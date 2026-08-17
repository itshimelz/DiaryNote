use serde::{Deserialize, Serialize};

/// Data representation of an image file read and processed natively by Rust
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct DroppedImageData {
    /// Full filesystem path to the source image file
    pub file_path: String,
    /// Exact filename with extension (e.g., "vacation.png")
    pub filename: String,
    /// Clean title derived from the file stem (e.g., "vacation")
    pub title: String,
    /// MIME type string (e.g., "image/png", "image/jpeg", "image/webp")
    pub mime_type: String,
    /// Base64 data URL string ready to be assigned directly to an <img> src or storage
    pub data_url: String,
    /// Total file size in bytes
    pub file_size: u64,
    /// Image width in pixels
    pub width: Option<u32>,
    /// Image height in pixels
    pub height: Option<u32>,
    /// Calculated aspect ratio (width / height)
    pub aspect_ratio: Option<f64>,
}
