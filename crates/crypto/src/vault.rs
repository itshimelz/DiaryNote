use crate::cipher::AesGcmCipher;
use crate::error::{CryptoError, CryptoResult};
use crate::kdf::Argon2Kdf;
use rand::RngCore;
use std::time::Instant;
use zeroize::Zeroizing;

/// Thread-safe in-memory session manager for unlocking and accessing locked notes
#[derive(Debug)]
pub struct VaultSession {
    derived_key: Option<Zeroizing<[u8; 32]>>,
    salt: [u8; 16],
    last_accessed: Option<Instant>,
    auto_lock_duration: Option<std::time::Duration>,
}

impl VaultSession {
    pub fn new(auto_lock_minutes: Option<u32>) -> Self {
        let mut salt = [0u8; 16];
        rand::rngs::OsRng.fill_bytes(&mut salt);

        Self {
            derived_key: None,
            salt,
            last_accessed: None,
            auto_lock_duration: auto_lock_minutes
                .map(|m| std::time::Duration::from_secs((m * 60) as u64)),
        }
    }

    /// Sets up or unlocks the vault with the user's master passcode
    pub fn unlock(
        &mut self,
        passcode: &str,
        stored_hash: Option<&str>,
        stored_salt: Option<&[u8]>,
    ) -> CryptoResult<()> {
        if let Some(hash) = stored_hash {
            if !Argon2Kdf::verify_password(passcode, hash) {
                return Err(CryptoError::DecryptionFailed);
            }
        }

        if let Some(salt) = stored_salt {
            if salt.len() == 16 {
                self.salt.copy_from_slice(salt);
            }
        }

        let key = Argon2Kdf::derive_key(passcode, &self.salt)?;
        self.derived_key = Some(key);
        self.last_accessed = Some(Instant::now());
        Ok(())
    }

    /// Explicitly locks the vault and wipes the encryption key from memory
    pub fn lock(&mut self) {
        self.derived_key = None;
        self.last_accessed = None;
    }

    /// Checks if the vault is currently unlocked and has not timed out
    pub fn is_unlocked(&mut self) -> bool {
        if let (Some(last), Some(duration)) = (self.last_accessed, self.auto_lock_duration) {
            if last.elapsed() > duration {
                self.lock();
                return false;
            }
        }
        self.derived_key.is_some()
    }

    pub fn salt(&self) -> &[u8; 16] {
        &self.salt
    }

    /// Encrypts a note's plaintext content using the active vault key
    pub fn encrypt_text(&mut self, plaintext: &str) -> CryptoResult<String> {
        if !self.is_unlocked() {
            return Err(CryptoError::VaultLocked);
        }
        self.last_accessed = Some(Instant::now());

        let key = self.derived_key.as_ref().ok_or(CryptoError::VaultLocked)?;
        AesGcmCipher::encrypt_string(plaintext, key, &self.salt)
    }

    /// Decrypts an encrypted note's payload using the active vault key
    pub fn decrypt_text(&mut self, envelope_str: &str) -> CryptoResult<String> {
        if !self.is_unlocked() {
            return Err(CryptoError::VaultLocked);
        }
        self.last_accessed = Some(Instant::now());

        let key = self.derived_key.as_ref().ok_or(CryptoError::VaultLocked)?;
        AesGcmCipher::decrypt_string(envelope_str, key)
    }
}

impl Default for VaultSession {
    fn default() -> Self {
        Self::new(Some(15)) // Default 15 minutes auto-lock
    }
}
