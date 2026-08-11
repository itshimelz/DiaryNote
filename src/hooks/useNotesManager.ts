import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, CanvasTransform } from '../types';
import { loadNotes, SAMPLE_NOTES, AppSettings } from '../lib/storage';
import {
  initDatabase,
  saveBatchNotesToDB,
  saveDirtyNotesToDB,
} from '../lib/sqliteStorage';
import { getUniqueTitleForDay } from '../utils';

export function useNotesManager(
  pushHistorySnapshot: (notes: Note[]) => void,
  resetHistory: (notes: Note[]) => void
) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isDbLoadedRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dirtyNoteIdsRef = useRef<Set<string>>(new Set());

  // Initialize DB on mount
  const initAppDatabase = useCallback((
    onLoaded: (data: { transform: CanvasTransform; settings: AppSettings }) => void
  ) => {
    initDatabase().then(({ notes: dbNotes, transform: dbTransform, settings: dbSettings }) => {
      setNotes(dbNotes);
      resetHistory(dbNotes);
      isDbLoadedRef.current = true;
      onLoaded({ transform: dbTransform, settings: dbSettings });
    });
  }, [resetHistory]);

  // Debounced autosave to SQLite DB (only after DB hydration to prevent initial jumps or state overwrites)
  useEffect(() => {
    if (!isDbLoadedRef.current) return;
    const timeout = window.setTimeout(() => {
      const dirtyIds = dirtyNoteIdsRef.current;
      if (dirtyIds.size > 0) {
        // Only write modified notes to DB
        const dirtyNotes = notes.filter(n => dirtyIds.has(n.id));
        saveDirtyNotesToDB(dirtyNotes);
        dirtyNoteIdsRef.current = new Set();
      }
      setLastSavedAt(new Date());
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [notes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  // Add new note handler
  const handleAddNote = useCallback(
    (
      transform: CanvasTransform,
      settings: AppSettings,
      customX?: number,
      customY?: number
    ): string => {
      const newId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

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

      const initialTitle = getUniqueTitleForDay('Untitled Note', newId, notes);

      const newNote: Note = {
        id: newId,
        title: initialTitle,
        content: '',
        x: viewportX,
        y: viewportY,
        width: 380,
        height: 340,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fontFamily: settings.defaultFont || 'sans',
        fontSize: 'sm',
        paperTheme: 'white',
        activeMode: 'text',
        isPinned: false,
        zIndex: (notes.length > 0 ? Math.max(...notes.map((n) => n.zIndex || 1)) : 1) + 1,
        tags: [],
      };

      const updated = [...notes, newNote];
      setNotes(updated);
      pushHistorySnapshot(updated);
      return newId;
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

        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
          pushHistorySnapshot(nextNotes);
        }, 400);

        return nextNotes;
      });
    },
    [pushHistorySnapshot]
  );

  // Batch note update handler (e.g. multi-select drag)
  const handleUpdateBatchNotes = useCallback(
    (updatedNotes: Note[]) => {
      updatedNotes.forEach(n => dirtyNoteIdsRef.current.add(n.id));
      setNotes((prevNotes) => {
        const updatedMap = new Map(updatedNotes.map((n) => [n.id, n]));
        const nextNotes = prevNotes.map((n) => updatedMap.get(n.id) || n);

        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
          pushHistorySnapshot(nextNotes);
        }, 400);

        return nextNotes;
      });
    },
    [pushHistorySnapshot]
  );

  // Single note deletion
  const handleDeleteNote = useCallback(
    (noteId: string) => {
      setNotes((prev) => {
        const nextNotes = prev.filter((n) => n.id !== noteId);
        // Full sync needed for deletes (to remove from DB)
        saveBatchNotesToDB(nextNotes);
        pushHistorySnapshot(nextNotes);
        return nextNotes;
      });
    },
    [pushHistorySnapshot]
  );

  // Multiple notes deletion
  const handleDeleteMultipleNotes = useCallback(
    (idsToDelete: string[]) => {
      if (idsToDelete.length === 0) return;
      setNotes((prev) => {
        const nextNotes = prev.filter((n) => !idsToDelete.includes(n.id));
        // Full sync needed for deletes (to remove from DB)
        saveBatchNotesToDB(nextNotes);
        pushHistorySnapshot(nextNotes);
        return nextNotes;
      });
    },
    [pushHistorySnapshot]
  );

  // Bring note to front (z-index)
  const bringToFront = useCallback((noteId: string) => {
    setNotes((prevNotes) => {
      if (prevNotes.length === 0) return prevNotes;
      const maxZ = Math.max(...prevNotes.map((n) => n.zIndex || 1), 1);
      const targetNote = prevNotes.find((n) => n.id === noteId);
      if (targetNote && targetNote.zIndex === maxZ && prevNotes.filter((n) => (n.zIndex || 1) === maxZ).length === 1) {
        return prevNotes;
      }
      return prevNotes.map((n) => (n.id === noteId ? { ...n, zIndex: maxZ + 1 } : n));
    });
  }, []);

  return {
    notes,
    setNotes,
    lastSavedAt,
    initAppDatabase,
    handleAddNote,
    handleUpdateNote,
    handleUpdateBatchNotes,
    handleDeleteNote,
    handleDeleteMultipleNotes,
    bringToFront,
  };
}
