use std::sync::Arc;
use tauri::State;

use crate::commands::AppState;
use crate::domain::asset::AssetInfo;

#[tauri::command]
pub fn save_asset_from_bytes(
    state: State<Arc<AppState>>,
    data: Vec<u8>,
    filename: Option<String>,
) -> Result<AssetInfo, String> {
    state
        .asset_service
        .save_asset_from_bytes(&data, filename.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_asset_from_path(
    state: State<Arc<AppState>>,
    path: String,
) -> Result<AssetInfo, String> {
    state
        .asset_service
        .save_asset_from_path(std::path::Path::new(&path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_asset_info(
    state: State<Arc<AppState>>,
    hash: String,
) -> Result<AssetInfo, String> {
    state
        .asset_service
        .get_asset_info(&hash)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_asset(
    state: State<Arc<AppState>>,
    hash: String,
) -> Result<(), String> {
    state
        .asset_service
        .delete_asset(&hash)
        .map_err(|e| e.to_string())
}
