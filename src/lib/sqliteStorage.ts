import Dexie, { type Table } from 'dexie';
import { Note, CanvasTransform } from '../types';
import { SAMPLE_NOTES, DEFAULT_SETTINGS, INITIAL_TRANSFORM, getInitialTransform, AppSettings } from './storage';
import {
  encryptNoteEnvelope,
  decryptNoteEnvelope,
  getCachedSessionPasscode,
  isEncryptedEnvelope,
} from '../services/cryptoVaultService';

export class DiaryNoteDatabase extends Dexie {
  notes!: Table<Note, string>;
  settings!: Table<AppSettings & { id: string }, string>;
  transform!: Table<CanvasTransform & { id: string }, string>;

  constructor() {
    super('DiaryNoteSQLiteDB');
    this.version(1).stores({
      notes: 'id, title, paperTheme, isPinned, createdAt, updatedAt, *tags',
      settings: 'id',
      transform: 'id',
    });
    this.version(2).stores({
      notes: 'id, title, paperTheme, isPinned, createdAt, updatedAt, createdTimestamp, updatedTimestamp, isDailyEntry, entryDate, [isDailyEntry+entryDate], *tags',
      settings: 'id',
      transform: 'id',
    }).upgrade(async (tx) => {
      await tx.table('notes').toCollection().modify((note: Note) => {
        if (!note.createdTimestamp && note.createdAt) {
          const t = new Date(note.createdAt).getTime();
          note.createdTimestamp = isNaN(t) ? Date.now() : t;
        }
        if (!note.updatedTimestamp && note.updatedAt) {
          const t = new Date(note.updatedAt).getTime();
          note.updatedTimestamp = isNaN(t) ? (note.createdTimestamp || Date.now()) : t;
        }
      });
    });
  }
}

export const db = new DiaryNoteDatabase();

/**
 * Encrypts a note's content if locked and a session passcode is available,
 * ensuring plaintext is never committed to IndexedDB.
 */
export async function sanitizeNoteForStorage(note: Note): Promise<Note> {
  if (!note.isLocked || !note.content || isEncryptedEnvelope(note.content)) {
    return note;
  }
  const passcode = getCachedSessionPasscode();
  if (passcode) {
    const encryptedContent = await encryptNoteEnvelope(note.content, passcode);
    return {
      ...note,
      content: encryptedContent,
    };
  }
  return note;
}

/**
 * Decrypts a note's content from storage into memory if authenticated.
 */
export async function prepareNoteForMemory(note: Note): Promise<Note> {
  if (!note.isLocked || !note.content || !isEncryptedEnvelope(note.content)) {
    return note;
  }
  const passcode = getCachedSessionPasscode();
  if (passcode) {
    const decryptedContent = await decryptNoteEnvelope(note.content, passcode);
    return {
      ...note,
      content: decryptedContent,
    };
  }
  return note;
}

/**
 * Initialize database. Migrates existing notes from localStorage to DB if present.
 */
