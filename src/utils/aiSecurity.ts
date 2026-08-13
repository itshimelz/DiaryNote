/**
 * Hardware-Accelerated AES-GCM Encryption Utility for AI API Credentials
 * Uses Web Crypto API with high-entropy device-unique salt and keys.
 */

const SALT_KEY = 'diarynote_ai_salt_v2';
const DEVICE_ENTROPY_KEY = 'diarynote_ai_device_entropy_v1';
const LEGACY_SEED = 'diarynote_secure_key_seed_2026';

function getOrCreateDeviceEntropy(): string {
  let entropy = localStorage.getItem(DEVICE_ENTROPY_KEY);
  if (!entropy) {
    const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
    entropy = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_ENTROPY_KEY, entropy);
  }
  return entropy;
}

async function getDerivedKey(saltBytes: Uint8Array, useLegacySeed = false): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const seedString = useLegacySeed ? LEGACY_SEED : getOrCreateDeviceEntropy();

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(seedString),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 200000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function getStoredSalt(): Uint8Array {
  let stored = localStorage.getItem(SALT_KEY);
  if (!stored) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    stored = Array.from(salt).join(',');
    localStorage.setItem(SALT_KEY, stored);
    return salt;
  }
  return new Uint8Array(stored.split(',').map(Number));
}

/**
 * Encrypts raw API key using AES-GCM
 */
export async function encryptApiKey(apiKey: string): Promise<{ ciphertext: string; iv: string }> {
  if (!apiKey.trim()) return { ciphertext: '', iv: '' };

  const salt = getStoredSalt();
  const key = await getDerivedKey(salt, false);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(apiKey.trim())
  );

  const ciphertext = Array.from(new Uint8Array(encryptedBuffer))
    .map((b) => String.fromCharCode(b))
    .join('');

  const ivStr = Array.from(iv)
    .map((b) => String.fromCharCode(b))
    .join('');

  return {
    ciphertext: btoa(ciphertext),
    iv: btoa(ivStr),
  };
}

/**
 * Decrypts AES-GCM encrypted API key with legacy fallback support
 */
export async function decryptApiKey(ciphertext: string, ivStr: string): Promise<string> {
  if (!ciphertext || !ivStr) return '';

  const salt = getStoredSalt();
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(ivStr), (c) => c.charCodeAt(0));
  const dec = new TextDecoder();

  // 1. Try modern device-entropy key derivation
  try {
    const key = await getDerivedKey(salt, false);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      ciphertextBytes
    );
    return dec.decode(decryptedBuffer);
  } catch {
    // 2. Fallback to legacy seed for pre-existing configured keys
    try {
      const legacyKey = await getDerivedKey(salt, true);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        legacyKey,
        ciphertextBytes
      );
      return dec.decode(decryptedBuffer);
    } catch (legacyErr) {
      console.warn('Failed to decrypt API key:', legacyErr);
      return '';
    }
  }
}
