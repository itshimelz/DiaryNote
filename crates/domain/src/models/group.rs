use crate::error::DomainError;
use crate::models::note::{NoteId, Point2D, Size2D};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct GroupId(pub Uuid);

impl GroupId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for GroupId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for GroupId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for GroupId {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(GroupId)
            .map_err(|e| DomainError::Validation(format!("Invalid UUID for GroupId: {e}")))
    }
}

/// Visual Group Frame enclosing multiple notes on the canvas
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GroupFrame {
    pub id: GroupId,
    pub title: String,
    pub color: String,
    pub position: Point2D,
    pub size: Size2D,
    pub note_ids: Vec<NoteId>,
}

impl GroupFrame {
    pub fn new(
        title: impl Into<String>,
        color: impl Into<String>,
        position: Point2D,
        size: Size2D,
    ) -> Self {
        Self {
            id: GroupId::new(),
            title: title.into(),
            color: color.into(),
            position,
            size,
            note_ids: Vec::new(),
        }
    }

    pub fn add_note(&mut self, id: NoteId) {
        if !self.note_ids.contains(&id) {
            self.note_ids.push(id);
        }
    }

    pub fn remove_note(&mut self, id: &NoteId) {
        self.note_ids.retain(|n| n != id);
    }
}
