pub mod aes_gcm;

pub use aes_gcm::{
    decrypt_note_envelope, encrypt_note_envelope, hash_security_input, is_encrypted_envelope,
    verify_security_input, CryptoError,
};
