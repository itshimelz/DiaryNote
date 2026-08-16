use std::path::PathBuf;
use base64::prelude::*;

use crate::models::DroppedImageData;
use crate::utils::detect_image_mime_type;

/// Maximum allowed individual image size for memory safety (50 MB)
const MAX_IMAGE_FILE_SIZE: u64 = 50 * 1024 * 1024;

/// Tauri command to read and process dropped image files natively via Rust.
/// Bypasses webview sandbox restrictions and returns base64 data URLs with clean titles and metadata.
#[tauri::command]
pub fn read_image_files(paths: Vec<String>) -> Result<Vec<DroppedImageData>, String> {
    let mut results = Vec::new();

    for p in paths {
        let clean_path_str = p.trim();
        if clean_path_str.is_empty() {
            continue;
        }

        let path = PathBuf::from(clean_path_str);
        if !path.exists() || !path.is_file() {
            continue;
        }

        // Check file size metadata
        let metadata = match std::fs::metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let file_size = metadata.len();
        if file_size == 0 || file_size > MAX_IMAGE_FILE_SIZE {
            continue;
        }

        // Read file contents
        let bytes = match std::fs::read(&path) {
            Ok(b) => b,
            Err(_) => continue,
        };

        // Determine image MIME type
        let header_sample = &bytes[..std::cmp::min(64, bytes.len())];
        let mime = match detect_image_mime_type(&path, header_sample) {
            Some(m) => m,
            None => continue,
        };

        let filename = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "image.png".to_string());

        let title = path
            .file_stem()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Photo Note".to_string());

        let base64_str = BASE64_STANDARD.encode(&bytes);
        let data_url = format!("data:{};base64,{}", mime, base64_str);

        results.push(DroppedImageData {
            file_path: clean_path_str.to_string(),
            filename,
            title,
            mime_type: mime.to_string(),
            data_url,
            file_size,
        });
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_read_image_files_valid_file() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("diarynote_test_img.png");
        
        // Write valid 1x1 PNG header
        let png_bytes = [
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        ];
        let mut file = std::fs::File::create(&test_file).unwrap();
        file.write_all(&png_bytes).unwrap();

        let res = read_image_files(vec![test_file.to_string_lossy().to_string()]);
        assert!(res.is_ok());
        let list = res.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].mime_type, "image/png");
        assert_eq!(list[0].title, "diarynote_test_img");
        assert!(list[0].data_url.starts_with("data:image/png;base64,"));

        let _ = std::fs::remove_file(test_file);
    }

    #[test]
    fn test_read_image_files_skips_non_images() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("diarynote_test_doc.txt");
        let mut file = std::fs::File::create(&test_file).unwrap();
        file.write_all(b"Hello world").unwrap();

        let res = read_image_files(vec![test_file.to_string_lossy().to_string()]);
        assert!(res.is_ok());
        let list = res.unwrap();
        assert_eq!(list.len(), 0);

        let _ = std::fs::remove_file(test_file);
    }
}
