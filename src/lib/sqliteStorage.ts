import Dexie, { type Table } from 'dexie';
import { Note, CanvasTransform, GridType, CanvasTheme } from '../types';
import { SAMPLE_NOTES, DEFAULT_SETTINGS, INITIAL_TRANSFORM, getInitialTransform, AppSettings } from './storage';

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
  }
}

export const db = new DiaryNoteDatabase();

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

    const notes = await db.notes.toArray();

    // Load transform
    let transform = getInitialTransform(notes);
    const transformRecord = await db.transform.get('main');
    if (transformRecord) {
      const { id, ...rest } = transformRecord;
      transform = rest;
    } else {
      await db.transform.put({ id: 'main', ...transform });
    }

    // Load settings
    let settings = DEFAULT_SETTINGS;
    const settingsRecord = await db.settings.get('main');
    if (settingsRecord) {
      const { id, ...rest } = settingsRecord;
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
 * Save a single note to DB
 */
export async function saveNoteToDB(note: Note): Promise<void> {
  try {
    await db.notes.put(note);
  } catch (err) {
    console.error('Error saving note to DB:', err);
  }
}

/**
 * Save multiple notes to DB (incremental sync — no full table wipe)
 */
export async function saveBatchNotesToDB(notes: Note[]): Promise<void> {
  try {
    await db.transaction('rw', db.notes, async () => {
      // Determine which notes were deleted since last save
      const existingIds = new Set(await db.notes.toCollection().primaryKeys());
      const incomingIds = new Set(notes.map(n => n.id));
      const toDelete = [...existingIds].filter(id => !incomingIds.has(id as string));

      if (toDelete.length > 0) {
        await db.notes.bulkDelete(toDelete);
      }

      // Upsert all current notes
      if (notes.length > 0) {
        await db.notes.bulkPut(notes);
      }
    });
  } catch (err) {
    console.error('Error batch saving notes to DB:', err);
  }
}

/**
 * Save only specific dirty/modified notes to DB (targeted upsert)
 */
export async function saveDirtyNotesToDB(dirtyNotes: Note[]): Promise<void> {
  if (dirtyNotes.length === 0) return;
  try {
    await db.notes.bulkPut(dirtyNotes);
  } catch (err) {
    console.error('Error saving dirty notes to DB:', err);
  }
}

/**
 * Delete a note from DB
 */
export async function deleteNoteFromDB(noteId: string): Promise<void> {
  try {
    await db.notes.delete(noteId);
  } catch (err) {
    console.error('Error deleting note from DB:', err);
  }
}

/**
 * Save viewport canvas transform to DB
 */
export async function saveTransformToDB(transform: CanvasTransform): Promise<void> {
  try {
    await db.transform.put({ id: 'main', ...transform });
  } catch (err) {
    console.error('Error saving transform to DB:', err);
  }
}

/**
 * Save app settings to DB
 */
export async function saveSettingsToDB(settings: AppSettings): Promise<void> {
  try {
    await db.settings.put({ id: 'main', ...settings });
  } catch (err) {
    console.error('Error saving settings to DB:', err);
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
