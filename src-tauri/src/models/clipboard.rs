use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Represents a note's current 2D coordinate on the canvas
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct NotePosition {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

/// Represents the calculated relocated coordinate for a note
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct RelocatedNoteResult {
    pub id: String,
    pub x: f64,
    pub y: f64,
}
