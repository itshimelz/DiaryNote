use std::fs::{self, File};
use std::io::{Read, Seek, Write};
use std::path::Path;
use rusqlite::Connection;
use thiserror::Error;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

use crate::domain::note::repository::NoteRepository;
use crate::infrastructure::filesystem::AssetStore;
use crate::infrastructure::os::AppPaths;
use crate::infrastructure::sqlite::init_sqlite_connection;
use crate::infrastructure::sqlite::SqliteNoteRepository;
use crate::models::{
    BackupManifest, ConflictResolutionMode,
    VaultArchiveInspection, VaultExportSummary, VaultImportSummary,
};

#[derive(Debug, Error)]
pub enum BackupError {
    #[error("SQLite database error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("Filesystem IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("ZIP archive error: {0}")]
    Zip(#[from] zip::result::ZipError),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Invalid archive structure: {0}")]
    InvalidArchive(String),
}

/// Creates a safe point-in-time SQLite snapshot of src_conn using SQLite Online Backup API.
/// This works reliably even with active WAL readers and writers without detached WAL corruption.
pub fn create_online_backup_snapshot<P: AsRef<Path>>(
    src_conn: &Connection,
    dest_path: P,
) -> Result<(), BackupError> {
    let dest_path = dest_path.as_ref();
    if dest_path.exists() {
        let _ = fs::remove_file(dest_path);
    }

    let mut dest_conn = Connection::open(dest_path)?;

    // Configure destination for standalone single-file snapshot
    dest_conn.execute_batch("PRAGMA synchronous = OFF; PRAGMA page_size = 4096;")?;

    {
        let backup = rusqlite::backup::Backup::new(src_conn, &mut dest_conn)?;
        backup.run_to_completion(20, std::time::Duration::from_millis(10), None)?;
    }

    let _: String = dest_conn.query_row("PRAGMA journal_mode = DELETE", [], |r| r.get(0))?;
    dest_conn.execute("VACUUM", [])?;
    drop(dest_conn);

    Ok(())
}

/// Exports a full .diarynote vault archive bundle containing:
/// 1. manifest.json (versioned metadata & asset hashes)
/// 2. diarynote.db (checkpointed standalone SQLite snapshot)
/// 3. assets/* (referenced original image files)
pub fn export_vault_archive<P: AsRef<Path>>(
    src_conn: &Connection,
    paths: &AppPaths,
    target_archive_path: P,
) -> Result<VaultExportSummary, BackupError> {
    let target_archive_path = target_archive_path.as_ref();

    if let Some(parent) = target_archive_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let temp_snapshot_filename = format!("snapshot_{}_{}.db", std::process::id(), chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));
    let temp_snapshot_path = paths.temp_dir.join(&temp_snapshot_filename);

    // 1. Create consistent online SQLite backup snapshot
    create_online_backup_snapshot(src_conn, &temp_snapshot_path)?;

