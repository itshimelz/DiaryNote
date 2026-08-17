use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_timestamp: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_timestamp: Option<i64>,
    #[serde(default = "default_font_family")]
    pub font_family: String,
    #[serde(default = "default_font_size")]
    pub font_size: String,
    #[serde(default = "default_paper_theme")]
    pub paper_theme: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_pinned: Option<bool>,
    #[serde(default = "default_z_index")]
    pub z_index: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub embedding: Option<Vec<f32>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_locked: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entry_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_daily_entry: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mood: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_aspect_ratio: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frame_style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pin_style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation: Option<f64>,
}

fn default_font_family() -> String {
    "sans".to_string()
}

fn default_font_size() -> String {
    "md".to_string()
}

fn default_paper_theme() -> String {
    "white".to_string()
}

fn default_z_index() -> i32 {
    1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_note_camel_case_roundtrip() {
        let json_data = r##"{
            "id": "note-123",
            "title": "My Note",
            "content": "Hello world",
            "x": 100.5,
            "y": 200.0,
            "width": 380.0,
            "height": 340.0,
            "createdAt": "2026-08-17T00:00:00Z",
            "updatedAt": "2026-08-17T00:00:00Z",
            "createdTimestamp": 1786924800000,
            "updatedTimestamp": 1786924800000,
            "fontFamily": "sans",
            "fontSize": "md",
            "paperTheme": "cream",
            "isPinned": true,
            "zIndex": 5,
            "tags": ["#journal", "#todo"],
            "isLocked": false
        }"##;

        let note: Note = serde_json::from_str(json_data).expect("Failed to deserialize note");
        assert_eq!(note.id, "note-123");
        assert_eq!(note.title, "My Note");
        assert_eq!(note.paper_theme, "cream");
        assert_eq!(note.is_pinned, Some(true));
        assert_eq!(note.tags.as_ref().unwrap().len(), 2);

        let serialized = serde_json::to_string(&note).expect("Failed to serialize note");
        assert!(serialized.contains("\"paperTheme\":\"cream\""));
        assert!(serialized.contains("\"isPinned\":true"));
    }
}
