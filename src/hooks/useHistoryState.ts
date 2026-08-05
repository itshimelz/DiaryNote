import { useState, useRef, useCallback } from 'react';
import { Note } from '../types';

export function useHistoryState(initialNotes: Note[] = []) {
  const [history, setHistory] = useState<Note[][]>(() => [initialNotes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const historyRef = useRef<Note[][]>(history);
  const historyIndexRef = useRef(historyIndex);

  const syncHistory = useCallback((newHistory: Note[][], index: number) => {
    historyRef.current = newHistory;
    historyIndexRef.current = index;
    setHistory(newHistory);
    setHistoryIndex(index);
  }, []);

  const pushHistorySnapshot = useCallback((newNotes: Note[]) => {
    let nextHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), newNotes];
    if (nextHistory.length > 50) nextHistory = nextHistory.slice(-50);
    const nextIndex = nextHistory.length - 1;
    syncHistory(nextHistory, nextIndex);
  }, [syncHistory]);

  const handleUndo = useCallback((setNotes: (notes: Note[]) => void) => {
    if (historyIndexRef.current > 0) {
      const nextIndex = historyIndexRef.current - 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      setNotes(historyRef.current[nextIndex]);
    }
  }, []);

  const handleRedo = useCallback((setNotes: (notes: Note[]) => void) => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const nextIndex = historyIndexRef.current + 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      setNotes(historyRef.current[nextIndex]);
    }
  }, []);

  const resetHistory = useCallback((notes: Note[]) => {
    syncHistory([notes], 0);
  }, [syncHistory]);

  return {
    history,
    historyIndex,
    pushHistorySnapshot,
    handleUndo,
    handleRedo,
    resetHistory,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
