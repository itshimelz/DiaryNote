import { useState, useRef, useCallback } from 'react';
import { Note } from '../types';

export interface HistoryDiff {
  upserted: Note[];
  deletedIds: string[];
  prevUpserted: Note[];
  prevDeleted: Note[];
}

function computeDiff(prevNotes: Note[], nextNotes: Note[]): HistoryDiff | null {
  const prevMap = new Map(prevNotes.map((n) => [n.id, n]));
  const nextMap = new Map(nextNotes.map((n) => [n.id, n]));

  const upserted: Note[] = [];
  const prevUpserted: Note[] = [];
  const deletedIds: string[] = [];
  const prevDeleted: Note[] = [];

  for (const [id, nextNote] of nextMap.entries()) {
    const prevNote = prevMap.get(id);
    if (!prevNote) {
      upserted.push(nextNote);
    } else if (JSON.stringify(prevNote) !== JSON.stringify(nextNote)) {
      upserted.push(nextNote);
      prevUpserted.push(prevNote);
    }
  }

  for (const [id, prevNote] of prevMap.entries()) {
    if (!nextMap.has(id)) {
      deletedIds.push(id);
      prevDeleted.push(prevNote);
    }
  }

  if (upserted.length === 0 && deletedIds.length === 0) {
    return null;
  }

  return { upserted, deletedIds, prevUpserted, prevDeleted };
}

function applyDiff(currentNotes: Note[], diff: HistoryDiff, isUndo: boolean): Note[] {
  if (isUndo) {
    const prevUpsertedIds = new Set(diff.prevUpserted.map((n) => n.id));
    const newlyCreatedIds = new Set(
      diff.upserted.filter((n) => !prevUpsertedIds.has(n.id)).map((n) => n.id)
    );

    let result = currentNotes.filter((n) => !newlyCreatedIds.has(n.id));

    const restoreMap = new Map(diff.prevUpserted.map((n) => [n.id, n]));
    result = result.map((n) => restoreMap.get(n.id) || n);

    if (diff.prevDeleted.length > 0) {
      result = [...result, ...diff.prevDeleted];
    }

    return result;
  } else {
    const deleteIdSet = new Set(diff.deletedIds);
    let result = currentNotes.filter((n) => !deleteIdSet.has(n.id));

    const upsertMap = new Map(diff.upserted.map((n) => [n.id, n]));
    const existingIds = new Set(result.map((n) => n.id));

    result = result.map((n) => upsertMap.get(n.id) || n);
    const newItems = diff.upserted.filter((n) => !existingIds.has(n.id));
    if (newItems.length > 0) {
      result = [...result, ...newItems];
    }

    return result;
  }
}

export function useHistoryState(initialNotes: Note[] = []) {
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(0);

  const currentNotesRef = useRef<Note[]>(initialNotes);
  const diffsRef = useRef<HistoryDiff[]>([]);
  const historyIndexRef = useRef(0);

  const resetHistory = useCallback((notes: Note[]) => {
    currentNotesRef.current = notes;
    diffsRef.current = [];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    setHistoryLength(0);
  }, []);

  const pushHistorySnapshot = useCallback((newNotes: Note[]) => {
    const diff = computeDiff(currentNotesRef.current, newNotes);
    if (!diff) return;

    let nextDiffs = diffsRef.current.slice(0, historyIndexRef.current);
    nextDiffs.push(diff);

    if (nextDiffs.length > 50) {
      nextDiffs = nextDiffs.slice(-50);
    }

    diffsRef.current = nextDiffs;
    currentNotesRef.current = newNotes;
    const nextIndex = nextDiffs.length;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setHistoryLength(nextDiffs.length);
  }, []);

  const handleUndo = useCallback((restoreCallback: (notes: Note[]) => void) => {
    if (historyIndexRef.current > 0) {
      const targetDiffIndex = historyIndexRef.current - 1;
      const diff = diffsRef.current[targetDiffIndex];
      const restored = applyDiff(currentNotesRef.current, diff, true);

      currentNotesRef.current = restored;
      historyIndexRef.current = targetDiffIndex;
      setHistoryIndex(targetDiffIndex);
      restoreCallback(restored);
    }
  }, []);

  const handleRedo = useCallback((restoreCallback: (notes: Note[]) => void) => {
    if (historyIndexRef.current < diffsRef.current.length) {
      const targetDiffIndex = historyIndexRef.current;
      const diff = diffsRef.current[targetDiffIndex];
      const restored = applyDiff(currentNotesRef.current, diff, false);

      currentNotesRef.current = restored;
      const nextIndex = targetDiffIndex + 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      restoreCallback(restored);
    }
  }, []);

  return {
    pushHistorySnapshot,
    handleUndo,
    handleRedo,
    resetHistory,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < historyLength,
  };
}
