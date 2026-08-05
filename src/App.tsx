import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, CanvasTransform, GridType, CanvasTheme } from './types';
import {
  loadNotes,
  saveNotes,
  loadTransform,
  saveTransform,
  loadSettings,
  saveSettings,
  SAMPLE_NOTES,
  exportBackup,
  importBackup,
} from './lib/storage';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { CanvasControls } from './components/CanvasControls';
import { NotesSidebar } from './components/NotesSidebar';
import { SearchModal } from './components/SearchModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { getUniqueTitleForDay } from './lib/markdownMention';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [transform, setTransform] = useState<CanvasTransform>(() => loadTransform());
  const [settings, setSettings] = useState(() => loadSettings());

  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const selectedNoteId = (selectedNoteIds || []).length > 0 ? selectedNoteIds[(selectedNoteIds || []).length - 1] : null;

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
      setSelectedNoteIds((prev = []) => {
        if (prev.includes(noteId)) {
          return prev;
        }
        return [noteId];
      });
    }
  }, []);

  const handleSelectMultipleNotes = useCallback((ids: string[]) => {
    setSelectedNoteIds(ids || []);
  }, []);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [isNotesListOpen, setIsNotesListOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notesToDelete, setNotesToDelete] = useState<string[]>([]);

  // History stack for Undo & Redo
  const [history, setHistory] = useState<Note[][]>(() => [loadNotes()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync document root dark mode class with settings.themeMode
  useEffect(() => {
    if (settings.themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.themeMode]);

  // Push new state snapshot to history stack
  const pushHistorySnapshot = useCallback((newNotes: Note[]) => {
    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      if (nextHistory.length >= 50) nextHistory.shift();
      return [...nextHistory, newNotes];
    });
    setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, 49));
  }, [historyIndex]);

  // Undo callback
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setNotes(history[nextIndex]);
    }
  }, [history, historyIndex]);

  // Redo callback
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setNotes(history[nextIndex]);
    }
  }, [history, historyIndex]);

  // Global Keyboard Shortcuts (Ctrl+K for search, Ctrl+Z / Ctrl+Y for Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+K or Cmd+K -> Search Modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Ctrl+Z or Cmd+Z -> Undo (if not active in input)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else if (!isEditingText) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isEditingText) {
        e.preventDefault();
        handleRedo();
      }

      // Delete or Backspace key -> trigger delete note confirmation modal
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          setNotesToDelete([...selectedNoteIds]);
          setIsDeleteModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedNoteIds]);

  // Autosave notes to local storage
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // Autosave transform to local storage
  useEffect(() => {
    saveTransform(transform);
  }, [transform]);

  // Autosave settings to local storage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Bring note to front z-index
  const bringToFront = useCallback((noteId: string) => {
    setNotes((prevNotes) => {
      const maxZ = Math.max(...prevNotes.map((n) => n.zIndex || 1), 1);
      return prevNotes.map((n) => (n.id === noteId ? { ...n, zIndex: maxZ + 1 } : n));
    });
  }, []);

  // Add new note
  const handleAddNote = useCallback(
    (customX?: number, customY?: number) => {
      const newId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      let viewportX = customX ?? Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - 180);
      let viewportY = customY ?? Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - 150);

      if (settings.snapToGrid) {
        viewportX = Math.round(viewportX / 24) * 24;
        viewportY = Math.round(viewportY / 24) * 24;
      }

      const maxZ = Math.max(...notes.map((n) => n.zIndex || 1), 1);
      const initialTitle = getUniqueTitleForDay('Untitled Note', newId, notes);

      const newNote: Note = {
        id: newId,
        title: initialTitle,
        content: '',
        x: viewportX,
        y: viewportY,
        width: 380,
        height: 320,
        createdAt: now,
        updatedAt: now,
        fontFamily: settings.defaultFont || 'sans',
        fontSize: 'sm',
        paperTheme: 'ruled',
        zIndex: maxZ + 1,
      };

      const updated = [...notes, newNote];
      setNotes(updated);
      pushHistorySnapshot(updated);
      setSelectedNoteIds([newId]);
    },
    [notes, transform, settings, pushHistorySnapshot]
  );

  // Smoothly center canvas on a target note
  const handleNavigateToNote = useCallback(
    (targetNoteId: string) => {
      const targetNote = notes.find((n) => n.id === targetNoteId);
      if (!targetNote) return;

      setSelectedNoteIds([targetNoteId]);
      bringToFront(targetNoteId);

      setFocusedNoteId(targetNoteId);
      setTimeout(() => setFocusedNoteId(null), 1800);

      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      const noteCenterX = targetNote.x + targetNote.width / 2;
      const noteCenterY = targetNote.y + targetNote.height / 2;

      const newX = Math.round(screenCenterX - noteCenterX * transform.zoom);
      const newY = Math.round(screenCenterY - noteCenterY * transform.zoom);

      setTransform((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    },
    [notes, transform.zoom, bringToFront]
  );

  // Update note handler with debounced history recording
  const handleUpdateNote = useCallback((updated: Note) => {
    setNotes((prevNotes) => {
      const nextNotes = prevNotes.map((n) => (n.id === updated.id ? updated : n));

      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        pushHistorySnapshot(nextNotes);
      }, 400);

      return nextNotes;
    });
  }, [pushHistorySnapshot]);

  // Batch update multiple notes handler (for multi-note dragging)
  const handleUpdateBatchNotes = useCallback((updatedNotes: Note[]) => {
    setNotes((prevNotes) => {
      const updatedMap = new Map(updatedNotes.map((n) => [n.id, n]));
      const nextNotes = prevNotes.map((n) => updatedMap.get(n.id) || n);

      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        pushHistorySnapshot(nextNotes);
      }, 400);

      return nextNotes;
    });
  }, [pushHistorySnapshot]);

  // Delete note handler
  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes((prev) => {
      const nextNotes = prev.filter((n) => n.id !== noteId);
      pushHistorySnapshot(nextNotes);
      return nextNotes;
    });
    setSelectedNoteIds((prev) => prev.filter((id) => id !== noteId));
  }, [pushHistorySnapshot]);

  // Delete multiple notes handler
  const handleDeleteMultipleNotes = useCallback((idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    setNotes((prev) => {
      const nextNotes = prev.filter((n) => !idsToDelete.includes(n.id));
      pushHistorySnapshot(nextNotes);
      return nextNotes;
    });
    setSelectedNoteIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
  }, [pushHistorySnapshot]);

  // Fit all notes on screen
  const handleFitNotes = useCallback(() => {
    if (notes.length === 0) return;

    const minX = Math.min(...notes.map((n) => n.x));
    const maxX = Math.max(...notes.map((n) => n.x + n.width));
    const minY = Math.min(...notes.map((n) => n.y));
    const maxY = Math.max(...notes.map((n) => n.y + n.height));

    const width = maxX - minX || 500;
    const height = maxY - minY || 500;

    const padding = 120;
    const scaleX = (window.innerWidth - padding * 2) / width;
    const scaleY = (window.innerHeight - padding * 2) / height;
    const newZoom = Math.max(0.2, Math.min(1.2, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      zoom: newZoom,
      x: Math.round(window.innerWidth / 2 - centerX * newZoom),
      y: Math.round(window.innerHeight / 2 - centerY * newZoom),
    });
  }, [notes]);

  // Export JSON Backup
  const handleExportBackup = () => {
    exportBackup(notes, transform, settings);
  };

  // Import JSON Backup
  const handleImportBackup = async (file: File) => {
    try {
      const res = await importBackup(file);
      if (res.notes && res.notes.length > 0) {
        setNotes(res.notes);
        pushHistorySnapshot(res.notes);
        if (res.transform) setTransform(res.transform);
        if (res.settings) setSettings(res.settings);
      }
    } catch (e) {
      alert('Failed to import backup file. Please ensure it is a valid Infinite Notes JSON export.');
    }
  };

  // Reset to default sample notes
  const handleResetSampleNotes = () => {
    if (confirm('Are you sure you want to reload the sample diary notes? This will replace current notes.')) {
      setNotes(SAMPLE_NOTES);
      pushHistorySnapshot(SAMPLE_NOTES);
      setTransform({
        x: Math.round(window.innerWidth / 2 - 400),
        y: Math.round(window.innerHeight / 2 - 300),
        zoom: 1,
      });
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none ${
      settings.themeMode === 'light' ? 'bg-[#f9f9f9] text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Infinite Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <InfiniteCanvas
          notes={notes}
          transform={transform}
          onTransformChange={setTransform}
          gridType={settings.gridType}
          themeMode={settings.themeMode}
          snapToGrid={settings.snapToGrid}
          showConnections={settings.showConnections}
          selectedNoteId={selectedNoteId}
          selectedNoteIds={selectedNoteIds}
          focusedNoteId={focusedNoteId}
          onSelectNote={handleSelectNote}
          onSelectMultipleNotes={handleSelectMultipleNotes}
          onNavigateToNote={handleNavigateToNote}
          onUpdateNote={handleUpdateNote}
          onUpdateBatchNotes={handleUpdateBatchNotes}
          onDeleteNote={handleDeleteNote}
          onBringToFront={bringToFront}
          onDoubleClickCanvas={(x, y) => handleAddNote(x, y)}
          isPanMode={isPanMode}
        />
      </div>

      {/* Geometric Balance Bottom Status Bar */}
      <footer className="h-8 bg-slate-900 text-slate-400 px-6 flex items-center justify-between text-[10px] font-mono shrink-0 z-40 border-t border-slate-800">
        <div className="flex gap-6 uppercase">
          <span>X: {Math.round(transform.x)} | Y: {Math.round(transform.y)}</span>
          <span>Notes: {notes.length}</span>
          <span>Zoom: {Math.round(transform.zoom * 100)}%</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="hidden sm:inline text-slate-500">Local Storage Sync: 100%</span>
          <span className="text-slate-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Last Save: Just now
          </span>
        </div>
      </footer>

      {/* Floating Toolbar & Controls */}
      <CanvasControls
        transform={transform}
        gridType={settings.gridType}
        themeMode={settings.themeMode}
        snapToGrid={settings.snapToGrid}
        showConnections={settings.showConnections}
        onAddNote={() => handleAddNote()}
        onZoomIn={() =>
          setTransform((t) => ({ ...t, zoom: Math.min(3.0, Number((t.zoom + 0.15).toFixed(2))) }))
        }
        onZoomOut={() =>
          setTransform((t) => ({ ...t, zoom: Math.max(0.15, Number((t.zoom - 0.15).toFixed(2))) }))
        }
        onResetZoom={() => setTransform((t) => ({ ...t, zoom: 1 }))}
        onFitNotes={handleFitNotes}
        onChangeGridType={(gridType) => setSettings((s) => ({ ...s, gridType }))}
        onToggleTheme={() =>
          setSettings((s) => ({
            ...s,
            themeMode: s.themeMode === 'light' ? 'gradient' : s.themeMode === 'gradient' ? 'dark' : 'light',
          }))
        }
        onToggleSnapToGrid={() => setSettings((s) => ({ ...s, snapToGrid: !s.snapToGrid }))}
        onToggleConnections={() => setSettings((s) => ({ ...s, showConnections: !s.showConnections }))}
        onOpenNotesList={() => setIsNotesListOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetSampleNotes={handleResetSampleNotes}
        isPanMode={isPanMode}
        onTogglePanMode={() => setIsPanMode(!isPanMode)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Ctrl+K Fast Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notes={notes}
        onSelectNote={handleNavigateToNote}
      />

      {/* Notes Finder Sidebar Drawer */}
      <NotesSidebar
        isOpen={isNotesListOpen}
        onClose={() => setIsNotesListOpen(false)}
        notes={notes}
        onSelectNote={handleNavigateToNote}
        onAddNote={() => handleAddNote()}
        onDeleteNote={handleDeleteNote}
      />

      {/* Delete Note Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          handleDeleteMultipleNotes(notesToDelete);
          setIsDeleteModalOpen(false);
          setNotesToDelete([]);
        }}
        count={notesToDelete.length}
        noteTitles={notesToDelete.map((id) => notes.find((n) => n.id === id)?.title || 'Untitled Note')}
        themeMode={settings.themeMode}
      />
    </div>
  );
}
