use crate::models::{AppSettings, CanvasTransform, LoadedAppState, Note};
use super::error::StorageError;

/// Core Hexagonal NoteRepository port contract.
/// Domain services interact exclusively with this trait, decoupling from SQLite infrastructure.
pub trait NoteRepository: Send + Sync {
    /// Loads all notes, canvas transform, and app settings for application startup hydration.
    fn load_all(&self) -> Result<LoadedAppState, StorageError>;

    /// Saves a batch of dirty/modified notes in an atomic transaction.
    fn save_batch(&self, notes: &[Note]) -> Result<usize, StorageError>;

    /// Deletes a batch of notes by their IDs and cascade-deletes associated tags.
    fn delete_batch(&self, ids: &[String]) -> Result<usize, StorageError>;

    /// Saves the current canvas camera transform (pan x, pan y, zoom).
    fn save_canvas_transform(&self, transform: &CanvasTransform) -> Result<(), StorageError>;

    /// Saves the application preferences.
    fn save_app_settings(&self, settings: &AppSettings) -> Result<(), StorageError>;

    /// Runs a database integrity check (e.g. PRAGMA quick_check).
    fn check_integrity(&self) -> Result<bool, StorageError>;
}

/// In-Memory Mock Repository for testing domain services without disk I/O.
#[derive(Default)]
pub struct MockNoteRepository {
    notes: std::sync::RwLock<Vec<Note>>,
    transform: std::sync::RwLock<CanvasTransform>,
    settings: std::sync::RwLock<AppSettings>,
}

impl MockNoteRepository {
    pub fn new() -> Self {
        Self::default()
    }
}

impl NoteRepository for MockNoteRepository {
    fn load_all(&self) -> Result<LoadedAppState, StorageError> {
        let notes = self.notes.read().unwrap().clone();
        let transform = self.transform.read().unwrap().clone();
        let settings = self.settings.read().unwrap().clone();
        Ok(LoadedAppState {
            notes,
            transform,
            settings,
        })
    }

    fn save_batch(&self, notes: &[Note]) -> Result<usize, StorageError> {
        let mut store = self.notes.write().unwrap();
        let mut saved_count = 0;
        for note in notes {
            if let Some(pos) = store.iter().position(|n| n.id == note.id) {
                store[pos] = note.clone();
            } else {
                store.push(note.clone());
            }
            saved_count += 1;
        }
        Ok(saved_count)
    }

    fn delete_batch(&self, ids: &[String]) -> Result<usize, StorageError> {
        let mut store = self.notes.write().unwrap();
        let initial_len = store.len();
        store.retain(|n| !ids.contains(&n.id));
        Ok(initial_len - store.len())
    }

    fn save_canvas_transform(&self, transform: &CanvasTransform) -> Result<(), StorageError> {
        let mut t = self.transform.write().unwrap();
        *t = transform.clone();
        Ok(())
    }

    fn save_app_settings(&self, settings: &AppSettings) -> Result<(), StorageError> {
        let mut s = self.settings.write().unwrap();
        *s = settings.clone();
        Ok(())
    }

    fn check_integrity(&self) -> Result<bool, StorageError> {
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_repository_crud() {
        let repo = MockNoteRepository::new();

        let note1 = Note {
            id: "n1".to_string(),
            title: "First".to_string(),
            content: "Hello".to_string(),
            x: 0.0,
            y: 0.0,
            width: 300.0,
            height: 200.0,
            created_at: "2026-08-17T00:00:00Z".to_string(),
            updated_at: "2026-08-17T00:00:00Z".to_string(),
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

        let saved = repo.save_batch(std::slice::from_ref(&note1)).expect("save batch failed");
        assert_eq!(saved, 1);

        let state = repo.load_all().expect("load failed");
        assert_eq!(state.notes.len(), 1);
        assert_eq!(state.notes[0].id, "n1");

        let del_id = "n1".to_string();
        let deleted = repo.delete_batch(std::slice::from_ref(&del_id)).expect("delete failed");
        assert_eq!(deleted, 1);

        let state_after = repo.load_all().expect("load failed");
        assert_eq!(state_after.notes.len(), 0);
    }
}
