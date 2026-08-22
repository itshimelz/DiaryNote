import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useCallback, useMemo } from 'react';
import { Note, CanvasTransform } from '../types';
import { AppSettings } from '../lib/storage';
import {
  saveDirtyNotesToDB,
  deleteNoteFromDB,
  deleteMultipleNotesFromDB,
  initDatabase,
} from '../lib/rustStorage';

/**
 * Single source of truth for notes, living OUTSIDE React.
 *
 * - `notesById`/`order` replace the old `notes: Note[]` state array.
 * - Persistence (dirty set + debounced SQLite save) runs inside actions, not effects.
 * - History integration goes through a bridge registered by the app (keeps the
 *   existing useHistoryState semantics untouched during migration).
 */

interface NotesState {
  notesById: Record<string, Note>;
  order: string[];
  /** Bumped only when geometry/membership changes (x/y/w/h, order, groups).
   *  Content-only edits (typing) do NOT bump it, so canvas-shell subscribers skip. */
  layoutVersion: number;
  /** Trailing-debounced (~300ms) counter for COARSE consumers (sidebar/stats/wrappers).
   *  Collapses per-keystroke fan-out into <=3 refreshes/sec during bursts. */
  listVersion: number;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: Date | null;

  hydrate: (dbNotes: Note[]) => void;
  insert: (note: Note) => string;
  update: (updated: Note) => void;
  updateBatch: (updates: Note[]) => void;
  remove: (noteId: string) => void;
  removeMany: (ids: string[]) => void;
  bringToFront: (noteId: string) => void;
  restore: (restoredNotes: Note[]) => void;
  flushHistory: () => void;
}

/** True when a mutation touched canvas-layout-relevant fields. */
function touchesLayout(prev: Note | undefined, next: Note): boolean {
  if (!prev) return true;
  return (
    prev.x !== next.x ||
    prev.y !== next.y ||
    prev.width !== next.width ||
    prev.height !== next.height ||
    prev.groupId !== next.groupId ||
    prev.groupName !== next.groupName ||
    prev.zIndex !== next.zIndex
  );
}

function bumpLayout(state: NotesState): Pick<NotesState, 'layoutVersion'> {
  return { layoutVersion: state.layoutVersion + 1 };
}

// ---------------------------------------------------------------------------
// Module-scoped machinery (never part of render state)
// ---------------------------------------------------------------------------

const dirtyIds = new Set<string>();
const dirtyUpdatedAt = new Map<string, string>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let historyTimer: ReturnType<typeof setTimeout> | undefined;
let historyPending: Note[] | null = null;
let flushRegistered = false;

type HistoryBridge = {
  commitSnapshot: (list: Note[]) => void;
  resetHistory: (list: Note[]) => void;
};

let historyBridge: HistoryBridge | null = null;

export function registerNotesHistoryBridge(bridge: HistoryBridge): void {
  historyBridge = bridge;
}

function toArray(state: NotesState): Note[] {
  return state.order.map((id) => state.notesById[id]);
}

function commitHistoryNow(list: Note[]): void {
  if (historyTimer !== undefined) {
    clearTimeout(historyTimer);
    historyTimer = undefined;
    historyPending = null;
  }
  historyBridge?.commitSnapshot(list);
}

/** Coalesced history push (typing bursts land as one diff after 400ms of quiet). */
function scheduleHistoryPush(list: Note[]): void {
  historyPending = list;
  if (historyTimer !== undefined) clearTimeout(historyTimer);
  historyTimer = setTimeout(() => {
    historyTimer = undefined;
    const pending = historyPending;
    historyPending = null;
    if (pending) historyBridge?.commitSnapshot(pending);
  }, 400);
}

function scheduleSave(): void {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = undefined;
    if (dirtyIds.size === 0) return;

    const snapUpdatedAt = new Map(dirtyUpdatedAt);
    const dirtySnap = [...dirtyIds];
    const dirtyNotes = toArray(useNotesStore.getState()).filter((n) => dirtyIds.has(n.id));
    if (dirtyNotes.length === 0) return;

    useNotesStore.setState({ isSaving: true });
    const startTime = Date.now();
    try {
      const success = await saveDirtyNotesToDB(dirtyNotes);
      if (success) {
        // Clear only ids whose note has not been re-dirtied while the IPC was in
        // flight (fixes the lost-update race where an edit during a save lost its
        // dirty flag until the next edit).
        for (const id of dirtySnap) {
          const note = useNotesStore.getState().notesById[id];
          if (note && note.updatedAt === snapUpdatedAt.get(id)) {
            dirtyIds.delete(id);
            dirtyUpdatedAt.delete(id);
          }
        }
        useNotesStore.setState({ lastSavedAt: new Date(), saveError: null });
      } else {
        useNotesStore.setState({ saveError: 'Failed to save changes to local database' });
      }
    } catch {
      useNotesStore.setState({ saveError: 'Failed to save changes to local database' });
    }
    const elapsed = Date.now() - startTime;
    if (elapsed < 350) {
      await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
    }
    useNotesStore.setState({ isSaving: false });
  }, 500);
}

