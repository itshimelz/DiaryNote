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
  onToggleConnections?: () => void,
  onToggleZenMode?: () => void,
  onLockSelectedNotes?: (ids: string[]) => void,
  onNavigateToNote?: (id: string) => void,
  onGroupNotes?: () => void,
  onUngroupNotes?: () => void,
  onToggleShortcutsModal?: () => void,
  onMergeNotesAI?: () => void
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
  const onToggleZenModeRef = useRef(onToggleZenMode);
  const onLockSelectedNotesRef = useRef(onLockSelectedNotes);
  const onNavigateToNoteRef = useRef(onNavigateToNote);
  const onGroupNotesRef = useRef(onGroupNotes);
  const onUngroupNotesRef = useRef(onUngroupNotes);
  const onToggleShortcutsModalRef = useRef(onToggleShortcutsModal);
  const onMergeNotesAIRef = useRef(onMergeNotesAI);



  const editTimerRef = useRef<number>(0);
  const stateRef = useRef({
    selectedNoteId,
    selectedNoteIds,
    handleUndo,
    handleRedo,
    requestDeleteNotes,
    setIsSearchOpen,
  });

  useEffect(() => {
    stateRef.current = {
      selectedNoteId,
      selectedNoteIds,
      handleUndo,
      handleRedo,
      requestDeleteNotes,
      setIsSearchOpen,
    };
  });

  useEffect(() => {
    onCreateNoteRef.current = onCreateNote;
    onFitNotesRef.current = onFitNotes;
    onResetZoomRef.current = onResetZoom;
    onTogglePanModeRef.current = onTogglePanMode;
    onToggleThemeRef.current = onToggleTheme;
    onToggleSnapToGridRef.current = onToggleSnapToGrid;
    onToggleConnectionsRef.current = onToggleConnections;
    onToggleZenModeRef.current = onToggleZenMode;
    onLockSelectedNotesRef.current = onLockSelectedNotes;
    onNavigateToNoteRef.current = onNavigateToNote;
    onGroupNotesRef.current = onGroupNotes;
    onUngroupNotesRef.current = onUngroupNotes;
    onToggleShortcutsModalRef.current = onToggleShortcutsModal;
    onMergeNotesAIRef.current = onMergeNotesAI;
  }, [
    onCreateNote,
    onFitNotes,
    onResetZoom,
    onTogglePanMode,
    onToggleTheme,
    onToggleSnapToGrid,
    onToggleConnections,
    onToggleZenMode,
    onLockSelectedNotes,
    onNavigateToNote,
    onGroupNotes,
    onUngroupNotes,
    onToggleShortcutsModal,
    onMergeNotesAI,
  ]);


  const handleSelectNote = useCallback((noteId: string | null, isMultiSelect?: boolean) => {
    if (noteId === null) {
      setSelectedNoteIds([]);
      setEditingNoteId(null);
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

  // Global Keyboard Shortcuts (bound once on mount for stable memory footprint)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        selectedNoteId: curSelectedNoteId,
        selectedNoteIds: curSelectedNoteIds,
        handleUndo: curUndo,
        handleRedo: curRedo,
        requestDeleteNotes: curDelete,
        setIsSearchOpen: curSetSearchOpen,
      } = stateRef.current;

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

      // Keyboard Shortcuts Cheatsheet Modal (Ctrl+/ or Cmd+/ or Ctrl+Shift+/)
      if ((e.ctrlKey || e.metaKey) && (key === '/' || e.code === 'Slash')) {
        e.preventDefault();
        onToggleShortcutsModalRef.current?.();
        return;
      }

      // Search shortcuts (Ctrl+K, Cmd+K, Ctrl+F, or '/' without Ctrl/Cmd)
      if (
        ((e.ctrlKey || e.metaKey) && (key === 'k' || key === 'f')) ||
        (key === '/' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        curSetSearchOpen(true);
        return;
      }

      // Undo (Ctrl+Z) & Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          curRedo();
        } else {
          curUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        curRedo();
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

      // Zoom to Selected Note Shortcut (Shift+Z or Shift+F)
      if (curSelectedNoteId && e.shiftKey && (key === 'z' || key === 'f')) {
        e.preventDefault();
        onNavigateToNoteRef.current?.(curSelectedNoteId);
        return;
      }

      // Toggle Zen Mode Shortcut ('Z' without modifiers)
      if (key === 'z' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        onToggleZenModeRef.current?.();
        return;
      }

      // Lock Selected Notes Shortcut (Ctrl+L)
      if ((e.ctrlKey || e.metaKey) && key === 'l') {
        if (curSelectedNoteIds.length > 0) {
          e.preventDefault();
          onLockSelectedNotesRef.current?.(curSelectedNoteIds);
        }
        return;
      }

      // Group Notes Shortcut (Ctrl+G / Cmd+G)
      if ((e.ctrlKey || e.metaKey) && key === 'g' && !e.shiftKey) {
        e.preventDefault();
        onGroupNotesRef.current?.();
        return;
      }

      // Ungroup Notes Shortcut (Ctrl+Shift+G / Cmd+Shift+G)
      if ((e.ctrlKey || e.metaKey) && key === 'g' && e.shiftKey) {
        e.preventDefault();
        onUngroupNotesRef.current?.();
        return;
      }

      // AI Note Merging Shortcut (Shift+M)
      if (e.shiftKey && key === 'm' && !e.ctrlKey && !e.metaKey) {
        if (curSelectedNoteIds.length >= 2 && curSelectedNoteIds.length <= 5) {
          e.preventDefault();
          onMergeNotesAIRef.current?.();
        }
        return;
      }


      // Enter key opens edit mode on selected note
      if (e.key === 'Enter' && curSelectedNoteId) {
        e.preventDefault();
        setEditingNoteId(null);
        window.clearTimeout(editTimerRef.current);
        editTimerRef.current = window.setTimeout(() => setEditingNoteId(curSelectedNoteId), 0);
        return;
      }

      // Delete key deletes selected notes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (curSelectedNoteIds.length > 0) {
          e.preventDefault();
          curDelete([...curSelectedNoteIds]);
        }
      }

      // Escape key deselects all active notes
      if (e.key === 'Escape') {
        if (curSelectedNoteIds.length > 0) {
          e.preventDefault();
          setSelectedNoteIds([]);
          if (document.activeElement && 'blur' in document.activeElement) {
            (document.activeElement as HTMLElement).blur();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(editTimerRef.current);
    };
  }, []);

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
