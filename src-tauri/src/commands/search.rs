use std::sync::Arc;
use tauri::State;

use crate::domain::search::{SearchFilter, SearchResultItem, SearchService};
use crate::error::AppError;
use crate::models::Note;

#[tauri::command]
pub fn search_notes(
    search_service: State<'_, Arc<SearchService>>,
    query: String,
    filter: Option<SearchFilter>,
    limit: Option<usize>,
) -> Result<SearchResultItem, AppError> {
    Ok(search_service.search_notes(&query, filter, limit)?)
}

#[tauri::command]
pub fn index_vault_notes(
    search_service: State<'_, Arc<SearchService>>,
    notes: Vec<Note>,
) -> Result<(), AppError> {
    Ok(search_service.index_vault_notes(&notes)?)
}

#[tauri::command]
pub fn clear_vault_fts_index(search_service: State<'_, Arc<SearchService>>) -> Result<(), AppError> {
    search_service.clear_vault_index();
    Ok(())
}