function registerFlushListeners(): void {
  if (flushRegistered) return;
  flushRegistered = true;
  const handleImmediateFlush = () => {
    if (dirtyIds.size === 0) return;
    const dirtyNotes = toArray(useNotesStore.getState()).filter((n) => dirtyIds.has(n.id));
    if (dirtyNotes.length > 0) {
      void saveDirtyNotesToDB(dirtyNotes);
    }
  };
  window.addEventListener('beforeunload', handleImmediateFlush);
  window.addEventListener('blur', handleImmediateFlush);
}

let coarseTimer: ReturnType<typeof setTimeout> | undefined;
/** Trailing-debounced coarse-list notification: refreshes only after 400ms of quiet. */
function scheduleCoarse(): void {
  if (coarseTimer !== undefined) clearTimeout(coarseTimer);
  coarseTimer = setTimeout(() => {
    coarseTimer = undefined;
    useNotesStore.setState((prev) => ({ listVersion: prev.listVersion + 1 }));
  }, 400);
}

function markDirty(note: Note): void {
  dirtyIds.add(note.id);
  dirtyUpdatedAt.set(note.id, note.updatedAt);
}

function nextZ(state: NotesState): number {
  return state.order.reduce((m, id) => Math.max(m, state.notesById[id]?.zIndex || 1), 1) + 1;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector(() => ({
    notesById: {},
    order: [],
    layoutVersion: 0,
    listVersion: 0,
    isSaving: false,
    saveError: null,
    lastSavedAt: null,

    /** Replace full contents (DB hydration / bulk restore). */
    hydrate: (dbNotes: Note[]) => {
      const notesById: Record<string, Note> = {};
      const order: string[] = [];
      for (const n of dbNotes) {
        notesById[n.id] = n;
        order.push(n.id);
      }
      registerFlushListeners();
      historyBridge?.resetHistory(dbNotes);
      useNotesStore.setState((prev) => ({
        notesById,
        order,
        listVersion: prev.listVersion + 1,
        ...bumpLayout(prev),
      }));
    },

    /** Insert a fully-formed note; z-index is always assigned on top of current max
     *  (legacy updaters ignored creator-provided values). Commits history now. */
    insert: (note: Note): string => {
      useNotesStore.setState((s) => {
        const withZ = { ...note, zIndex: nextZ(s) };
        commitHistoryNow([...toArray(s), withZ]);
        markDirty(withZ);
        scheduleSave();
        return {
          notesById: { ...s.notesById, [withZ.id]: withZ },
          order: [...s.order, withZ.id],
          listVersion: s.listVersion + 1,
          ...bumpLayout(s),
        };
      });
      return note.id;
    },

    update: (updated: Note) => {
      useNotesStore.setState((s) => {
        const exists = !!s.notesById[updated.id];
        if (!exists) {
          const withZ = { ...updated, zIndex: nextZ(s) };
          commitHistoryNow([...toArray(s), withZ]);
          markDirty(withZ);
          scheduleSave();
          return {
            notesById: { ...s.notesById, [withZ.id]: withZ },
            order: [...s.order, withZ.id],
            listVersion: s.listVersion + 1,
            ...bumpLayout(s),
          };
        }
        const nextList = s.order.map((id) => (id === updated.id ? updated : s.notesById[id]));
        scheduleHistoryPush(nextList);
        markDirty(updated);
        scheduleSave();
        scheduleCoarse();
        // bringToFront-style z-only edits and pure content edits skip the canvas-shell bump;
        // geometry/group changes bump so culling/index subscribers refresh.
        return {
          notesById: { ...s.notesById, [updated.id]: updated },
          ...(touchesLayout(s.notesById[updated.id], updated) ? bumpLayout(s) : null),
        };
      });
    },

    updateBatch: (updates: Note[]) => {
      useNotesStore.setState((s) => {
        const updMap = new Map(updates.map((n) => [n.id, n]));
        const order = [...s.order];
        const nextById = { ...s.notesById };
        for (const [id, note] of updMap) {
          if (!nextById[id]) order.push(id);
          nextById[id] = note;
          markDirty(note);
        }
        const nextList = order.map((id) => nextById[id]);
        scheduleHistoryPush(nextList);
        scheduleSave();
        scheduleCoarse();
        const anyLayout = updates.some((n) => touchesLayout(s.notesById[n.id], n));
        return { notesById: nextById, order, ...(anyLayout ? bumpLayout(s) : null) };
      });
    },

    remove: (noteId: string) => {
      dirtyIds.delete(noteId);
      dirtyUpdatedAt.delete(noteId);
      useNotesStore.setState((s) => {
        if (!s.notesById[noteId]) return s;
        const nextList = toArray(s).filter((n) => n.id !== noteId);
        const nextById = { ...s.notesById };
        delete nextById[noteId];
        commitHistoryNow(nextList);
        return {
          notesById: nextById,
          order: s.order.filter((id) => id !== noteId),
          listVersion: s.listVersion + 1,
          ...bumpLayout(s),
        };
      });
      deleteNoteFromDB(noteId)
        .then((success) => {
          useNotesStore.setState(
            success
              ? { saveError: null }
              : { saveError: 'Failed to delete note from local database' }
          );
        })
        .catch(() => {
          useNotesStore.setState({ saveError: 'Failed to delete note from local database' });
        });
    },

    removeMany: (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      ids.forEach((id) => {
        dirtyIds.delete(id);
        dirtyUpdatedAt.delete(id);
      });
      useNotesStore.setState((s) => {
        const nextList = toArray(s).filter((n) => !idSet.has(n.id));
        const nextById = { ...s.notesById };
        ids.forEach((id) => delete nextById[id]);
        commitHistoryNow(nextList);
        return {
          notesById: nextById,
          order: s.order.filter((id) => !idSet.has(id)),
          listVersion: s.listVersion + 1,
          ...bumpLayout(s),
        };
      });
      deleteMultipleNotesFromDB(ids)
        .then((success) => {
          useNotesStore.setState(
            success
              ? { saveError: null }
              : { saveError: 'Failed to delete note from local database' }
          );
        })
        .catch(() => {
          useNotesStore.setState({ saveError: 'Failed to delete note from local database' });
        });
    },

    bringToFront: (noteId: string) => {
      useNotesStore.setState((s) => {
        const target = s.notesById[noteId];
        if (!target || s.order.length === 0) return s;
        let maxZ = 1;
        let topCount = 0;
        for (const id of s.order) {
          const z = s.notesById[id]?.zIndex || 1;
          if (z > maxZ) {
            maxZ = z;
            topCount = 1;
          } else if (z === maxZ) {
            topCount++;
          }
        }
        if (target.zIndex === maxZ && topCount === 1) return s;
        const bumped = { ...target, zIndex: maxZ + 1 };
        const nextList = s.order.map((id) => (id === noteId ? bumped : s.notesById[id]));
        // Legacy quirk preserved: pending history staged but not scheduled here.
        historyPending = nextList;
        markDirty(bumped);
        scheduleSave();
        scheduleCoarse();
        return { notesById: { ...s.notesById, [noteId]: bumped } };
      });
    },

    restore: (restoredNotes: Note[]) => {
      useNotesStore.setState((s) => {
        const restoredMap = new Map(restoredNotes.map((n) => [n.id, n]));

        for (const [id, note] of restoredMap) {
          if (s.notesById[id] !== note) {
            dirtyIds.add(id);
            dirtyUpdatedAt.set(id, note.updatedAt);
          }
        }

        const deletedIds: string[] = [];
        for (const id of Object.keys(s.notesById)) {
          if (!restoredMap.has(id)) {
            deletedIds.push(id);
            dirtyIds.delete(id);
            dirtyUpdatedAt.delete(id);
          }
        }
        if (deletedIds.length > 0) {
          deleteMultipleNotesFromDB(deletedIds).catch(() => {});
        }

        const notesById: Record<string, Note> = {};
        const order: string[] = [];
        for (const n of restoredNotes) {
          notesById[n.id] = n;
          order.push(n.id);
        }
        scheduleSave();
        return { notesById, order, listVersion: s.listVersion + 1, ...bumpLayout(s) };
      });
    },

    flushHistory: () => {
      if (historyTimer !== undefined) {
        clearTimeout(historyTimer);
        historyTimer = undefined;
      }
      if (historyPending) {
        const pending = historyPending;
        historyPending = null;
        historyBridge?.commitSnapshot(pending);
      }
    },
  }))
);

