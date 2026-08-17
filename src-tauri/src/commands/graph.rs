use std::sync::Arc;
use tauri::State;

use crate::commands::storage::AppState;
use crate::domain::graph::{BacklinkItem, NoteConnection, ParsedLinks};
use crate::models::Note;

#[tauri::command]
pub fn parse_note_markdown_links(
    state: State<Arc<AppState>>,
    content: String,
) -> Result<ParsedLinks, String> {
    Ok(state.graph_service.parse_content(&content))
}

#[tauri::command]
pub fn get_note_graph_connections(
    state: State<Arc<AppState>>,
    notes: Vec<Note>,
) -> Result<Vec<NoteConnection>, String> {
    Ok(state.graph_service.get_connections(&notes))
}

#[tauri::command]
pub fn get_note_backlinks(
    state: State<Arc<AppState>>,
    target_note_id: String,
    notes: Vec<Note>,
) -> Result<Vec<BacklinkItem>, String> {
    Ok(state.graph_service.get_backlinks(&target_note_id, &notes))
}
