import { invoke } from '@tauri-apps/api/core';
import { Note, CanvasTransform } from '../types';
import { AppSettings, SAMPLE_NOTES, DEFAULT_SETTINGS, INITIAL_TRANSFORM } from './storage';

/**
 * Detects if the application is running inside a Tauri native desktop environment.
 */
export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

export interface LoadedState {
  notes: Note[];
  transform: CanvasTransform;
  settings: AppSettings;
}

// In-memory fallback state for non-Tauri test environments (Vitest/DOM)
let mockNotes: Note[] | null = null;
let mockTransform: CanvasTransform | null = null;
let mockSettings: AppSettings | null = null;

function getMockNotes(): Note[] {
  if (!mockNotes) {
    mockNotes = Array.isArray(SAMPLE_NOTES) ? [...SAMPLE_NOTES] : [];
  }
  return mockNotes;
}

function getMockTransform(): CanvasTransform {
  if (!mockTransform) {
    mockTransform = INITIAL_TRANSFORM ? { ...INITIAL_TRANSFORM } : { x: 0, y: 0, zoom: 1 };
  }
  return mockTransform;
}

function getMockSettings(): AppSettings {
  if (!mockSettings) {
    mockSettings = DEFAULT_SETTINGS ? { ...DEFAULT_SETTINGS } : {
      gridType: 'dots',
      themeMode: 'gradient',
      defaultFont: 'sans',
      snapToGrid: false,
      showConnections: true,
      showMinimap: true,
      checkForUpdatesOnLaunch: true,
      enableAIServices: false,
      aiProvider: 'gemini',
      customBaseUrl: '',
      customModelName: '',
    };
  }
  return mockSettings;
}

/**
 * Resets the in-memory fallback storage (useful for isolated unit tests).
 */
export function resetMockStorage(initialNotes?: Note[]) {
  mockNotes = initialNotes ? [...initialNotes] : (Array.isArray(SAMPLE_NOTES) ? [...SAMPLE_NOTES] : []);
  mockTransform = INITIAL_TRANSFORM ? { ...INITIAL_TRANSFORM } : { x: 0, y: 0, zoom: 1 };
  mockSettings = DEFAULT_SETTINGS ? { ...DEFAULT_SETTINGS } : {
    gridType: 'dots',
    themeMode: 'gradient',
    defaultFont: 'sans',
    snapToGrid: false,
    showConnections: true,
    showMinimap: true,
    checkForUpdatesOnLaunch: true,
    enableAIServices: false,
    aiProvider: 'gemini',
    customBaseUrl: '',
    customModelName: '',
  };
}

/**
 * Initializes the database.
 * In desktop mode (Tauri):
 *  - Loads all notes, canvas transform, and settings directly from the native SQLite engine.
 *  - Seeds default sample notes if the SQLite database is completely fresh.
 * In test mode (outside Tauri):
 *  - Returns the in-memory state.
 */
export async function initDatabase(): Promise<LoadedState> {
  if (!isTauriEnvironment()) {
    return {
      notes: [...getMockNotes()],
      transform: { ...getMockTransform() },
      settings: { ...getMockSettings() },
    };
  }

  try {
    const state = await invoke<LoadedState>('load_app_state');

    // If SQLite is completely empty on fresh install, seed with default notes
    if (!state.notes || state.notes.length === 0) {
      const defaultNotes = Array.isArray(SAMPLE_NOTES) ? SAMPLE_NOTES : [];
      const defaultTransform = INITIAL_TRANSFORM || { x: 0, y: 0, zoom: 1 };
      const defaultSettings: AppSettings = DEFAULT_SETTINGS || {
        gridType: 'dots',
        themeMode: 'gradient',
        defaultFont: 'sans',
        snapToGrid: false,
        showConnections: true,
        showMinimap: true,
        checkForUpdatesOnLaunch: true,
        enableAIServices: false,
        aiProvider: 'gemini',
        customBaseUrl: '',
        customModelName: '',
      };

      await invoke<number>('save_notes_batch', { notes: defaultNotes });
      await invoke('save_canvas_transform', { transform: defaultTransform });
      await invoke('save_app_settings', { settings: defaultSettings });
      return {
        notes: defaultNotes,
        transform: defaultTransform,
        settings: defaultSettings,
      };
    }

    return state;
  } catch (error) {
    console.error('Failed to initialize native SQLite storage:', error);
    return {
      notes: [...getMockNotes()],
      transform: { ...getMockTransform() },
      settings: { ...getMockSettings() },
    };
  }
}

/**
 * Saves a single note to the native SQLite database.
 */
export async function saveNoteToDB(note: Note): Promise<boolean> {
  return saveDirtyNotesToDB([note]);
}

/**
 * Saves a batch of dirty/modified notes atomically to native SQLite.
 */
