use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Domain error: {0}")]
    Domain(#[from] domain::error::DomainError),

    #[error("Crypto error: {0}")]
    Crypto(#[from] crypto::error::CryptoError),

    #[error("Migration error: {0}")]
    Migration(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Backup error: {0}")]
    Backup(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("General error: {0}")]
    General(String),
}

pub type StorageResult<T> = Result<T, StorageError>;
