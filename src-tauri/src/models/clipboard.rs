use serde::{Deserialize, Serialize};

/// Represents a note's current 2D coordinate on the canvas
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct NotePosition {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

/// Represents the calculated relocated coordinate for a note
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct RelocatedNoteResult {
    pub id: String,
    pub x: f64,
    pub y: f64,
}
