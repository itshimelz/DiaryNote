use thiserror::Error;

#[derive(Error, Debug)]
pub enum AiError {
    #[error("Network request failed: {0}")]
    Network(#[from] reqwest::Error),

    #[error("AI Provider error: {0}")]
    Provider(String),

    #[error("API key missing or invalid")]
    MissingApiKey,

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub type AiResult<T> = Result<T, AiError>;
