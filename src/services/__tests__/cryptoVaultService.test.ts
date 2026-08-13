import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashSecurityInputSecure,
  verifySecurityInputSecure,
  encryptNoteContent,
  decryptNoteContent,
  cacheSessionPasscode,
  getCachedSessionPasscode,
  lockSessionVault,
  resetRateLimiter,
  getRateLimitBackoffSeconds,
} from '../cryptoVaultService';

describe('Cryptographic Vault & Session Service (cryptoVaultService.ts)', () => {
  beforeEach(() => {
    resetRateLimiter();
    lockSessionVault();
  });

  it('hashes and verifies passcode with PBKDF2 random salt', async () => {
    const rawPass = 'SecretPass123!';
    const hash = await hashSecurityInputSecure(rawPass);

    expect(hash).toMatch(/^\$pbkdf2\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);

    const isMatch = await verifySecurityInputSecure(rawPass, hash);
    expect(isMatch).toBe(true);

    const isFail = await verifySecurityInputSecure('WrongPassword', hash);
    expect(isFail).toBe(false);
  });

  it('maintains backward compatibility with legacy SHA-256 hashes', async () => {
    const legacyPass = 'mypassword';
    // Pre-computed SHA-256 for 'mypassword'
    const enc = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(legacyPass));
    const legacyHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const verified = await verifySecurityInputSecure(legacyPass, legacyHash);
    expect(verified).toBe(true);

    const wrongLegacy = await verifySecurityInputSecure('wrong', legacyHash);
    expect(wrongLegacy).toBe(false);
  });

  it('encrypts and decrypts note content with AES-256-GCM', async () => {
    const secretContent = '# Top Secret Thoughts\nThis is my encrypted personal journal entry.';
    const passcode = 'VaultKey2026';

    const { ciphertext, iv, salt } = await encryptNoteContent(secretContent, passcode);
    expect(ciphertext).toBeDefined();
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(ciphertext).not.toBe(secretContent);

    const decrypted = await decryptNoteContent(ciphertext, iv, salt, passcode);
    expect(decrypted).toBe(secretContent);
  });

  it('manages in-memory session key caching and auto-lock lifecycle', () => {
    expect(getCachedSessionPasscode()).toBeNull();

    cacheSessionPasscode('SessionSecret123', 5000);
    expect(getCachedSessionPasscode()).toBe('SessionSecret123');

    lockSessionVault();
    expect(getCachedSessionPasscode()).toBeNull();
  });

  it('enforces exponential backoff on repeated failed passcode attempts', async () => {
    const pass = 'CorrectPass123';
    const hash = await hashSecurityInputSecure(pass);

    expect(getRateLimitBackoffSeconds()).toBe(0);

    // 1st failed attempt -> 1s backoff
    await verifySecurityInputSecure('wrong1', hash);
    expect(getRateLimitBackoffSeconds()).toBeGreaterThanOrEqual(1);

    // Attempting during backoff throws rate limit error
    await expect(verifySecurityInputSecure('wrong2', hash)).rejects.toThrow(/Too many incorrect attempts/);
  });
});
