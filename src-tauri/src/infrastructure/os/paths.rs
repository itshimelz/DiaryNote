use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone)]
pub struct AppPaths {
    pub app_data_dir: PathBuf,
    pub db_path: PathBuf,
    pub assets_dir: PathBuf,
    pub originals_dir: PathBuf,
    pub thumbnails_dir: PathBuf,
    pub backups_dir: PathBuf,
    pub temp_dir: PathBuf,
}

impl AppPaths {
    /// Creates AppPaths from a given root base directory and ensures all subdirectories exist.
    pub fn from_root(root: PathBuf) -> std::io::Result<Self> {
        let db_path = root.join("diarynote.db");
        let assets_dir = root.join("assets");
        let originals_dir = assets_dir.join("originals");
        let thumbnails_dir = assets_dir.join("thumbnails");
        let backups_dir = root.join("backups");
        let temp_dir = root.join("temp");

        std::fs::create_dir_all(&root)?;
        std::fs::create_dir_all(&originals_dir)?;
        std::fs::create_dir_all(&thumbnails_dir)?;
        std::fs::create_dir_all(&backups_dir)?;
        std::fs::create_dir_all(&temp_dir)?;

        Ok(Self {
            app_data_dir: root,
            db_path,
            assets_dir,
            originals_dir,
            thumbnails_dir,
            backups_dir,
            temp_dir,
        })
    }

    /// Resolves the platform-aware AppPaths from Tauri's AppHandle.
    pub fn from_app(app: &AppHandle) -> std::io::Result<Self> {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::NotFound, e.to_string()))?;
        Self::from_root(app_data)
    }

    /// Helper to resolve a specific asset hash path inside originals_dir.
    pub fn resolve_asset_path(&self, hash: &str, ext: Option<&str>) -> PathBuf {
        let filename = match ext {
            Some(e) if !e.is_empty() => format!("{}.{}", hash, e.trim_start_matches('.')),
            _ => hash.to_string(),
        };
        self.originals_dir.join(filename)
    }

    /// Helper to resolve a thumbnail path.
    pub fn resolve_thumbnail_path(&self, hash: &str) -> PathBuf {
        self.thumbnails_dir.join(format!("{}_thumb.webp", hash))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_paths_creation_and_resolution() {
        let temp_root = std::env::temp_dir().join(format!("diarynote_test_{}", std::process::id()));
        let paths = AppPaths::from_root(temp_root.clone()).expect("Failed to initialize AppPaths");

        assert!(paths.app_data_dir.exists());
        assert!(paths.originals_dir.exists());
        assert!(paths.thumbnails_dir.exists());
        assert!(paths.backups_dir.exists());
        assert!(paths.temp_dir.exists());

        let asset_file = paths.resolve_asset_path("abc123hash", Some("png"));
        assert!(asset_file.ends_with("abc123hash.png"));
        assert!(asset_file.starts_with(&paths.originals_dir));

        let thumb_file = paths.resolve_thumbnail_path("abc123hash");
        assert!(thumb_file.ends_with("abc123hash_thumb.webp"));

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_root);
    }
}
