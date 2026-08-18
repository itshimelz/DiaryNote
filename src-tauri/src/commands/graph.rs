use std::sync::Arc;
use tauri::State;

use crate::domain::graph::{BacklinkItem, GraphService, NoteConnection, ParsedLinks};
use crate::error::AppError;
use crate::models::Note;

#[tauri::command]
pub fn parse_note_markdown_links(
    graph_service: State<'_, Arc<GraphService>>,
    content: String,
) -> Result<ParsedLinks, AppError> {
    Ok(graph_service.parse_content(&content))
}

#[tauri::command]
pub fn get_note_graph_connections(
    graph_service: State<'_, Arc<GraphService>>,
    notes: Vec<Note>,
) -> Result<Vec<NoteConnection>, AppError> {
    Ok(graph_service.get_connections(&notes))
}

#[tauri::command]
pub fn get_note_backlinks(
    graph_service: State<'_, Arc<GraphService>>,
    target_note_id: String,
    notes: Vec<Note>,
) -> Result<Vec<BacklinkItem>, AppError> {
    Ok(graph_service.get_backlinks(&target_note_id, &notes))
}
