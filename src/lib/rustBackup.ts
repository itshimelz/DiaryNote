import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from './rustStorage';
import { Note, CanvasTransform } from '../types';
import { AppSettings } from './storage';

export interface BackupManifest {
  formatVersion: string;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  noteCount: number;
  assetHashes: string[];
  metadata?: Record<string, unknown>;
}

export interface VaultExportSummary {
  filePath: string;
  fileName: string;
  noteCount: number;
  assetCount: number;
  sizeBytes: number;
}

export interface VaultArchiveInspection {
  manifest: BackupManifest;
  notes: Note[];
  transform?: CanvasTransform;
  settings?: AppSettings;
  assetCount: number;
}

export interface VaultImportSummary {
  notesImported: number;
  notesOverwritten: number;
  notesSkipped: number;
  assetsImported: number;
}

export type ConflictResolutionMode = 'keep-both' | 'overwrite' | 'skip';

/**
 * Creates an online point-in-time backup archive of the active vault.
 */
export async function exportVaultArchive(targetPath?: string): Promise<VaultExportSummary | null> {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    return await invoke<VaultExportSummary>('export_vault_archive', { targetPath });
  } catch (err) {
    console.error('Failed to export vault archive:', err);
    throw err;
  }
}

/**
 * Inspects a .diarynote archive without modifying vault state.
 */
export async function inspectVaultArchive(archivePath: string): Promise<VaultArchiveInspection | null> {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    return await invoke<VaultArchiveInspection>('inspect_vault_archive', { archivePath });
  } catch (err) {
    console.error('Failed to inspect vault archive:', err);
    throw err;
  }
}

/**
 * Imports notes, assets, and settings from a .diarynote archive into the native vault.
 */
export async function importVaultArchive(
  archivePath: string,
  conflictMode: ConflictResolutionMode = 'keep-both',
  includeSettings = false
): Promise<VaultImportSummary | null> {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    return await invoke<VaultImportSummary>('import_vault_archive', {
      archivePath,
      conflictMode,
      includeSettings,
    });
  } catch (err) {
    console.error('Failed to import vault archive:', err);
    throw err;
  }
}
