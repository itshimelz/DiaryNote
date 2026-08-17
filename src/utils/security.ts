/**
 * Hardware-Accelerated Security & Cryptography Adapter
 * Uses PBKDF2 with 600,000 rounds and random salts, falling back to legacy SHA-256 for backward compatibility.
 */

import {
  hashSecurityInput,
  verifySecurityInput,
} from '../lib/rustVault';
import { getRateLimitBackoffSeconds } from '../services/cryptoVaultService';

export { hashSecurityInput, verifySecurityInput, getRateLimitBackoffSeconds };
