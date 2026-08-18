use std::sync::Arc;
use tauri::State;
use crate::domain::note::NoteService;
use crate::error::AppError;
use crate::infrastructure::os::AppPaths;
use crate::infrastructure::sqlite::DbPool;
use crate::models::{AppSettings, CanvasTransform, DatabaseStats, LoadedAppState, Note};

#[tauri::command]
pub fn load_app_state(note_service: State<'_, Arc<NoteService>>) -> Result<LoadedAppState, AppError> {
    Ok(note_service.load_app_state()?)
}

#[tauri::command]
pub fn save_notes_batch(
    note_service: State<'_, Arc<NoteService>>,
    notes: Vec<Note>,
) -> Result<usize, AppError> {
    Ok(note_service.save_notes_batch(&notes)?)
}

#[tauri::command]
pub fn delete_notes(
    note_service: State<'_, Arc<NoteService>>,
    ids: Vec<String>,
) -> Result<usize, AppError> {
    Ok(note_service.delete_notes(&ids)?)
}

#[tauri::command]
pub fn save_canvas_transform(
    note_service: State<'_, Arc<NoteService>>,
    transform: CanvasTransform,
) -> Result<(), AppError> {
    Ok(note_service.save_canvas_transform(&transform)?)
}

#[tauri::command]
pub fn save_app_settings(
    note_service: State<'_, Arc<NoteService>>,
    settings: AppSettings,
) -> Result<(), AppError> {
    Ok(note_service.save_app_settings(&settings)?)
}

#[tauri::command]
pub fn check_database_integrity(note_service: State<'_, Arc<NoteService>>) -> Result<bool, AppError> {
    Ok(note_service.check_integrity()?)
}

#[tauri::command]
pub fn get_database_stats(
    db_pool: State<'_, DbPool>,
    app_paths: State<'_, AppPaths>,
) -> Result<DatabaseStats, AppError> {
    let conn = db_pool.reader().map_err(AppError::Database)?;

    let db_path = app_paths.db_path.to_string_lossy().to_string();
    let db_size_bytes = std::fs::metadata(&app_paths.db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let wal_path = app_paths.db_path.with_extension("db-wal");
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
pub fn vacuum_database(
    db_pool: State<'_, DbPool>,
    app_paths: State<'_, AppPaths>,
) -> Result<DatabaseStats, AppError> {
    {
        let conn = db_pool.writer().map_err(AppError::Database)?;
        conn.execute_batch("VACUUM; PRAGMA optimize;")?;
    }

    get_database_stats(db_pool, app_paths)
}