    // 2. Count active notes and collect asset hashes
    let note_count: usize = src_conn.query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0))?;

    let mut asset_hashes = Vec::new();
    if let Ok(entries) = fs::read_dir(&paths.originals_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(stem) = p.file_stem().and_then(|s| s.to_str()) {
                    if stem.len() == 64 && stem.chars().all(|c| c.is_ascii_hexdigit()) {
                        asset_hashes.push(stem.to_string());
                    }
                }
            }
        }
    }
    asset_hashes.sort();
    asset_hashes.dedup();

    let manifest = BackupManifest {
        format_version: "1.0.0".to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: 2,
        created_at: chrono::Utc::now().to_rfc3339(),
        note_count,
        asset_hashes: asset_hashes.clone(),
        metadata: None,
    };

    let manifest_bytes = serde_json::to_vec_pretty(&manifest)?;

    // 3. Stage ZIP creation in temp directory before moving to target destination
    let temp_zip_filename = format!("export_stage_{}_{}.diarynote", std::process::id(), chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));
    let temp_zip_path = paths.temp_dir.join(&temp_zip_filename);
    let zip_file = File::create(&temp_zip_path)?;

    let mut zip = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    // Add manifest.json
    zip.start_file("manifest.json", options)?;
    zip.write_all(&manifest_bytes)?;

    // Add diarynote.db
    zip.start_file("diarynote.db", options)?;
    let mut snapshot_file = File::open(&temp_snapshot_path)?;
    std::io::copy(&mut snapshot_file, &mut zip)?;
    drop(snapshot_file);
    let _ = fs::remove_file(&temp_snapshot_path);

    // Add assets
    let mut asset_count = 0;
    if let Ok(entries) = fs::read_dir(&paths.originals_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(file_name) = p.file_name().and_then(|s| s.to_str()) {
                    let zip_entry_path = format!("assets/{}", file_name);
                    zip.start_file(zip_entry_path, options)?;
                    let mut asset_file = File::open(&p)?;
                    std::io::copy(&mut asset_file, &mut zip)?;
                    asset_count += 1;
                }
            }
        }
    }

    zip.finish()?;

    // Atomically move or copy temp zip to target
    if target_archive_path.exists() {
        let _ = fs::remove_file(target_archive_path);
    }

    if let Err(_e) = fs::rename(&temp_zip_path, target_archive_path) {
        fs::copy(&temp_zip_path, target_archive_path)?;
        let _ = fs::remove_file(&temp_zip_path);
    }

    let metadata = fs::metadata(target_archive_path)?;
    let file_name = target_archive_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("vault_backup.diarynote")
        .to_string();

    Ok(VaultExportSummary {
        file_path: target_archive_path.to_string_lossy().to_string(),
        file_name,
        note_count,
        asset_count,
        size_bytes: metadata.len(),
    })
}

/// Inspects a .diarynote archive (or legacy .json backup) without committing changes to the vault.
pub fn inspect_vault_archive<P: AsRef<Path>>(
    archive_path: P,
    temp_dir: &Path,
) -> Result<VaultArchiveInspection, BackupError> {
    let archive_path = archive_path.as_ref();
    if !archive_path.exists() {
        return Err(BackupError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("Backup archive not found: {}", archive_path.display()),
        )));
    }

    // Check if file is JSON format
    let file = File::open(archive_path)?;
    let mut magic_header = [0u8; 4];
    let mut reader = std::io::BufReader::new(file);
    let bytes_read = reader.read(&mut magic_header).unwrap_or(0);
    reader.seek(std::io::SeekFrom::Start(0))?;

    // PK\x03\x04 indicates ZIP container
    if bytes_read >= 4 && magic_header == [0x50, 0x4b, 0x03, 0x04] {
        // Handle .diarynote ZIP format
        let mut archive = ZipArchive::new(reader)?;

        // 1. Read manifest.json
        let manifest: BackupManifest = {
            let mut manifest_file = archive.by_name("manifest.json").map_err(|_| {
                BackupError::InvalidArchive("Archive missing required manifest.json".to_string())
            })?;
            let mut manifest_str = String::new();
            manifest_file.read_to_string(&mut manifest_str)?;
            serde_json::from_str(&manifest_str)?
        };

        // 2. Extract database to temporary inspection file
        let inspect_db_path = temp_dir.join(format!(
            "inspect_{}_{}.db",
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        ));

        {
            let mut db_zip_file = archive.by_name("diarynote.db").map_err(|_| {
                BackupError::InvalidArchive("Archive missing required diarynote.db database".to_string())
            })?;
            let mut out_db_file = File::create(&inspect_db_path)?;
            std::io::copy(&mut db_zip_file, &mut out_db_file)?;
        }

        // Count assets inside zip
        let mut asset_count = 0;
        for i in 0..archive.len() {
            if let Ok(file) = archive.by_index(i) {
                if file.name().starts_with("assets/") && !file.name().ends_with('/') {
                    asset_count += 1;
                }
            }
        }

        // 3. Read notes from temporary database
        let inspect_conn = init_sqlite_connection(&inspect_db_path)?;
        let repo = SqliteNoteRepository::new(inspect_conn);
        let loaded = repo.load_all().map_err(|e| BackupError::Sqlite(rusqlite::Error::UserFunctionError(Box::new(e))))?;

        let _ = fs::remove_file(&inspect_db_path);

        Ok(VaultArchiveInspection {
            manifest,
            notes: loaded.notes,
            transform: Some(loaded.transform),
            settings: Some(loaded.settings),
            asset_count,
        })
    } else {
        Err(BackupError::InvalidArchive(
            "Specified file is not a valid .diarynote archive container".to_string(),
        ))
    }
}

