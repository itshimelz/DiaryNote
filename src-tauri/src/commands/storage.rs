use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use tauri::State;
use crate::domain::asset::AssetService;
use crate::domain::graph::GraphService;
use crate::domain::note::NoteService;
use crate::domain::search::SearchService;
use crate::domain::vault::VaultService;
use crate::infrastructure::os::AppPaths;
use crate::models::{AppSettings, CanvasTransform, DatabaseStats, LoadedAppState, Note};

pub struct AppState {
    pub note_service: NoteService,
    pub asset_service: AssetService,
    pub vault_service: VaultService,
    pub search_service: SearchService,
    pub graph_service: GraphService,
    pub db_conn: Arc<Mutex<Connection>>,
    pub app_paths: AppPaths,
}

impl AppState {
    pub fn new(
        note_service: NoteService,
        asset_service: AssetService,
        vault_service: VaultService,
        search_service: SearchService,
        graph_service: GraphService,
        db_conn: Arc<Mutex<Connection>>,
        app_paths: AppPaths,
    ) -> Self {
        Self {
            note_service,
            asset_service,
            vault_service,
            search_service,
            graph_service,
            db_conn,
            app_paths,
        }
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

#[tauri::command]
pub fn get_database_stats(state: State<Arc<AppState>>) -> Result<DatabaseStats, String> {
    let conn = state.db_conn.lock().map_err(|e| e.to_string())?;

    let db_path = state.app_paths.db_path.to_string_lossy().to_string();
    let db_size_bytes = std::fs::metadata(&state.app_paths.db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let wal_path = state.app_paths.db_path.with_extension("db-wal");
    let wal_size_bytes = std::fs::metadata(&wal_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let total_notes: usize = conn
        .query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0))
        .unwrap_or(0);

    let total_assets: usize = conn
        .query_row("SELECT COUNT(*) FROM assets", [], |r| r.get(0))
        .unwrap_or(0);

    let total_assets_size_bytes: u64 = conn
        .query_row("SELECT COALESCE(SUM(byte_size), 0) FROM assets", [], |r| r.get(0))
        .unwrap_or(0);

    let is_integrity_ok: bool = conn
        .query_row("PRAGMA quick_check", [], |r| r.get::<_, String>(0))
        .map(|res| res == "ok")
        .unwrap_or(false);

    Ok(DatabaseStats {
        db_path,
        db_size_bytes,
        wal_size_bytes,
        total_notes,
        total_assets,
        total_assets_size_bytes,
        is_integrity_ok,
    })
}

#[tauri::command]
pub fn vacuum_database(state: State<Arc<AppState>>) -> Result<DatabaseStats, String> {
    {
        let conn = state.db_conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("VACUUM; PRAGMA optimize;")
            .map_err(|e| e.to_string())?;
    }

    get_database_stats(state)
}
