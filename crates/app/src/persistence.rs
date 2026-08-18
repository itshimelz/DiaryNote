//! Background SQLite persistence coordinator.
//!
//! Handles SQLite connection initialization, database path resolution,
//! initial load of notes, and dirty state settlement.

use anyhow::Result;
use domain::models::note::{Note, NoteId};
use domain::repositories::NotesRepository;
use std::path::PathBuf;
use storage::db::Database;
use storage::repositories::sqlite_notes::SqliteNotesRepository;

#[allow(dead_code)]
pub struct PersistenceCoordinator {
    repo: SqliteNotesRepository,
}

#[allow(dead_code)]
impl PersistenceCoordinator {
    /// Initialize SQLite database at default OS application data directory
    pub fn initialize() -> Result<Self> {
        let db_path = Self::resolve_db_path();
        let db = Database::open_file(&db_path)?;
        let repo = SqliteNotesRepository::new(db, None);

        Ok(Self { repo })
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_db_path() {
        let path = PersistenceCoordinator::resolve_db_path();
        assert!(path.to_string_lossy().contains("diarynote.db"));
    }
}
