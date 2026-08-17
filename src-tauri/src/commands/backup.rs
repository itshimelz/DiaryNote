use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

use crate::commands::storage::AppState;
use crate::infrastructure::filesystem::backup::{
    export_vault_archive as infra_export_vault_archive,
    import_vault_archive as infra_import_vault_archive,
    inspect_vault_archive as infra_inspect_vault_archive,
};
use crate::models::{
    ConflictResolutionMode, VaultArchiveInspection, VaultExportSummary, VaultImportSummary,
};

#[tauri::command]
pub fn export_vault_archive(
    state: State<Arc<AppState>>,
    target_path: Option<String>,
) -> Result<VaultExportSummary, String> {
    let conn = state.db_conn.lock().map_err(|e| e.to_string())?;

    let default_filename = format!(
        "DiaryNote-Backup-{}.diarynote",
        chrono::Utc::now().format("%Y-%m-%d_%H-%M-%S")
    );

    let export_path = match target_path {
        Some(p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => state.app_paths.backups_dir.join(&default_filename),
    };

    infra_export_vault_archive(&conn, &state.app_paths, &export_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn inspect_vault_archive(
    state: State<Arc<AppState>>,
    archive_path: String,
) -> Result<VaultArchiveInspection, String> {
    let path = PathBuf::from(&archive_path);
    infra_inspect_vault_archive(&path, &state.app_paths.temp_dir).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_vault_archive(
    state: State<Arc<AppState>>,
    archive_path: String,
    conflict_mode: Option<ConflictResolutionMode>,
    include_settings: Option<bool>,
) -> Result<VaultImportSummary, String> {
    let conn = state.db_conn.lock().map_err(|e| e.to_string())?;
    let path = PathBuf::from(&archive_path);

    infra_import_vault_archive(
        &conn,
        &state.app_paths,
        &path,
        conflict_mode.unwrap_or(ConflictResolutionMode::KeepBoth),
        include_settings.unwrap_or(false),
    )
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::asset::AssetService;
    use crate::domain::graph::GraphService;
    use crate::domain::note::NoteService;
    use crate::domain::search::SearchService;
    use crate::domain::vault::VaultService;
    use crate::infrastructure::filesystem::AssetStore;
    use crate::infrastructure::os::AppPaths;
    use crate::infrastructure::sqlite::{init_sqlite_connection, SqliteNoteRepository};
    use crate::models::Note;
    use std::sync::Mutex;

    #[test]
    fn test_commands_backup_roundtrip() {
        let temp_root = std::env::temp_dir().join(format!("diarynote_cmd_backup_test_{}", std::process::id()));
        let app_paths = AppPaths::from_root(temp_root.clone()).expect("AppPaths error");
        let conn = init_sqlite_connection(&app_paths.db_path).expect("SQLite init error");
        let conn_arc = Arc::new(Mutex::new(conn));

        let repo = Arc::new(SqliteNoteRepository::from_arc(Arc::clone(&conn_arc)));
        let note_service = NoteService::new(repo);
        let asset_store = Arc::new(AssetStore::new(app_paths.clone()));
        let asset_service = AssetService::new(asset_store, Some(Arc::clone(&conn_arc)));
        let vault_service = VaultService::new();
        let search_service = SearchService::new(Arc::clone(&conn_arc));
        let graph_service = GraphService::new();

        let app_state = Arc::new(AppState::new(
            note_service,
            asset_service,
            vault_service,
            search_service,
            graph_service,
            Arc::clone(&conn_arc),
            app_paths.clone(),
        ));

        // Save a note
        let note = Note {
            id: "note-backup-cmd-1".to_string(),
            title: "Cmd Backup Test Note".to_string(),
            content: "Cmd Backup Content".to_string(),
            x: 0.0,
            y: 0.0,
            width: 200.0,
            height: 200.0,
            created_at: "2026-08-18T00:00:00Z".to_string(),
            updated_at: "2026-08-18T00:00:00Z".to_string(),
            created_timestamp: None,
            updated_timestamp: None,
            font_family: "sans".to_string(),
            font_size: "md".to_string(),
            paper_theme: "white".to_string(),
            is_pinned: None,
            z_index: 1,
            tags: None,
            active_mode: None,
            embedding: None,
            is_locked: None,
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

        app_state.note_service.save_notes_batch(&[note]).unwrap();

        let backup_dest = app_paths.backups_dir.join("cmd_test_backup.diarynote");
        let export_res = infra_export_vault_archive(
            &conn_arc.lock().unwrap(),
            &app_paths,
            &backup_dest,
        ).expect("Export failed");
        assert_eq!(export_res.note_count, 1);

        let inspect_res = infra_inspect_vault_archive(&backup_dest, &app_paths.temp_dir).expect("Inspect failed");
        assert_eq!(inspect_res.notes.len(), 1);

        let import_res = infra_import_vault_archive(
            &conn_arc.lock().unwrap(),
            &app_paths,
            &backup_dest,
            ConflictResolutionMode::KeepBoth,
            false,
        ).expect("Import failed");
        assert_eq!(import_res.notes_imported, 1);

        let _ = std::fs::remove_dir_all(&temp_root);
    }
}
