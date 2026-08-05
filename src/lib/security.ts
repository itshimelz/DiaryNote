// SHA-256 Password and Security Answer Hashing Utility using Web Crypto API

export async function hashSecurityInput(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySecurityInput(input: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  const hash = await hashSecurityInput(input);
  return hash === storedHash;
}
