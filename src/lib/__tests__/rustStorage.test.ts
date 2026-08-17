import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initDatabase,
  saveDirtyNotesToDB,
  deleteMultipleNotesFromDB,
  saveCanvasTransformToDB,
  saveAppSettingsToDB,
  getDatabaseStats,
  vacuumDatabase,
  checkDatabaseIntegrity,
  isTauriEnvironment,
} from '../rustStorage';
import { Note } from '../../types';
import { DEFAULT_SETTINGS, INITIAL_TRANSFORM } from '../storage';

describe('rustStorage bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects non-Tauri environment in standard vitest runner', () => {
    expect(isTauriEnvironment()).toBe(false);
  });

  it('initializes database fallback gracefully when outside Tauri', async () => {
    const state = await initDatabase();
    expect(state).toBeDefined();
    expect(Array.isArray(state.notes)).toBe(true);
    expect(state.transform).toBeDefined();
    expect(state.settings).toBeDefined();
  });

  it('saves and deletes notes in fallback environment', async () => {
    const testNote: Note = {
      id: 'test-n-1',
      title: 'Rust Bridge Test',
      content: 'Testing storage',
      x: 10,
      y: 20,
      width: 380,
      height: 340,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fontFamily: 'sans',
      fontSize: 'md',
      paperTheme: 'white',
      zIndex: 1,
    };

    const saveSuccess = await saveDirtyNotesToDB([testNote]);
    expect(saveSuccess).toBe(true);

    const deleteSuccess = await deleteMultipleNotesFromDB(['test-n-1']);
    expect(deleteSuccess).toBe(true);
  });

  it('saves canvas transform and app settings in fallback environment', async () => {
    const transformSaved = await saveCanvasTransformToDB(INITIAL_TRANSFORM);
    expect(transformSaved).toBe(true);

    const settingsSaved = await saveAppSettingsToDB(DEFAULT_SETTINGS);
    expect(settingsSaved).toBe(true);
  });

  it('retrieves database stats, defragments, and checks integrity in fallback environment', async () => {
    const stats = await getDatabaseStats();
    expect(stats).toBeDefined();
    expect(stats.isIntegrityOk).toBe(true);
    expect(stats.dbPath).toContain('diarynote.db');

    const vacuumStats = await vacuumDatabase();
    expect(vacuumStats).toBeDefined();
    expect(vacuumStats.isIntegrityOk).toBe(true);

    const integrityOk = await checkDatabaseIntegrity();
    expect(integrityOk).toBe(true);
  });
});
