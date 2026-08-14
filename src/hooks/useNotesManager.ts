import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, CanvasTransform } from '../types';
import { AppSettings } from '../lib/storage';
import {
  initDatabase,
  saveDirtyNotesToDB,
  deleteNoteFromDB,
  deleteMultipleNotesFromDB,
} from '../lib/sqliteStorage';
import { getUniqueTitleForDay, getLocalDateString } from '../utils';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';

export function useNotesManager(
  pushHistorySnapshot: (notes: Note[]) => void,
  resetHistory: (notes: Note[]) => void
) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isDbLoadedRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHistoryNotesRef = useRef<Note[] | null>(null);
  const dirtyNoteIdsRef = useRef<Set<string>>(new Set());

  const flushPendingHistory = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    if (pendingHistoryNotesRef.current) {
      pushHistorySnapshot(pendingHistoryNotesRef.current);
      pendingHistoryNotesRef.current = null;
    }
  }, [pushHistorySnapshot]);

  // Initialize DB on mount
  const initAppDatabase = useCallback((
    onLoaded: (data: { transform: CanvasTransform; settings: AppSettings }) => void
  ) => {
    initDatabase().then(({ notes: dbNotes, transform: dbTransform, settings: dbSettings }) => {
      setNotes(dbNotes);
      resetHistory(dbNotes);
      isDbLoadedRef.current = true;
      setLastSavedAt(new Date());
      onLoaded({ transform: dbTransform, settings: dbSettings });
    });
  }, [resetHistory]);

  // Debounced autosave to SQLite DB (only after DB hydration to prevent initial jumps or state overwrites)
  useEffect(() => {
    if (!isDbLoadedRef.current) return;
    const timeout = window.setTimeout(async () => {
      const dirtyIds = new Set(dirtyNoteIdsRef.current);
      if (dirtyIds.size > 0) {
        setIsSaving(true);
        // Only write modified notes to DB
        const dirtyNotes = notes.filter(n => dirtyIds.has(n.id));
        const success = await saveDirtyNotesToDB(dirtyNotes);
        if (success) {
          // Remove processed IDs
          for (const id of dirtyIds) {
            dirtyNoteIdsRef.current.delete(id);
          }
          setLastSavedAt(new Date());
          setSaveError(null);
        } else {
          setSaveError('Failed to save changes to local database');
        }
        setIsSaving(false);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [notes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  // Flush dirty notes before window shutdown/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const dirtyIds = dirtyNoteIdsRef.current;
      if (dirtyIds.size > 0) {
        const dirtyNotes = notes.filter((n) => dirtyIds.has(n.id));
        if (dirtyNotes.length > 0) {
          saveDirtyNotesToDB(dirtyNotes);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [notes]);

  // Add new note handler
  const handleAddNote = useCallback(
    (
      transform: CanvasTransform,
      settings: AppSettings,
      customX?: number,
      customY?: number,
      initialTitle?: string,
      initialContent?: string
    ): string => {
      const newId = `note-${crypto.randomUUID()}`;

      let viewportX =
        typeof customX === 'number' && !isNaN(customX)
          ? customX
          : Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - 180);
      let viewportY =
        typeof customY === 'number' && !isNaN(customY)
          ? customY
          : Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - 150);

      if (settings.snapToGrid) {
        viewportX = Math.round(viewportX / 24) * 24;
        viewportY = Math.round(viewportY / 24) * 24;
      }

      const noteTitle = initialTitle || getUniqueTitleForDay('Untitled Note', newId, notes);

      const newNote: Note = {
        id: newId,
        title: noteTitle,
        content: initialContent || '',
        x: viewportX,
        y: viewportY,
        width: DEFAULT_NOTE_WIDTH,
        height: DEFAULT_NOTE_HEIGHT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fontFamily: settings.defaultFont || 'sans',
        fontSize: 'sm',
        paperTheme: 'white',
        activeMode: 'text',
        isPinned: false,
        zIndex: 1,
        tags: [],
      };

      setNotes((prevNotes) => {
        const maxZ = prevNotes.length > 0 ? Math.max(...prevNotes.map((n) => n.zIndex || 1)) : 1;
        const noteWithZ = { ...newNote, zIndex: maxZ + 1 };
        const updated = [...prevNotes, noteWithZ];
        pushHistorySnapshot(updated);
        return updated;
      });

      dirtyNoteIdsRef.current.add(newId);
      return newId;
    },
    [notes, pushHistorySnapshot]
  );

  // Create or focus daily journal entry
  const handleCreateOrFocusDailyEntry = useCallback(
    (
      transform: CanvasTransform,
      settings: AppSettings,
      targetDateStr?: string
    ): { noteId: string; isNew: boolean } => {
      const dateStr = targetDateStr || getLocalDateString();
      const todayStr = getLocalDateString();
      const formattedTitle = `${dateStr}`;

      // Search if a note for this date already exists
      const existingNote = notes.find(
        (n) => n.entryDate === dateStr || n.title === formattedTitle || n.title === dateStr
      );

      if (existingNote) {
        return { noteId: existingNote.id, isNew: false };
      }

      // Prevent creating daily entries for future dates
      if (dateStr > todayStr) {
        return { noteId: '', isNew: false };
      }

      // Create new daily note at current viewport center
      const newId = `journal-${dateStr}-${crypto.randomUUID()}`;
      let viewportX = Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - 190);
      let viewportY = Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - 170);

      if (settings.snapToGrid) {
        viewportX = Math.round(viewportX / 24) * 24;
        viewportY = Math.round(viewportY / 24) * 24;
      }

      const newNote: Note = {
        id: newId,
        title: formattedTitle,
        content: '',
        x: viewportX,
        y: viewportY,
        width: DEFAULT_NOTE_WIDTH,
        height: DEFAULT_NOTE_HEIGHT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fontFamily: settings.defaultFont || 'sans',
        fontSize: 'sm',
        paperTheme: 'cream',
        activeMode: 'text',
        isPinned: true,
        zIndex: (notes.length > 0 ? Math.max(...notes.map((n) => n.zIndex || 1)) : 1) + 1,
        tags: ['journal', 'daily'],
        isDailyEntry: true,
        entryDate: dateStr,
      };

      const updated = [...notes, newNote];
      setNotes(updated);
      pushHistorySnapshot(updated);
      dirtyNoteIdsRef.current.add(newId);
      return { noteId: newId, isNew: true };
    },
    [notes, pushHistorySnapshot]
  );

  // Single note update handler
  const handleUpdateNote = useCallback(
    (updated: Note) => {
      dirtyNoteIdsRef.current.add(updated.id);
      setNotes((prevNotes) => {
        const exists = prevNotes.some((n) => n.id === updated.id);
        const nextNotes = exists
          ? prevNotes.map((n) => (n.id === updated.id ? updated : n))
          : [...prevNotes, updated];

        pendingHistoryNotesRef.current = nextNotes;
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
          pushHistorySnapshot(nextNotes);
          pendingHistoryNotesRef.current = null;
        }, 400);

        return nextNotes;
      });
    },
    [pushHistorySnapshot]
  );

  // Batch note update handler (e.g. multi-select drag)
  const handleUpdateBatchNotes = useCallback(
    (updatedNotes: Note[]) => {
      updatedNotes.forEach((n) => dirtyNoteIdsRef.current.add(n.id));
      setNotes((prevNotes) => {
        const updatedMap = new Map(updatedNotes.map((n) => [n.id, n]));
        const nextNotes = prevNotes.map((n) => updatedMap.get(n.id) || n);

        pendingHistoryNotesRef.current = nextNotes;
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
          pushHistorySnapshot(nextNotes);
          pendingHistoryNotesRef.current = null;
        }, 400);

        return nextNotes;
      });
    },
    [pushHistorySnapshot]
  );

  // Single note deletion ($O(1) direct deletion with settlement)
  const handleDeleteNote = useCallback(
    (noteId: string) => {
      dirtyNoteIdsRef.current.delete(noteId);
      setNotes((prev) => {
        const nextNotes = prev.filter((n) => n.id !== noteId);
        pushHistorySnapshot(nextNotes);
        return nextNotes;
      });

      setIsSaving(true);
      deleteNoteFromDB(noteId)
        .then((success) => {
          if (success) {
            setSaveError(null);
          } else {
            setSaveError('Failed to delete note from local database');
          }
        })
        .catch((err) => {
          console.error('Error deleting note:', err);
          setSaveError('Failed to delete note from local database');
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [pushHistorySnapshot]
  );

  // Multiple notes deletion ($O(1) direct bulk deletion with settlement)
  const handleDeleteMultipleNotes = useCallback(
    (idsToDelete: string[]) => {
      if (idsToDelete.length === 0) return;
      idsToDelete.forEach((id) => dirtyNoteIdsRef.current.delete(id));
      setNotes((prev) => {
        const nextNotes = prev.filter((n) => !idsToDelete.includes(n.id));
        pushHistorySnapshot(nextNotes);
        return nextNotes;
      });

      setIsSaving(true);
      deleteMultipleNotesFromDB(idsToDelete)
        .then((success) => {
          if (success) {
            setSaveError(null);
          } else {
            setSaveError('Failed to delete notes from local database');
          }
        })
        .catch((err) => {
          console.error('Error deleting notes:', err);
          setSaveError('Failed to delete notes from local database');
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [pushHistorySnapshot]
  );

  // Reconcile and persist restored history snapshots (Undo/Redo)
  const handleRestoreNotes = useCallback((restoredNotes: Note[]) => {
    setNotes((currentNotes) => {
      const currentMap = new Map(currentNotes.map((n) => [n.id, n]));
      const restoredMap = new Map(restoredNotes.map((n) => [n.id, n]));

      // Mark modified or restored notes dirty
      for (const [id, note] of restoredMap.entries()) {
        const curr = currentMap.get(id);
        if (!curr || JSON.stringify(curr) !== JSON.stringify(note)) {
          dirtyNoteIdsRef.current.add(id);
        }
      }

      // Notes removed by undo (e.g. newly created note being undone)
      const deletedIds: string[] = [];
      for (const id of currentMap.keys()) {
        if (!restoredMap.has(id)) {
          deletedIds.push(id);
          dirtyNoteIdsRef.current.delete(id);
        }
      }

      if (deletedIds.length > 0) {
        deleteMultipleNotesFromDB(deletedIds);
      }

      return restoredNotes;
    });
  }, []);

  // Bring note to front (z-index)
  const bringToFront = useCallback((noteId: string) => {
    setNotes((prevNotes) => {
      if (prevNotes.length === 0) return prevNotes;
      const maxZ = Math.max(...prevNotes.map((n) => n.zIndex || 1), 1);
      const targetNote = prevNotes.find((n) => n.id === noteId);
      if (targetNote && targetNote.zIndex === maxZ && prevNotes.filter((n) => (n.zIndex || 1) === maxZ).length === 1) {
        return prevNotes;
      }
      dirtyNoteIdsRef.current.add(noteId);
      const nextNotes = prevNotes.map((n) => (n.id === noteId ? { ...n, zIndex: maxZ + 1 } : n));
      pendingHistoryNotesRef.current = nextNotes;
      return nextNotes;
    });
  }, []);

  return {
    notes,
    setNotes,
    lastSavedAt,
    isSaving,
    saveError,
    initAppDatabase,
    handleAddNote,
    handleCreateOrFocusDailyEntry,
    handleUpdateNote,
    handleUpdateBatchNotes,
    handleDeleteNote,
    handleDeleteMultipleNotes,
    handleRestoreNotes,
    bringToFront,
    flushPendingHistory,
  };
}