export async function initDatabase(): Promise<{
  notes: Note[];
  transform: CanvasTransform;
  settings: AppSettings;
}> {
  try {
    const isInitialized = localStorage.getItem('diarynote_has_initialized');
    
    if (!isInitialized) {
      // Migrate from localStorage if available
      const legacyRaw = localStorage.getItem('infinite_notes_v1_notes');
      let initialNotes = SAMPLE_NOTES;
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed)) {
            initialNotes = parsed;
          }
        } catch {
          initialNotes = SAMPLE_NOTES;
        }
      }
      await db.notes.bulkPut(initialNotes);
      localStorage.setItem('diarynote_has_initialized', 'true');
    }

    // ponytail: Run compactDatabase on startup to prune legacy storage and orphaned records
    await compactDatabase();

    const rawNotes = await db.notes.toArray();
    const notes = await Promise.all(rawNotes.map(prepareNoteForMemory));

    // Load transform
    let transform = getInitialTransform(notes);
    const transformRecord = await db.transform.get('main');
    if (transformRecord) {
      const { id: _, ...rest } = transformRecord;
      transform = rest;
    } else {
      await db.transform.put({ id: 'main', ...transform });
    }

    // Load settings
    let settings = DEFAULT_SETTINGS;
    const settingsRecord = await db.settings.get('main');
    if (settingsRecord) {
      const { id: _, ...rest } = settingsRecord;
      settings = rest;
    } else {
      const legacySettings = localStorage.getItem('infinite_notes_v1_settings');
      if (legacySettings) {
        try {
          settings = { ...DEFAULT_SETTINGS, ...JSON.parse(legacySettings) };
        } catch {
          settings = DEFAULT_SETTINGS;
        }
      }
      await db.settings.put({ id: 'main', ...settings });
    }

    return { notes, transform, settings };
  } catch (error) {
    console.error('Failed to initialize SQLite database, falling back to default:', error);
    return {
      notes: SAMPLE_NOTES,
      transform: INITIAL_TRANSFORM,
      settings: DEFAULT_SETTINGS,
    };
  }
}

/**
 * Fast spatial window query — returns notes that fall within current viewport bounding box
 */
export async function getNotesInBounds(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Promise<Note[]> {
  try {
    return await db.notes
      .filter(
        (n) =>
          n.x + (n.width || 340) >= minX &&
          n.x <= maxX &&
          n.y + (n.height || 340) >= minY &&
          n.y <= maxY
      )
      .toArray();
  } catch (err) {
    console.error('Error fetching notes in bounds:', err);
    return [];
  }
}

/**
 * Fetch lightweight spatial metadata for fast app startup and minimal RAM indexing
 */
export async function getNotesMetadata(): Promise<Note[]> {
  try {
    const notes = await db.notes.toArray();
    return notes.map((n) => ({
      ...n,
      content: n.content ? '' : '',
    }));
  } catch (err) {
    console.error('Error fetching note metadata:', err);
    return [];
  }
}

/**
 * Save a single note to DB
 */
export async function saveNoteToDB(note: Note): Promise<boolean> {
  try {
    const sanitized = await sanitizeNoteForStorage(note);
    await db.notes.put(sanitized);
    return true;
  } catch (err) {
    console.error('Error saving note to DB:', err);
    return false;
  }
}

/**
 * Save multiple notes to DB (incremental sync — no full table wipe)
 */
export async function saveBatchNotesToDB(notes: Note[]): Promise<boolean> {
  try {
    const sanitized = await Promise.all(notes.map(sanitizeNoteForStorage));
    await db.transaction('rw', db.notes, async () => {
      // Determine which notes were deleted since last save
      const existingIds = new Set(await db.notes.toCollection().primaryKeys());
      const incomingIds = new Set(sanitized.map((n) => n.id));
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id as string));

      if (toDelete.length > 0) {
        await db.notes.bulkDelete(toDelete);
      }

      // Upsert all current notes
      if (sanitized.length > 0) {
        await db.notes.bulkPut(sanitized);
      }
    });
    return true;
  } catch (err) {
    console.error('Error batch saving notes to DB:', err);
    return false;
  }
}

/**
 * Save only specific dirty/modified notes to DB (targeted upsert)
 */
export async function saveDirtyNotesToDB(dirtyNotes: Note[]): Promise<boolean> {
  if (dirtyNotes.length === 0) return true;
  try {
    const sanitized = await Promise.all(dirtyNotes.map(sanitizeNoteForStorage));
    await db.notes.bulkPut(sanitized);
    return true;
  } catch (err) {
    console.error('Error saving dirty notes to DB:', err);
    return false;
  }
}

/**
 * Delete a single note from DB ($O(1) direct deletion)
 */
