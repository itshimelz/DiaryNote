use std::path::Path;

/// Detects the image MIME type from initial header bytes with extension fallback
pub fn detect_image_mime_type(path: &Path, header: &[u8]) -> Option<&'static str> {
    // 1. Check Magic Bytes (headers)
    if header.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Some("image/png");
    }
    if header.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some("image/jpeg");
    }
    if header.starts_with(b"RIFF") && header.get(8..12) == Some(b"WEBP") {
        return Some("image/webp");
    }
    if header.starts_with(b"GIF87a") || header.starts_with(b"GIF89a") {
        return Some("image/gif");
    }
    if header.starts_with(b"BM") {
        return Some("image/bmp");
    }
    if header.starts_with(b"<svg")
        || header.starts_with(b"<?xml")
        || (header.len() >= 5 && std::str::from_utf8(header).map(|s| s.contains("<svg")).unwrap_or(false))
    {
        return Some("image/svg+xml");
    }

    // 2. Extension-based fallback
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        match ext.to_lowercase().as_str() {
            "png" => Some("image/png"),
            "jpg" | "jpeg" | "jpe" | "jfif" => Some("image/jpeg"),
            "webp" => Some("image/webp"),
            "gif" => Some("image/gif"),
            "svg" | "svgz" => Some("image/svg+xml"),
            "bmp" => Some("image/bmp"),
            "avif" => Some("image/avif"),
            "ico" => Some("image/x-icon"),
            "tif" | "tiff" => Some("image/tiff"),
            _ => None,
        }
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_png_magic_bytes() {
        let header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR";
        assert_eq!(detect_image_mime_type(Path::new("test"), header), Some("image/png"));
    }

    #[test]
    fn test_detect_jpeg_magic_bytes() {
        let header = &[0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        assert_eq!(detect_image_mime_type(Path::new("test"), header), Some("image/jpeg"));
    }

    #[test]
    fn test_detect_webp_magic_bytes() {
        let header = b"RIFF\x00\x00\x00\x00WEBPVP8 ";
        assert_eq!(detect_image_mime_type(Path::new("test"), header), Some("image/webp"));
    }

    #[test]
    fn test_detect_svg_header() {
        let header = b"<svg xmlns=\"http://www.w3.org/2000/svg\">";
        assert_eq!(detect_image_mime_type(Path::new("test"), header), Some("image/svg+xml"));
    }

    #[test]
    fn test_extension_fallback() {
        assert_eq!(detect_image_mime_type(Path::new("photo.avif"), b""), Some("image/avif"));
        assert_eq!(detect_image_mime_type(Path::new("photo.ico"), b""), Some("image/x-icon"));
        assert_eq!(detect_image_mime_type(Path::new("notes.txt"), b""), None);
    }
}