/// Imports notes, assets, and optional preferences from a .diarynote archive or legacy .json file.
pub fn import_vault_archive<P: AsRef<Path>>(
    dest_conn: &Connection,
    paths: &AppPaths,
    archive_path: P,
    conflict_mode: ConflictResolutionMode,
    include_settings: bool,
) -> Result<VaultImportSummary, BackupError> {
    let archive_path = archive_path.as_ref();
    let inspection = inspect_vault_archive(archive_path, &paths.temp_dir)?;

    let mut assets_imported = 0;

    // 1. Unpack assets into originals_dir if ZIP container
    if let Ok(file) = File::open(archive_path) {
        if let Ok(mut archive) = ZipArchive::new(file) {
            let asset_store = AssetStore::new(paths.clone());
            for i in 0..archive.len() {
                if let Ok(mut zip_entry) = archive.by_index(i) {
                    let entry_name = zip_entry.name().to_string();
                    if entry_name.starts_with("assets/") && !entry_name.ends_with('/') {
                        let filename = entry_name.trim_start_matches("assets/");
                        let mut buf = Vec::new();
                        if zip_entry.read_to_end(&mut buf).is_ok()
                            && asset_store.save_asset(&buf, Some(filename)).is_ok()
                        {
                            assets_imported += 1;
                        }
                    }
                }
            }
        }
    }

    // 2. Query existing note IDs
    let mut stmt = dest_conn.prepare("SELECT id FROM notes")?;
    let existing_ids: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get(0))?
        .flatten()
        .collect();

    let mut notes_to_insert = Vec::new();
    let mut notes_overwritten = 0;
    let mut notes_skipped = 0;
    let mut notes_imported = 0;

    for mut note in inspection.notes {
        let is_existing = existing_ids.contains(&note.id);
        if is_existing {
            match conflict_mode {
                ConflictResolutionMode::Overwrite => {
                    notes_overwritten += 1;
                    notes_imported += 1;
                    notes_to_insert.push(note);
                }
                ConflictResolutionMode::KeepBoth => {
                    note.id = format!("note-{}", uuid_v4_simple());
                    note.title = format!("{} (Imported)", if note.title.is_empty() { "Untitled Note" } else { &note.title });
                    notes_imported += 1;
                    notes_to_insert.push(note);
                }
                ConflictResolutionMode::Skip => {
                    notes_skipped += 1;
                }
            }
        } else {
            notes_imported += 1;
            notes_to_insert.push(note);
        }
    }

    // 3. Save notes to database
    let repo = SqliteNoteRepository::new(init_sqlite_connection(&paths.db_path)?);
    if !notes_to_insert.is_empty() {
        repo.save_batch(&notes_to_insert)
            .map_err(|e| BackupError::Sqlite(rusqlite::Error::UserFunctionError(Box::new(e))))?;
    }

    // 4. Optionally import settings and transform
    if include_settings {
        if let Some(ref transform) = inspection.transform {
            let _ = repo.save_canvas_transform(transform);
        }
        if let Some(ref settings) = inspection.settings {
            let _ = repo.save_app_settings(settings);
        }
    }

    Ok(VaultImportSummary {
        notes_imported,
        notes_overwritten,
        notes_skipped,
        assets_imported,
    })
}

