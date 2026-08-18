use thiserror::Error;

#[derive(Error, Debug, Clone, PartialEq)]
pub enum DomainError {
    #[error("Note not found: {0}")]
    NoteNotFound(String),

    #[error("Invalid note bounds: width and height must be positive (got {width}x{height})")]
    InvalidBounds { width: f32, height: f32 },

    #[error("Invalid coordinate: {0}")]
    InvalidCoordinate(String),

    #[error("Invalid zoom factor: {factor} (must be between {min} and {max})")]
    InvalidZoom { factor: f32, min: f32, max: f32 },

    #[error("Group not found: {0}")]
    GroupNotFound(String),

    #[error("Edge not found: {0}")]
    EdgeNotFound(String),

    #[error("Tag name cannot be empty")]
    EmptyTagName,

    #[error("Invalid journal date: {0} (must be YYYY-MM-DD)")]
    InvalidJournalDate(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Serialization error: {0}")]
    Serialization(String),
}

pub type DomainResult<T> = Result<T, DomainError>;
