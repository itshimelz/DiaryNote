/**
 * AES-GCM Encryption Utility for AI API Keys
 * Uses Web Crypto API (supported natively in Browsers and Tauri Desktop apps).
 */

const SALT_KEY = 'diarynote_ai_salt_v1';
const SECRET_SEED = 'diarynote_secure_key_seed_2026';

async function getDerivedKey(saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET_SEED),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
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
  const key = await getDerivedKey(salt);
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
 * Decrypts AES-GCM encrypted API key
 */
export async function decryptApiKey(ciphertext: string, ivStr: string): Promise<string> {
  if (!ciphertext || !ivStr) return '';
  try {
    const salt = getStoredSalt();
    const key = await getDerivedKey(salt);

    const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(ivStr), (c) => c.charCodeAt(0));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      ciphertextBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('Failed to decrypt API key:', err);
    return '';
  }
}
