use std::sync::Arc;
use tauri::State;

use crate::domain::vault::{VaultService, VaultStatus};
use crate::error::AppError;

#[tauri::command]
pub fn vault_hash_security_input(
    vault_service: State<'_, Arc<VaultService>>,
    input: String,
) -> Result<String, AppError> {
    Ok(vault_service.hash_security_input(&input))
}

#[tauri::command]
pub fn vault_verify_security_input(
    vault_service: State<'_, Arc<VaultService>>,
    input: String,
    stored_hash: String,
) -> Result<bool, AppError> {
    Ok(vault_service.verify_security_input(&input, &stored_hash)?)
}

#[tauri::command]
pub fn vault_unlock(
    vault_service: State<'_, Arc<VaultService>>,
    passcode: String,
    stored_hash: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<bool, AppError> {
    Ok(vault_service.unlock(&passcode, stored_hash.as_deref(), timeout_secs)?)
}

#[tauri::command]
pub fn vault_lock(vault_service: State<'_, Arc<VaultService>>) -> Result<(), AppError> {
    Ok(vault_service.lock()?)
}

#[tauri::command]
pub fn vault_is_unlocked(vault_service: State<'_, Arc<VaultService>>) -> Result<bool, AppError> {
    Ok(vault_service.is_unlocked())
}

#[tauri::command]
pub fn vault_get_status(vault_service: State<'_, Arc<VaultService>>) -> Result<VaultStatus, AppError> {
    Ok(vault_service.get_status())
}

#[tauri::command]
pub fn vault_encrypt_note(
    vault_service: State<'_, Arc<VaultService>>,
    plaintext: String,
    passcode: Option<String>,
) -> Result<String, AppError> {
    Ok(vault_service.encrypt_content(&plaintext, passcode.as_deref())?)
}

#[tauri::command]
pub fn vault_decrypt_note(
    vault_service: State<'_, Arc<VaultService>>,
    envelope: String,
    passcode: Option<String>,
) -> Result<String, AppError> {
    Ok(vault_service.decrypt_content(&envelope, passcode.as_deref())?)
}
