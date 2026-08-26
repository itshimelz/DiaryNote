use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::domain::asset::Asset;
use crate::infrastructure::os::AppPaths;
use crate::utils::mime::detect_image_mime_type;

#[derive(Debug, Error)]
pub enum AssetError {
    #[error("Invalid asset hash: {0}")]
    InvalidHash(String),

    #[error("Asset not found: {0}")]
    NotFound(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image processing error: {0}")]
    ImageProcessing(String),
}

#[derive(Debug, Clone)]
pub struct AssetStore {
    paths: AppPaths,
}

impl AssetStore {
    pub const MAX_ASSET_SIZE: usize = 50 * 1024 * 1024;

    pub fn new(paths: AppPaths) -> Self {
        Self { paths }
    }

    /// Validates that a hash string is strictly 64 hex characters and contains no path traversal.
    pub fn validate_hash(hash: &str) -> Result<(), AssetError> {
        let hash = hash.trim();
        if hash.len() != 64 {
            return Err(AssetError::InvalidHash(format!(
                "Hash must be 64 hexadecimal characters, got length {}",
                hash.len()
            )));
        }

        if !hash.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(AssetError::InvalidHash(
                "Hash contains invalid non-hexadecimal characters".to_string(),
            ));
        }

        if hash.contains('/') || hash.contains('\\') || hash.contains("..") || hash.contains('\0') {
            return Err(AssetError::InvalidHash(
                "Path traversal characters detected in asset hash".to_string(),
            ));
        }

        Ok(())
    }

