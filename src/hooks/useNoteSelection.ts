import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';

export function useNoteSelection(
  notes: Note[],
  handleUndo: () => void,
  handleRedo: () => void,
  requestDeleteNotes: (ids: string[]) => void,
  setIsSearchOpen: (open: boolean) => void
) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const selectedNoteId = selectedNoteIds.length > 0 ? selectedNoteIds[selectedNoteIds.length - 1] : null;

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

  // Global Keyboard Shortcuts (Ctrl+K for search, Ctrl+Z / Ctrl+Y for Undo/Redo, Delete/Backspace, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isEditingText) return;

      // Search shortcut (Ctrl+K / Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Undo (Ctrl+Z) & Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
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
  }, [handleRedo, handleUndo, notes, requestDeleteNotes, selectedNoteId, selectedNoteIds, setIsSearchOpen]);

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
