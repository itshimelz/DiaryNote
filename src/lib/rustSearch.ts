import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types';
import { isTauriEnvironment as isTauriAvailable } from './rustStorage';

export interface SearchFilter {
  tag?: string;
  mood?: string;
  is_pinned?: boolean;
  is_daily_entry?: boolean;
  entry_date?: string;
}

export interface SearchItemMatch {
  note_id: string;
  title: string;
  snippet: string;
  rank: number;
  is_vault: boolean;
  paper_theme: string;
  mood?: string;
  entry_date?: string;
  is_daily_entry: boolean;
  is_pinned: boolean;
  updated_at: string;
}

export interface SearchResultItem {
  total: number;
  matches: SearchItemMatch[];
}


/**
 * Executes a dual-tier full-text search against persistent SQLite FTS5 and in-memory vault index.
 */
export async function searchNotesFts(
  query: string,
  filter?: SearchFilter,
  limit?: number
): Promise<SearchResultItem> {
  if (!isTauriAvailable()) {
    // Web fallback: returns empty placeholder
    return { total: 0, matches: [] };
  }

  return await invoke<SearchResultItem>('search_notes', {
    query,
    filter: filter || null,
    limit: limit || null,
  });
}

/**
 * Indexes decrypted vault notes into the transient in-memory FTS5 table upon unlock.
 */
export async function indexVaultNotesFts(notes: Note[]): Promise<void> {
  if (!isTauriAvailable() || !notes || notes.length === 0) {
    return;
  }

  await invoke('index_vault_notes', { notes });
}

/**
 * Clears the transient in-memory vault FTS5 index upon vault lock or timeout.
 */
export async function clearVaultFtsIndex(): Promise<void> {
  if (!isTauriAvailable()) {
    return;
  }

  try {
    await invoke('clear_vault_fts_index');
  } catch (e) {
    console.warn('Failed to clear vault FTS index:', e);
  }
}
