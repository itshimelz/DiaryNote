pub mod commands;
pub mod domain;
pub mod infrastructure;
pub mod models;
pub mod utils;

use std::sync::Arc;
use commands::{
    check_database_integrity, delete_notes, load_app_state, read_image_files, relocate_notes,
    save_app_settings, save_canvas_transform, save_export_file, save_notes_batch, AppState,
};
use domain::note::NoteService;
use infrastructure::{init_sqlite_connection, AppPaths, SqliteNoteRepository};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            save_export_file,
            read_image_files,
            relocate_notes,
            load_app_state,
            save_notes_batch,
            delete_notes,
            save_canvas_transform,
            save_app_settings,
            check_database_integrity,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Resolve platform-aware paths and initialize SQLite repository
            let app_paths = AppPaths::from_app(&app.handle())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            let conn = init_sqlite_connection(&app_paths.db_path)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            let repo = Arc::new(SqliteNoteRepository::new(conn));
            let note_service = NoteService::new(repo);
            let app_state = Arc::new(AppState::new(note_service));

            app.manage(app_state);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
