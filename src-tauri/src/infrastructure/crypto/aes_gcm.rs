use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use rand::RngCore;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use thiserror::Error;

const PBKDF2_ITERATIONS: u32 = 600_000;
const SALT_BYTES: usize = 16;
const IV_BYTES: usize = 12;
const KEY_BYTES: usize = 32;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Encryption failed: {0}")]
    Encryption(String),
    #[error("Decryption failed: {0}")]
    Decryption(String),
    #[error("Invalid envelope format: expected $aes-gcm$<salt>$<iv>$<ciphertext>")]
    InvalidEnvelopeFormat,
    #[error("Invalid base64 payload: {0}")]
    Base64Decode(#[from] base64::DecodeError),
    #[error("UTF-8 decoding error: {0}")]
    Utf8Error(#[from] std::string::FromUtf8Error),
}

/// Derives a 256-bit AES symmetric key from a passcode and salt using PBKDF2-HMAC-SHA256.
pub fn derive_key_pbkdf2(passcode: &str, salt: &[u8]) -> [u8; KEY_BYTES] {
    let mut key = [0u8; KEY_BYTES];
    pbkdf2::pbkdf2_hmac::<Sha256>(passcode.as_bytes(), salt, PBKDF2_ITERATIONS, key.as_mut_slice());
    key
}

/// Hashes security input (passcode or security recovery answer) with PBKDF2-SHA256 and random salt.
/// Output format: `$pbkdf2$600000$<saltB64>$<hashB64>`
pub fn hash_security_input(input: &str) -> String {
    let normalized = input.trim().to_lowercase();
    let mut salt = [0u8; SALT_BYTES];
    rand::thread_rng().fill_bytes(salt.as_mut_slice());

    let mut derived_bits = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<Sha256>(
        normalized.as_bytes(),
        salt.as_slice(),
        PBKDF2_ITERATIONS,
        derived_bits.as_mut_slice(),
    );

    let salt_b64 = BASE64.encode(salt.as_slice());
    let hash_b64 = BASE64.encode(derived_bits.as_slice());

    format!("$pbkdf2${}${}${}", PBKDF2_ITERATIONS, salt_b64, hash_b64)
}

/// Verifies a user security input against a stored hash (supporting both modern `$pbkdf2$` and legacy SHA-256 hex).
pub fn verify_security_input(input: &str, stored_hash: &str) -> bool {
    if input.is_empty() || stored_hash.is_empty() {
        return false;
    }

    let normalized = input.trim().to_lowercase();

    if stored_hash.starts_with("$pbkdf2$") {
        let parts: Vec<&str> = stored_hash.split('$').collect();
        // ['', 'pbkdf2', iterations, saltB64, hashB64]
        if parts.len() == 5 {
            let iterations = parts[2].parse::<u32>().unwrap_or(PBKDF2_ITERATIONS);
            let salt_b64 = parts[3];
            let expected_hash_b64 = parts[4];

            let Ok(salt) = BASE64.decode(salt_b64) else {
                return false;
            };
            let Ok(expected_hash) = BASE64.decode(expected_hash_b64) else {
                return false;
            };

            let mut derived = [0u8; 32];
            pbkdf2::pbkdf2_hmac::<Sha256>(
                normalized.as_bytes(),
                salt.as_slice(),
                iterations,
                derived.as_mut_slice(),
            );

            return derived.as_slice().ct_eq(expected_hash.as_slice()).into();
        }
    }

    // Legacy hex SHA-256 fallback compatibility
    let mut hasher = Sha256::new();
    hasher.update(normalized.as_bytes());
    let legacy_digest = hasher.finalize();
    let legacy_hex = hex::encode(legacy_digest);

    legacy_hex.as_bytes().ct_eq(stored_hash.as_bytes()).into()
}

/// Checks if a content string is stored in the `$aes-gcm$` encrypted envelope format.
pub fn is_encrypted_envelope(content: &str) -> bool {
    content.starts_with("$aes-gcm$")
}

/// Encrypts plaintext into a self-contained `$aes-gcm$<salt>$<iv>$<ciphertext>` envelope string.
pub fn encrypt_note_envelope(plaintext: &str, passcode: &str) -> Result<String, CryptoError> {
    if plaintext.is_empty() {
        return Ok(String::new());
    }
    if is_encrypted_envelope(plaintext) {
        return Ok(plaintext.to_string());
    }

    let mut salt = [0u8; SALT_BYTES];
    let mut iv = [0u8; IV_BYTES];
    rand::thread_rng().fill_bytes(salt.as_mut_slice());
    rand::thread_rng().fill_bytes(iv.as_mut_slice());

    let key = derive_key_pbkdf2(passcode, salt.as_slice());
    let cipher = Aes256Gcm::new_from_slice(key.as_slice())
        .map_err(|e| CryptoError::Encryption(format!("Failed to initialize cipher: {}", e)))?;
    let nonce = Nonce::from_slice(iv.as_slice());

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| CryptoError::Encryption(format!("AES-GCM encryption failed: {}", e)))?;

    let salt_b64 = BASE64.encode(salt.as_slice());
    let iv_b64 = BASE64.encode(iv.as_slice());
    let ciphertext_b64 = BASE64.encode(ciphertext.as_slice());

    Ok(format!("$aes-gcm${}${}${}", salt_b64, iv_b64, ciphertext_b64))
}

