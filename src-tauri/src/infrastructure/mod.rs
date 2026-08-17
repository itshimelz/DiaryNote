pub mod crypto;
pub mod filesystem;
pub mod network;
pub mod os;
pub mod sqlite;

pub use crypto::{
    decrypt_note_envelope, encrypt_note_envelope, hash_security_input, is_encrypted_envelope,
    verify_security_input, CryptoError,
};
pub use filesystem::{
    create_online_backup_snapshot, export_vault_archive, import_vault_archive,
    inspect_vault_archive, AssetError, AssetStore, BackupError,
};
pub use network::{AiClient, AiError};
pub use os::AppPaths;
pub use sqlite::{init_sqlite_connection, SqliteNoteRepository};


