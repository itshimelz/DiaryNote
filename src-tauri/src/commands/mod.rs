pub mod ai;
pub mod assets;
pub mod backup;
pub mod clipboard;
pub mod export;
pub mod graph;
pub mod image;
pub mod layout;
pub mod search;
pub mod storage;
pub mod vault;

pub use ai::{ai_generate_tags, ai_stream_synthesis, ai_test_connection};
pub use assets::{delete_asset, get_asset_info, save_asset_from_bytes, save_asset_from_path};
pub use backup::{export_vault_archive, import_vault_archive, inspect_vault_archive};
pub use clipboard::relocate_notes;
pub use export::{export_note_to_file, save_export_file};
pub use graph::{get_note_backlinks, get_note_graph_connections, parse_note_markdown_links};
pub use image::read_image_files;
pub use layout::compute_batch_layout;
pub use search::{clear_vault_fts_index, index_vault_notes, search_notes};
pub use storage::{
    check_database_integrity, delete_notes, get_database_stats, load_app_state, save_app_settings,
    save_canvas_transform, save_notes_batch, vacuum_database,
};
pub use vault::{
    vault_decrypt_note, vault_encrypt_note, vault_get_status, vault_hash_security_input,
    vault_is_unlocked, vault_lock, vault_unlock, vault_verify_security_input,
};