export async function saveDirtyNotesToDB(notes: Note[]): Promise<boolean> {
  if (!notes || notes.length === 0) return true;

  if (!isTauriEnvironment()) {
    const currentNotes = getMockNotes();
    const incomingMap = new Map(notes.map((n) => [n.id, n]));
    const updated = currentNotes.map((n) => (incomingMap.has(n.id) ? incomingMap.get(n.id)! : n));
    notes.forEach((n) => {
      if (!updated.some((existing) => existing.id === n.id)) {
        updated.push(n);
      }
    });
    mockNotes = updated;
    return true;
  }

  try {
    const count = await invoke<number>('save_notes_batch', { notes });
    return count >= 0;
  } catch (error) {
    console.error('Failed to save notes batch to native SQLite:', error);
    return false;
  }
}

/**
 * Deletes a single note from native SQLite.
 */
export async function deleteNoteFromDB(id: string): Promise<boolean> {
  return deleteMultipleNotesFromDB([id]);
}

/**
 * Deletes multiple notes from native SQLite.
 */
export async function deleteMultipleNotesFromDB(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;

  if (!isTauriEnvironment()) {
    const idSet = new Set(ids);
    mockNotes = getMockNotes().filter((n) => !idSet.has(n.id));
    return true;
  }

  try {
    const count = await invoke<number>('delete_notes', { ids });
    return count >= 0;
  } catch (error) {
    console.error('Failed to delete notes from native SQLite:', error);
    return false;
  }
}

/**
 * Saves canvas viewport camera transform.
 */
export async function saveCanvasTransformToDB(transform: CanvasTransform): Promise<boolean> {
  if (!isTauriEnvironment()) {
    mockTransform = { ...transform };
    return true;
  }

  try {
    await invoke('save_canvas_transform', { transform });
    return true;
  } catch (error) {
    console.error('Failed to save canvas transform to native SQLite:', error);
    return false;
  }
}

/**
 * Saves application settings.
 */
export async function saveAppSettingsToDB(settings: AppSettings): Promise<boolean> {
  if (!isTauriEnvironment()) {
    mockSettings = { ...settings };
    return true;
  }

  try {
    await invoke('save_app_settings', { settings });
    return true;
  } catch (error) {
    console.error('Failed to save app settings to native SQLite:', error);
    return false;
  }
}

/**
 * Verifies database integrity via PRAGMA quick_check.
 */
export async function checkDatabaseIntegrity(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return true;
  }

  try {
    return await invoke<boolean>('check_database_integrity');
  } catch (error) {
    console.error('Database integrity check failed:', error);
    return false;
  }
}

export interface DatabaseStats {
  dbPath: string;
  dbSizeBytes: number;
  walSizeBytes: number;
  totalNotes: number;
  totalAssets: number;
  totalAssetsSizeBytes: number;
  isIntegrityOk: boolean;
}

/**
 * Retrieves comprehensive database metrics (file sizes, counts, integrity).
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  if (!isTauriEnvironment()) {
    const notes = getMockNotes();
    return {
      dbPath: 'in-memory://diarynote.db',
      dbSizeBytes: JSON.stringify(notes).length * 2,
      walSizeBytes: 0,
      totalNotes: notes.length,
      totalAssets: 0,
      totalAssetsSizeBytes: 0,
      isIntegrityOk: true,
    };
  }

  try {
    return await invoke<DatabaseStats>('get_database_stats');
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      dbPath: 'Unknown',
      dbSizeBytes: 0,
      walSizeBytes: 0,
      totalNotes: 0,
      totalAssets: 0,
      totalAssetsSizeBytes: 0,
      isIntegrityOk: false,
    };
  }
}

/**
 * Performs database defragmentation and optimization (VACUUM; PRAGMA optimize;).
 */
export async function vacuumDatabase(): Promise<DatabaseStats> {
  if (!isTauriEnvironment()) {
    return getDatabaseStats();
  }

  try {
    return await invoke<DatabaseStats>('vacuum_database');
  } catch (error) {
    console.error('Failed to vacuum database:', error);
    throw error;
  }
}

/**
 * Formats and exports a single note to disk via native Rust backend.
 */
export async function exportNoteToFileNative(
  note: Note,
  format: 'md' | 'txt' | 'json',
  subfolder?: string
): Promise<string> {
  if (!isTauriEnvironment()) {
    return note.title || 'Untitled Note';
  }

  try {
    return await invoke<string>('export_note_to_file', {
      noteId: note.id,
      title: note.title || 'Untitled Note',
      content: note.content || '',
      exportFormat: format,
      tags: note.tags || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      subfolder: subfolder || 'Exports',
    });
  } catch (error) {
    console.error('Failed to export note natively:', error);
    throw error;
  }
}
