/**
 * Hardware-Accelerated Security & Cryptography Adapter
 * Uses PBKDF2 with 600,000 rounds and random salts, falling back to legacy SHA-256 for backward compatibility.
 */

import {
  hashSecurityInputSecure,
  verifySecurityInputSecure,
  getRateLimitBackoffSeconds,
} from '../services/cryptoVaultService';

export async function hashSecurityInput(input: string): Promise<string> {
  return hashSecurityInputSecure(input);
}

export async function verifySecurityInput(input: string, storedHash: string): Promise<boolean> {
  return verifySecurityInputSecure(input, storedHash);
}

export { getRateLimitBackoffSeconds };
