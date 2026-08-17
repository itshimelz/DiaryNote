import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchNotesFts, indexVaultNotesFts, clearVaultFtsIndex } from '../rustSearch';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('rustSearch bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it('delegates searchNotesFts to Tauri invoke', async () => {
    const mockResult = {
      total: 1,
      matches: [
        {
          note_id: 'note-1',
          title: 'React Architecture',
          snippet: 'Building <mark>canvas</mark> with Rust',
          rank: -12.5,
          is_vault: false,
          paper_theme: 'white',
          is_daily_entry: false,
          is_pinned: false,
          updated_at: '2026-08-17T00:00:00Z',
        },
      ],
    };
    (invoke as any).mockResolvedValueOnce(mockResult);

    const result = await searchNotesFts('canvas', { mood: 'happy' }, 20);
    expect(invoke).toHaveBeenCalledWith('search_notes', {
      query: 'canvas',
      filter: { mood: 'happy' },
      limit: 20,
    });
    expect(result.total).toBe(1);
    expect(result.matches[0].note_id).toBe('note-1');
  });

  it('delegates indexVaultNotesFts and clearVaultFtsIndex', async () => {
    (invoke as any).mockResolvedValue(undefined);

    await indexVaultNotesFts([]);
    expect(invoke).not.toHaveBeenCalled(); // empty array skipped

    await indexVaultNotesFts([{ id: 'n1', title: 'Sec', content: 'text' } as any]);
    expect(invoke).toHaveBeenCalledWith('index_vault_notes', {
      notes: [{ id: 'n1', title: 'Sec', content: 'text' }],
    });

    await clearVaultFtsIndex();
    expect(invoke).toHaveBeenCalledWith('clear_vault_fts_index');
  });
});
