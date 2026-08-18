pub mod cipher;
pub mod error;
pub mod kdf;
pub mod vault;

pub use cipher::{AesGcmCipher, EncryptedEnvelope};
pub use error::{CryptoError, CryptoResult};
pub use kdf::Argon2Kdf;
pub use vault::VaultSession;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_argon2_key_derivation_and_verification() {
        let passcode = "super-secret-passcode-123";
        let hash = Argon2Kdf::create_password_hash(passcode).unwrap();

        assert!(Argon2Kdf::verify_password(passcode, &hash));
        assert!(!Argon2Kdf::verify_password("wrong-password", &hash));

        let salt = [42u8; 16];
        let key1 = Argon2Kdf::derive_key(passcode, &salt).unwrap();
        let key2 = Argon2Kdf::derive_key(passcode, &salt).unwrap();
        assert_eq!(key1.as_ref(), key2.as_ref());
    }

    #[test]
    fn test_aes_gcm_encryption_roundtrip() {
        let key = [7u8; 32];
        let salt = [9u8; 16];
        let plaintext = "Top secret journal entry: I found the secret map!";

        let encrypted_envelope_str = AesGcmCipher::encrypt_string(plaintext, &key, &salt).unwrap();
        assert!(!encrypted_envelope_str.contains("secret map"));

        let decrypted = AesGcmCipher::decrypt_string(&encrypted_envelope_str, &key).unwrap();
        assert_eq!(decrypted, plaintext);

        // Wrong key should fail decryption
        let wrong_key = [8u8; 32];
        let res = AesGcmCipher::decrypt_string(&encrypted_envelope_str, &wrong_key);
        assert_eq!(res.unwrap_err(), CryptoError::DecryptionFailed);
    }

    #[test]
    fn test_vault_session_lifecycle() {
        let mut vault = VaultSession::new(None);
        assert!(!vault.is_unlocked());

        let passcode = "master-key-2026";
        let hash = Argon2Kdf::create_password_hash(passcode).unwrap();

        // Unlock with correct passcode
        vault.unlock(passcode, Some(&hash), None).unwrap();
        assert!(vault.is_unlocked());

        let secret = "Encrypted private thoughts";
        let ciphertext = vault.encrypt_text(secret).unwrap();
        let decrypted = vault.decrypt_text(&ciphertext).unwrap();
        assert_eq!(decrypted, secret);

        // Lock vault
        vault.lock();
        assert!(!vault.is_unlocked());
        assert_eq!(
            vault.encrypt_text("test").unwrap_err(),
            CryptoError::VaultLocked
        );
        assert_eq!(
            vault.decrypt_text(&ciphertext).unwrap_err(),
            CryptoError::VaultLocked
        );
    }
}
