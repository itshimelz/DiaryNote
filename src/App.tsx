import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CanvasTransform, Note } from './types';
import { exportBackup, exportNotesBackup, importBackup, SAMPLE_NOTES } from './lib/storage';

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
  BatchActionBar,
  KeyboardShortcutsModal,
  NoteContextMenu,
  PasteConfirmModal,
  HiddenClipboardListener,
} from './components';
import { sendNativeAppNotification } from './lib/notifications';

export default function App() {
  const [isNotesListOpen, setIsNotesListOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notesToDelete, setNotesToDelete] = useState<string[]>([]);

  const [isZenMode, setIsZenMode] = useState(false);
  const [securityModalNoteId, setSecurityModalNoteId] = useState<string | null>(null);
  const [securityModalMode, setSecurityModalMode] = useState<'set' | 'unlock'>('set');

  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  const [pasteModalState, setPasteModalState] = useState<{
    isOpen: boolean;
    text: string;
  }>({
    isOpen: false,
    text: '',
  });

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
          .map((n) => ({ ...n, isLocked: true }));
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

  const handleTriggerPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteModalState({
        isOpen: true,
        text: text ? text.trim() : '',
      });
    } catch {
      setPasteModalState({
        isOpen: true,
        text: '',
      });
    }
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
    (id) => handleNavigateToNote(id, setSelectedNoteIds),
    () => {
      // Group shortcut (Ctrl+G) handler
      if (selectedNoteIds.length < 2) return;
      const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
      const newGroupId = `group-${Date.now()}`;
      const groupName = `Group ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const updated = selectedNotes.map((n) => ({
        ...n,
        groupId: newGroupId,
        groupName,
        tags: n.tags?.filter((t) => !/^#?Group\s/i.test(t)),
      }));
      handleUpdateBatchNotes(updated);
      setSelectedNoteIds([]);
    },
    () => {
      // Ungroup shortcut (Ctrl+Shift+G) handler
      if (selectedNoteIds.length === 0) return;
      const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id) && n.groupId);
      if (selectedNotes.length === 0) return;
      const updated = selectedNotes.map((n) => ({
        ...n,
        groupId: undefined,
        groupName: undefined,
        tags: n.tags?.filter((t) => !/^#?Group\s/i.test(t)),
      }));
      handleUpdateBatchNotes(updated);
      setSelectedNoteIds([]);
    },
    () => setIsShortcutsModalOpen((prev) => !prev),
    handleTriggerPaste
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
    (screenX?: number, screenY?: number) => {
      let worldX: number | undefined = undefined;
      let worldY: number | undefined = undefined;

      if (typeof screenX === 'number' && typeof screenY === 'number' && !isNaN(screenX) && !isNaN(screenY)) {
        worldX = Math.round((screenX - transform.x) / transform.zoom - 180);
        worldY = Math.round((screenY - transform.y) / transform.zoom - 150);
        if (settings.snapToGrid) {
          worldX = Math.round(worldX / 24) * 24;
          worldY = Math.round(worldY / 24) * 24;
        }
      }

      const newId = handleAddNote(transform, settings, worldX, worldY);
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

  const handleExportNote = useCallback((note: Note, format: 'md' | 'txt' | 'json') => {
    if (note.isLocked) {
      setSecurityModalNoteId(note.id);
      setSecurityModalMode('unlock');
      return;
    }
    if (format === 'json') {
      const fileName = `${(note.title || 'note').replace(/[^a-z0-9]/gi, '_')}-backup.json`;
      exportNotesBackup([note], fileName);
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

  const handleContextMenuNote = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      e.preventDefault();
      setSelectedNoteIds((prev) => {
        if (prev.includes(noteId)) return prev;
        return e.shiftKey ? [...prev, noteId] : [noteId];
      });
      setContextMenuState({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [setSelectedNoteIds]
  );

  const handleContextMenuCanvas = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedNoteIds([]);
    setContextMenuState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, [setSelectedNoteIds]);

  // Global Ctrl+V / Cmd+V paste to create note from external source
  useEffect(() => {
    const processPastedText = (text: string) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (text && text.trim().length > 0) {
        setPasteModalState({
          isOpen: true,
          text: text.trim(),
        });
      }
    };

    // 1. Native ClipboardEvent handler
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain');
      if (pastedText && pastedText.trim().length > 0) {
        e.preventDefault();
        processPastedText(pastedText);
      }
    };

    // 2. Keyboard shortcut fallback (Ctrl+V / Cmd+V) reading navigator.clipboard
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.getAttribute('contenteditable') === 'true')
        ) {
          return;
        }

        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && clipboardText.trim().length > 0) {
            e.preventDefault();
            processPastedText(clipboardText);
          }
        } catch (err) {
          // System clipboard access permission fallback
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
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
        onContextMenuNote={handleContextMenuNote}
        onContextMenuCanvas={handleContextMenuCanvas}
      />

      {/* Docked Bottom Control Bar Container with Corner Morphing */}
      {!isZenMode && (
        <motion.div
          layout
          initial={false}
          animate={{
            borderRadius: selectedNoteIds.length >= 2
              ? ['6px', '10px 10px 4px 4px', '6px']
              : ['6px', '4px 4px 10px 10px', '6px'],
          }}
          transition={{
            layout: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
            borderRadius: { duration: 0.15, ease: 'easeOut' },
          }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center border shadow-sm select-none w-[640px] max-w-[calc(100vw-32px)] transition-colors duration-200 ${
            selectedNoteIds.length >= 2 ? 'overflow-visible' : 'overflow-hidden'
          } ${
            settings.themeMode === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-800'
              : 'bg-slate-900/90 border-slate-800 text-slate-200'
          }`}
        >
          {/* Batch Action Bar Header (POSITIONED BEHIND CanvasControls z-10) */}
          <AnimatePresence initial={false}>
            {selectedNoteIds.length >= 2 && (
              <motion.div
                key="batch-menu-wrapper"
                initial={{
                  height: 0,
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  y: 15,
                }}
                transition={{
                  height: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
                  y: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.12, ease: 'linear' },
                }}
                className="w-full relative z-10 overflow-visible origin-bottom"
              >
                <BatchActionBar
                  selectedNoteIds={selectedNoteIds}
                  notes={notes}
                  themeMode={settings.themeMode}
                  onUpdateBatchNotes={handleUpdateBatchNotes}
                  onDeleteNotes={(ids) => {
                    setNotesToDelete(ids);
                    setIsDeleteModalOpen(true);
                  }}
                  onClearSelection={() => setSelectedNoteIds([])}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Canvas Controls Row (POSITIONED IN FRONT z-20) */}
          <div className={`w-full relative z-20 rounded-b-[inherit] ${
            settings.themeMode === 'light' ? 'bg-white/95' : 'bg-slate-900/90'
          }`}>
            <CanvasControls
              notes={notes}
              transform={transform}
              gridType={settings.gridType}
              themeMode={settings.themeMode}
              snapToGrid={settings.snapToGrid}
              showConnections={settings.showConnections}
              hasBatchBar={selectedNoteIds.length >= 2}
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
              onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
              onOpenNotesList={() => setIsNotesListOpen(true)}
              onExportBackup={() => exportBackup(notes, transform, settings)}
              onImportBackup={handleImportBackupFile}
              onResetSampleNotes={handleResetSampleNotes}
            />
          </div>
        </motion.div>
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
          });
        }}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        themeMode={settings.themeMode}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Right-Click Context Menu for Selected Note(s) */}
      <NoteContextMenu
        x={contextMenuState.x}
        y={contextMenuState.y}
        isOpen={contextMenuState.isOpen}
        selectedNoteIds={selectedNoteIds}
        notes={notes}
        themeMode={settings.themeMode}
        onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onNavigateToNote={(id) => handleNavigateToNote(id, setSelectedNoteIds)}
        onEditNote={(id) => {
          setSelectedNoteIds([id]);
          setEditingNoteId(id);
        }}
        onTogglePin={(ids) => {
          const targets = notes.filter((n) => ids.includes(n.id));
          const allPinned = targets.every((n) => n.isPinned);
          const updated = targets.map((n) => ({ ...n, isPinned: !allPinned }));
          handleUpdateBatchNotes(updated);
        }}
        onLockNotes={(ids) => handleLockSelectedNotes(ids)}
        onGroupNotes={() => {
          if (selectedNoteIds.length < 2) return;
          const targets = notes.filter((n) => selectedNoteIds.includes(n.id));
          const newGroupId = `group-${Date.now()}`;
          const groupName = `Group ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          const updated = targets.map((n) => ({
            ...n,
            groupId: newGroupId,
            groupName,
          }));
          handleUpdateBatchNotes(updated);
        }}
        onUngroupNotes={() => {
          const targets = notes.filter((n) => selectedNoteIds.includes(n.id) && n.groupId);
          const updated = targets.map((n) => ({
            ...n,
            groupId: undefined,
            groupName: undefined,
          }));
          handleUpdateBatchNotes(updated);
        }}
        onDuplicateNotes={(ids) => {
          ids.forEach((id) => {
            const target = notes.find((n) => n.id === id);
            if (target) {
              const newId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              const dupNote: Note = {
                ...target,
                id: newId,
                title: `${target.title || 'Untitled'} (Copy)`,
                x: target.x + 30,
                y: target.y + 30,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              handleUpdateNote(dupNote);
              setSelectedNoteIds([newId]);
            }
          });
        }}
        onExportNotes={(ids, format) => {
          const targets = notes.filter((n) => ids.includes(n.id));
          if (targets.length === 1) {
            handleExportNote(targets[0], format);
          } else if (targets.length > 1) {
            const fileName = `selected-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
            exportNotesBackup(targets, fileName);
          }
        }}
        onDeleteNotes={(ids) => requestDeleteNotes(ids)}
        onChangePaperTheme={(ids, paperTheme) => {
          const targets = notes.filter((n) => ids.includes(n.id));
          const updated = targets.map((n) => ({ ...n, paperTheme }));
          handleUpdateBatchNotes(updated);
        }}
        onPasteFromClipboard={async () => {
          try {
            const text = await navigator.clipboard.readText();
            setPasteModalState({ isOpen: true, text: text ? text.trim() : '' });
          } catch {
            setPasteModalState({ isOpen: true, text: '' });
          }
        }}
        onCreateNoteHere={() => handleCreateNote(contextMenuState.x, contextMenuState.y)}
        onSelectAllNotes={() => setSelectedNoteIds(notes.map((n) => n.id))}
      />

      {/* Clipboard Ctrl+V Paste Confirm Modal */}
      <PasteConfirmModal
        isOpen={pasteModalState.isOpen}
        pastedText={pasteModalState.text}
        themeMode={settings.themeMode}
        onClose={() => setPasteModalState({ isOpen: false, text: '' })}
        onConfirm={(pastedTitle, pastedContent) => {
          const newId = handleAddNote(transform, settings);
          setNotes((prev) =>
            prev.map((n) =>
              n.id === newId ? { ...n, title: pastedTitle, content: pastedContent } : n
            )
          );
          setSelectedNoteIds([newId]);
          sendNativeAppNotification(
            'Note Created',
            `Created note "${pastedTitle}" from clipboard paste`
          );
        }}
      />

      {/* Hidden Native Clipboard Paste Listener (bypasses browser/distro permissions) */}
      <HiddenClipboardListener
        onPasteText={(text) => {
          setPasteModalState({
            isOpen: true,
            text,
          });
        }}
      />
    </div>
  );
}
