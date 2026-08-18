use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Data representation of an image file read and processed natively by Rust
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
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
    #[ts(type = "number")]
    pub file_size: u64,
    /// Image width in pixels
    pub width: Option<u32>,
    /// Image height in pixels
    pub height: Option<u32>,
    /// Calculated aspect ratio (width / height)
    pub aspect_ratio: Option<f64>,
}
