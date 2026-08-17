use std::sync::Arc;
use tauri::State;
use crate::domain::note::NoteService;
use crate::models::{AppSettings, CanvasTransform, LoadedAppState, Note};

pub struct AppState {
    pub note_service: NoteService,
}

impl AppState {
    pub fn new(note_service: NoteService) -> Self {
        Self { note_service }
    }
}

#[tauri::command]
pub fn load_app_state(state: State<Arc<AppState>>) -> Result<LoadedAppState, String> {
    state
        .note_service
        .load_app_state()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_notes_batch(state: State<Arc<AppState>>, notes: Vec<Note>) -> Result<usize, String> {
    state
        .note_service
        .save_notes_batch(&notes)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_notes(state: State<Arc<AppState>>, ids: Vec<String>) -> Result<usize, String> {
    state
        .note_service
        .delete_notes(&ids)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_canvas_transform(
    state: State<Arc<AppState>>,
    transform: CanvasTransform,
) -> Result<(), String> {
    state
        .note_service
        .save_canvas_transform(&transform)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_app_settings(state: State<Arc<AppState>>, settings: AppSettings) -> Result<(), String> {
    state
        .note_service
        .save_app_settings(&settings)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_database_integrity(state: State<Arc<AppState>>) -> Result<bool, String> {
    state
        .note_service
        .check_integrity()
        .map_err(|e| e.to_string())
}
