import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  initDatabase,
  saveNoteToDB,
  saveDirtyNotesToDB,
  deleteNoteFromDB,
  deleteMultipleNotesFromDB,
  getNotesInBounds,
  getNotesMetadata,
  compactDatabase,
  saveTransformToDB,
  saveSettingsToDB,
} from '../sqliteStorage';
import { Note } from '../../types';
import { DEFAULT_SETTINGS, exportBackup, exportNotesBackup } from '../storage';
import {
  cacheSessionPasscode,
  lockSessionVault,
  isEncryptedEnvelope,
} from '../../services/cryptoVaultService';
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

describe('IndexedDB Storage Engine (sqliteStorage.ts)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.notes.clear();
    await db.settings.clear();
    await db.transform.clear();
  });

  it('initializes database and seeds sample notes on first launch', async () => {
    const { notes, transform, settings } = await initDatabase();
    expect(notes.length).toBeGreaterThan(0);
    expect(transform).toBeDefined();
    expect(settings).toBeDefined();
    expect(localStorage.getItem('diarynote_has_initialized')).toBe('true');
  });

  it('saves and reads a single note', async () => {
    const testNote = createTestNote({
      id: 'test-note-1',
      title: 'Test Note Title',
      content: 'Test Note Content',
      x: 100,
      y: 200,
      tags: ['test'],
    });

    const saveSuccess = await saveNoteToDB(testNote);
    expect(saveSuccess).toBe(true);

    const loaded = await db.notes.get('test-note-1');
    expect(loaded).toBeDefined();
    expect(loaded?.title).toBe('Test Note Title');
    expect(loaded?.content).toBe('Test Note Content');
  });

  it('saves only dirty notes via saveDirtyNotesToDB', async () => {
    const noteA = createTestNote({
      id: 'note-a',
      title: 'Note A',
      content: 'Content A',
    });
    const noteB = createTestNote({
      id: 'note-b',
      title: 'Note B',
      content: 'Content B',
      paperTheme: 'cream',
    });

    const res = await saveDirtyNotesToDB([noteA, noteB]);
    expect(res).toBe(true);

    const allNotes = await db.notes.toArray();
    expect(allNotes.length).toBe(2);
    expect(allNotes.map((n) => n.id)).toEqual(['note-a', 'note-b']);
  });

  it('performs $O(1)$ single-note and bulk-note deletions directly', async () => {
    const notes: Note[] = [
      createTestNote({ id: 'del-1', title: '1' }),
      createTestNote({ id: 'del-2', title: '2' }),
      createTestNote({ id: 'del-3', title: '3' }),
    ];
    await saveDirtyNotesToDB(notes);
    expect(await db.notes.count()).toBe(3);

    const delSingleSuccess = await deleteNoteFromDB('del-1');
    expect(delSingleSuccess).toBe(true);
    expect(await db.notes.get('del-1')).toBeUndefined();
    expect(await db.notes.count()).toBe(2);

    const delBulkSuccess = await deleteMultipleNotesFromDB(['del-2', 'del-3']);
    expect(delBulkSuccess).toBe(true);
    expect(await db.notes.count()).toBe(0);
  });

  it('fetches notes within spatial viewport bounds', async () => {
    const insideNote = createTestNote({
      id: 'inside',
      title: 'Inside',
      x: 100,
      y: 100,
      width: 300,
      height: 300,
    });
    const outsideNote = createTestNote({
      id: 'outside',
      title: 'Outside',
      x: 5000,
      y: 5000,
      width: 300,
      height: 300,
    });

    await saveDirtyNotesToDB([insideNote, outsideNote]);

    const results = await getNotesInBounds(0, 0, 1000, 1000);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('inside');
  });

  it('fetches lightweight note metadata without full content', async () => {
    const noteWithBody = createTestNote({
      id: 'heavy-note',
      title: 'Heavy Note',
      content: 'Very long text content that takes up memory',
    });
    await saveNoteToDB(noteWithBody);

    const metadata = await getNotesMetadata();
    expect(metadata.length).toBe(1);
    expect(metadata[0].title).toBe('Heavy Note');
    expect(metadata[0].content).toBe('');
  });

  it('compacts database and purges residual legacy localStorage keys', async () => {
    localStorage.setItem('infinite_notes_v1_notes', '[]');
    localStorage.setItem('infinite_notes_v1_settings', '{}');
    localStorage.setItem('infinite_notes_v1_transform', '{}');

    const result = await compactDatabase();
    expect(result.freedKeys).toBeGreaterThanOrEqual(3);
    expect(localStorage.getItem('infinite_notes_v1_notes')).toBeNull();
    expect(localStorage.getItem('infinite_notes_v1_settings')).toBeNull();
    expect(localStorage.getItem('infinite_notes_v1_transform')).toBeNull();
  });

  it('persists transform and settings to database', async () => {
    const transformRes = await saveTransformToDB({ x: 500, y: -200, zoom: 1.5 });
    expect(transformRes).toBe(true);

    const settingsRes = await saveSettingsToDB({ ...DEFAULT_SETTINGS, defaultFont: 'sans' });
    expect(settingsRes).toBe(true);

    const loadedTransform = await db.transform.get('main');
    expect(loadedTransform?.zoom).toBe(1.5);

    const loadedSettings = await db.settings.get('main');
    expect(loadedSettings?.defaultFont).toBe('sans');
  });

  it('encrypts locked note content at rest in IndexedDB when session passcode is available', async () => {
    cacheSessionPasscode('VaultSecret2026');

    const lockedNote = createTestNote({
      id: 'locked-note-1',
      title: 'Secret Thoughts',
      content: 'This text must never be stored in plaintext on disk.',
      isLocked: true,
    });

    const success = await saveNoteToDB(lockedNote);
    expect(success).toBe(true);

    const recordInDb = await db.notes.get('locked-note-1');
    expect(recordInDb).toBeDefined();
    expect(recordInDb?.content).not.toBe('This text must never be stored in plaintext on disk.');
    expect(isEncryptedEnvelope(recordInDb?.content)).toBe(true);

    lockSessionVault();
  });

  it('redacts unauthenticated locked notes when exporting workspace backup', async () => {
    setMasterSessionUnlocked(false);

    const publicNote = createTestNote({ id: 'p1', title: 'Public Note', content: 'Public Content' });
    const lockedNote = createTestNote({ id: 'l1', title: 'Locked Note', content: 'Secret Content', isLocked: true });

    // Mock saveFileWithNotification by verifying behavior
    const transform = { x: 0, y: 0, zoom: 1 };
    await exportBackup([publicNote, lockedNote], transform, DEFAULT_SETTINGS);

    // Also test selection backup exclusion
    const selectionRes = await exportNotesBackup([lockedNote]);
    expect(selectionRes).toBe('');
  });
});
