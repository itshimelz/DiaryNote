import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment as isTauriAvailable } from './rustStorage';

export interface AssetInfo {
  hash: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  extension?: string;
  assetUri: string;
  thumbnailUri?: string;
}


/**
 * Validates that a string is a 64-character hexadecimal SHA-256 hash.
 */
export function isValidAssetHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') return false;
  const clean = hash.trim();
  return /^[a-f0-9]{64}$/i.test(clean);
}

/**
 * Checks if a URI string is a native Content-Addressable Asset URI (diarynote-asset://).
 */
export function isAssetUri(uri: string | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('diarynote-asset://');
}

/**
 * Resolves a custom diarynote-asset:// URI for a given SHA-256 hash.
 */
export function getAssetUri(hash: string, isThumbnail = false): string {
  const cleanHash = hash.replace('diarynote-asset://', '').replace(/\?.*$/, '').trim();
  return `diarynote-asset://${cleanHash}${isThumbnail ? '?thumb=1' : ''}`;
}

/**
 * Saves raw byte array into the native Content-Addressable Asset Store.
 */
export async function saveAssetFromBytes(
  data: Uint8Array | number[],
  filename?: string
): Promise<AssetInfo> {
  if (!isTauriAvailable()) {
    // Web fallback: construct mock metadata
    const size = data instanceof Uint8Array ? data.length : data.length;
    const mockHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return {
      hash: mockHash,
      mimeType: filename?.endsWith('.png') ? 'image/png' : 'image/jpeg',
      sizeBytes: size,
      createdAt: new Date().toISOString(),
      assetUri: `diarynote-asset://${mockHash}`,
      thumbnailUri: `diarynote-asset://${mockHash}?thumb=1`,
    };
  }

  const payload = data instanceof Uint8Array ? Array.from(data) : data;
  return await invoke<AssetInfo>('save_asset_from_bytes', {
    data: payload,
    filename: filename || null,
  });
}

/**
 * Imports a file by filesystem path into the native Content-Addressable Asset Store.
 */
export async function saveAssetFromPath(path: string): Promise<AssetInfo> {
  if (!isTauriAvailable()) {
    throw new Error('Native path import is only available in desktop environment');
  }

  return await invoke<AssetInfo>('save_asset_from_path', { path });
}

/**
 * Retrieves metadata for a stored asset hash.
 */
export async function getAssetInfo(hash: string): Promise<AssetInfo> {
  if (!isTauriAvailable()) {
    throw new Error('getAssetInfo is only available in desktop environment');
  }

  return await invoke<AssetInfo>('get_asset_info', { hash });
}

/**
 * Deletes an asset and its thumbnail from the native store.
 */
export async function deleteAsset(hash: string): Promise<void> {
  if (!isTauriAvailable()) {
    return;
  }

  await invoke<void>('delete_asset', { hash });
}
