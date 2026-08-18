use serde::Serialize;
use thiserror::Error;

/// Centralized application error type for all Tauri commands and domain services.
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Vault error: {0}")]
    Vault(String),

    #[error("Asset error: {0}")]
    Asset(String),

    #[error("I/O error: {0}")]
    Io(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<crate::domain::note::error::StorageError> for AppError {
    fn from(err: crate::domain::note::error::StorageError) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<crate::domain::vault::VaultError> for AppError {
    fn from(err: crate::domain::vault::VaultError) -> Self {
        AppError::Vault(err.to_string())
    }
}

impl From<crate::infrastructure::crypto::CryptoError> for AppError {
    fn from(err: crate::infrastructure::crypto::CryptoError) -> Self {
        AppError::Vault(err.to_string())
    }
}

impl From<crate::infrastructure::filesystem::AssetError> for AppError {
    fn from(err: crate::infrastructure::filesystem::AssetError) -> Self {
        AppError::Asset(err.to_string())
    }
}

impl From<crate::infrastructure::filesystem::backup::BackupError> for AppError {
    fn from(err: crate::infrastructure::filesystem::backup::BackupError) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl From<crate::infrastructure::network::AiError> for AppError {
    fn from(err: crate::infrastructure::network::AiError) -> Self {
        AppError::Network(err.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::Network(err.to_string())
    }
}

impl From<String> for AppError {
    fn from(err: String) -> Self {
        AppError::Internal(err)
    }
}

impl From<&str> for AppError {
    fn from(err: &str) -> Self {
        AppError::Internal(err.to_string())
    }
}
