use std::sync::Arc;
use tauri::State;

use crate::domain::asset::{AssetInfo, AssetService};
use crate::error::AppError;

#[tauri::command]
pub fn save_asset_from_bytes(
    asset_service: State<'_, Arc<AssetService>>,
    data: Vec<u8>,
    filename: Option<String>,
) -> Result<AssetInfo, AppError> {
    Ok(asset_service.save_asset_from_bytes(&data, filename.as_deref())?)
}

#[tauri::command]
pub fn save_asset_from_path(
    asset_service: State<'_, Arc<AssetService>>,
    path: String,
) -> Result<AssetInfo, AppError> {
    Ok(asset_service.save_asset_from_path(std::path::Path::new(&path))?)
}

#[tauri::command]
pub fn get_asset_info(
    asset_service: State<'_, Arc<AssetService>>,
    hash: String,
) -> Result<AssetInfo, AppError> {
    Ok(asset_service.get_asset_info(&hash)?)
}

#[tauri::command]
pub fn delete_asset(
    asset_service: State<'_, Arc<AssetService>>,
    hash: String,
) -> Result<(), AppError> {
    Ok(asset_service.delete_asset(&hash)?)
}
