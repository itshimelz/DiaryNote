import { invoke } from '@tauri-apps/api/core';
import { Note, CanvasTransform } from '../types';
import { AppSettings, SAMPLE_NOTES, DEFAULT_SETTINGS, INITIAL_TRANSFORM } from './storage';
import * as indexedDb from './indexedDbStorage';

/**
 * Detects if the application is running inside a Tauri native environment.
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

/**
 * Initializes the database.
 * If in Tauri:
 *  - Checks if IndexedDB data exists that needs migration to native SQLite.
 *  - Loads all notes, canvas transform, and settings directly from the native SQLite engine.
 * If outside Tauri:
 *  - Falls back gracefully to IndexedDB.
 */
export async function initDatabase(): Promise<LoadedState> {
  if (!isTauriEnvironment()) {
    return indexedDb.initDatabase();
  }

  try {
    const isMigrated = localStorage.getItem('diarynote_migrated_to_sqlite');
    if (!isMigrated) {
      // Migrate existing IndexedDB notes on first native launch
      try {
        const idbState = await indexedDb.initDatabase();
        if (idbState.notes && idbState.notes.length > 0) {
          await invoke<number>('save_notes_batch', { notes: idbState.notes });
          await invoke('save_canvas_transform', { transform: idbState.transform });
          await invoke('save_app_settings', { settings: idbState.settings });
        }
      } catch (err) {
        console.warn('IndexedDB migration to SQLite skipped or empty:', err);
      }
      localStorage.setItem('diarynote_migrated_to_sqlite', 'true');
    }

    const state = await invoke<LoadedState>('load_app_state');

    // If SQLite is completely empty, initialize with default sample notes
    if (!state.notes || state.notes.length === 0) {
      await invoke<number>('save_notes_batch', { notes: SAMPLE_NOTES });
      await invoke('save_canvas_transform', { transform: INITIAL_TRANSFORM });
      await invoke('save_app_settings', { settings: DEFAULT_SETTINGS });
      return {
        notes: SAMPLE_NOTES,
        transform: INITIAL_TRANSFORM,
        settings: DEFAULT_SETTINGS,
      };
    }

    return state;
  } catch (error) {
    console.error('Failed to initialize native SQLite storage, falling back to IndexedDB:', error);
    return indexedDb.initDatabase();
  }
}

/**
 * Saves a batch of dirty/modified notes atomically to native SQLite (or IndexedDB fallback).
 */
export async function saveDirtyNotesToDB(notes: Note[]): Promise<boolean> {
  if (!notes || notes.length === 0) return true;

  if (!isTauriEnvironment()) {
    return indexedDb.saveDirtyNotesToDB(notes);
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
 * Deletes a single note from native SQLite (or IndexedDB fallback).
 */
export async function deleteNoteFromDB(id: string): Promise<boolean> {
  return deleteMultipleNotesFromDB([id]);
}

/**
 * Deletes multiple notes from native SQLite (or IndexedDB fallback).
 */
export async function deleteMultipleNotesFromDB(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;

  if (!isTauriEnvironment()) {
    return indexedDb.deleteMultipleNotesFromDB(ids);
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
    return indexedDb.saveTransformToDB(transform);
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
    return indexedDb.saveSettingsToDB(settings);
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