/// Decrypts a self-contained `$aes-gcm$<salt>$<iv>$<ciphertext>` envelope string using the provided passcode.
pub fn decrypt_note_envelope(envelope: &str, passcode: &str) -> Result<String, CryptoError> {
    if envelope.is_empty() || !is_encrypted_envelope(envelope) {
        return Ok(envelope.to_string());
    }

    let parts: Vec<&str> = envelope.split('$').collect();
    // Expected: ['', 'aes-gcm', saltB64, ivB64, ciphertextB64]
    if parts.len() != 5 {
        return Err(CryptoError::InvalidEnvelopeFormat);
    }

    let salt = BASE64.decode(parts[2])?;
    let iv = BASE64.decode(parts[3])?;
    let ciphertext = BASE64.decode(parts[4])?;

    if iv.len() != IV_BYTES {
        return Err(CryptoError::Decryption("Invalid IV length".to_string()));
    }

    let key = derive_key_pbkdf2(passcode, salt.as_slice());
    let cipher = Aes256Gcm::new_from_slice(key.as_slice())
        .map_err(|e| CryptoError::Decryption(format!("Failed to initialize cipher: {}", e)))?;
    let nonce = Nonce::from_slice(iv.as_slice());

    let decrypted_bytes = cipher
        .decrypt(nonce, ciphertext.as_slice())
        .map_err(|e| CryptoError::Decryption(format!("Decryption authentication failed: {}", e)))?;

    String::from_utf8(decrypted_bytes).map_err(CryptoError::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pbkdf2_hash_and_verify_roundtrip() {
        let passcode = "super-secret-master-pass-1234!";
        let hash = hash_security_input(passcode);
        assert!(hash.starts_with("$pbkdf2$600000$"));

        assert!(verify_security_input(passcode, &hash));
        assert!(verify_security_input(&passcode.to_uppercase(), &hash)); // Case insensitive
        assert!(!verify_security_input("wrong-pass", &hash));
    }

    #[test]
    fn test_legacy_sha256_verification() {
        let input = "diarynote123";
        let mut hasher = Sha256::new();
        hasher.update(input.as_bytes());
        let legacy_hex = hex::encode(hasher.finalize());

        assert!(verify_security_input(input, &legacy_hex));
        assert!(!verify_security_input("wrong", &legacy_hex));
    }

    #[test]
    fn test_envelope_encrypt_decrypt_roundtrip() {
        let passcode = "my-secure-diary-passcode";
        let plaintext = "Top secret project plans:\n1. Migrate to Rust\n2. Ship local-first desktop.";

        let envelope = encrypt_note_envelope(plaintext, passcode).expect("Encryption failed");
        assert!(is_encrypted_envelope(&envelope));
        assert!(!envelope.contains("Top secret"));

        let decrypted = decrypt_note_envelope(&envelope, passcode).expect("Decryption failed");
        assert_eq!(decrypted, plaintext);

        // Wrong passcode fails
        let err = decrypt_note_envelope(&envelope, "wrong-passcode");
        assert!(err.is_err());
    }

    #[test]
    fn test_idempotent_envelope_encryption() {
        let passcode = "test-pass";
        let plaintext = "Hello World";
        let env1 = encrypt_note_envelope(plaintext, passcode).unwrap();
        let env2 = encrypt_note_envelope(&env1, passcode).unwrap();
        assert_eq!(env1, env2);
    }
}
