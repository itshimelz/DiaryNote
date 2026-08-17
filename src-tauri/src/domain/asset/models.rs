use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AssetInfo {
    pub hash: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub created_at: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub aspect_ratio: Option<f64>,
    pub extension: Option<String>,
    pub asset_uri: String,
    pub thumbnail_uri: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Asset {
    pub hash: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub created_at: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub aspect_ratio: Option<f64>,
    pub extension: Option<String>,
}

impl Asset {
    pub fn to_info(&self) -> AssetInfo {
        AssetInfo {
            hash: self.hash.clone(),
            mime_type: self.mime_type.clone(),
            size_bytes: self.size_bytes,
            created_at: self.created_at.clone(),
            width: self.width,
            height: self.height,
            aspect_ratio: self.aspect_ratio,
            extension: self.extension.clone(),
            asset_uri: format!("diarynote-asset://{}", self.hash),
            thumbnail_uri: Some(format!("diarynote-asset://{}?thumb=1", self.hash)),
        }
    }
}
