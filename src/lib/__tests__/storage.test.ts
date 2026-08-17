import { describe, it, expect, beforeEach } from 'vitest';
import {
  initDatabase,
  saveNoteToDB,
  saveDirtyNotesToDB,
  deleteNoteFromDB,
  deleteMultipleNotesFromDB,
  saveCanvasTransformToDB,
  saveAppSettingsToDB,
  checkDatabaseIntegrity,
  resetMockStorage,
} from '../rustStorage';
import { Note } from '../../types';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadTransform,
  saveTransform,
  exportBackup,
  exportNotesBackup,
} from '../storage';
import { validateAndParseBackupContent } from '../../schemas/backupSchema';
import { setMasterSessionUnlocked } from '../../services/authPolicyService';

function createTestNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id || `test-${Math.random().toString(36).substring(2, 7)}`,
    title: overrides.title || 'Test Note',
    content: overrides.content || '',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 340,
    height: overrides.height ?? 300,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    fontFamily: overrides.fontFamily || 'sans',
    fontSize: overrides.fontSize || 'sm',
    paperTheme: overrides.paperTheme || 'white',
    zIndex: overrides.zIndex ?? 1,
    ...overrides,
  };
}

describe('Storage Core & Rust Bridge (storage.ts & rustStorage.ts)', () => {
  beforeEach(async () => {
    localStorage.clear();
    resetMockStorage();
  });

  it('initializes database and seeds sample notes on first launch', async () => {
    const { notes, transform, settings } = await initDatabase();
    expect(notes.length).toBeGreaterThan(0);
    expect(transform).toBeDefined();
    expect(settings).toBeDefined();
  });

  it('saves and updates dirty notes via saveDirtyNotesToDB', async () => {
    const note1 = createTestNote({ id: 'n1', title: 'Note 1', content: 'Body 1' });
    const note2 = createTestNote({ id: 'n2', title: 'Note 2', content: 'Body 2' });

    const success = await saveDirtyNotesToDB([note1, note2]);
    expect(success).toBe(true);

    const { notes } = await initDatabase();
    expect(notes.some((n) => n.id === 'n1' && n.title === 'Note 1')).toBe(true);
    expect(notes.some((n) => n.id === 'n2' && n.title === 'Note 2')).toBe(true);
  });

  it('saves a single note via saveNoteToDB', async () => {
    const note = createTestNote({ id: 'single-1', title: 'Single Note' });
    const success = await saveNoteToDB(note);
    expect(success).toBe(true);

    const { notes } = await initDatabase();
    expect(notes.some((n) => n.id === 'single-1')).toBe(true);
  });

  it('deletes a single note from storage via deleteNoteFromDB', async () => {
    const note = createTestNote({ id: 'to-del', title: 'Delete Me' });
    await saveNoteToDB(note);

    const deleteSuccess = await deleteNoteFromDB('to-del');
    expect(deleteSuccess).toBe(true);

    const { notes } = await initDatabase();
    expect(notes.some((n) => n.id === 'to-del')).toBe(false);
  });

  it('deletes multiple notes from storage via deleteMultipleNotesFromDB', async () => {
    const note1 = createTestNote({ id: 'del-1' });
    const note2 = createTestNote({ id: 'del-2' });
    await saveDirtyNotesToDB([note1, note2]);

    const deleteSuccess = await deleteMultipleNotesFromDB(['del-1', 'del-2']);
    expect(deleteSuccess).toBe(true);

    const { notes } = await initDatabase();
    expect(notes.some((n) => n.id === 'del-1' || n.id === 'del-2')).toBe(false);
  });

  it('persists and loads canvas transform', async () => {
    const newTransform = { x: 500, y: -200, zoom: 1.5 };
    const success = await saveCanvasTransformToDB(newTransform);
    expect(success).toBe(true);

    saveTransform(newTransform);
    const loaded = loadTransform();
    expect(loaded.x).toBe(500);
    expect(loaded.y).toBe(-200);
    expect(loaded.zoom).toBe(1.5);
  });

  it('persists and loads app settings', async () => {
    const newSettings = { ...DEFAULT_SETTINGS, defaultFont: 'sans' as const, snapToGrid: true };
    const success = await saveAppSettingsToDB(newSettings);
    expect(success).toBe(true);

    saveSettings(newSettings);
    const loaded = loadSettings();
    expect(loaded.defaultFont).toBe('sans');
    expect(loaded.snapToGrid).toBe(true);
  });

  it('verifies database integrity', async () => {
    const isHealthy = await checkDatabaseIntegrity();
    expect(isHealthy).toBe(true);
  });

  it('redacts unauthenticated locked notes when exporting workspace backup', async () => {
    setMasterSessionUnlocked(false);

    const publicNote = createTestNote({ id: 'p1', title: 'Public Note', content: 'Public Content' });
    const lockedNote = createTestNote({ id: 'l1', title: 'Locked Note', content: 'Secret Content', isLocked: true });

    const transform = { x: 0, y: 0, zoom: 1 };
    await exportBackup([publicNote, lockedNote], transform, DEFAULT_SETTINGS);

    // Also test selection backup exclusion
    const selectionRes = await exportNotesBackup([lockedNote]);
    expect(selectionRes).toBe('');
  });

  it('validates and parses valid backup content via schema', () => {
    const validPayload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: [createTestNote({ id: 'b1', title: 'Backup Note' })],
      transform: { x: 100, y: 100, zoom: 1 },
      settings: DEFAULT_SETTINGS,
    });

    const parsed = validateAndParseBackupContent(validPayload);
    expect(parsed.notes.length).toBe(1);
    expect(parsed.notes[0].id).toBe('b1');
    expect(parsed.transform?.x).toBe(100);
  });
});
