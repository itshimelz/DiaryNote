import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  exportVaultArchive,
  inspectVaultArchive,
  importVaultArchive,
} from '../rustBackup';
import { isTauriEnvironment } from '../rustStorage';

describe('rustBackup bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects non-Tauri environment in standard vitest runner', () => {
    expect(isTauriEnvironment()).toBe(false);
  });

  it('returns null gracefully when exporting outside Tauri', async () => {
    const res = await exportVaultArchive();
    expect(res).toBeNull();
  });

  it('returns null gracefully when inspecting outside Tauri', async () => {
    const res = await inspectVaultArchive('/tmp/fake.diarynote');
    expect(res).toBeNull();
  });

  it('returns null gracefully when importing outside Tauri', async () => {
    const res = await importVaultArchive('/tmp/fake.diarynote', 'keep-both', false);
    expect(res).toBeNull();
  });
});
