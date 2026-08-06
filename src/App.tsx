import React, { useState, useEffect, useCallback } from 'react';
import { CanvasTransform, Note } from './types';
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
  SecurityModal,
} from './components';
import { sendNativeAppNotification } from './lib/notifications';

export default function App() {
  const [isNotesListOpen, setIsNotesListOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notesToDelete, setNotesToDelete] = useState<string[]>([]);

  const [isZenMode, setIsZenMode] = useState(false);
  const [securityModalNoteId, setSecurityModalNoteId] = useState<string | null>(null);
  const [securityModalMode, setSecurityModalMode] = useState<'set' | 'unlock'>('set');

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

  // Request deletion of notes - if any targeted note is locked, require passcode verification first
  const requestDeleteNotes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const hasLockedNote = ids.some((id) => notes.find((n) => n.id === id)?.isLocked);
      if (hasLockedNote) {
        // Find first locked note id to verify passcode before deletion
        const firstLockedId = ids.find((id) => notes.find((n) => n.id === id)?.isLocked)!;
        setSecurityModalNoteId(firstLockedId);
        setSecurityModalMode('unlock');
        // Pending notes to delete after passcode verification
        setNotesToDelete(ids);
        return;
      }
      setNotesToDelete(ids);
      setIsDeleteModalOpen(true);
    },
    [notes]
  );


  const handleResetZoom = useCallback(() => {
    handleCanvasTransformChange({ x: Math.round(window.innerWidth / 2 - 400), y: Math.round(window.innerHeight / 2 - 300), zoom: 1 });
  }, [handleCanvasTransformChange]);

  const handleTogglePanMode = useCallback(() => {
    setIsPanMode((prev) => !prev);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => ({ ...prev, themeMode: prev.themeMode === 'dark' ? 'light' : 'dark' }));
  }, [setSettings]);

  const handleToggleSnapToGrid = useCallback(() => {
    setSettings((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  }, [setSettings]);

  const handleToggleConnections = useCallback(() => {
    setSettings((prev) => ({ ...prev, showConnections: !prev.showConnections }));
  }, [setSettings]);

  // Lock selected notes — if global master passcode already set, lock immediately; otherwise open setup modal
  const handleLockSelectedNotes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      if (settings.masterPasswordHash) {
        // Master passcode configured — lock all selected notes immediately
        const notesToLock = notes
          .filter((n) => ids.includes(n.id) && !n.isLocked)
          .map((n) => ({ ...n, isLocked: true, updatedAt: new Date().toISOString() }));
        if (notesToLock.length > 0) {
          handleUpdateBatchNotes(notesToLock);
          const count = notesToLock.length;
          sendNativeAppNotification(
            'Note Locked',
            count === 1 ? `Locked note "${notesToLock[0].title || 'Untitled Note'}"` : `Locked ${count} notes`
          );
        }
      } else {
        // First time global setup — open setup modal for the first selected note
        setSecurityModalNoteId(ids[0]);
        setSecurityModalMode('set');
      }
    },
    [notes, settings.masterPasswordHash, handleUpdateBatchNotes]
  );

  // 4. Note Selection & Keyboard Shortcuts Hook
  const {
    selectedNoteIds,
    setSelectedNoteIds,
    selectedNoteId,
    editingNoteId,
    setEditingNoteId,
    handleSelectNote,
    handleSelectMultipleNotes,
  } = useNoteSelection(
    notes,
    handleUndo,
    handleRedo,
    requestDeleteNotes,
    setIsSearchOpen,
    (x, y) => handleCreateNote(x, y),
    handleFitNotes,
    handleResetZoom,
    handleTogglePanMode,
    handleToggleTheme,
    handleToggleSnapToGrid,
    handleToggleConnections,
    () => setIsZenMode((prev) => !prev),
    handleLockSelectedNotes,
    (id) => handleNavigateToNote(id, setSelectedNoteIds)
  );

  const handleDeleteProtectedNote = useCallback(
    (noteId: string) => {
      const target = notes.find((n) => n.id === noteId);
      if (target?.isLocked) {
        setSecurityModalNoteId(noteId);
        setSecurityModalMode('unlock');
        setNotesToDelete([noteId]);
      } else {
        handleDeleteNote(noteId);
        setSelectedNoteIds((prev) => prev.filter((id) => id !== noteId));
        sendNativeAppNotification(
          'Note Deleted',
          `Deleted note "${target?.title || 'Untitled Note'}"`
        );
      }
    },
    [notes, handleDeleteNote, setSelectedNoteIds]
  );

  const handleCreateNote = useCallback(
    (customX?: number, customY?: number) => {
      const newId = handleAddNote(transform, settings, customX, customY);
      setSelectedNoteIds([newId]);
      setEditingNoteId(newId);
    },
    [handleAddNote, transform, settings, setSelectedNoteIds, setEditingNoteId]
  );

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

  const handleConfirmDelete = useCallback(() => {
    if (notesToDelete.length > 0) {
      handleDeleteMultipleNotes(notesToDelete);
      setSelectedNoteIds((prev) => prev.filter((id) => !notesToDelete.includes(id)));
      const count = notesToDelete.length;
      sendNativeAppNotification(
        'Notes Deleted',
        count === 1 ? `Deleted 1 note` : `Deleted ${count} notes`
      );
      setNotesToDelete([]);
    }
    setIsDeleteModalOpen(false);
  }, [handleDeleteMultipleNotes, notesToDelete, setSelectedNoteIds]);

  const securityModalNote = notes.find((n) => n.id === securityModalNoteId);

  const handleExportNote = useCallback((note: Note, format: 'md' | 'txt') => {
    if (note.isLocked) {
      setSecurityModalNoteId(note.id);
      setSecurityModalMode('unlock');
      return;
    }
    const text = `# ${note.title || 'Untitled Note'}\n\n${note.content || ''}`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'note').replace(/[^a-z0-9]/gi, '_')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${settings.themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Zen Mode Exit Badge */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="fixed top-4 right-4 z-50 px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-mono border border-slate-700 shadow-xl backdrop-blur-md hover:bg-slate-800 transition-all select-none"
        >
          Zen Mode (Click or press Z to exit)
        </button>
      )}

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
        onDeleteNote={handleDeleteProtectedNote}
        onBringToFront={bringToFront}
        onDoubleClickCanvas={handleCreateNote}
        onRequestLockNote={(id) => {
          if (settings.masterPasswordHash) {
            // Global master passcode already set — lock immediately without modal
            const note = notes.find((n) => n.id === id);
            if (note) {
              handleUpdateNote({
                ...note,
                isLocked: true,
                updatedAt: new Date().toISOString(),
              });
              sendNativeAppNotification(
                'Note Locked',
                `Locked note "${note.title || 'Untitled Note'}"`
              );
            }
          } else {
            // First time setup — prompt to set app-wide global master passcode
            setSecurityModalNoteId(id);
            setSecurityModalMode('set');
          }
        }}
        onRequestUnlockNote={(id) => {
          setSecurityModalNoteId(id);
          setSecurityModalMode('unlock');
        }}
        onExportNote={handleExportNote}
      />

      {/* Docked Control Bar */}
      {!isZenMode && (
        <CanvasControls
          notes={notes}
          transform={transform}
          gridType={settings.gridType}
          themeMode={settings.themeMode}
          snapToGrid={settings.snapToGrid}
          showConnections={settings.showConnections}
          isPanMode={isPanMode}
          canUndo={canUndo}
          canRedo={canRedo}
          onAddNote={() => handleCreateNote()}
          onTogglePanMode={handleTogglePanMode}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onFitNotes={handleFitNotes}
          onChangeGridType={(gridType) => setSettings((prev) => ({ ...prev, gridType }))}
          onToggleTheme={handleToggleTheme}
          onToggleSnapToGrid={handleToggleSnapToGrid}
          onToggleConnections={handleToggleConnections}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotesList={() => setIsNotesListOpen(true)}
          onExportBackup={() => exportBackup(notes, transform, settings)}
          onImportBackup={handleImportBackupFile}
          onResetSampleNotes={handleResetSampleNotes}
        />
      )}

      {/* Sidebar Drawer */}
      <NotesSidebar
        isOpen={isNotesListOpen}
        notes={notes}
        themeMode={settings.themeMode}
        onClose={() => setIsNotesListOpen(false)}
        onSelectNote={(id) => handleNavigateToNote(id, setSelectedNoteIds)}
        onAddNote={() => handleCreateNote()}
        onDeleteNote={handleDeleteProtectedNote}
      />

      {/* Command Palette Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        notes={notes}
        themeMode={settings.themeMode}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={(id) => handleNavigateToNote(id, setSelectedNoteIds)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        count={notesToDelete.length}
        themeMode={settings.themeMode}
        onConfirm={handleConfirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      {/* App Global Master Security Lock & Unlock Modal */}
      <SecurityModal
        isOpen={securityModalNoteId !== null}
        mode={securityModalMode}
        themeMode={settings.themeMode}
        existingQuestion={settings.masterSecurityQuestion}
        existingPasswordHash={settings.masterPasswordHash}
        existingAnswerHash={settings.masterSecurityAnswerHash}
        onClose={() => setSecurityModalNoteId(null)}
        onSuccessSet={(masterPasswordHash, masterSecurityQuestion, masterSecurityAnswerHash) => {
          // Store global master passcode & recovery question in App Settings
          setSettings((prev) => ({
            ...prev,
            masterPasswordHash,
            masterSecurityQuestion,
            masterSecurityAnswerHash,
          }));

          // Lock target note immediately
          if (securityModalNote) {
            handleUpdateNote({
              ...securityModalNote,
              isLocked: true,
              updatedAt: new Date().toISOString(),
            });
          }
        }}
        onSuccessUnlock={() => {
          if (!securityModalNote) return;
          
          // If pending deletion was requested, proceed with deletion after successful unlock
          if (notesToDelete.length > 0) {
            handleDeleteMultipleNotes(notesToDelete);
            setSelectedNoteIds((prev) => prev.filter((id) => !notesToDelete.includes(id)));
            const count = notesToDelete.length;
            sendNativeAppNotification(
              'Note Deleted',
              count === 1 ? `Deleted protected note "${securityModalNote.title || 'Untitled Note'}"` : `Deleted ${count} protected notes`
            );
            setNotesToDelete([]);
            return;
          }

          // Otherwise unlock note view
          handleUpdateNote({
            ...securityModalNote,
            isLocked: false,
            updatedAt: new Date().toISOString(),
          });
        }}
      />
    </div>
  );
}
