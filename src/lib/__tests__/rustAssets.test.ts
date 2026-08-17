import { describe, it, expect } from 'vitest';
import {
  isValidAssetHash,
  isAssetUri,
  getAssetUri,
  saveAssetFromBytes,
} from '../rustAssets';

describe('rustAssets bridge', () => {
  it('validates 64-char hex SHA-256 hash correctly', () => {
    const validHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(isValidAssetHash(validHash)).toBe(true);

    // Invalid length
    expect(isValidAssetHash('abc123')).toBe(false);
    // Invalid characters
    expect(isValidAssetHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8zz')).toBe(false);
    // Traversal / Empty
    expect(isValidAssetHash('')).toBe(false);
    expect(isValidAssetHash('../../etc/passwd')).toBe(false);
  });

  it('detects asset URI strings', () => {
    expect(isAssetUri('diarynote-asset://abc123hash')).toBe(true);
    expect(isAssetUri('diarynote-asset://abc123hash?thumb=1')).toBe(true);
    expect(isAssetUri('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
    expect(isAssetUri('https://example.com/image.png')).toBe(false);
    expect(isAssetUri(undefined)).toBe(false);
  });

  it('formats asset URIs and thumbnail variants', () => {
    const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(getAssetUri(hash)).toBe(`diarynote-asset://${hash}`);
    expect(getAssetUri(hash, true)).toBe(`diarynote-asset://${hash}?thumb=1`);
    expect(getAssetUri(`diarynote-asset://${hash}?thumb=1`, false)).toBe(`diarynote-asset://${hash}`);
  });

  it('provides safe web fallback for saveAssetFromBytes when outside Tauri', async () => {
    const mockBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const res = await saveAssetFromBytes(mockBytes, 'test.png');
    expect(res.sizeBytes).toBe(5);
    expect(res.mimeType).toBe('image/png');
    expect(res.hash.length).toBe(64);
    expect(res.assetUri).toContain('diarynote-asset://');
  });
});
