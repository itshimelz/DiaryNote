import { invoke } from '@tauri-apps/api/core';
import {
  hashSecurityInputSecure,
  verifySecurityInputSecure,
  encryptNoteEnvelope,
  decryptNoteEnvelope,
  cacheSessionPasscode,
  lockSessionVault,
  isSessionVaultUnlocked,
  getCachedSessionPasscode,
  getRateLimitBackoffSeconds,
} from '../services/cryptoVaultService';

import { isTauriEnvironment as isTauriAvailable } from './rustStorage';

export interface VaultStatus {
  is_unlocked: boolean;
  auto_lock_timeout_secs: number;
  backoff_remaining_secs: number;
  failed_attempts: number;
}


/**
 * Hashes security input (passcode / answer) using hardware-accelerated Rust PBKDF2.
 */
export async function hashSecurityInput(input: string): Promise<string> {
  if (!isTauriAvailable()) {
    return await hashSecurityInputSecure(input);
  }
  return await invoke<string>('vault_hash_security_input', { input });
}

/**
 * Verifies security input with rate-limiting and backoff.
 */
export async function verifySecurityInput(input: string, storedHash: string): Promise<boolean> {
  if (!isTauriAvailable()) {
    return await verifySecurityInputSecure(input, storedHash);
  }
  return await invoke<boolean>('vault_verify_security_input', {
    input,
    storedHash,
  });
}

/**
 * Authenticates master passcode and unlocks the session vault in Rust memory.
 */
export async function unlockVault(
  passcode: string,
  storedHash?: string,
  timeoutSecs?: number
): Promise<boolean> {
  if (!isTauriAvailable()) {
    const isValid = storedHash ? await verifySecurityInputSecure(passcode, storedHash) : true;
    if (isValid) {
      cacheSessionPasscode(passcode, (timeoutSecs || 900) * 1000);
    }
    return isValid;
  }
  const unlocked = await invoke<boolean>('vault_unlock', {
    passcode,
    storedHash: storedHash || null,
    timeoutSecs: timeoutSecs || null,
  });
  if (unlocked) {
    cacheSessionPasscode(passcode, (timeoutSecs || 900) * 1000);
  }
  return unlocked;
}

/**
 * Locks the session vault and zeroes memory in Rust.
 */
export async function lockVault(): Promise<void> {
  lockSessionVault();
  if (isTauriAvailable()) {
    try {
      await invoke('vault_lock');
    } catch (e) {
      console.warn('Failed to lock native vault:', e);
    }
  }
}

/**
 * Checks if the vault is currently authenticated in memory.
 */
export async function isVaultUnlocked(): Promise<boolean> {
  if (!isTauriAvailable()) {
    return isSessionVaultUnlocked();
  }
  try {
    return await invoke<boolean>('vault_is_unlocked');
  } catch {
    return isSessionVaultUnlocked();
  }
}

/**
 * Retrieves the current vault status and rate limit state.
 */
export async function getVaultStatus(): Promise<VaultStatus> {
  if (!isTauriAvailable()) {
    return {
      is_unlocked: isSessionVaultUnlocked(),
      auto_lock_timeout_secs: 900,
      backoff_remaining_secs: getRateLimitBackoffSeconds(),
      failed_attempts: 0,
    };
  }
  return await invoke<VaultStatus>('vault_get_status');
}

/**
 * Encrypts note content into an $aes-gcm$ envelope via Rust.
 */
export async function encryptNoteContent(
  plaintext: string,
  passcode?: string
): Promise<string> {
  if (!plaintext) return '';
  if (!isTauriAvailable()) {
    const key = passcode || getCachedSessionPasscode();
    if (!key) throw new Error('Vault is locked: passcode required');
    return await encryptNoteEnvelope(plaintext, key);
  }
  return await invoke<string>('vault_encrypt_note', {
    plaintext,
    passcode: passcode || null,
  });
}

/**
 * Decrypts an $aes-gcm$ envelope into plaintext via Rust.
 */
export async function decryptNoteContent(
  envelope: string,
  passcode?: string
): Promise<string> {
  if (!envelope) return '';
  if (!isTauriAvailable()) {
    const key = passcode || getCachedSessionPasscode();
    if (!key) throw new Error('Vault is locked: passcode required');
    return await decryptNoteEnvelope(envelope, key);
  }
  return await invoke<string>('vault_decrypt_note', {
    envelope,
    passcode: passcode || null,
  });
}
