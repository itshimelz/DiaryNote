/**
 * Cryptographic Vault Service (AES-256-GCM + PBKDF2 600,000 rounds)
 * Provides hardware-accelerated encryption at rest, session key caching,
 * and exponential backoff rate limiting.
 */

const PBKDF2_ITERATIONS = 600000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

// In-Memory Session Key Vault
interface SessionVaultState {
  cachedKey: CryptoKey | null;
  cachedPasscode: string | null;
  lastActiveTimestamp: number;
  autoLockTimeoutMs: number; // default 15 mins (900,000 ms)
  timeoutHandle: any | null;
}

const sessionVault: SessionVaultState = {
  cachedKey: null,
  cachedPasscode: null,
  lastActiveTimestamp: 0,
  autoLockTimeoutMs: 15 * 60 * 1000,
  timeoutHandle: null,
};

// Rate Limiter State for Passcode Verification
interface RateLimitState {
  failedAttempts: number;
  lockedUntil: number;
}

const rateLimitState: RateLimitState = {
  failedAttempts: 0,
  lockedUntil: 0,
};

/**
 * Checks remaining rate limit backoff in seconds (0 if unlocked).
 */
export function getRateLimitBackoffSeconds(): number {
  const now = Date.now();
  if (now < rateLimitState.lockedUntil) {
    return Math.ceil((rateLimitState.lockedUntil - now) / 1000);
  }
  return 0;
}

/**
 * Records a failed passcode attempt and calculates exponential backoff.
 */
export function recordFailedAttempt(): number {
  rateLimitState.failedAttempts += 1;
  // Exponential backoff: 2^(attempts - 1) seconds (1s, 2s, 4s, 8s, 16s, max 60s)
  const backoffSec = Math.min(60, Math.pow(2, Math.min(rateLimitState.failedAttempts - 1, 6)));
  rateLimitState.lockedUntil = Date.now() + backoffSec * 1000;
  return backoffSec;
}

/**
 * Resets the rate limiter after successful passcode entry.
 */
export function resetRateLimiter(): void {
  rateLimitState.failedAttempts = 0;
  rateLimitState.lockedUntil = 0;
}

/**
 * Derives a CryptoKey using PBKDF2 with SHA-256 and salt.
 */
async function deriveKeyFromPasscode(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Securely hashes a passcode or security answer with PBKDF2-SHA256 and random salt.
 * Returns format: $pbkdf2$600000$saltBase64$hashBase64
 */
export async function hashSecurityInputSecure(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(normalized),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));

  return `$pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

/**
 * Verifies an input string against stored hash (supports both modern $pbkdf2$ and legacy SHA-256).
 */
export async function verifySecurityInputSecure(input: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !input) return false;

  const backoff = getRateLimitBackoffSeconds();
  if (backoff > 0) {
    throw new Error(`Too many incorrect attempts. Please wait ${backoff} second(s).`);
  }

  const normalized = input.trim().toLowerCase();

  // Modern PBKDF2 format
  if (storedHash.startsWith('$pbkdf2$')) {
    const parts = storedHash.split('$');
    // ['', 'pbkdf2', iterations, saltB64, hashB64]
    if (parts.length === 5) {
      const iterations = parseInt(parts[2], 10) || PBKDF2_ITERATIONS;
      const saltB64 = parts[3];
      const expectedHashB64 = parts[4];

      const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
      const enc = new TextEncoder();

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(normalized),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );

      const derivedHashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
      const isValid = derivedHashB64 === expectedHashB64;

      if (isValid) {
        resetRateLimiter();
      } else {
        recordFailedAttempt();
      }
      return isValid;
    }
  }

  // Legacy SHA-256 fallback compatibility
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(normalized));
  const legacyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const isLegacyValid = legacyHash === storedHash;
  if (isLegacyValid) {
    resetRateLimiter();
  } else {
    recordFailedAttempt();
  }
  return isLegacyValid;
}

/**
 * Encrypts arbitrary plaintext with AES-256-GCM using derived key.
 */
export async function encryptNoteContent(
  plaintext: string,
  passcode: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  if (!plaintext) return { ciphertext: '', iv: '', salt: '' };

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKeyFromPasscode(passcode, salt);

  const enc = new TextEncoder();
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

/**
 * Decrypts AES-256-GCM ciphertext using passcode and stored salt/iv.
 */
export async function decryptNoteContent(
  ciphertextB64: string,
  ivB64: string,
  saltB64: string,
  passcode: string
): Promise<string> {
  if (!ciphertextB64 || !ivB64 || !saltB64) return '';

  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));

  const key = await deriveKeyFromPasscode(passcode, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Checks if a content string is stored in an encrypted envelope format.
 */
export function isEncryptedEnvelope(content?: string): boolean {
  return typeof content === 'string' && content.startsWith('$aes-gcm$');
}

/**
 * Encrypts plaintext into a self-contained $aes-gcm$ envelope string.
 */
export async function encryptNoteEnvelope(plaintext: string, passcode: string): Promise<string> {
  if (!plaintext) return '';
  if (isEncryptedEnvelope(plaintext)) return plaintext;
  const { ciphertext, iv, salt } = await encryptNoteContent(plaintext, passcode);
  return `$aes-gcm$${salt}$${iv}$${ciphertext}`;
}

/**
 * Decrypts a self-contained $aes-gcm$ envelope string using the provided passcode.
 */
export async function decryptNoteEnvelope(envelope: string, passcode: string): Promise<string> {
  if (!envelope || !isEncryptedEnvelope(envelope)) return envelope || '';
  const parts = envelope.split('$');
  // Expected parts: ['', 'aes-gcm', saltB64, ivB64, ciphertextB64]
  if (parts.length !== 5) return envelope;
  const saltB64 = parts[2];
  const ivB64 = parts[3];
  const ciphertextB64 = parts[4];
  return decryptNoteContent(ciphertextB64, ivB64, saltB64, passcode);
}

/**
 * Session Vault: Stores authenticated passcode in memory with auto-lock timer.
 */
export function cacheSessionPasscode(passcode: string, timeoutMs: number = 15 * 60 * 1000): void {
  sessionVault.cachedPasscode = passcode;
  sessionVault.lastActiveTimestamp = Date.now();
  sessionVault.autoLockTimeoutMs = timeoutMs;

  if (sessionVault.timeoutHandle) {
    clearTimeout(sessionVault.timeoutHandle);
  }

  sessionVault.timeoutHandle = setTimeout(() => {
    lockSessionVault();
  }, timeoutMs);
}

export function getCachedSessionPasscode(): string | null {
  if (!sessionVault.cachedPasscode) return null;

  const now = Date.now();
  if (now - sessionVault.lastActiveTimestamp > sessionVault.autoLockTimeoutMs) {
    lockSessionVault();
    return null;
  }

  sessionVault.lastActiveTimestamp = now;
  return sessionVault.cachedPasscode;
}

export function isSessionVaultUnlocked(): boolean {
  return getCachedSessionPasscode() !== null;
}

export function lockSessionVault(): void {
  sessionVault.cachedPasscode = null;
  sessionVault.cachedKey = null;
  sessionVault.lastActiveTimestamp = 0;
  if (sessionVault.timeoutHandle) {
    clearTimeout(sessionVault.timeoutHandle);
    sessionVault.timeoutHandle = null;
  }
}
