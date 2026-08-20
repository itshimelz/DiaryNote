pub mod commands;
pub mod domain;
pub mod error;
pub mod infrastructure;
pub mod models;
pub mod utils;

pub use error::AppError;

use std::sync::Arc;
use commands::{
    ai_generate_tags, ai_stream_synthesis, ai_test_connection, check_database_integrity,
    clear_vault_fts_index, compute_batch_layout, delete_asset, delete_notes, export_note_to_file,
    export_vault_archive, find_nearest_spatial_note, get_asset_info, get_database_stats, get_note_backlinks,
    get_note_graph_connections, import_vault_archive, index_vault_notes, inspect_vault_archive,
    load_app_state, parse_note_markdown_links, read_image_files, relocate_notes, save_app_settings,
    save_asset_from_bytes, save_asset_from_path, save_canvas_transform, save_export_file,
    save_notes_batch, search_notes, vacuum_database, vault_decrypt_note, vault_encrypt_note,
    vault_get_status, vault_hash_security_input, vault_is_unlocked, vault_lock, vault_unlock,
    vault_verify_security_input, open_external_url,
};
use domain::asset::AssetService;
use domain::graph::GraphService;
use domain::note::NoteService;
use domain::search::SearchService;
use domain::vault::VaultService;
use infrastructure::{init_sqlite_db_pool, AppPaths, AssetStore, SqliteNoteRepository};
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
            let uri_str = uri.to_string();
            let raw_path = uri.path();
            let host = uri.host().unwrap_or("");

            // Format can be:
            // 1. diarynote-asset://<hash> (where host is <hash> or path is /<hash>)
            // 2. diarynote-asset://localhost/<hash>
            // 3. diarynote-asset:///<hash>
            let mut candidate = if !host.is_empty() && host != "localhost" {
                host
            } else {
                raw_path.trim_start_matches('/')
            };

            // Strip query parameters and sub-paths if present in authority
            if let Some(pos) = candidate.find('?') {
                candidate = &candidate[..pos];
            }
            if let Some(pos) = candidate.find('/') {
                candidate = &candidate[..pos];
            }
            let hash = candidate.trim();

            let is_thumb = uri.query().map(|q| q.contains("thumb=1")).unwrap_or(false)
                || uri_str.contains("thumb=1");

            if AssetStore::validate_hash(hash).is_err() {
                return tauri::http::Response::builder()
                    .status(tauri::http::StatusCode::BAD_REQUEST)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap();
            }

            let app_paths = match AppPaths::from_app(ctx.app_handle()) {
                Ok(p) => p,
                Err(_) => {
                    return tauri::http::Response::builder()
                        .status(tauri::http::StatusCode::INTERNAL_SERVER_ERROR)
                        .header("Access-Control-Allow-Origin", "*")
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
                        .header("Access-Control-Allow-Origin", "*")
                        .body(bytes)
                        .unwrap_or_else(|_| {
                            tauri::http::Response::builder()
                                .status(tauri::http::StatusCode::INTERNAL_SERVER_ERROR)
                                .header("Access-Control-Allow-Origin", "*")
                                .body(Vec::new())
                                .unwrap()
                        }),
                    Err(_) => tauri::http::Response::builder()
                        .status(tauri::http::StatusCode::INTERNAL_SERVER_ERROR)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(Vec::new())
                        .unwrap(),
                },
                Err(_) => tauri::http::Response::builder()
                    .status(tauri::http::StatusCode::NOT_FOUND)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(Vec::new())
                    .unwrap(),
            }
        })
        .invoke_handler(tauri::generate_handler![
            save_export_file,
            export_note_to_file,
            compute_batch_layout,
            find_nearest_spatial_note,
            read_image_files,
            relocate_notes,
            load_app_state,
            save_notes_batch,
            delete_notes,
            save_canvas_transform,
            save_app_settings,
            check_database_integrity,
            get_database_stats,
            vacuum_database,
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
            export_vault_archive,
            inspect_vault_archive,
            import_vault_archive,
            ai_test_connection,
            ai_stream_synthesis,
            ai_generate_tags,
            open_external_url,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Resolve platform-aware paths and initialize segregated SQLite DbPool
            let app_paths = AppPaths::from_app(app.handle())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            let db_pool = init_sqlite_db_pool(&app_paths.db_path)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

            let repo = Arc::new(SqliteNoteRepository::from_pool(db_pool.clone()));
            let note_service = Arc::new(NoteService::new(repo));

            let asset_store = Arc::new(AssetStore::new(app_paths.clone()));
            let asset_service = Arc::new(AssetService::new(asset_store, Some(db_pool.writer_arc())));

            let vault_service = Arc::new(VaultService::new());
            let search_service = Arc::new(SearchService::new(db_pool.reader_arc()));
            let graph_service = Arc::new(GraphService::new());

            // Direct state injection into Tauri
            app.manage(note_service);
            app.manage(asset_service);
            app.manage(vault_service);
            app.manage(search_service);
            app.manage(graph_service);
            app.manage(db_pool);
            app.manage(app_paths);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
