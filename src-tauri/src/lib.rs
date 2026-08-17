pub mod commands;
pub mod domain;
pub mod infrastructure;
pub mod models;
pub mod utils;

use std::sync::{Arc, Mutex};
use commands::{
    check_database_integrity, clear_vault_fts_index, delete_asset, delete_notes,
    get_asset_info, get_note_backlinks, get_note_graph_connections, index_vault_notes,
    load_app_state, parse_note_markdown_links, read_image_files, relocate_notes,
    save_app_settings, save_asset_from_bytes, save_asset_from_path, save_canvas_transform,
    save_export_file, save_notes_batch, search_notes, vault_decrypt_note, vault_encrypt_note,
    vault_get_status, vault_hash_security_input, vault_is_unlocked, vault_lock, vault_unlock,
    vault_verify_security_input, AppState,
};
use domain::asset::AssetService;
use domain::graph::GraphService;
use domain::note::NoteService;
use domain::search::SearchService;
use domain::vault::VaultService;
use infrastructure::{init_sqlite_connection, AppPaths, AssetStore, SqliteNoteRepository};
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
        .register_uri_scheme_protocol("diarynote-asset", |ctx, request| {
            let uri = request.uri();
            let raw_path = uri.path();
            let host = uri.host().unwrap_or("");

            // Format can be diarynote-asset://<hash> (where host is <hash> or path is /<hash>)
            let raw_hash = if !host.is_empty() && host != "localhost" {
                host
            } else {
                raw_path.trim_start_matches('/')
            };
            let hash = raw_hash.split('/').next().unwrap_or(raw_hash);

            let is_thumb = uri.query().map(|q| q.contains("thumb=1")).unwrap_or(false);

            if AssetStore::validate_hash(hash).is_err() {
                return tauri::http::Response::builder()
                    .status(tauri::http::StatusCode::BAD_REQUEST)
                    .body(Vec::new())
                    .unwrap();
            }

            let app_paths = match AppPaths::from_app(ctx.app_handle()) {
                Ok(p) => p,
                Err(_) => {
                    return tauri::http::Response::builder()
                        .status(tauri::http::StatusCode::INTERNAL_SERVER_ERROR)
                        .body(Vec::new())
                        .unwrap();
                }
            };

            let store = AssetStore::new(app_paths);
            let file_result = if is_thumb {
                store.get_thumbnail_file(hash)
            } else {
                store.get_asset_file(hash)
            };

            match file_result {
                Ok((path, mime)) => match std::fs::read(&path) {
                    Ok(bytes) => tauri::http::Response::builder()
                        .status(tauri::http::StatusCode::OK)
                        .header("Content-Type", mime)
                        .header("Cache-Control", "public, max-age=31536000, immutable")
                        .body(bytes)
                        .unwrap_or_else(|_| {
                            tauri::http::Response::builder()
                                .status(tauri::http::StatusCode::INTERNAL_SERVER_ERROR)
                                .body(Vec::new())
                                .unwrap()
                        }),
                    Err(_) => tauri::http::Response::builder()
                        .status(tauri::http::StatusCode::INTERNAL_SERVER_ERROR)
                        .body(Vec::new())
                        .unwrap(),
                },
                Err(_) => tauri::http::Response::builder()
                    .status(tauri::http::StatusCode::NOT_FOUND)
                    .body(Vec::new())
                    .unwrap(),
            }
        })
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
            save_asset_from_bytes,
            save_asset_from_path,
            get_asset_info,
            delete_asset,
            vault_hash_security_input,
            vault_verify_security_input,
            vault_unlock,
            vault_lock,
            vault_is_unlocked,
            vault_get_status,
            vault_encrypt_note,
            vault_decrypt_note,
            search_notes,
            index_vault_notes,
            clear_vault_fts_index,
            parse_note_markdown_links,
            get_note_graph_connections,
            get_note_backlinks,
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
            let app_paths = AppPaths::from_app(app.handle())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            let conn = init_sqlite_connection(&app_paths.db_path)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            let conn_arc = Arc::new(Mutex::new(conn));

            let repo = Arc::new(SqliteNoteRepository::from_arc(Arc::clone(&conn_arc)));
            let note_service = NoteService::new(repo);

            let asset_store = Arc::new(AssetStore::new(app_paths));
            let asset_service = AssetService::new(asset_store, Some(Arc::clone(&conn_arc)));

            let vault_service = VaultService::new();
            let search_service = SearchService::new(Arc::clone(&conn_arc));
            let graph_service = GraphService::new();

            let app_state = Arc::new(AppState::new(
                note_service,
                asset_service,
                vault_service,
                search_service,
                graph_service,
            ));

            app.manage(app_state);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
