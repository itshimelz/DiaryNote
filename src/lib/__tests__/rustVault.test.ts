import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hashSecurityInput,
  verifySecurityInput,
  unlockVault,
  lockVault,
  isVaultUnlocked,
  getVaultStatus,
  encryptNoteContent,
  decryptNoteContent,
} from '../rustVault';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('rustVault bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it('delegates hashSecurityInput to Tauri invoke', async () => {
    (invoke as any).mockResolvedValueOnce('$pbkdf2$600000$mockSalt$mockHash');

    const hash = await hashSecurityInput('secret123');
    expect(invoke).toHaveBeenCalledWith('vault_hash_security_input', { input: 'secret123' });
    expect(hash).toContain('$pbkdf2$');
  });

  it('delegates verifySecurityInput to Tauri invoke', async () => {
    (invoke as any).mockResolvedValueOnce(true);

    const valid = await verifySecurityInput('secret123', '$pbkdf2$600000$salt$hash');
    expect(invoke).toHaveBeenCalledWith('vault_verify_security_input', {
      input: 'secret123',
      storedHash: '$pbkdf2$600000$salt$hash',
    });
    expect(valid).toBe(true);
  });

  it('handles unlockVault, lockVault, and isVaultUnlocked', async () => {
    (invoke as any).mockResolvedValueOnce(true); // unlock
    (invoke as any).mockResolvedValueOnce(true); // is_unlocked
    (invoke as any).mockResolvedValueOnce(undefined); // lock

    const unlocked = await unlockVault('my-passcode');
    expect(unlocked).toBe(true);
    expect(invoke).toHaveBeenCalledWith('vault_unlock', {
      passcode: 'my-passcode',
      storedHash: null,
      timeoutSecs: null,
    });

    const isUnlocked = await isVaultUnlocked();
    expect(isUnlocked).toBe(true);

    await lockVault();
    expect(invoke).toHaveBeenCalledWith('vault_lock');
  });

  it('delegates encryption and decryption roundtrips', async () => {
    const envelope = '$aes-gcm$saltB64$ivB64$cipherB64';
    (invoke as any).mockResolvedValueOnce(envelope);
    (invoke as any).mockResolvedValueOnce('Plaintext secret');

    const enc = await encryptNoteContent('Plaintext secret');
    expect(enc).toBe(envelope);

    const dec = await decryptNoteContent(envelope);
    expect(dec).toBe('Plaintext secret');
  });

  it('fetches vault status', async () => {
    (invoke as any).mockResolvedValueOnce({
      is_unlocked: true,
      auto_lock_timeout_secs: 900,
      backoff_remaining_secs: 0,
      failed_attempts: 0,
    });

    const status = await getVaultStatus();
    expect(status.is_unlocked).toBe(true);
    expect(status.auto_lock_timeout_secs).toBe(900);
  });
});
