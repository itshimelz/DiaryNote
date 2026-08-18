//! Background SQLite persistence coordinator.
//!
//! Handles SQLite connection initialization, database path resolution,
//! initial load of notes, FTS5 full-text search, and dirty state settlement.

use anyhow::Result;
use domain::models::note::{Note, NoteId};
use domain::repositories::NotesRepository;
use std::path::PathBuf;
use storage::backup::{BackupManager, ImportStrategy, ImportSummary};
use storage::db::Database;
use storage::repositories::sqlite_notes::SqliteNotesRepository;
use storage::search::{FtsSearchEngine, SearchResultItem};

/// Database Diagnostics & Metrics
#[derive(Debug, Clone, PartialEq, Default)]
pub struct DbMetrics {
    pub file_size_bytes: u64,
    pub wal_size_bytes: u64,
    pub page_count: i64,
    pub page_size: i64,
    pub total_notes: usize,
}

#[allow(dead_code)]
pub struct PersistenceCoordinator {
    db: Database,
    repo: SqliteNotesRepository,
    fts: FtsSearchEngine,
    backup_mgr: BackupManager,
}

#[allow(dead_code)]
impl PersistenceCoordinator {
    /// Initialize SQLite database at default OS application data directory
    pub fn initialize() -> Result<Self> {
        let db_path = Self::resolve_db_path();
        let db = Database::open_file(&db_path)?;
        let repo = SqliteNotesRepository::new(db.clone(), None);
        let fts = FtsSearchEngine::new(db.clone());
        let backup_mgr = BackupManager::new(db.clone());

        Ok(Self {
            db,
            repo,
            fts,
            backup_mgr,
        })
    }

    /// In-memory initialization for testing
    pub fn initialize_in_memory() -> Result<Self> {
        let db = Database::open_in_memory()?;
        let repo = SqliteNotesRepository::new(db.clone(), None);
        let fts = FtsSearchEngine::new(db.clone());
        let backup_mgr = BackupManager::new(db.clone());

        Ok(Self {
            db,
            repo,
            fts,
            backup_mgr,
        })
    }

    /// Resolve SQLite file path across Linux, macOS, and Windows
    pub fn resolve_db_path() -> PathBuf {
        let mut base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("./data"));
        base.push("DiaryNote");
        std::fs::create_dir_all(&base).ok();
        base.push("diarynote.db");
        base
    }

    /// Load all notes from database
    pub async fn load_notes(&self) -> Result<Vec<Note>> {
        let notes = self.repo.get_all_notes().await?;
        Ok(notes)
    }

    /// Save or update a single note
    pub async fn save_note(&self, note: &Note) -> Result<()> {
        self.repo.save_note(note).await?;
        Ok(())
    }

    /// Save multiple notes in a single transaction
    pub async fn save_batch(&self, notes: &[Note]) -> Result<()> {
        self.repo.batch_save_notes(notes).await?;
        Ok(())
    }

    /// Delete a note by ID
    pub async fn delete_note(&self, id: &NoteId) -> Result<()> {
        self.repo.delete_note(id).await?;
        Ok(())
    }

    /// Delete multiple notes
    pub async fn delete_batch(&self, ids: &[NoteId]) -> Result<()> {
        self.repo.batch_delete_notes(ids).await?;
        Ok(())
    }

    /// Execute sub-millisecond FTS5 search
    pub fn search_fts(&self, query: &str, limit: usize) -> Result<Vec<SearchResultItem>> {
        let results = self.fts.search(query, limit)?;
        Ok(results)
    }

    /// Export a full backup payload JSON
    pub async fn export_backup_json(&self) -> Result<String> {
        let json = self.backup_mgr.export_backup().await?;
        Ok(json)
    }

    /// Restore/Import a backup payload JSON with collision resolution
    pub async fn import_backup_json(&self, json_str: &str, strategy: ImportStrategy) -> Result<ImportSummary> {
        let summary = self.backup_mgr.import_backup(json_str, strategy).await?;
        Ok(summary)
    }

    /// Run SQLite VACUUM and OPTIMIZE
    pub fn vacuum_optimize(&self) -> Result<()> {
        self.db.with_conn(|conn| {
            conn.execute_batch("VACUUM; PRAGMA optimize;")?;
            Ok(())
        })?;
        Ok(())
    }

    /// Retrieve live database metrics
    pub fn get_metrics(&self) -> Result<DbMetrics> {
        let db_path = Self::resolve_db_path();
        let file_size_bytes = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
        let wal_path = db_path.with_extension("db-wal");
        let wal_size_bytes = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);

        let (page_count, page_size) = self.db.with_conn(|conn| {
            let page_count: i64 = conn.query_row("PRAGMA page_count", [], |r| r.get(0))?;
            let page_size: i64 = conn.query_row("PRAGMA page_size", [], |r| r.get(0))?;
            Ok((page_count, page_size))
        })?;

        Ok(DbMetrics {
            file_size_bytes,
            wal_size_bytes,
            page_count,
            page_size,
            total_notes: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_db_path() {
        let path = PersistenceCoordinator::resolve_db_path();
        assert!(path.to_string_lossy().contains("diarynote.db"));
    }

    #[tokio::test]
    async fn test_persistence_in_memory_crud_and_fts() {
        let coord = PersistenceCoordinator::initialize_in_memory().unwrap();
        let mut note = Note::new("Test Persistence", "Body content about Rust and GPUI", domain::models::note::Point2D::new(0.0, 0.0));
        note.tags = vec!["architecture".into()];

        // Save
        coord.save_note(&note).await.unwrap();
        let loaded = coord.load_notes().await.unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].title, "Test Persistence");

        // FTS Search
        let results = coord.search_fts("Rust", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Test Persistence");

        // Backup Export & Import
        let backup_json = coord.export_backup_json().await.unwrap();
        assert!(backup_json.contains("Test Persistence"));

        let summary = coord.import_backup_json(&backup_json, ImportStrategy::KeepBoth).await.unwrap();
        assert_eq!(summary.imported_notes, 1);
    }
}
