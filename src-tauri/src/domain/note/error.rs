use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Disk full (ENOSPC): insufficient storage space")]
    DiskFull,

    #[error("Permission denied to access file or database")]
    PermissionDenied,

    #[error("Note not found: {0}")]
    NotFound(String),

    #[error("Corrupt or invalid data: {0}")]
    Corruption(String),

    #[error("Serialization error: {0}")]
    Serialization(String),
}

impl From<serde_json::Error> for StorageError {
    fn from(err: serde_json::Error) -> Self {
        Self::Serialization(err.to_string())
    }
}

impl From<rusqlite::Error> for StorageError {
    fn from(err: rusqlite::Error) -> Self {
        match err {
            rusqlite::Error::SqliteFailure(ref f, _) => {
                // SQLite error code 13 is SQLITE_FULL (disk full)
                if f.extended_code == 13 {
                    return Self::DiskFull;
                }
                // SQLite error code 8 is SQLITE_READONLY or 14 SQLITE_CANTOPEN
                if f.extended_code == 8 || f.extended_code == 14 {
                    return Self::PermissionDenied;
                }
                // SQLite error code 11 is SQLITE_CORRUPT
                if f.extended_code == 11 {
                    return Self::Corruption(err.to_string());
                }
                Self::Database(err.to_string())
            }
            _ => Self::Database(err.to_string()),
        }
    }
}