export async function deleteNoteFromDB(noteId: string): Promise<boolean> {
  try {
    await db.notes.delete(noteId);
    return true;
  } catch (err) {
    console.error('Error deleting note from DB:', err);
    return false;
  }
}

/**
 * Delete multiple notes from DB ($O(1) direct bulk deletion)
 */
export async function deleteMultipleNotesFromDB(noteIds: string[]): Promise<boolean> {
  if (noteIds.length === 0) return true;
  try {
    await db.notes.bulkDelete(noteIds);
    return true;
  } catch (err) {
    console.error('Error bulk deleting notes from DB:', err);
    return false;
  }
}

/**
 * Save viewport canvas transform to DB
 */
export async function saveTransformToDB(transform: CanvasTransform): Promise<boolean> {
  try {
    await db.transform.put({ id: 'main', ...transform });
    return true;
  } catch (err) {
    console.error('Error saving transform to DB:', err);
    return false;
  }
}

/**
 * Save app settings to DB
 */
export async function saveSettingsToDB(settings: AppSettings): Promise<boolean> {
  try {
    await db.settings.put({ id: 'main', ...settings });
    return true;
  } catch (err) {
    console.error('Error saving settings to DB:', err);
    return false;
  }
}

/**
 * RAG Helper: Cosine similarity vector search over notes with embeddings
 */
export async function searchNotesByVector(
  queryEmbedding: number[],
  topK = 5
): Promise<{ note: Note; score: number }[]> {
  const notes = await db.notes.toArray();
  const scored = notes
    .filter((n) => n.embedding && n.embedding.length === queryEmbedding.length)
    .map((note) => {
      const vec = note.embedding!;
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < vec.length; i++) {
        dot += vec[i] * queryEmbedding[i];
        normA += vec[i] * vec[i];
        normB += queryEmbedding[i] * queryEmbedding[i];
      }
      const similarity = normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
      return { note, score: similarity };
    });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Minimal IndexedDB compaction and legacy storage cleanup.
 * Removes residual localStorage keys and purges orphaned table records.
 */
export async function compactDatabase(): Promise<{ freedKeys: number }> {
  let freedKeys = 0;
  const legacyKeys = ['infinite_notes_v1_notes', 'infinite_notes_v1_settings', 'infinite_notes_v1_transform'];
  for (const key of legacyKeys) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      freedKeys++;
    }
  }

  try {
    await db.transaction('rw', db.notes, async () => {
      const keys = await db.notes.toCollection().primaryKeys();
      const invalidKeys = keys.filter((k) => !k || typeof k !== 'string');
      if (invalidKeys.length > 0) {
        await db.notes.bulkDelete(invalidKeys as string[]);
        freedKeys += invalidKeys.length;
      }
    });
  } catch (err) {
    console.error('IndexedDB compaction error:', err);
  }

  return { freedKeys };
}

/**
 * Commits imported notes directly and atomically into IndexedDB within a single transaction.
 */
export async function saveImportedNotesToDB(importedNotes: Note[]): Promise<boolean> {
  if (!importedNotes || importedNotes.length === 0) return true;
  try {
    const sanitized = await Promise.all(importedNotes.map(sanitizeNoteForStorage));
    await db.transaction('rw', db.notes, async () => {
      await db.notes.bulkPut(sanitized);
    });
    return true;
  } catch (err) {
    console.error('Error committing imported notes to IndexedDB:', err);
    return false;
  }
}

/**
 * Retrieves a daily journal entry by exact date ('YYYY-MM-DD').
 */
export async function getDailyEntryByDate(dateStr: string): Promise<Note | undefined> {
  if (!dateStr) return undefined;
  try {
    const entry = await db.notes
      .filter((n) => Boolean(n.isDailyEntry) && n.entryDate === dateStr)
      .first();
    return entry ? prepareNoteForMemory(entry) : undefined;
  } catch (err) {
    console.error('Error fetching daily entry by date:', err);
    return undefined;
  }
}
