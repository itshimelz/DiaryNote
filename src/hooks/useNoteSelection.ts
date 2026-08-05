import { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '../types';

export function useNoteSelection(
  notes: Note[],
  handleUndo: () => void,
  handleRedo: () => void,
  requestDeleteNotes: (ids: string[]) => void,
  setIsSearchOpen: (open: boolean) => void,
  onCreateNote?: (customX?: number, customY?: number) => void,
  onFitNotes?: () => void,
  onResetZoom?: () => void,
  onTogglePanMode?: () => void,
  onToggleTheme?: () => void,
  onToggleSnapToGrid?: () => void,
  onToggleConnections?: () => void
) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const selectedNoteId = selectedNoteIds.length > 0 ? selectedNoteIds[selectedNoteIds.length - 1] : null;

  const onCreateNoteRef = useRef(onCreateNote);
  const onFitNotesRef = useRef(onFitNotes);
  const onResetZoomRef = useRef(onResetZoom);
  const onTogglePanModeRef = useRef(onTogglePanMode);
  const onToggleThemeRef = useRef(onToggleTheme);
  const onToggleSnapToGridRef = useRef(onToggleSnapToGrid);
  const onToggleConnectionsRef = useRef(onToggleConnections);

  useEffect(() => {
    onCreateNoteRef.current = onCreateNote;
    onFitNotesRef.current = onFitNotes;
    onResetZoomRef.current = onResetZoom;
    onTogglePanModeRef.current = onTogglePanMode;
    onToggleThemeRef.current = onToggleTheme;
    onToggleSnapToGridRef.current = onToggleSnapToGrid;
    onToggleConnectionsRef.current = onToggleConnections;
  });

  const handleSelectNote = useCallback((noteId: string | null, isMultiSelect?: boolean) => {
    if (noteId === null) {
      setSelectedNoteIds([]);
      return;
    }

    if (isMultiSelect) {
      setSelectedNoteIds((prev = []) =>
        prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
      );
    } else {
      setSelectedNoteIds([noteId]);
    }
  }, []);

  const handleSelectMultipleNotes = useCallback((ids: string[]) => {
    setSelectedNoteIds(ids || []);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // If user is currently editing text inside an input or textarea, bypass canvas single-key shortcuts
      if (isEditingText) return;

      // If active element is a button (e.g. Fit or Zoom button), blur it when Spacebar is pressed for panning
      if (e.code === 'Space' && document.activeElement && document.activeElement.tagName === 'BUTTON') {
        (document.activeElement as HTMLElement).blur();
      }

      const key = e.key.toLowerCase();

      // Search shortcuts (Ctrl+K, Cmd+K, Ctrl+F, or '/')
      if (((e.ctrlKey || e.metaKey) && (key === 'k' || key === 'f')) || key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Undo (Ctrl+Z) & Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // New Note Shortcut ('N' or 'Ctrl+N')
      if (key === 'n' || ((e.ctrlKey || e.metaKey) && key === 'n')) {
        e.preventDefault();
        onCreateNoteRef.current?.();
        return;
      }

      // Fit All Notes Shortcut ('F')
      if (key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onFitNotesRef.current?.();
        return;
      }

      // Reset Zoom / Home Canvas Shortcut ('H' or 'Home')
      if (key === 'h' || e.key === 'Home') {
        e.preventDefault();
        onResetZoomRef.current?.();
        return;
      }

      // Toggle Pan Mode Shortcut ('P')
      if (key === 'p') {
        e.preventDefault();
        onTogglePanModeRef.current?.();
        return;
      }

      // Toggle Theme Mode Shortcut ('T')
      if (key === 't') {
        e.preventDefault();
        onToggleThemeRef.current?.();
        return;
      }

      // Toggle Snap to Grid Shortcut ('S')
      if (key === 's') {
        e.preventDefault();
        onToggleSnapToGridRef.current?.();
        return;
      }

      // Toggle Connections Shortcut ('C')
      if (key === 'c') {
        e.preventDefault();
        onToggleConnectionsRef.current?.();
        return;
      }

      // Enter key opens edit mode on selected note
      if (e.key === 'Enter' && selectedNoteId) {
        e.preventDefault();
        setEditingNoteId(null);
        window.setTimeout(() => setEditingNoteId(selectedNoteId), 0);
        return;
      }

      // Delete key deletes selected notes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          requestDeleteNotes([...selectedNoteIds]);
        }
      }

      // Escape key deselects all active notes
      if (e.key === 'Escape') {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          setSelectedNoteIds([]);
          if (document.activeElement && 'blur' in document.activeElement) {
            (document.activeElement as HTMLElement).blur();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleRedo,
    handleUndo,
    notes,
    onCreateNote,
    onFitNotes,
    onResetZoom,
    onToggleConnections,
    onTogglePanMode,
    onToggleSnapToGrid,
    onToggleTheme,
    requestDeleteNotes,
    selectedNoteId,
    selectedNoteIds,
    setIsSearchOpen,
  ]);

  return {
    selectedNoteIds,
    setSelectedNoteIds,
    selectedNoteId,
    editingNoteId,
    setEditingNoteId,
    handleSelectNote,
    handleSelectMultipleNotes,
  };
}
