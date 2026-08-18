use thiserror::Error;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CryptoError {
    #[error("Key derivation failed: {0}")]
    KeyDerivation(String),

    #[error("Encryption failed: {0}")]
    Encryption(String),

    #[error("Decryption failed: invalid passcode or corrupted ciphertext")]
    DecryptionFailed,

    #[error("Invalid envelope format: {0}")]
    InvalidEnvelope(String),

    #[error("Vault is locked")]
    VaultLocked,

    #[error("Passcode too short: minimum {min} characters required")]
    PasscodeTooShort { min: usize },
}

pub type CryptoResult<T> = Result<T, CryptoError>;
