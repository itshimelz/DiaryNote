use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::infrastructure::crypto::{
    decrypt_note_envelope, encrypt_note_envelope, hash_security_input, is_encrypted_envelope,
    verify_security_input, CryptoError,
};

#[derive(Error, Debug)]
pub enum VaultError {
    #[error("Crypto error: {0}")]
    Crypto(#[from] CryptoError),
    #[error("Rate limited: please wait {0} second(s) before trying again")]
    RateLimited(u64),
    #[error("Vault is locked: passcode required")]
    VaultLocked,
    #[error("Invalid passcode")]
    InvalidPasscode,
    #[error("Vault state lock error")]
    LockError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultStatus {
    pub is_unlocked: bool,
    pub auto_lock_timeout_secs: u64,
    pub backoff_remaining_secs: u64,
    pub failed_attempts: u32,
}

#[derive(Zeroize, ZeroizeOnDrop)]
struct SensitiveKeyStore {
    passcode: String,
}

struct SessionVaultInner {
    key_store: Option<SensitiveKeyStore>,
    last_active: Instant,
    auto_lock_duration: Duration,
    failed_attempts: u32,
    locked_until: Option<Instant>,
}

impl SessionVaultInner {
    fn new() -> Self {
        Self {
            key_store: None,
            last_active: Instant::now(),
            auto_lock_duration: Duration::from_secs(900), // 15 minutes default
            failed_attempts: 0,
            locked_until: None,
        }
    }

    fn get_backoff_remaining_secs(&self) -> u64 {
        if let Some(until) = self.locked_until {
            let now = Instant::now();
            if until > now {
                return (until - now).as_secs() + 1;
            }
        }
        0
    }

    fn record_failed_attempt(&mut self) -> u64 {
        self.failed_attempts += 1;
        // Exponential backoff: 2^(attempts - 1) seconds (1s, 2s, 4s, 8s, 16s, max 60s)
        let exponent = (self.failed_attempts - 1).min(6);
        let backoff_secs = (1u64 << exponent).min(60);
        self.locked_until = Some(Instant::now() + Duration::from_secs(backoff_secs));
        backoff_secs
    }

    fn reset_rate_limit(&mut self) {
        self.failed_attempts = 0;
        self.locked_until = None;
    }

    fn is_session_valid(&mut self) -> bool {
        if self.key_store.is_none() {
            return false;
        }

        if self.last_active.elapsed() > self.auto_lock_duration {
            self.lock();
            return false;
        }

        self.last_active = Instant::now();
        true
    }

    fn lock(&mut self) {
        if let Some(mut store) = self.key_store.take() {
            store.zeroize();
        }
    }
}

#[derive(Clone)]
pub struct VaultService {
    inner: Arc<Mutex<SessionVaultInner>>,
}

impl Default for VaultService {
    fn default() -> Self {
        Self::new()
    }
}

impl VaultService {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(SessionVaultInner::new())),
        }
    }

    pub fn hash_security_input(&self, input: &str) -> String {
        hash_security_input(input)
    }

    pub fn verify_security_input(&self, input: &str, stored_hash: &str) -> Result<bool, VaultError> {
        let mut vault = self.inner.lock().map_err(|_| VaultError::LockError)?;
        let backoff = vault.get_backoff_remaining_secs();
        if backoff > 0 {
            return Err(VaultError::RateLimited(backoff));
        }

        let is_valid = verify_security_input(input, stored_hash);
        if is_valid {
            vault.reset_rate_limit();
        } else {
            let _ = vault.record_failed_attempt();
        }

        Ok(is_valid)
    }

    pub fn unlock(
        &self,
        passcode: &str,
        stored_hash: Option<&str>,
        timeout_secs: Option<u64>,
    ) -> Result<bool, VaultError> {
        let mut vault = self.inner.lock().map_err(|_| VaultError::LockError)?;
        let backoff = vault.get_backoff_remaining_secs();
        if backoff > 0 {
            return Err(VaultError::RateLimited(backoff));
        }

        if let Some(hash) = stored_hash {
            let is_valid = verify_security_input(passcode, hash);
            if !is_valid {
                let _ = vault.record_failed_attempt();
                return Ok(false);
            }
        }

        vault.reset_rate_limit();
        vault.key_store = Some(SensitiveKeyStore {
            passcode: passcode.to_string(),
        });
        vault.last_active = Instant::now();
        if let Some(secs) = timeout_secs {
            vault.auto_lock_duration = Duration::from_secs(secs);
        }

        Ok(true)
    }

    pub fn lock(&self) -> Result<(), VaultError> {
        let mut vault = self.inner.lock().map_err(|_| VaultError::LockError)?;
        vault.lock();
        Ok(())
    }

    pub fn is_unlocked(&self) -> bool {
        if let Ok(mut vault) = self.inner.lock() {
            vault.is_session_valid()
        } else {
            false
        }
    }

    pub fn get_status(&self) -> VaultStatus {
        if let Ok(mut vault) = self.inner.lock() {
            let is_unlocked = vault.is_session_valid();
            VaultStatus {
                is_unlocked,
                auto_lock_timeout_secs: vault.auto_lock_duration.as_secs(),
                backoff_remaining_secs: vault.get_backoff_remaining_secs(),
                failed_attempts: vault.failed_attempts,
            }
        } else {
            VaultStatus {
                is_unlocked: false,
                auto_lock_timeout_secs: 900,
                backoff_remaining_secs: 0,
                failed_attempts: 0,
            }
        }
    }

    pub fn encrypt_content(
        &self,
        plaintext: &str,
        override_passcode: Option<&str>,
    ) -> Result<String, VaultError> {
        if plaintext.is_empty() || is_encrypted_envelope(plaintext) {
            return Ok(plaintext.to_string());
        }

        if let Some(pass) = override_passcode {
            return Ok(encrypt_note_envelope(plaintext, pass)?);
        }

        let mut vault = self.inner.lock().map_err(|_| VaultError::LockError)?;
        if !vault.is_session_valid() {
            return Err(VaultError::VaultLocked);
        }

        let passcode = vault
            .key_store
            .as_ref()
            .map(|k| k.passcode.as_str())
            .ok_or(VaultError::VaultLocked)?;

        Ok(encrypt_note_envelope(plaintext, passcode)?)
    }

    pub fn decrypt_content(
        &self,
        envelope: &str,
        override_passcode: Option<&str>,
    ) -> Result<String, VaultError> {
        if envelope.is_empty() || !is_encrypted_envelope(envelope) {
            return Ok(envelope.to_string());
        }

        if let Some(pass) = override_passcode {
            return Ok(decrypt_note_envelope(envelope, pass)?);
        }

        let mut vault = self.inner.lock().map_err(|_| VaultError::LockError)?;
        if !vault.is_session_valid() {
            return Err(VaultError::VaultLocked);
        }

        let passcode = vault
            .key_store
            .as_ref()
            .map(|k| k.passcode.as_str())
            .ok_or(VaultError::VaultLocked)?;

        Ok(decrypt_note_envelope(envelope, passcode)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_service_session_lifecycle() {
        let service = VaultService::new();
        assert!(!service.is_unlocked());

        let passcode = "master-secret-password-123";
        let hash = service.hash_security_input(passcode);

        // Unlock with correct passcode
        let unlocked = service.unlock(passcode, Some(&hash), Some(300)).expect("Unlock failed");
        assert!(unlocked);
        assert!(service.is_unlocked());

        // Encrypt note
        let note_text = "Private secret personal journal entry";
        let envelope = service.encrypt_content(note_text, None).expect("Encrypt failed");
        assert!(is_encrypted_envelope(&envelope));

        // Decrypt note
        let decrypted = service.decrypt_content(&envelope, None).expect("Decrypt failed");
        assert_eq!(decrypted, note_text);

        // Lock vault
        service.lock().expect("Lock failed");
        assert!(!service.is_unlocked());

        // Encrypting without unlocked vault fails
        assert!(service.encrypt_content(note_text, None).is_err());
    }

    #[test]
    fn test_rate_limiting_exponential_backoff() {
        let service = VaultService::new();
        let correct_pass = "correct-password";
        let hash = service.hash_security_input(correct_pass);

        // Attempt 1 fails (1s backoff)
        let _ = service.verify_security_input("wrong-1", &hash);
        let status = service.get_status();
        assert_eq!(status.failed_attempts, 1);
        assert!(status.backoff_remaining_secs > 0);

        // Subsequent attempt immediately blocked by rate limit
        let res = service.verify_security_input("wrong-2", &hash);
        assert!(matches!(res, Err(VaultError::RateLimited(_))));
    }
}
