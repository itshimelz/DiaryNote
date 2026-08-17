use std::sync::Arc;
use tauri::State;

use crate::commands::storage::AppState;
use crate::domain::vault::VaultStatus;

#[tauri::command]
pub fn vault_hash_security_input(
    state: State<Arc<AppState>>,
    input: String,
) -> Result<String, String> {
    Ok(state.vault_service.hash_security_input(&input))
}

#[tauri::command]
pub fn vault_verify_security_input(
    state: State<Arc<AppState>>,
    input: String,
    stored_hash: String,
) -> Result<bool, String> {
    state
        .vault_service
        .verify_security_input(&input, &stored_hash)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_unlock(
    state: State<Arc<AppState>>,
    passcode: String,
    stored_hash: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<bool, String> {
    state
        .vault_service
        .unlock(&passcode, stored_hash.as_deref(), timeout_secs)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_lock(state: State<Arc<AppState>>) -> Result<(), String> {
    state.vault_service.lock().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_is_unlocked(state: State<Arc<AppState>>) -> Result<bool, String> {
    Ok(state.vault_service.is_unlocked())
}

#[tauri::command]
pub fn vault_get_status(state: State<Arc<AppState>>) -> Result<VaultStatus, String> {
    Ok(state.vault_service.get_status())
}

#[tauri::command]
pub fn vault_encrypt_note(
    state: State<Arc<AppState>>,
    plaintext: String,
    passcode: Option<String>,
) -> Result<String, String> {
    state
        .vault_service
        .encrypt_content(&plaintext, passcode.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_decrypt_note(
    state: State<Arc<AppState>>,
    envelope: String,
    passcode: Option<String>,
) -> Result<String, String> {
    state
        .vault_service
        .decrypt_content(&envelope, passcode.as_deref())
        .map_err(|e| e.to_string())
}
