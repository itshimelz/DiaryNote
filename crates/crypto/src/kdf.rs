use crate::error::{CryptoError, CryptoResult};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, Params,
};
use zeroize::Zeroizing;

/// Key Derivation Function using Argon2id
pub struct Argon2Kdf;

impl Argon2Kdf {
    pub const SALT_LEN: usize = 16;
    pub const KEY_LEN: usize = 32;

    /// Memory cost: 64MB (65536 KB), Iterations: 3, Parallelism: 1
    fn argon2_instance() -> CryptoResult<Argon2<'static>> {
        let params = Params::new(65536, 3, 1, Some(Self::KEY_LEN))
            .map_err(|e| CryptoError::KeyDerivation(format!("Invalid Argon2 params: {e}")))?;
        Ok(Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            params,
        ))
    }

    /// Derives a 32-byte encryption key from a passcode and salt
    pub fn derive_key(passcode: &str, salt: &[u8]) -> CryptoResult<Zeroizing<[u8; 32]>> {
        if passcode.len() < 4 {
            return Err(CryptoError::PasscodeTooShort { min: 4 });
        }

        let argon2 = Self::argon2_instance()?;
        let mut key = Zeroizing::new([0u8; 32]);
        argon2
            .hash_password_into(passcode.as_bytes(), salt, key.as_mut())
            .map_err(|e| CryptoError::KeyDerivation(format!("Key derivation failed: {e}")))?;

        Ok(key)
    }

    /// Generates a password verification hash (PHC format) to store in the database
    pub fn create_password_hash(passcode: &str) -> CryptoResult<String> {
        if passcode.len() < 4 {
            return Err(CryptoError::PasscodeTooShort { min: 4 });
        }

        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Self::argon2_instance()?;

        let hash = argon2
            .hash_password(passcode.as_bytes(), &salt)
            .map_err(|e| CryptoError::KeyDerivation(format!("Password hashing failed: {e}")))?;

        Ok(hash.to_string())
    }

    /// Verifies a candidate passcode against an existing PHC password hash
    pub fn verify_password(passcode: &str, hash_str: &str) -> bool {
        let parsed_hash = match PasswordHash::new(hash_str) {
            Ok(h) => h,
            Err(_) => return false,
        };

        Argon2::default()
            .verify_password(passcode.as_bytes(), &parsed_hash)
            .is_ok()
    }
}
