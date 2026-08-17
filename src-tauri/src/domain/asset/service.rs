use std::path::Path;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;

use crate::domain::asset::{Asset, AssetInfo};
use crate::infrastructure::filesystem::{AssetError, AssetStore};

#[derive(Clone)]
pub struct AssetService {
    store: Arc<AssetStore>,
    db_conn: Option<Arc<Mutex<Connection>>>,
}

impl AssetService {
    pub fn new(store: Arc<AssetStore>, db_conn: Option<Arc<Mutex<Connection>>>) -> Self {
        Self { store, db_conn }
    }

    pub fn save_asset_from_bytes(
        &self,
        data: &[u8],
        filename: Option<&str>,
    ) -> Result<AssetInfo, AssetError> {
        let asset = self.store.save_asset(data, filename)?;
        self.record_asset_in_db(&asset)?;
        Ok(asset.to_info())
    }

    pub fn save_asset_from_path(&self, path: &Path) -> Result<AssetInfo, AssetError> {
        let data = std::fs::read(path).map_err(AssetError::Io)?;
        let filename = path.file_name().and_then(|n| n.to_str());
        self.save_asset_from_bytes(data.as_slice(), filename)
    }

    pub fn get_asset_info(&self, hash: &str) -> Result<AssetInfo, AssetError> {
        AssetStore::validate_hash(hash)?;
        let (file_path, mime_type) = self.store.get_asset_file(hash)?;
        let metadata = std::fs::metadata(&file_path).map_err(AssetError::Io)?;

        let asset = Asset {
            hash: hash.to_string(),
            mime_type,
            size_bytes: metadata.len(),
            created_at: chrono::Utc::now().to_rfc3339(),
            width: None,
            height: None,
            aspect_ratio: None,
            extension: file_path.extension().and_then(|e| e.to_str()).map(|s| s.to_string()),
        };

        Ok(asset.to_info())
    }

    pub fn delete_asset(&self, hash: &str) -> Result<(), AssetError> {
        self.store.delete_asset(hash)?;

        if let Some(conn_mutex) = &self.db_conn {
            if let Ok(conn) = conn_mutex.lock() {
                let _ = conn.execute(
                    "DELETE FROM assets WHERE hash = ?1",
                    (hash,),
                );
            }
        }

        Ok(())
    }

    pub fn get_asset_store(&self) -> &AssetStore {
        &self.store
    }

    fn record_asset_in_db(&self, asset: &Asset) -> Result<(), AssetError> {
        if let Some(conn_mutex) = &self.db_conn {
            let conn = conn_mutex.lock().map_err(|e| {
                AssetError::Io(std::io::Error::other(format!("Database lock error: {}", e)))
            })?;

            let _ = conn.execute(
                "INSERT OR IGNORE INTO assets (hash, mime_type, size_bytes, created_at) VALUES (?1, ?2, ?3, ?4)",
                (
                    &asset.hash,
                    &asset.mime_type,
                    asset.size_bytes as i64,
                    &asset.created_at,
                ),
            );
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::os::AppPaths;

    fn create_test_service() -> (AssetService, std::path::PathBuf) {
        let temp_root = std::env::temp_dir().join(format!("diarynote_asset_svc_test_{}", std::process::id()));
        let paths = AppPaths::from_root(temp_root.clone()).expect("Failed to init AppPaths");
        let store = Arc::new(AssetStore::new(paths));
        (AssetService::new(store, None), temp_root)
    }

    #[test]
    fn test_asset_service_lifecycle() {
        let (service, root) = create_test_service();
        let test_bytes = b"testing-asset-service-123456";

        let info = service
            .save_asset_from_bytes(test_bytes.as_slice(), Some("test.png"))
            .expect("Failed to save bytes");

        assert_eq!(info.size_bytes, test_bytes.len() as u64);
        assert_eq!(info.asset_uri, format!("diarynote-asset://{}", info.hash));

        let retrieved = service.get_asset_info(&info.hash).expect("Failed to get asset info");
        assert_eq!(retrieved.hash, info.hash);

        service.delete_asset(&info.hash).expect("Failed to delete");
        assert!(service.get_asset_info(&info.hash).is_err());

        let _ = std::fs::remove_dir_all(&root);
    }
}
