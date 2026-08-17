use std::sync::Arc;
use crate::models::{AppSettings, CanvasTransform, LoadedAppState, Note};
use super::error::StorageError;
use super::repository::NoteRepository;

pub struct NoteService {
    repo: Arc<dyn NoteRepository>,
}

impl NoteService {
    pub fn new(repo: Arc<dyn NoteRepository>) -> Self {
        Self { repo }
    }

    pub fn load_app_state(&self) -> Result<LoadedAppState, StorageError> {
        self.repo.load_all()
    }

    pub fn save_notes_batch(&self, notes: &[Note]) -> Result<usize, StorageError> {
        if notes.is_empty() {
            return Ok(0);
        }
        self.repo.save_batch(notes)
    }

    pub fn delete_notes(&self, ids: &[String]) -> Result<usize, StorageError> {
        if ids.is_empty() {
            return Ok(0);
        }
        self.repo.delete_batch(ids)
    }

    pub fn save_canvas_transform(&self, transform: &CanvasTransform) -> Result<(), StorageError> {
        self.repo.save_canvas_transform(transform)
    }

    pub fn save_app_settings(&self, settings: &AppSettings) -> Result<(), StorageError> {
        self.repo.save_app_settings(settings)
    }

    pub fn check_integrity(&self) -> Result<bool, StorageError> {
        self.repo.check_integrity()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::note::repository::MockNoteRepository;

    #[test]
    fn test_note_service_with_mock_repo() {
        let mock_repo = Arc::new(MockNoteRepository::new());
        let service = NoteService::new(mock_repo);

        let note = Note {
            id: "test-note".to_string(),
            title: "Service Test".to_string(),
            content: "Testing domain service layer".to_string(),
            x: 10.0,
            y: 20.0,
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
            tags: Some(vec!["#test".to_string()]),
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

        let count = service.save_notes_batch(std::slice::from_ref(&note)).expect("save failed");
        assert_eq!(count, 1);

        let state = service.load_app_state().expect("load failed");
        assert_eq!(state.notes.len(), 1);
        assert_eq!(state.notes[0].title, "Service Test");

        let delete_id = "test-note".to_string();
        let deleted = service.delete_notes(std::slice::from_ref(&delete_id)).expect("delete failed");
        assert_eq!(deleted, 1);

        let state_after = service.load_app_state().expect("load failed");
        assert_eq!(state_after.notes.len(), 0);
    }
}
