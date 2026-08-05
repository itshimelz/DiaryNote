import React, { useState, useEffect, useCallback } from 'react';
import { CanvasTransform } from './types';
import { exportBackup, importBackup, SAMPLE_NOTES } from './lib/storage';

// Custom Hooks
import { useHistoryState } from './hooks/useHistoryState';
import { useNotesManager } from './hooks/useNotesManager';
import { useCanvasTransform } from './hooks/useCanvasTransform';
import { useNoteSelection } from './hooks/useNoteSelection';

// Modular Components
import {
  InfiniteCanvas,
  CanvasControls,
  NotesSidebar,
  SearchModal,
  DeleteConfirmationModal,
} from './components';

export default function App() {
  const [isNotesListOpen, setIsNotesListOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notesToDelete, setNotesToDelete] = useState<string[]>([]);

  // 1. History Stack Hook
  const {
    pushHistorySnapshot,
    handleUndo: triggerUndo,
    handleRedo: triggerRedo,
    resetHistory,
    canUndo,
    canRedo,
  } = useHistoryState();

  // 2. Notes Manager Hook
  const {
    notes,
    setNotes,
    initAppDatabase,
    handleAddNote,
    handleUpdateNote,
    handleUpdateBatchNotes,
    handleDeleteNote,
    handleDeleteMultipleNotes,
    bringToFront,
  } = useNotesManager(pushHistorySnapshot, resetHistory);

  // 3. Canvas Transform Hook
  const {
    transform,
    settings,
    setSettings,
    focusedNoteId,
    handleCanvasTransformChange,
    handleZoomIn,
    handleZoomOut,
    handleFitNotes,
    handleNavigateToNote,
  } = useCanvasTransform(notes, bringToFront);

  // Initialize SQLite Database on mount
  useEffect(() => {
    initAppDatabase(() => {
      // Database initialized
    });
  }, [initAppDatabase]);

  const handleUndo = useCallback(() => triggerUndo(setNotes), [triggerUndo, setNotes]);
  const handleRedo = useCallback(() => triggerRedo(setNotes), [triggerRedo, setNotes]);

  const requestDeleteNotes = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setNotesToDelete(ids);
    setIsDeleteModalOpen(true);
  }, []);

  // 4. Note Selection & Keyboard Shortcuts Hook
  const {
    selectedNoteIds,
    setSelectedNoteIds,
    selectedNoteId,
    editingNoteId,
    setEditingNoteId,
    handleSelectNote,
    handleSelectMultipleNotes,
  } = useNoteSelection(notes, handleUndo, handleRedo, requestDeleteNotes, setIsSearchOpen);

  const handleCreateNote = useCallback(
    (customX?: number, customY?: number) => {
      const newId = handleAddNote(transform, settings, customX, customY);
      setSelectedNoteIds([newId]);
      setEditingNoteId(newId);
    },
    [handleAddNote, transform, settings, setSelectedNoteIds, setEditingNoteId]
  );

  const handleConfirmDelete = useCallback(() => {
    if (notesToDelete.length > 0) {
      handleDeleteMultipleNotes(notesToDelete);
      setSelectedNoteIds((prev) => prev.filter((id) => !notesToDelete.includes(id)));
      setNotesToDelete([]);
    }
    setIsDeleteModalOpen(false);
  }, [handleDeleteMultipleNotes, notesToDelete, setSelectedNoteIds]);

  const handleResetZoom = useCallback(() => {
    handleCanvasTransformChange({ x: Math.round(window.innerWidth / 2 - 400), y: Math.round(window.innerHeight / 2 - 300), zoom: 1 });
  }, [handleCanvasTransformChange]);

  const handleResetSampleNotes = useCallback(() => {
    setNotes(SAMPLE_NOTES);
    resetHistory(SAMPLE_NOTES);
  }, [resetHistory, setNotes]);

  const handleImportBackupFile = useCallback(
    (file: File) => {
      importBackup(file)
        .then(({ notes: importedNotes, transform: importedTransform, settings: importedSettings }) => {
          if (importedNotes) {
            setNotes(importedNotes);
            resetHistory(importedNotes);
          }
          if (importedTransform) handleCanvasTransformChange(importedTransform);
          if (importedSettings) setSettings((prev) => ({ ...prev, ...importedSettings }));
        })
        .catch((err) => {
          console.error('Failed to import backup:', err);
        });
    },
    [handleCanvasTransformChange, resetHistory, setNotes, setSettings]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Infinite Canvas */}
      <InfiniteCanvas
        notes={notes}
        transform={transform}
        selectedNoteId={selectedNoteId}
        selectedNoteIds={selectedNoteIds}
        editingNoteId={editingNoteId}
        focusedNoteId={focusedNoteId}
        gridType={settings.gridType}
        themeMode={settings.themeMode}
        snapToGrid={settings.snapToGrid}
        showConnections={settings.showConnections}
        isPanMode={isPanMode}
        onTransformChange={handleCanvasTransformChange}
        onSelectNote={handleSelectNote}
        onSelectMultipleNotes={handleSelectMultipleNotes}
        onNavigateToNote={(id) => handleNavigateToNote(id, setSelectedNoteIds)}
        onUpdateNote={handleUpdateNote}
        onUpdateBatchNotes={handleUpdateBatchNotes}
        onDeleteNote={handleDeleteNote}
        onBringToFront={bringToFront}
        onDoubleClickCanvas={handleCreateNote}
      />

      {/* Docked Control Bar */}
      <CanvasControls
        transform={transform}
        gridType={settings.gridType}
        themeMode={settings.themeMode}
        snapToGrid={settings.snapToGrid}
        showConnections={settings.showConnections}
        isPanMode={isPanMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onAddNote={() => handleCreateNote()}
        onTogglePanMode={() => setIsPanMode((prev) => !prev)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitNotes={handleFitNotes}
        onChangeGridType={(gridType) => setSettings((prev) => ({ ...prev, gridType }))}
        onToggleTheme={() => setSettings((prev) => ({ ...prev, themeMode: prev.themeMode === 'dark' ? 'light' : 'dark' }))}
        onToggleSnapToGrid={() => setSettings((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
        onToggleConnections={() => setSettings((prev) => ({ ...prev, showConnections: !prev.showConnections }))}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotesList={() => setIsNotesListOpen(true)}
        onExportBackup={() => exportBackup(notes, transform, settings)}
        onImportBackup={handleImportBackupFile}
        onResetSampleNotes={handleResetSampleNotes}
      />

      {/* Sidebar Drawer */}
      <NotesSidebar
        isOpen={isNotesListOpen}
        notes={notes}
        onClose={() => setIsNotesListOpen(false)}
        onSelectNote={(id) => handleNavigateToNote(id, setSelectedNoteIds)}
        onAddNote={() => handleCreateNote()}
        onDeleteNote={handleDeleteNote}
      />

      {/* Command Palette Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        notes={notes}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={(id) => handleNavigateToNote(id, setSelectedNoteIds)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        count={notesToDelete.length}
        themeMode={settings.themeMode}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setNotesToDelete([]);
        }}
      />
    </div>
  );
}
