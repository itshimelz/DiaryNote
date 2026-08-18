use crate::error::{CryptoError, CryptoResult};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};

/// Versioned, authenticated encryption envelope for locked note payloads
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EncryptedEnvelope {
    pub version: u8,
    pub salt_base64: String,
    pub nonce_base64: String,
    pub ciphertext_base64: String,
}

impl EncryptedEnvelope {
    pub const CURRENT_VERSION: u8 = 1;
    pub const NONCE_LEN: usize = 12;
    pub const SALT_LEN: usize = 16;

    pub fn to_serialized_string(&self) -> CryptoResult<String> {
        serde_json::to_string(self)
            .map_err(|e| CryptoError::Encryption(format!("Envelope serialization failed: {e}")))
    }

    pub fn from_serialized_string(s: &str) -> CryptoResult<Self> {
        serde_json::from_str(s)
            .map_err(|e| CryptoError::InvalidEnvelope(format!("Invalid encrypted envelope: {e}")))
    }
}

pub struct AesGcmCipher;

impl AesGcmCipher {
    /// Encrypts plaintext bytes using a 32-byte key and returns an `EncryptedEnvelope`
    pub fn encrypt(
        plaintext: &[u8],
        key: &[u8; 32],
        salt: &[u8],
    ) -> CryptoResult<EncryptedEnvelope> {
        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|e| CryptoError::Encryption(format!("Invalid key length: {e}")))?;

        let mut nonce_bytes = [0u8; EncryptedEnvelope::NONCE_LEN];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| CryptoError::Encryption(format!("AES-GCM encryption failed: {e}")))?;

        Ok(EncryptedEnvelope {
            version: EncryptedEnvelope::CURRENT_VERSION,
            salt_base64: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, salt),
            nonce_base64: base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                nonce_bytes,
            ),
            ciphertext_base64: base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                ciphertext,
            ),
        })
    }

    /// Decrypts an `EncryptedEnvelope` using the derived 32-byte key
    pub fn decrypt(envelope: &EncryptedEnvelope, key: &[u8; 32]) -> CryptoResult<Vec<u8>> {
        if envelope.version != EncryptedEnvelope::CURRENT_VERSION {
            return Err(CryptoError::InvalidEnvelope(format!(
                "Unsupported envelope version: {}",
                envelope.version
            )));
        }

        let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| CryptoError::DecryptionFailed)?;

        let nonce_bytes = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            &envelope.nonce_base64,
        )
        .map_err(|_| CryptoError::InvalidEnvelope("Malformed nonce base64".into()))?;

        if nonce_bytes.len() != EncryptedEnvelope::NONCE_LEN {
            return Err(CryptoError::InvalidEnvelope(format!(
                "Invalid nonce length: {}",
                nonce_bytes.len()
            )));
        }

        let ciphertext = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            &envelope.ciphertext_base64,
        )
        .map_err(|_| CryptoError::InvalidEnvelope("Malformed ciphertext base64".into()))?;

        let nonce = Nonce::from_slice(&nonce_bytes);
        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|_| CryptoError::DecryptionFailed)?;

        Ok(plaintext)
    }

    /// Convenience helper to encrypt a UTF-8 string
    pub fn encrypt_string(plaintext: &str, key: &[u8; 32], salt: &[u8]) -> CryptoResult<String> {
        let envelope = Self::encrypt(plaintext.as_bytes(), key, salt)?;
        envelope.to_serialized_string()
    }

    /// Convenience helper to decrypt a serialized envelope string back to UTF-8
    pub fn decrypt_string(envelope_str: &str, key: &[u8; 32]) -> CryptoResult<String> {
        let envelope = EncryptedEnvelope::from_serialized_string(envelope_str)?;
        let bytes = Self::decrypt(&envelope, key)?;
        String::from_utf8(bytes).map_err(|_| CryptoError::DecryptionFailed)
    }
}