fn uuid_v4_simple() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let random_bytes: [u8; 16] = rng.gen();
    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        random_bytes[0],
        random_bytes[1],
        random_bytes[2],
        random_bytes[3],
        random_bytes[4],
        random_bytes[5],
        (random_bytes[6] & 0x0f) | 0x40,
        random_bytes[7],
        (random_bytes[8] & 0x3f) | 0x80,
        random_bytes[9],
        random_bytes[10],
        random_bytes[11],
        random_bytes[12],
        random_bytes[13],
        random_bytes[14],
        random_bytes[15]
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use crate::models::Note;

    fn create_test_env() -> (AppPaths, PathBuf) {
        let temp_root = std::env::temp_dir().join(format!("diarynote_backup_test_{}", std::process::id()));
        let paths = AppPaths::from_root(temp_root.clone()).expect("Failed to init AppPaths");
        (paths, temp_root)
    }

    #[test]
    fn test_online_backup_and_archive_export_import_roundtrip() {
        let (paths, root) = create_test_env();

        // 1. Initialize source database and populate notes
        let conn = init_sqlite_connection(&paths.db_path).expect("Failed to init SQLite connection");
        let repo = SqliteNoteRepository::new(init_sqlite_connection(&paths.db_path).unwrap());

        let note1 = Note {
            id: "note-101".to_string(),
            title: "Original Note 1".to_string(),
            content: "Content with @[Note 2](note-102) reference".to_string(),
            x: 50.0,
            y: 50.0,
            width: 300.0,
            height: 200.0,
            created_at: "2026-08-18T00:00:00Z".to_string(),
            updated_at: "2026-08-18T00:00:00Z".to_string(),
            created_timestamp: Some(1787000000000),
            updated_timestamp: Some(1787000000000),
            font_family: "sans".to_string(),
            font_size: "md".to_string(),
            paper_theme: "white".to_string(),
            is_pinned: Some(true),
            z_index: 1,
            tags: Some(vec!["#journal".to_string(), "#test".to_string()]),
            active_mode: None,
            embedding: None,
            is_locked: Some(false),
            group_id: None,
            group_name: None,
            entry_date: None,
            is_daily_entry: None,
            mood: None,
            image_url: None,
            image_type: None,
            image_aspect_ratio: None,
            frame_style: None,
            pin_style: None,
            rotation: None,
        };

        repo.save_batch(std::slice::from_ref(&note1)).expect("Failed to save note");

        // 2. Save a test asset
        let asset_store = AssetStore::new(paths.clone());
        let asset = asset_store.save_asset(b"test-image-bytes-54321".as_slice(), Some("sample.png")).expect("Failed to save asset");
        assert_eq!(asset.hash.len(), 64);

        // 3. Export archive
        let archive_target = paths.backups_dir.join("test_vault_backup.diarynote");
        let export_summary = export_vault_archive(&conn, &paths, &archive_target).expect("Export failed");
        assert_eq!(export_summary.note_count, 1);
        assert_eq!(export_summary.asset_count, 1);
        assert!(archive_target.exists());

        // 4. Inspect archive
        let inspection = inspect_vault_archive(&archive_target, &paths.temp_dir).expect("Inspection failed");
        assert_eq!(inspection.notes.len(), 1);
        assert_eq!(inspection.notes[0].id, "note-101");
        assert_eq!(inspection.manifest.schema_version, 2);

        // 5. Test Import with KeepBoth conflict mode
        let import_summary = import_vault_archive(
            &conn,
            &paths,
            &archive_target,
            ConflictResolutionMode::KeepBoth,
            true,
        ).expect("Import failed");

        assert_eq!(import_summary.notes_imported, 1);

        // Check that destination now has 2 notes (original + imported copy)
        let loaded = repo.load_all().expect("Failed to reload notes");
        assert_eq!(loaded.notes.len(), 2);
        assert!(loaded.notes.iter().any(|n| n.id == "note-101"));
        assert!(loaded.notes.iter().any(|n| n.title.contains("(Imported)")));

        // Cleanup
        let _ = fs::remove_dir_all(&root);
    }
}
