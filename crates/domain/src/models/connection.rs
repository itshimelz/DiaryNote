use crate::error::DomainError;
use crate::models::note::NoteId;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct EdgeId(pub Uuid);

impl EdgeId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for EdgeId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for EdgeId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for EdgeId {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(EdgeId)
            .map_err(|e| DomainError::Validation(format!("Invalid UUID for EdgeId: {e}")))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum EdgeStyle {
    #[default]
    Solid,
    Dashed,
    Dotted,
}

/// Visual connection line / arrow between two notes
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConnectionEdge {
    pub id: EdgeId,
    pub from_note: NoteId,
    pub to_note: NoteId,
    pub label: Option<String>,
    pub style: EdgeStyle,
    pub color: String,
    pub arrow_start: bool,
    pub arrow_end: bool,
}

impl ConnectionEdge {
    pub fn new(from_note: NoteId, to_note: NoteId) -> Self {
        Self {
            id: EdgeId::new(),
            from_note,
            to_note,
            label: None,
            style: EdgeStyle::Solid,
            color: "#71717a".into(),
            arrow_start: false,
            arrow_end: true,
        }
    }
}