    /// Calculates SHA-256 hash of byte slice.
    pub fn calculate_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex::encode(hasher.finalize())
    }

    /// Saves asset bytes into the content-addressable store.
    /// Deduplicates if the hash already exists on disk.
    pub fn save_asset(&self, data: &[u8], filename_hint: Option<&str>) -> Result<Asset, AssetError> {
        if data.is_empty() || data.len() > Self::MAX_ASSET_SIZE {
            return Err(AssetError::ImageProcessing(format!(
                "Image must be between 1 byte and {} MB",
                Self::MAX_ASSET_SIZE / 1024 / 1024
            )));
        }
        let hash = Self::calculate_hash(data);
        Self::validate_hash(&hash)?;

        let hint_path = Path::new(filename_hint.unwrap_or(""));
        let mime_type = detect_image_mime_type(hint_path, data)
            .unwrap_or("application/octet-stream")
            .to_string();

        let ext = match mime_type.as_str() {
            "image/png" => "png",
            "image/jpeg" => "jpg",
            "image/webp" => "webp",
            "image/gif" => "gif",
            "image/svg+xml" => "svg",
            "image/bmp" => "bmp",
            "image/avif" => "avif",
            "image/x-icon" => "ico",
            _ => hint_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("bin"),
        };

        let target_filename = format!("{}.{}", hash, ext);
        let target_path = self.paths.originals_dir.join(&target_filename);
        let thumb_path = self.paths.resolve_thumbnail_path(&hash);
        let display_path = self.paths.resolve_display_path(&hash);

        // Deduplication check: if file already exists, extract dimensions and return existing asset
        if target_path.exists() {
            let (width, height, aspect_ratio) = self.inspect_image_dimensions(&target_path, data);
            if !display_path.exists() || !thumb_path.exists() {
                self.generate_derivatives(data, &thumb_path, &display_path);
            }
            return Ok(Asset {
                hash,
                mime_type,
                size_bytes: data.len() as u64,
                created_at: chrono::Utc::now().to_rfc3339(),
                width,
                height,
                aspect_ratio,
                extension: Some(ext.to_string()),
            });
        }

        // Atomic staging pipeline:
        // 1. Write to temp directory
        let temp_filename = format!("stage_{}_{}", hash, std::process::id());
        let temp_path = self.paths.temp_dir.join(temp_filename);

        let write_res = (|| -> Result<(), std::io::Error> {
            let mut file = File::create(&temp_path)?;
            file.write_all(data)?;
            file.flush()?;
            Ok(())
        })();

        if let Err(e) = write_res {
            let _ = fs::remove_file(&temp_path);
            return Err(AssetError::Io(e));
        }

        // 2. Generate thumbnail if image decoding succeeds
        let (width, height, aspect_ratio) =
            self.generate_derivatives_and_dimensions(data, &thumb_path, &display_path);

        // 3. Atomically move staged file to originals_dir
        if let Err(_e) = fs::rename(&temp_path, &target_path) {
            // Fallback for cross-device moves: copy + delete
            if let Err(copy_err) = fs::copy(&temp_path, &target_path) {
                let _ = fs::remove_file(&temp_path);
                let _ = fs::remove_file(&thumb_path);
                return Err(AssetError::Io(copy_err));
            }
            let _ = fs::remove_file(&temp_path);
        }

        Ok(Asset {
            hash,
            mime_type,
            size_bytes: data.len() as u64,
            created_at: chrono::Utc::now().to_rfc3339(),
            width,
            height,
            aspect_ratio,
            extension: Some(ext.to_string()),
        })
    }

    /// Resolves the filesystem path for a given asset hash.
    pub fn get_asset_file(&self, hash: &str) -> Result<(PathBuf, String), AssetError> {
        Self::validate_hash(hash)?;

        // Direct probe of the extensions save_asset can emit: a handful of stat calls instead
        // of listing originals_dir, which cost O(stored assets) on every image request.
        for ext in Self::KNOWN_EXTENSIONS {
            let candidate = self.paths.originals_dir.join(format!("{}.{}", hash, ext));
            if candidate.is_file() {
                let mime = Self::sniff_mime(&candidate);
                return Ok((candidate, mime));
            }
        }

        // Fallback for assets stored with an extension taken from a filename hint.
        if let Ok(entries) = fs::read_dir(&self.paths.originals_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if file_name.starts_with(hash) {
                        let mime = Self::sniff_mime(&path);
                        return Ok((path, mime));
                    }
                }
            }
        }

        Err(AssetError::NotFound(hash.to_string()))
    }

    /// Extensions `save_asset` writes for every MIME type it recognizes.
    const KNOWN_EXTENSIONS: &'static [&'static str] =
        &["png", "jpg", "webp", "gif", "svg", "bmp", "avif", "ico"];

    fn sniff_mime(path: &Path) -> String {
        let mut header = [0u8; 32];
        let _ = File::open(path).and_then(|mut f| f.read(&mut header));
        detect_image_mime_type(path, &header)
            .unwrap_or("application/octet-stream")
            .to_string()
    }

    /// Resolves thumbnail path if available, or falls back to original asset path.
    pub fn get_thumbnail_file(&self, hash: &str) -> Result<(PathBuf, String), AssetError> {
        Self::validate_hash(hash)?;

        let thumb_path = self.paths.resolve_thumbnail_path(hash);
        if thumb_path.exists() {
            return Ok((thumb_path, "image/webp".to_string()));
        }

        self.get_asset_file(hash)
    }

    pub fn get_display_file(&self, hash: &str) -> Result<(PathBuf, String), AssetError> {
        Self::validate_hash(hash)?;
        let display_path = self.paths.resolve_display_path(hash);
        if display_path.exists() {
            return Ok((display_path, "image/webp".to_string()));
        }
        self.get_asset_file(hash)
    }

    /// Deletes the original asset and its thumbnail.
    pub fn delete_asset(&self, hash: &str) -> Result<(), AssetError> {
        Self::validate_hash(hash)?;

        if let Ok((path, _)) = self.get_asset_file(hash) {
            let _ = fs::remove_file(path);
        }

        let thumb_path = self.paths.resolve_thumbnail_path(hash);
        if thumb_path.exists() {
            let _ = fs::remove_file(thumb_path);
        }

        let display_path = self.paths.resolve_display_path(hash);
        if display_path.exists() {
            let _ = fs::remove_file(display_path);
        }

        Ok(())
    }

    fn generate_derivatives_and_dimensions(
        &self,
        data: &[u8],
        thumb_path: &Path,
        display_path: &Path,
    ) -> (Option<u32>, Option<u32>, Option<f64>) {
        if let Ok(img) = image::load_from_memory(data) {
            let width = img.width();
            let height = img.height();
            let aspect_ratio = if height > 0 {
                Some(width as f64 / height as f64)
            } else {
                None
            };

            // Generate a max 400x400 thumbnail
            let thumb = img.thumbnail(400, 400);
            if let Ok(mut thumb_file) = File::create(thumb_path) {
                // Save thumbnail as PNG / WebP
                let _ = thumb.write_to(&mut thumb_file, image::ImageFormat::WebP);
            }

            let display = img.thumbnail(1440, 1440);
            if let Ok(mut display_file) = File::create(display_path) {
                let _ = display.write_to(&mut display_file, image::ImageFormat::WebP);
            }

            (Some(width), Some(height), aspect_ratio)
        } else {
            (None, None, None)
        }
    }


    fn generate_derivatives(&self, data: &[u8], thumb_path: &Path, display_path: &Path) {
        let _ = self.generate_derivatives_and_dimensions(data, thumb_path, display_path);
    }

    fn inspect_image_dimensions(
        &self,
        _path: &Path,
        data: &[u8],
    ) -> (Option<u32>, Option<u32>, Option<f64>) {
        if let Ok(img) = image::load_from_memory(data) {
            let width = img.width();
            let height = img.height();
            let aspect_ratio = if height > 0 {
                Some(width as f64 / height as f64)
            } else {
                None
            };
            (Some(width), Some(height), aspect_ratio)
        } else {
            (None, None, None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_ID: AtomicU64 = AtomicU64::new(0);

    fn create_test_store() -> (AssetStore, PathBuf) {
        let temp_root = std::env::temp_dir().join(format!(
            "diarynote_asset_test_{}_{}",
            std::process::id(),
            TEST_ID.fetch_add(1, Ordering::Relaxed)
        ));
        let paths = AppPaths::from_root(temp_root.clone()).expect("Failed to init AppPaths");
        (AssetStore::new(paths), temp_root)
    }

    #[test]
    fn test_validate_hash_rules() {
        // Valid 64 hex chars
        assert!(AssetStore::validate_hash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855").is_ok());

        // Invalid length
        assert!(AssetStore::validate_hash("abc123").is_err());

        // Path traversal attempts
        assert!(AssetStore::validate_hash("../../../../etc/passwd").is_err());
        assert!(AssetStore::validate_hash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85/").is_err());
        assert!(AssetStore::validate_hash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85\\").is_err());
        assert!(AssetStore::validate_hash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8zz").is_err());
    }

    #[test]
    fn test_save_and_deduplicate_asset() {
        let (store, root) = create_test_store();
        let test_data = b"fake-image-png-content-12345".as_slice();

        let asset1 = store.save_asset(test_data, Some("photo.png")).expect("Failed to save asset");
        assert_eq!(asset1.size_bytes, test_data.len() as u64);
        assert_eq!(asset1.hash.len(), 64);

        // Verify file exists in originals_dir
        let (resolved_path, _) = store.get_asset_file(&asset1.hash).expect("Asset should exist");
        assert!(resolved_path.exists());

        // Save exact same data again -> deduplicated to same hash
        let asset2 = store.save_asset(test_data, Some("photo.png")).expect("Failed second save");
        assert_eq!(asset1.hash, asset2.hash);

        // Cleanup
        let _ = store.delete_asset(&asset1.hash);
        assert!(store.get_asset_file(&asset1.hash).is_err());
        let _ = fs::remove_dir_all(&root);
    }

    /// The fast extension probe must resolve the same file the directory-scan fallback would.
    #[test]
    fn test_get_asset_file_resolves_probe_and_fallback() {
        let (store, root) = create_test_store();
        let png = store.save_asset(b"png-bytes".as_slice(), Some("a.png")).unwrap();
        let (probed, _) = store.get_asset_file(&png.hash).expect("probe hit");
        assert_eq!(probed.extension().unwrap(), "png");

        // Unknown MIME keeps the hint extension, so only the fallback scan can find it.
        let odd = store.save_asset(b"raw-bytes".as_slice(), Some("scan.tiff")).unwrap();
        let (scanned, _) = store.get_asset_file(&odd.hash).expect("fallback hit");
        assert_eq!(scanned.extension().unwrap(), "tiff");

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn test_image_save_creates_display_derivatives() {
        let (store, root) = create_test_store();
        let image = image::DynamicImage::new_rgba8(1600, 900);
        let mut bytes = std::io::Cursor::new(Vec::new());
        image.write_to(&mut bytes, image::ImageFormat::Png).unwrap();

        let asset = store.save_asset(bytes.get_ref(), Some("photo.png")).unwrap();
        assert!(store.paths.resolve_thumbnail_path(&asset.hash).is_file());
        assert!(store.paths.resolve_display_path(&asset.hash).is_file());

        let _ = fs::remove_dir_all(&root);
    }
}