// ---------------------------------------------------------------------------
// Hooks / selectors
// ---------------------------------------------------------------------------

export const getNotesArray = (): Note[] => {
  const s = useNotesStore.getState();
  return s.order.map((id) => s.notesById[id]);
};

/** Coarse list snapshot — identity stable while map/order references are unchanged. */
export const useNotesList = (): Note[] => {
  // Subscribe ONLY to the throttled counter; data read at render time stays fresh
  // because every counter bump happens after the mutations that caused it.
  const listVersion = useNotesStore((s) => s.listVersion);
  return useMemo(() => getNotesArray(), [listVersion]);
};

/** Granular per-note subscription: re-renders only when THIS note object changes. */
export const useNote = (id: string | null | undefined): Note | null => {
  const selector = useCallback(
    (s: NotesState) => (id ? s.notesById[id] ?? null : null),
    [id]
  );
  return useNotesStore(selector);
};

export const useSaveStatus = () => {
  const isSaving = useNotesStore((s) => s.isSaving);
  const saveError = useNotesStore((s) => s.saveError);
  const lastSavedAt = useNotesStore((s) => s.lastSavedAt);
  return { isSaving, saveError, lastSavedAt };
};

/** Boot-time DB hydration. Returns persisted transform/settings for App to apply. */
export async function initNotesFromDB(): Promise<{
  transform: CanvasTransform;
  settings: AppSettings;
}> {
  const { notes, transform, settings } = await initDatabase();
  useNotesStore.getState().hydrate(notes);
  return { transform, settings };
}
