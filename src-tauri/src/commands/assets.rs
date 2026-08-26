use std::sync::Arc;
use base64::prelude::*;
use serde::Serialize;
use tauri::State;

use crate::domain::asset::{AssetInfo, AssetService};
use crate::error::AppError;
use crate::infrastructure::sqlite::DbPool;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigratedImagePatch {
    id: String,
    image_url: String,
    updated_at: String,
}

fn decode_inline_image(data_url: &str) -> Option<(Vec<u8>, String)> {
    let (header, encoded) = data_url.split_once(',')?;
    let bytes = BASE64_STANDARD.decode(encoded).ok()?;
    let extension = header
        .strip_prefix("data:image/")?
        .split(';')
        .next()
        .unwrap_or("png")
        .replace("jpeg", "jpg");
    Some((bytes, extension))
}

#[tauri::command]
pub async fn save_asset_from_bytes(
    asset_service: State<'_, Arc<AssetService>>,
    data: Vec<u8>,
    filename: Option<String>,
) -> Result<AssetInfo, AppError> {
    Ok(asset_service.save_asset_from_bytes(&data, filename.as_deref())?)
}

#[tauri::command]
pub async fn save_asset_from_path(
    asset_service: State<'_, Arc<AssetService>>,
    path: String,
) -> Result<AssetInfo, AppError> {
    Ok(asset_service.save_asset_from_path(std::path::Path::new(&path))?)
}

#[tauri::command]
pub async fn get_asset_info(
    asset_service: State<'_, Arc<AssetService>>,
    hash: String,
) -> Result<AssetInfo, AppError> {
    Ok(asset_service.get_asset_info(&hash)?)
}

#[tauri::command]
pub async fn delete_asset(
    asset_service: State<'_, Arc<AssetService>>,
    hash: String,
) -> Result<(), AppError> {
    Ok(asset_service.delete_asset(&hash)?)
}

#[tauri::command]
pub async fn migrate_inline_images(
    asset_service: State<'_, Arc<AssetService>>,
    db_pool: State<'_, DbPool>,
) -> Result<Vec<MigratedImagePatch>, AppError> {
    let ids: Vec<String> = {
        let conn = db_pool.reader().map_err(AppError::Database)?;
        let mut stmt = conn.prepare("SELECT id FROM notes WHERE image_url LIKE 'data:image/%;base64,%'")?;
        let ids = stmt.query_map([], |row| row.get(0))?.flatten().collect();
        ids
    };
    let mut patches = Vec::new();

    for id in ids {
        let row: Option<(String, String)> = {
            let conn = db_pool.reader().map_err(AppError::Database)?;
            conn.query_row(
                "SELECT image_url, updated_at FROM notes WHERE id = ?1",
                (&id,),
                |row| Ok((row.get(0)?, row.get(1)?)),
            ).ok()
        };
        let Some((data_url, updated_at)) = row else { continue };
        let Some((bytes, extension)) = decode_inline_image(&data_url) else { continue };
        let Ok(asset) = asset_service.save_asset_from_bytes(&bytes, Some(&format!("migrated.{extension}"))) else {
            continue;
        };
        let changed = {
            let conn = db_pool.writer().map_err(AppError::Database)?;
            conn.execute(
                "UPDATE notes SET image_url = ?1 WHERE id = ?2 AND image_url = ?3 AND updated_at = ?4",
                (&asset.asset_uri, &id, &data_url, &updated_at),
            )?
        };
        if changed == 1 {
            let conn = db_pool.writer().map_err(AppError::Database)?;
            conn.execute(
                "INSERT OR REPLACE INTO note_assets(note_id, asset_hash) VALUES (?1, ?2)",
                (&id, &asset.hash),
            )?;
            patches.push(MigratedImagePatch { id, image_url: asset.asset_uri, updated_at });
        }
    }

    Ok(patches)
}

#[tauri::command]
pub async fn sweep_orphaned_assets(
    asset_service: State<'_, Arc<AssetService>>,
    db_pool: State<'_, DbPool>,
) -> Result<usize, AppError> {
    let cutoff = (chrono::Utc::now() - chrono::Duration::days(7)).to_rfc3339();
    let hashes: Vec<String> = {
        let conn = db_pool.writer().map_err(AppError::Database)?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE assets SET orphaned_at = COALESCE(orphaned_at, ?1)
             WHERE NOT EXISTS (SELECT 1 FROM note_assets WHERE asset_hash = assets.hash)",
            (&now,),
        )?;
        conn.execute(
            "UPDATE assets SET orphaned_at = NULL
             WHERE EXISTS (SELECT 1 FROM note_assets WHERE asset_hash = assets.hash)",
            [],
        )?;
        let mut stmt = conn.prepare(
            "SELECT hash FROM assets WHERE orphaned_at IS NOT NULL AND orphaned_at <= ?1
             AND NOT EXISTS (SELECT 1 FROM note_assets WHERE asset_hash = assets.hash)",
        )?;
        let hashes = stmt.query_map((&cutoff,), |row| row.get(0))?.flatten().collect();
        hashes
    };

    let mut removed = 0;
    for hash in hashes {
        if asset_service.delete_asset(&hash).is_ok() {
            removed += 1;
        }
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::decode_inline_image;

    #[test]
    fn decodes_inline_image_and_normalizes_jpeg_extension() {
        let (bytes, extension) = decode_inline_image("data:image/jpeg;base64,aGVsbG8=").unwrap();
        assert_eq!(bytes, b"hello");
        assert_eq!(extension, "jpg");
        assert!(decode_inline_image("not-an-image").is_none());
    }
}
