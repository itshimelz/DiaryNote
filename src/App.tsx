import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, CanvasTransform } from './types';
import { exportBackup, exportNotesBackup, importBackup, saveFileWithNotification } from './lib/storage';

// Custom Hooks
import { useHistoryState } from './hooks/useHistoryState';
import { useNotesManager } from './hooks/useNotesManager';
import { useCanvasTransform, screenToWorld } from './hooks/useCanvasTransform';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useAppUIState } from './hooks/useAppUIState';

// Modular Components
import {
  InfiniteCanvas,
  CanvasControls,
  NotesSidebar,
  BatchActionBar,
  UpdateAlertBanner,
  StatusBar,
} from './components';

import { AppModals } from './components/Modals/AppModals';
import { sendNativeAppNotification } from './utils';
import { checkForAppUpdates } from './utils/updateChecker';
import { saveSettingsToDB, saveImportedNotesToDB } from './lib/sqliteStorage';
import { mergeNotesWithAI } from './services/ai/aiMergeService';
import { AppSettings } from './lib/storage';

export default function App() {
  const {
    isNotesListOpen,
    setIsNotesListOpen,
    isSearchOpen,
    setIsSearchOpen,
    isJournalCalendarOpen,
    setIsJournalCalendarOpen,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    isAboutModalOpen,
    setIsAboutModalOpen,
    isAISettingsOpen,
    setIsAISettingsOpen,
    isMergingAI,
    setIsMergingAI,
    mergedSelectionKeys,
    setMergedSelectionKeys,
    updateReleaseAlert,
    setUpdateReleaseAlert,
    isPanMode,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    notesToDelete,
    setNotesToDelete,
    isZenMode,
    setIsZenMode,
    showStatusBar,
    handleToggleStatusBar,
    handleTogglePanMode,
    securityModalNoteId,
    setSecurityModalNoteId,
    securityModalMode,
    setSecurityModalMode,
    contextMenuState,
    setContextMenuState,
    pasteModalState,
    setPasteModalState,
  } = useAppUIState();

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
    lastSavedAt,
    isSaving,
    saveError,
    initAppDatabase,
    handleAddNote,
    handleCreateOrFocusDailyEntry,
    handleUpdateNote,
    handleUpdateBatchNotes,
    handleDeleteNote,
    handleDeleteMultipleNotes,
    handleRestoreNotes,
    bringToFront,
    flushPendingHistory,
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
    handleResetZoom,
    handleFitNotes,
    handleNavigateToNote,
  } = useCanvasTransform(notes, bringToFront);

  // Initialize SQLite Database on mount and restore persisted canvas transform & settings
  useEffect(() => {
    initAppDatabase(({ transform: dbTransform, settings: dbSettings }) => {
      if (dbTransform) {
        handleCanvasTransformChange(dbTransform);
      }
      if (dbSettings) {
        setSettings((prev) => ({ ...prev, ...dbSettings }));
      }
    });
  }, [initAppDatabase, handleCanvasTransformChange, setSettings]);

  // Task 14: Network Transparency — Check GitHub for updates on mount only if opted-in
  useEffect(() => {
    if (settings.checkForUpdatesOnLaunch !== false) {
      checkForAppUpdates().then((res) => {
        if (res.updateAvailable && res.isFirstTimeAlert && res.latestRelease) {
          setUpdateReleaseAlert(res.latestRelease);
        }
      });
    }
  }, [settings.checkForUpdatesOnLaunch, setUpdateReleaseAlert]);

  // Staged backup import preview modal state
  const [stagedImportData, setStagedImportData] = useState<{
    isOpen: boolean;
    notes: Note[];
    transform?: CanvasTransform;
    settings?: AppSettings;
  }>({ isOpen: false, notes: [] });

  const handleUndo = useCallback(() => {
    flushPendingHistory();
    triggerUndo(handleRestoreNotes);
  }, [flushPendingHistory, triggerUndo, handleRestoreNotes]);

  const handleRedo = useCallback(() => {
    flushPendingHistory();
    triggerRedo(handleRestoreNotes);
  }, [flushPendingHistory, triggerRedo, handleRestoreNotes]);

  // Request deletion of notes - if any targeted note is locked, require passcode verification first
  const requestDeleteNotes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const hasLockedNote = ids.some((id) => notes.find((n) => n.id === id)?.isLocked);
      if (hasLockedNote) {
        const firstLockedId = ids.find((id) => notes.find((n) => n.id === id)?.isLocked)!;
        setSecurityModalNoteId(firstLockedId);
        setSecurityModalMode('unlock');
        setNotesToDelete(ids);
        return;
      }
      setNotesToDelete(ids);
      setIsDeleteModalOpen(true);
    },
    [notes, setSecurityModalNoteId, setSecurityModalMode, setNotesToDelete, setIsDeleteModalOpen]
  );

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => ({ ...prev, themeMode: prev.themeMode === 'dark' ? 'light' : 'dark' }));
  }, [setSettings]);

  const handleToggleSnapToGrid = useCallback(() => {
    setSettings((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  }, [setSettings]);

  const handleToggleConnections = useCallback(() => {
    setSettings((prev) => ({ ...prev, showConnections: !prev.showConnections }));
  }, [setSettings]);

  // Lock selected notes
  const handleLockSelectedNotes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      if (settings.masterPasswordHash) {
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
        setSecurityModalNoteId(ids[0]);
        setSecurityModalMode('set');
      }
    },
    [notes, settings.masterPasswordHash, handleUpdateBatchNotes, setSecurityModalNoteId, setSecurityModalMode]
  );

  const handleSaveAISettings = useCallback(
    (aiSettings: Partial<AppSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...aiSettings };
        saveSettingsToDB(updated);
        return updated;
      });
      sendNativeAppNotification(
        'AI Settings Saved',
        'AI service settings and key encryption updated successfully.'
      );
    },
    [setSettings]
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
    (id) => handleNavigateToNote(id, setSelectedNoteIds),
    () => {
      if (selectedNoteIds.length < 2) return;
      const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
      const newGroupId = `group-${crypto.randomUUID()}`;
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
    () => handleMergeNotesAI()
  );

  const currentSelectionKey = selectedNoteIds.slice().sort().join(',');
  const isCurrentSelectionMerged = mergedSelectionKeys.has(currentSelectionKey);

  const handleMergeNotesAI = useCallback(() => {
    if (!settings.enableAIServices || !settings.encryptedApiKey) {
      setIsAISettingsOpen(true);
      return;
    }

    const notesToMerge = notes.filter((n) => selectedNoteIds.includes(n.id));
    if (notesToMerge.length < 2 || notesToMerge.length > 5) {
      alert('Please select between 2 and 5 notes to merge.');
      return;
    }

    const selKey = selectedNoteIds.slice().sort().join(',');
    if (mergedSelectionKeys.has(selKey)) {
      sendNativeAppNotification(
        'Already Merged',
        'This selection of notes has already been merged into a note.'
      );
      return;
    }

    setIsMergingAI(true);
    setMergedSelectionKeys((prev) => new Set(prev).add(selKey));

    const targetCount = notesToMerge.length;
    sendNativeAppNotification(
      'AI Merge Started',
      `Synthesizing ${targetCount} notes in the background...`
    );

    (async () => {
      try {
        const result = await mergeNotesWithAI(notesToMerge, {
          aiProvider: settings.aiProvider || 'gemini',
          encryptedApiKey: settings.encryptedApiKey,
          apiKeyIv: settings.apiKeyIv || '',
          customBaseUrl: settings.customBaseUrl,
          customModelName: settings.customModelName,
        });

        const avgX = Math.round(notesToMerge.reduce((sum, n) => sum + n.x, 0) / notesToMerge.length);
        const avgY = Math.round(notesToMerge.reduce((sum, n) => sum + (n.y + (n.height || 340)), 0) / notesToMerge.length) + 40;
        const maxZ = Math.max(0, ...notes.map((n) => n.zIndex || 0));

        const newNote: Note = {
          id: `note-${crypto.randomUUID()}`,
          title: result.title,
          content: result.content,
          x: avgX,
          y: avgY,
          width: 500,
          height: 420,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fontFamily: settings.defaultFont || 'sans',
          fontSize: 'md',
          paperTheme: 'white',
          activeMode: 'text',
          isPinned: false,
          zIndex: maxZ + 1,
          tags: ['ai-merged'],
        };

        handleUpdateNote(newNote);

        sendNativeAppNotification(
          'AI Note Merged Successfully',
          `Created "${result.title}" from ${targetCount} notes.`
        );
      } catch (err: any) {
        console.error('Failed to merge notes with AI:', err);
        setMergedSelectionKeys((prev) => {
          const next = new Set(prev);
          next.delete(selKey);
          return next;
        });
        sendNativeAppNotification(
          'AI Merge Failed',
          err?.message || 'Failed to merge notes with AI. Please check your API Key settings.'
        );
      } finally {
        setIsMergingAI(false);
      }
    })();
  }, [settings, notes, selectedNoteIds, mergedSelectionKeys, handleUpdateNote, setIsAISettingsOpen, setIsMergingAI, setMergedSelectionKeys]);

  const handleOpenOrCreateTodayJournal = useCallback(
    (targetDateStr?: string) => {
      const { noteId } = handleCreateOrFocusDailyEntry(transform, settings, targetDateStr);
      handleNavigateToNote(noteId, setSelectedNoteIds);
    },
    [handleCreateOrFocusDailyEntry, transform, settings, handleNavigateToNote, setSelectedNoteIds]
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
    [notes, handleDeleteNote, setSelectedNoteIds, setSecurityModalNoteId, setSecurityModalMode, setNotesToDelete]
  );

  const handleCreateNote = useCallback(
    (screenX?: number, screenY?: number) => {
      let worldX: number | undefined = undefined;
      let worldY: number | undefined = undefined;

      if (typeof screenX === 'number' && typeof screenY === 'number' && !isNaN(screenX) && !isNaN(screenY)) {
        const coords = screenToWorld(screenX, screenY, transform);
        worldX = coords.worldX;
        worldY = coords.worldY;
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

  const handleImportBackupFile = useCallback(
    (file: File) => {
      importBackup(file)
        .then((parsed) => {
          if (!parsed.notes || parsed.notes.length === 0) {
            sendNativeAppNotification('Import Failed', `No notes found in ${file.name}`);
            return;
          }
          setStagedImportData({
            isOpen: true,
            notes: parsed.notes,
            transform: parsed.transform,
            settings: parsed.settings,
          });
        })
        .catch((err: any) => {
          console.error('Failed to parse backup:', err);
          sendNativeAppNotification(
            'Import Failed',
            `Failed to parse backup from ${file.name}: ${err?.message || 'Invalid backup structure'}`
          );
        });
    },
    []
  );

  const handleCommitImport = useCallback(
    async (resolvedNotes: Note[], newTransform?: CanvasTransform, newSettings?: AppSettings) => {
      try {
        await saveImportedNotesToDB(resolvedNotes);
        setNotes(resolvedNotes);
        resetHistory(resolvedNotes);

        if (newTransform) {
          handleCanvasTransformChange(newTransform);
        }
        if (newSettings) {
          setSettings((prev) => ({ ...prev, ...newSettings }));
        }

        sendNativeAppNotification(
          'Import Successful',
          `Imported ${resolvedNotes.length} notes into canvas.`
        );
      } catch (err: any) {
        console.error('Failed to persist imported notes to IndexedDB:', err);
        sendNativeAppNotification(
          'Import Error',
          `Failed to persist imported notes: ${err?.message || 'Storage error'}`
        );
      }
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
  }, [handleDeleteMultipleNotes, notesToDelete, setSelectedNoteIds, setNotesToDelete, setIsDeleteModalOpen]);

  const securityModalNote = notes.find((n) => n.id === securityModalNoteId) || null;

  const handleExportNote = useCallback(async (note: Note, format: 'md' | 'txt' | 'json') => {
    if (note.isLocked) {
      setSecurityModalNoteId(note.id);
      setSecurityModalMode('unlock');
      return;
    }
    const cleanTitle = (note.title || 'Untitled_Note').trim().replace(/[^a-z0-9_\-]/gi, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${cleanTitle}_${dateStr}.${format}`;

    if (format === 'json') {
      await exportNotesBackup([note], fileName);
    } else {
      const text = `# ${note.title || 'Untitled Note'}\n\n${note.content || ''}`;
      const contentType = format === 'md' ? 'text/markdown' : 'text/plain';
      await saveFileWithNotification(fileName, text, 'Notes', contentType);
    }
  }, [setSecurityModalNoteId, setSecurityModalMode]);

  // Global native paste event handler to create note from external clipboard
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          (activeEl.tagName === 'TEXTAREA' && !activeEl.getAttribute('aria-hidden')) ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain');
      if (pastedText && pastedText.trim().length > 0) {
        e.preventDefault();
        setPasteModalState({
          isOpen: true,
          text: pastedText.trim(),
        });
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleOpenOrCreateTodayJournal();
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleOpenOrCreateTodayJournal, setPasteModalState]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${settings.themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Zen Mode Exit Badge */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="fixed top-4 right-4 z-50 px-3.5 py-1.5 rounded-sm bg-slate-900/90 text-white text-xs font-mono border border-slate-700 shadow-sm backdrop-blur-md hover:bg-slate-800 transition-colors select-none cursor-pointer"
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
            setSecurityModalNoteId(id);
            setSecurityModalMode('set');
          }
        }}
        onRequestUnlockNote={(id) => {
          setSecurityModalNoteId(id);
          setSecurityModalMode('unlock');
        }}
        onExportNote={handleExportNote}
        onContextMenuNote={(e, noteId) => {
          e.preventDefault();
          const nextSelected = selectedNoteIds.includes(noteId)
            ? selectedNoteIds
            : e.shiftKey
            ? [...selectedNoteIds, noteId]
            : [noteId];

          setSelectedNoteIds(nextSelected);
          setContextMenuState({
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
          });
        }}
        onContextMenuCanvas={(e) => {
          e.preventDefault();
          setSelectedNoteIds([]);
          setContextMenuState({
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
          });
        }}
      />

      {/* Docked Bottom Control Bar Container */}
      {!isZenMode && (
        <motion.div
          layout
          initial={false}
          animate={{
            borderRadius: selectedNoteIds.length >= 2
              ? '10px 10px 4px 4px'
              : '4px 4px 10px 10px',
          }}
          transition={{
            layout: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
            borderRadius: selectedNoteIds.length >= 2
              ? { duration: 0.15, ease: 'easeOut' }
              : { duration: 0.18, ease: 'easeOut', delay: 0.16 },
          }}
          className={`fixed ${showStatusBar ? 'bottom-10' : 'bottom-6'} left-1/2 -translate-x-1/2 z-40 flex flex-col items-center border shadow-sm select-none min-w-[320px] sm:min-w-[540px] md:min-w-[640px] w-auto max-w-[calc(100vw-24px)] transition-[bottom] duration-200 ${
            selectedNoteIds.length >= 2 ? 'overflow-visible' : 'overflow-hidden'
          } ${
            settings.themeMode === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-800'
              : 'bg-slate-900/90 border-slate-800 text-slate-200'
          }`}
        >
          {/* Batch Action Bar Header */}
          <AnimatePresence initial={false}>
            {selectedNoteIds.length >= 2 && (
              <motion.div
                key="batch-menu-wrapper"
                initial={{ height: 0, opacity: 0, y: 15 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 15 }}
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
                  enableAIServices={settings.enableAIServices}
                  isMergingAI={isMergingAI}
                  isAlreadyMerged={isCurrentSelectionMerged}
                  onMergeNotesAI={handleMergeNotesAI}
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

          {/* Primary Canvas Controls Row */}
          <div className={`w-full relative z-20 rounded-b-[inherit] ${
            settings.themeMode === 'light' ? 'bg-white/95' : 'bg-slate-900/90'
          }`}>
            <CanvasControls
              notes={notes}
              zoom={transform.zoom}
              gridType={settings.gridType}
              themeMode={settings.themeMode}
              snapToGrid={settings.snapToGrid}
              showConnections={settings.showConnections}
              hasBatchBar={selectedNoteIds.length >= 2}
              enableAIServices={settings.enableAIServices}
              onOpenAISettings={() => setIsAISettingsOpen(true)}
              isPanMode={isPanMode}
              canUndo={canUndo}
              canRedo={canRedo}
              onAddNote={() => handleCreateNote()}
              onOpenTodayJournal={() => handleOpenOrCreateTodayJournal()}
              onOpenJournalCalendar={() => setIsJournalCalendarOpen(true)}
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
              onOpenAbout={() => setIsAboutModalOpen(true)}
              onOpenNotesList={() => setIsNotesListOpen(true)}
              onExportBackup={() => exportBackup(notes, transform, settings)}
              onImportBackup={handleImportBackupFile}
              showStatusBar={showStatusBar}
              onToggleStatusBar={handleToggleStatusBar}
              checkForUpdatesOnLaunch={settings.checkForUpdatesOnLaunch !== false}
              onToggleCheckForUpdates={() =>
                setSettings((prev) => ({
                  ...prev,
                  checkForUpdatesOnLaunch: prev.checkForUpdatesOnLaunch === false ? true : false,
                }))
              }
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

      {/* Modals Container */}
      <AppModals
        notes={notes}
        settings={settings}
        setSettings={setSettings}
        transform={transform}
        selectedNoteIds={selectedNoteIds}
        setSelectedNoteIds={setSelectedNoteIds}
        setEditingNoteId={setEditingNoteId}
        securityModalNote={securityModalNote}
        securityModalNoteId={securityModalNoteId}
        setSecurityModalNoteId={setSecurityModalNoteId}
        securityModalMode={securityModalMode}
        notesToDelete={notesToDelete}
        setNotesToDelete={setNotesToDelete}
        isDeleteModalOpen={isDeleteModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        isJournalCalendarOpen={isJournalCalendarOpen}
        setIsJournalCalendarOpen={setIsJournalCalendarOpen}
        isShortcutsModalOpen={isShortcutsModalOpen}
        setIsShortcutsModalOpen={setIsShortcutsModalOpen}
        isAboutModalOpen={isAboutModalOpen}
        setIsAboutModalOpen={setIsAboutModalOpen}
        isAISettingsOpen={isAISettingsOpen}
        setIsAISettingsOpen={setIsAISettingsOpen}
        stagedImportData={stagedImportData}
        setStagedImportData={setStagedImportData}
        handleCommitImport={handleCommitImport}
        contextMenuState={contextMenuState}
        setContextMenuState={setContextMenuState}
        pasteModalState={pasteModalState}
        setPasteModalState={setPasteModalState}
        handleUpdateNote={handleUpdateNote}
        handleUpdateBatchNotes={handleUpdateBatchNotes}
        handleDeleteMultipleNotes={handleDeleteMultipleNotes}
        handleConfirmDelete={handleConfirmDelete}
        handleCreateNote={handleCreateNote}
        handleAddNote={handleAddNote}
        handleOpenOrCreateTodayJournal={handleOpenOrCreateTodayJournal}
        handleNavigateToNote={handleNavigateToNote}
        handleLockSelectedNotes={handleLockSelectedNotes}
        handleExportNote={handleExportNote}
        requestDeleteNotes={requestDeleteNotes}
        handleSaveAISettings={handleSaveAISettings}
        setNotes={setNotes}
      />

      {/* First-Time Release Update Alert Banner */}
      {updateReleaseAlert && (
        <UpdateAlertBanner
          release={updateReleaseAlert}
          themeMode={settings.themeMode}
          onDismiss={() => setUpdateReleaseAlert(null)}
          onOpenAbout={() => {
            setUpdateReleaseAlert(null);
            setIsAboutModalOpen(true);
          }}
        />
      )}

      {/* Bottom Status Bar */}
      {showStatusBar && !isZenMode && (
        <StatusBar
          notes={notes}
          themeMode={settings.themeMode}
          selectedNoteIds={selectedNoteIds}
          snapToGrid={settings.snapToGrid}
          gridType={settings.gridType}
          enableAIServices={settings.enableAIServices}
          isMergingAI={isMergingAI}
          isSaving={isSaving}
          saveError={saveError}
          lastSavedAt={lastSavedAt}
          onToggleSnap={handleToggleSnapToGrid}
          onCycleGridType={() =>
            setSettings((prev) => ({
              ...prev,
              gridType:
                prev.gridType === 'dots'
                  ? 'grid'
                  : prev.gridType === 'grid'
                  ? 'ruled'
                  : prev.gridType === 'ruled'
                  ? 'blank'
                  : 'dots',
            }))
          }
          onOpenBackupModal={() => exportBackup(notes, transform, settings)}
          onOpenSearchModal={() => setIsSearchOpen(true)}
          onOpenJournalCalendar={() => setIsJournalCalendarOpen(true)}
        />
      )}
    </div>
  );
}
