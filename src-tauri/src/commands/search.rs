use std::sync::Arc;
use tauri::State;

use crate::commands::storage::AppState;
use crate::domain::search::{SearchFilter, SearchResultItem};
use crate::models::Note;

#[tauri::command]
pub fn search_notes(
    state: State<Arc<AppState>>,
    query: String,
    filter: Option<SearchFilter>,
    limit: Option<usize>,
) -> Result<SearchResultItem, String> {
    state
        .search_service
        .search_notes(&query, filter, limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn index_vault_notes(
    state: State<Arc<AppState>>,
    notes: Vec<Note>,
) -> Result<(), String> {
    state
        .search_service
        .index_vault_notes(&notes)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_vault_fts_index(state: State<Arc<AppState>>) -> Result<(), String> {
    state.search_service.clear_vault_index();
    Ok(())
}
