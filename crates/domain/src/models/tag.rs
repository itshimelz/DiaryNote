use crate::error::{DomainError, DomainResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    pub color: String,
    pub note_count: usize,
}

impl Tag {
    pub fn new(name: impl Into<String>, color: impl Into<String>) -> DomainResult<Self> {
        let name = name.into().trim().to_lowercase();
        if name.is_empty() {
            return Err(DomainError::EmptyTagName);
        }
        Ok(Self {
            name,
            color: color.into(),
            note_count: 0,
        })
    }
}
