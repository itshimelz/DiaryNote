import { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '../types';
import { findNearestSpatialNoteNative } from '../utils/layoutUtils';

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
  onMergeNotesAI?: () => void,
  onCutNotes?: (ids?: string[]) => void,
  onPasteRelocateNotes?: () => void,
  onCancelCutNotes?: () => void,
  hasCutNotes?: boolean
) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const selectedNoteId = selectedNoteIds.length > 0 ? selectedNoteIds[selectedNoteIds.length - 1] : null;

  const notesRef = useRef(notes);
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
  const onCutNotesRef = useRef(onCutNotes);
  const onPasteRelocateNotesRef = useRef(onPasteRelocateNotes);
  const onCancelCutNotesRef = useRef(onCancelCutNotes);
  const hasCutNotesRef = useRef(hasCutNotes);

  const editTimerRef = useRef<number>(0);
  const navSequenceRef = useRef<number>(0);
  const activeNavTargetIdRef = useRef<string | null>(null);

  const stateRef = useRef({
    selectedNoteId,
    selectedNoteIds,
    handleUndo,
    handleRedo,
    requestDeleteNotes,
    setIsSearchOpen,
  });

  useEffect(() => {
    notesRef.current = notes;
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
    notesRef.current = notes;
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
    onCutNotesRef.current = onCutNotes;
    onPasteRelocateNotesRef.current = onPasteRelocateNotes;
    onCancelCutNotesRef.current = onCancelCutNotes;
    hasCutNotesRef.current = hasCutNotes;
  }, [
    notes,
    onCreateNote,
    onFitNotes,
    onResetZoom,
    onTogglePanMode,
    onToggleTheme,
    onToggleSnapToGrid,
    onToggleZenMode,
    onLockSelectedNotes,
    onNavigateToNote,
    onGroupNotes,
    onUngroupNotes,
    onToggleShortcutsModal,
    onMergeNotesAI,
    onCutNotes,
    onPasteRelocateNotes,
    onCancelCutNotes,
    hasCutNotes,
  ]);

  const handleSelectNote = useCallback((noteId: string | null, isMultiSelect?: boolean) => {
    activeNavTargetIdRef.current = noteId;
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
    activeNavTargetIdRef.current = ids.length > 0 ? ids[ids.length - 1] : null;
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
        Boolean(e.isComposing) ||
        (target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable));

      // Universal Escape handler: cancels cut state (if active), closes editing, blurs focused inputs, and clears selection
      if (e.key === 'Escape') {
        if (hasCutNotesRef.current) {
          onCancelCutNotesRef.current?.();
        }
        if (curSelectedNoteIds.length > 0 || isEditingText) {
          e.preventDefault();
          setSelectedNoteIds([]);
          setEditingNoteId(null);
          if (document.activeElement && 'blur' in document.activeElement) {
            (document.activeElement as HTMLElement).blur();
          }
        }
        return;
      }

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

      // AI Note Merging Shortcut (Shift+M or Ctrl+Shift+M)
      if (e.shiftKey && key === 'm') {
        if (curSelectedNoteIds.length >= 2 && curSelectedNoteIds.length <= 5) {
          e.preventDefault();
          onMergeNotesAIRef.current?.();
        }
        return;
      }



      // Cut Selected Note(s) (Ctrl+X / Cmd+X)
      if ((e.ctrlKey || e.metaKey) && key === 'x' && !isEditingText) {
        if (curSelectedNoteIds.length > 0) {
          e.preventDefault();
          const idsToCut = [...curSelectedNoteIds];
          setSelectedNoteIds([]);
          onCutNotesRef.current?.(idsToCut);
        }
        return;
      }

      // Paste / Relocate Cut Note(s) (Ctrl+Shift+V or Ctrl+V only when cut notes are pending)
      if ((e.ctrlKey || e.metaKey) && key === 'v' && !isEditingText) {
        if (hasCutNotesRef.current) {
          e.preventDefault();
          e.stopPropagation();
          onPasteRelocateNotesRef.current?.();
          return;
        }
      }

      // Spatial Arrow-Key Navigation (ArrowLeft, ArrowRight, ArrowUp, ArrowDown)
      if (
        !isEditingText &&
        (activeNavTargetIdRef.current || curSelectedNoteId) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')
      ) {
        e.preventDefault();
        const originId = activeNavTargetIdRef.current || curSelectedNoteId!;
        const dir =
          e.key === 'ArrowLeft'
            ? 'left'
            : e.key === 'ArrowRight'
            ? 'right'
            : e.key === 'ArrowUp'
            ? 'up'
            : 'down';

        const isShift = e.shiftKey;
        const currentSeq = ++navSequenceRef.current;

        findNearestSpatialNoteNative(originId, dir, notesRef.current).then((targetId) => {
          if (currentSeq !== navSequenceRef.current) return;
          if (targetId) {
            activeNavTargetIdRef.current = targetId;
            if (isShift) {
              setSelectedNoteIds((prev = []) => (prev.includes(targetId) ? prev : [...prev, targetId]));
            } else {
              setSelectedNoteIds([targetId]);
              setEditingNoteId(null);
            }
            onNavigateToNoteRef.current?.(targetId);
          }
        });
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
