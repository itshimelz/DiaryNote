import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, CanvasTransform } from './types';
import { exportBackup, exportNotesBackup, importBackup, saveFileWithNotification } from './lib/storage';

// Custom Hooks
import { useHistoryState } from './hooks/useHistoryState';
import { useNotesManager } from './hooks/useNotesManager';
import { useCanvasTransform, screenToWorld } from './hooks/useCanvasTransform';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useAppUIState } from './hooks/useAppUIState';
import { useNativeFileDrop, DroppedImageData } from './hooks/useNativeFileDrop';
import { saveAssetFromPath, saveAssetFromBytes } from './lib/rustAssets';
import { isTauriEnvironment } from './lib/rustStorage';
import { invoke } from '@tauri-apps/api/core';


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
import { saveAppSettingsToDB as saveSettingsToDB, saveDirtyNotesToDB as saveImportedNotesToDB, exportNoteToFileNative } from './lib/rustStorage';
import { mergeNotesWithAI } from './services/ai/aiMergeService';
import { getSessionAuthState, setMasterSessionUnlocked, isNoteAuthorized } from './services/authPolicyService';
import { lockSessionVault } from './services/cryptoVaultService';
import { AppSettings } from './lib/storage';
import { DEFAULT_COVER_STYLE, DEFAULT_SEAL_STYLE } from './constants/noteCovers';

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
    isDatabaseModalOpen,
    setIsDatabaseModalOpen,
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
    notesToUnlock,
    setNotesToUnlock,
    notesToLock,
    setNotesToLock,
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
    handleAddImageNote,
    handleCreateOrFocusDailyEntry,
    handleUpdateNote,
    handleUpdateBatchNotes,
    handleDeleteNote: _handleDeleteNote,
    handleDeleteMultipleNotes,
    handleRestoreNotes,
    bringToFront,
    flushPendingHistory,
  } = useNotesManager(pushHistorySnapshot, resetHistory);

  const imagePickerCoordRef = useRef<{ x?: number; y?: number } | null>(null);
  const globalImageInputRef = useRef<HTMLInputElement>(null);
  const globalBackupInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize IndexedDB Database on mount and restore persisted canvas transform & settings
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

  // Task 14: Network Transparency — Check GitHub for updates on mount only if opted-in (deferred 3s after boot)
  useEffect(() => {
    if (settings.checkForUpdatesOnLaunch === false) return;
    const timer = setTimeout(() => {
      checkForAppUpdates().then((res) => {
        if (res.updateAvailable && res.isFirstTimeAlert && res.latestRelease) {
          setUpdateReleaseAlert(res.latestRelease);
        }
      });
    }, 3000);
    return () => clearTimeout(timer);
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

  // Lock or unlock selected notes
  const handleLockSelectedNotes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const targetNotes = notes.filter((n) => ids.includes(n.id));
      if (targetNotes.length === 0) return;

      const allLocked = targetNotes.every((n) => n.isLocked);

      if (allLocked) {
        // Unlock action
        if (getSessionAuthState().isMasterUnlocked) {
          const notesToUnlockBatch = targetNotes.map((n) => ({ ...n, isLocked: false }));
          handleUpdateBatchNotes(notesToUnlockBatch);
        } else {
          setNotesToUnlock(ids);
          setSecurityModalNoteId(ids[0]);
          setSecurityModalMode('unlock');
        }
      } else {
        // Lock action
        if (settings.masterPasswordHash) {
          const notesToLockBatch = targetNotes
            .filter((n) => !n.isLocked)
            .map((n) => ({ ...n, isLocked: true }));
          if (notesToLockBatch.length > 0) {
            handleUpdateBatchNotes(notesToLockBatch);
          }
        } else {
          setNotesToLock(ids);
          setSecurityModalNoteId(ids[0]);
          setSecurityModalMode('set');
        }
      }
    },
    [notes, settings.masterPasswordHash, handleUpdateBatchNotes, setSecurityModalNoteId, setSecurityModalMode, setNotesToUnlock, setNotesToLock]
  );

  const handleSaveAISettings = useCallback(
    (aiSettings: Partial<AppSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...aiSettings };
        saveSettingsToDB(updated);
        return updated;
      });
    },
    [setSettings]
  );

  // 3.5 Note Cut & Spatial Relocation State
  const [cutNoteIds, setCutNoteIds] = useState<string[]>([]);
  const cutNoteIdsRef = useRef<string[]>([]);
  const lastRelocatedAtRef = useRef<number>(0);
  useEffect(() => {
    cutNoteIdsRef.current = cutNoteIds;
  }, [cutNoteIds]);

  const mouseCoordRef = useRef<{ clientX: number; clientY: number }>({
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2,
  });

  const selectedNoteIdsRef = useRef<string[]>([]);
  const setSelectedNoteIdsRef = useRef<(ids: string[]) => void>(() => {});

  const handleCutSelectedNotes = useCallback(
    (explicitIds?: string[]) => {
      const targetIds =
        explicitIds && explicitIds.length > 0 ? explicitIds : selectedNoteIdsRef.current;
      if (targetIds.length === 0) return;

      const targetedNotes = notes.filter((n) => targetIds.includes(n.id));

      // SMART GROUP GUARD: Prevent cutting notes that belong to a group
      const groupedNotes = targetedNotes.filter((n) => Boolean(n.groupId));
      if (groupedNotes.length > 0) {
        sendNativeAppNotification(
          'Cannot Cut Grouped Note(s)',
          groupedNotes.length === 1
            ? `"${groupedNotes[0].title || 'Note'}" belongs to a group. Ungroup first (Ctrl+Shift+G) to relocate.`
            : `${groupedNotes.length} notes belong to a group. Ungroup first (Ctrl+Shift+G) to relocate.`
        );
        return;
      }

      setCutNoteIds([...targetIds]);
      // Instantly deselect so the semi-transparent cut ghost styling appears immediately
      setSelectedNoteIdsRef.current([]);
    },
    [notes]
  );

  const handlePasteRelocateNotes = useCallback(async () => {
    lastRelocatedAtRef.current = Date.now();
    const activeCutIds = cutNoteIdsRef.current;
    if (activeCutIds.length === 0) {
      return;
    }

    const targetClientX = mouseCoordRef.current.clientX;
    const targetClientY = mouseCoordRef.current.clientY;
    const targetWorldX = Math.round((targetClientX - transform.x) / transform.zoom);
    const targetWorldY = Math.round((targetClientY - transform.y) / transform.zoom);

    const targetedNotes = notes.filter((n) => activeCutIds.includes(n.id));
    if (targetedNotes.length === 0) {
      setCutNoteIds([]);
      return;
    }

    let newPositions: { id: string; x: number; y: number }[] = [];

    // Try native Rust relocate_notes command first
    if (isTauriEnvironment()) {
      try {
        const notePositions = targetedNotes.map((n) => ({ id: n.id, x: n.x, y: n.y }));
        const res = await invoke<{ id: string; x: number; y: number }[]>('relocate_notes', {
          notePositions,
          targetX: targetWorldX,
          targetY: targetWorldY,
        });
        if (res && res.length > 0) {
          newPositions = res;
        }
      } catch (err) {
        console.warn('Native relocate_notes fallback:', err);
      }
    }

    // Fallback in-memory spatial calculation
    if (newPositions.length === 0) {
      if (targetedNotes.length === 1) {
        newPositions = [
          {
            id: targetedNotes[0].id,
            x: targetWorldX - (targetedNotes[0].width || 340) / 2,
            y: targetWorldY - (targetedNotes[0].height || 340) / 2,
          },
        ];
      } else {
        const minX = Math.min(...targetedNotes.map((n) => n.x));
        const maxX = Math.max(...targetedNotes.map((n) => n.x + (n.width || 340)));
        const minY = Math.min(...targetedNotes.map((n) => n.y));
        const maxY = Math.max(...targetedNotes.map((n) => n.y + (n.height || 340)));
        const clusterCenterX = (minX + maxX) / 2;
        const clusterCenterY = (minY + maxY) / 2;
        const deltaX = targetWorldX - clusterCenterX;
        const deltaY = targetWorldY - clusterCenterY;
        newPositions = targetedNotes.map((n) => ({
          id: n.id,
          x: Math.round(n.x + deltaX),
          y: Math.round(n.y + deltaY),
        }));
      }
    }

    const posMap = new Map(newPositions.map((p) => [p.id, p]));
    const updated = targetedNotes.map((n) => {
      const pos = posMap.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    });

    handleUpdateBatchNotes(updated);
    const movedIds = [...activeCutIds];
    setCutNoteIds([]);
    setSelectedNoteIdsRef.current(movedIds);
    sendNativeAppNotification(
      'Note(s) Placed',
      `Relocated ${updated.length} note(s) to new canvas position.`
    );
  }, [notes, transform, handleUpdateBatchNotes]);

  const handleCancelCutNotes = useCallback(() => {
    if (cutNoteIdsRef.current.length > 0) {
      setCutNoteIds([]);
    }
  }, []);

  const handleToggleCoverSelectedNotes = useCallback(
    (noteIds: string[]) => {
      if (!noteIds || noteIds.length === 0) return;
      const targetNotes = notes.filter((n) => noteIds.includes(n.id));
      if (targetNotes.length === 0) return;

      const allCovered = targetNotes.every((n) => Boolean(n.isCovered));
      const newCoveredState = !allCovered;

      const updated = targetNotes.map((n) => ({
        ...n,
        isCovered: newCoveredState,
        coverStyle: n.coverStyle || DEFAULT_COVER_STYLE,
        sealStyle: n.sealStyle || DEFAULT_SEAL_STYLE,
        coverPrompt: n.coverPrompt || 'Click to open',
        updatedAt: new Date().toISOString(),
      }));

      handleUpdateBatchNotes(updated);
    },
    [notes, handleUpdateBatchNotes]
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
    () => handleMergeNotesAI(),
    (ids?: string[]) => handleCutSelectedNotes(ids),
    () => handlePasteRelocateNotes(),
    () => handleCancelCutNotes(),
    cutNoteIds.length > 0,
    handleToggleCoverSelectedNotes
  );

  useEffect(() => {
    selectedNoteIdsRef.current = selectedNoteIds;
    setSelectedNoteIdsRef.current = setSelectedNoteIds;
  }, [selectedNoteIds, setSelectedNoteIds]);

  // Native OS File Drag-and-Drop Image Creation Handler via Rust
  const handleAddDroppedImages = useCallback(
    (images: DroppedImageData[], customClientX?: number, customClientY?: number) => {
      if (!images || images.length === 0) return;

      images.forEach(async (imgData, index) => {
        let finalImageUrl = imgData.data_url;
        let precalculatedAspect: number | undefined;

        if (isTauriEnvironment() && imgData.file_path) {
          try {
            const assetInfo = await saveAssetFromPath(imgData.file_path);
            if (assetInfo && assetInfo.assetUri) {
              finalImageUrl = assetInfo.assetUri;
              precalculatedAspect = assetInfo.aspectRatio;
            }
          } catch (e) {
            console.warn('Native asset save from path failed, using data_url fallback:', e);
          }
        }

        const img = new Image();
        img.onload = () => {
          const aspectRatio = precalculatedAspect || (img.naturalWidth / Math.max(1, img.naturalHeight));

          let worldX: number | undefined;
          let worldY: number | undefined;

          if (typeof customClientX === 'number' && typeof customClientY === 'number') {
            worldX = Math.round((customClientX - transform.x) / transform.zoom - 170 + index * 24);
            worldY = Math.round((customClientY - transform.y) / transform.zoom - 180 + index * 24);
          } else {
            worldX = Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - 170 + index * 30);
            worldY = Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - 180 + index * 30);
          }

          const rawTitle = imgData.title || imgData.filename.replace(/\.[^/.]+$/, '') || 'Photo Note';
          const newId = handleAddImageNote(
            transform,
            settings,
            finalImageUrl,
            imgData.mime_type,
            worldX,
            worldY,
            rawTitle,
            '',
            'polaroid',
            undefined,
            aspectRatio
          );
          setSelectedNoteIds([newId]);
        };
        img.src = imgData.data_url;
      });
    },
    [transform, settings, handleAddImageNote, setSelectedNoteIds]
  );

  // Subscribe to Tauri Native OS Drag-Drop Events
  useNativeFileDrop({
    onDropImages: (images, clientX, clientY) => {
      handleAddDroppedImages(images, clientX, clientY);
    },
  });

  const handleAddImageFiles = useCallback(
    (files: File[], customClientX?: number, customClientY?: number) => {
      if (!files || files.length === 0) return;

      files.forEach(async (file, index) => {
        let finalImageUrl = '';
        let precalculatedAspect: number | undefined;

        if (isTauriEnvironment()) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const assetInfo = await saveAssetFromBytes(bytes, file.name);
            if (assetInfo && assetInfo.assetUri) {
              finalImageUrl = assetInfo.assetUri;
              precalculatedAspect = assetInfo.aspectRatio;
            }
          } catch (e) {
            console.warn('Native saveAssetFromBytes failed, fallback to data url:', e);
          }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (!dataUrl) return;

          const img = new Image();
          img.onload = () => {
            const aspectRatio = precalculatedAspect || (img.naturalWidth / Math.max(1, img.naturalHeight));

            let worldX: number | undefined;
            let worldY: number | undefined;

            if (typeof customClientX === 'number' && typeof customClientY === 'number') {
              worldX = Math.round((customClientX - transform.x) / transform.zoom - 170 + index * 24);
              worldY = Math.round((customClientY - transform.y) / transform.zoom - 180 + index * 24);
            } else {
              worldX = Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - 170 + index * 30);
              worldY = Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - 180 + index * 30);
            }

            const rawTitle = file.name.replace(/\.[^/.]+$/, '');
            const newId = handleAddImageNote(
              transform,
              settings,
              finalImageUrl || dataUrl,
              file.type,
              worldX,
              worldY,
              rawTitle,
              '',
              'polaroid',
              undefined,
              aspectRatio
            );
            setSelectedNoteIds([newId]);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    },
    [transform, settings, handleAddImageNote, setSelectedNoteIds]
  );

  const handleTriggerImagePicker = useCallback((clientX?: number, clientY?: number) => {
    imagePickerCoordRef.current = { x: clientX, y: clientY };
    globalImageInputRef.current?.click();
  }, []);

  const currentSelectionKey = selectedNoteIds.slice().sort().join(',');
  const isCurrentSelectionMerged = mergedSelectionKeys.has(currentSelectionKey);

  const handleMergeNotesAI = useCallback(() => {
    if (!settings.enableAIServices || !settings.encryptedApiKey) {
      setIsAISettingsOpen(true);
      return;
    }

    const notesToMerge = notes.filter((n) => selectedNoteIds.includes(n.id));
    if (notesToMerge.some((n) => Boolean(n.imageUrl))) {
      sendNativeAppNotification(
        'Cannot Merge Photos',
        'AI Note Merging is currently only supported for text and markdown notes.'
      );
      return;
    }
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

    const avgX = Math.round(notesToMerge.reduce((sum, n) => sum + n.x, 0) / notesToMerge.length);
    const avgY = Math.round(notesToMerge.reduce((sum, n) => sum + (n.y + (n.height || 340)), 0) / notesToMerge.length) + 40;
    const maxZ = Math.max(0, ...notes.map((n) => n.zIndex || 0));

    const newNoteId = `note-${crypto.randomUUID()}`;
    const initialNote: Note = {
      id: newNoteId,
      title: 'Synthesizing Notes...',
      content: 'AI is analyzing and synthesizing notes...',
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

    // Immediately render the card on the canvas so user sees streaming in real-time
    handleUpdateNote(initialNote);
    setSelectedNoteIds([newNoteId]);

    (async () => {
      try {
        const result = await mergeNotesWithAI(
          notesToMerge,
          {
            aiProvider: settings.aiProvider || 'gemini',
            encryptedApiKey: settings.encryptedApiKey,
            apiKeyIv: settings.apiKeyIv || '',
            customBaseUrl: settings.customBaseUrl,
            customModelName: settings.customModelName,
          },
          (progress) => {
            let displayTitle = 'Synthesizing Notes...';
            let displayContent = progress.accumulated;

            if (displayContent.startsWith('# ')) {
              const firstNewline = displayContent.indexOf('\n');
              if (firstNewline !== -1) {
                displayTitle = displayContent.slice(2, firstNewline).trim();
                displayContent = displayContent.slice(firstNewline + 1).trim();
              }
            }

            handleUpdateNote({
              ...initialNote,
              title: displayTitle || 'Synthesizing Notes...',
              content: displayContent,
              updatedAt: new Date().toISOString(),
            });
          }
        );

        handleUpdateNote({
          ...initialNote,
          title: result.title,
          content: result.content,
          updatedAt: new Date().toISOString(),
        });

        sendNativeAppNotification(
          'AI Note Merged Successfully',
          `Created "${result.title}" from ${targetCount} notes.`
        );
      } catch (err: any) {
        console.error('Failed to merge notes with AI:', err);
        handleDeleteMultipleNotes([newNoteId]);
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
  }, [settings, notes, selectedNoteIds, mergedSelectionKeys, handleUpdateNote, handleDeleteMultipleNotes, setSelectedNoteIds, setIsAISettingsOpen, setIsMergingAI, setMergedSelectionKeys]);

  const handleOpenOrCreateTodayJournal = useCallback(
    (targetDateStr?: string) => {
      const { noteId } = handleCreateOrFocusDailyEntry(transform, settings, targetDateStr);
      handleNavigateToNote(noteId, setSelectedNoteIds);
    },
    [handleCreateOrFocusDailyEntry, transform, settings, handleNavigateToNote, setSelectedNoteIds]
  );

  const handleDeleteProtectedNote = useCallback(
    (noteId: string) => {
      requestDeleteNotes([noteId]);
    },
    [requestDeleteNotes]
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
    if (note.isLocked && !isNoteAuthorized(note)) {
      setNotesToUnlock([note.id]);
      setSecurityModalNoteId(note.id);
      setSecurityModalMode('unlock');
      return;
    }

    const formatLabel = format === 'json' ? 'Backup (.json)' : format === 'md' ? 'Markdown (.md)' : 'Plain Text (.txt)';

    if (isTauriEnvironment()) {
      try {
        const savedPath = await exportNoteToFileNative(note, format);
        sendNativeAppNotification('Export Successful', `Exported "${note.title || 'Untitled Note'}" as ${formatLabel} to:\n${savedPath}`);
        return;
      } catch (err) {
        console.warn('Native export failed, falling back to browser download', err);
      }
    }

    const cleanTitle = (note.title || 'Untitled_Note').trim().replace(/[^a-z0-9_-]/gi, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${cleanTitle}_${dateStr}.${format}`;

    if (format === 'json') {
      await exportNotesBackup([note], fileName);
      sendNativeAppNotification('Backup Downloaded', `Exported ${fileName}`);
    } else {
      const text = `# ${note.title || 'Untitled Note'}\n\n${note.content || ''}`;
      const contentType = format === 'md' ? 'text/markdown' : 'text/plain';
      await saveFileWithNotification(fileName, text, 'Exports', contentType);
    }
  }, [setNotesToUnlock, setSecurityModalNoteId, setSecurityModalMode]);

  // Global shortcut listeners (e.g. today's journal entry)
  useEffect(() => {
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

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleOpenOrCreateTodayJournal]);

  // P0 perf: latest-ref pattern keeps InfiniteCanvas callback props referentially stable so
  // React.memo(InfiniteCanvas) holds across every App render, while handlers still read
  // fresh state at invocation time.
  const canvasHandlersRef = useRef({
    navigateToNote: (_id: string) => {},
    dropImageFiles: (_files: File[], _clientX: number, _clientY: number) => {},
    requestLockNote: (_id: string) => {},
    requestUnlockNote: (_id: string) => {},
    contextMenuNote: (_e: React.MouseEvent, _noteId: string) => {},
    contextMenuCanvas: (_e: React.MouseEvent) => {},
  });
  canvasHandlersRef.current.navigateToNote = (id) => handleNavigateToNote(id, setSelectedNoteIds);
  canvasHandlersRef.current.dropImageFiles = (files, clientX, clientY) =>
    handleAddImageFiles(files, clientX, clientY);
  canvasHandlersRef.current.requestLockNote = (id) => {
    if (settings.masterPasswordHash) {
      const note = notes.find((n) => n.id === id);
      if (note) {
        handleUpdateNote({
          ...note,
          isLocked: true,
        });
      }
    } else {
      setNotesToLock([id]);
      setSecurityModalNoteId(id);
      setSecurityModalMode('set');
    }
  };
  canvasHandlersRef.current.requestUnlockNote = (id) => {
    if (getSessionAuthState().isMasterUnlocked) {
      const note = notes.find((n) => n.id === id);
      if (note) {
        handleUpdateNote({
          ...note,
          isLocked: false,
        });
      }
    } else {
      setNotesToUnlock([id]);
      setSecurityModalNoteId(id);
      setSecurityModalMode('unlock');
    }
  };
  canvasHandlersRef.current.contextMenuNote = (e, noteId) => {
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
  };
  canvasHandlersRef.current.contextMenuCanvas = (e) => {
    e.preventDefault();
    setSelectedNoteIds([]);
    setContextMenuState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleNavigateToNoteStable = useCallback(
    (id: string) => canvasHandlersRef.current.navigateToNote(id),
    []
  );
  const handleDropImageFilesStable = useCallback(
    (files: File[], clientX: number, clientY: number) =>
      canvasHandlersRef.current.dropImageFiles(files, clientX, clientY),
    []
  );
  const handleRequestLockNoteStable = useCallback(
    (id: string) => canvasHandlersRef.current.requestLockNote(id),
    []
  );
  const handleRequestUnlockNoteStable = useCallback(
    (id: string) => canvasHandlersRef.current.requestUnlockNote(id),
    []
  );
  const handleContextMenuNoteStable = useCallback(
    (e: React.MouseEvent, noteId: string) => canvasHandlersRef.current.contextMenuNote(e, noteId),
    []
  );
  const handleContextMenuCanvasStable = useCallback(
    (e: React.MouseEvent) => canvasHandlersRef.current.contextMenuCanvas(e),
    []
  );
  const handleMouseMoveCoordStable = useCallback((clientX: number, clientY: number) => {
    mouseCoordRef.current = { clientX, clientY };
  }, []);

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${
      settings.themeMode === 'dark'
        ? 'bg-slate-950 text-slate-100'
        : settings.themeMode === 'cork'
        ? 'bg-[#b78a58] text-amber-950'
        : 'bg-slate-100 text-slate-900'
    }`}>
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
        onNavigateToNote={handleNavigateToNoteStable}
        onUpdateNote={handleUpdateNote}
        onUpdateBatchNotes={handleUpdateBatchNotes}
        onDeleteNote={handleDeleteProtectedNote}
        onBringToFront={bringToFront}
        onDoubleClickCanvas={handleCreateNote}
        onDropImageFiles={handleDropImageFilesStable}
        onRequestLockNote={handleRequestLockNoteStable}
        onRequestUnlockNote={handleRequestUnlockNoteStable}
        onExportNote={handleExportNote}
        onContextMenuNote={handleContextMenuNoteStable}
        onContextMenuCanvas={handleContextMenuCanvasStable}
        cutNoteIds={cutNoteIds}
        onMouseMoveCoord={handleMouseMoveCoordStable}
      />

      {/* Docked Bottom Control Bar Container */}
      {!isZenMode && (
        <motion.div
          key="bottom-dock-container"
          layout
          transition={{
            layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
          }}
          className={`fixed ${showStatusBar ? 'bottom-10' : 'bottom-6'} left-1/2 -translate-x-1/2 z-40 flex flex-col items-center border shadow-sm select-none rounded-sm min-w-[320px] sm:min-w-[540px] md:min-w-[640px] w-auto max-w-[calc(100vw-24px)] transition-[bottom] duration-200 overflow-hidden ${
            settings.themeMode === 'light'
              ? 'bg-white border-slate-200 text-slate-800'
              : 'bg-slate-900 border-slate-800 text-slate-200'
          }`}
        >
          {/* Integrated Batch Action Bar Header */}
          <AnimatePresence initial={false}>
            {selectedNoteIds.length >= 2 && (
              <motion.div
                key="batch-menu-wrapper"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.16, ease: 'easeOut' },
                }}
                className="w-full relative z-10 overflow-hidden"
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
                  onToggleCover={handleToggleCoverSelectedNotes}
                  onClearSelection={() => setSelectedNoteIds([])}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Canvas Controls Row */}
          <div className="w-full relative z-20">
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
              onAddImageFiles={(files) => handleAddImageFiles(files)}
              onOpenTodayJournal={() => handleOpenOrCreateTodayJournal()}
              onOpenJournalCalendar={() => setIsJournalCalendarOpen(true)}
              onTogglePanMode={handleTogglePanMode}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onFitNotes={handleFitNotes}
              onChangeGridType={(gridType) => setSettings((prev) => ({ ...prev, gridType }))}
              onToggleTheme={handleToggleTheme}
              onChangeThemeMode={(themeMode) => setSettings((prev) => ({ ...prev, themeMode }))}
              onToggleSnapToGrid={handleToggleSnapToGrid}
              onToggleConnections={handleToggleConnections}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
              onOpenAbout={() => setIsAboutModalOpen(true)}
              onOpenNotesList={() => setIsNotesListOpen(true)}
              onOpenDatabaseOperations={() => setIsDatabaseModalOpen(true)}
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
              masterPasswordHash={settings.masterPasswordHash}
              masterSecurityQuestion={settings.masterSecurityQuestion}
              isMasterUnlocked={getSessionAuthState().isMasterUnlocked}
              onLockSession={() => {
                setMasterSessionUnlocked(false);
                lockSessionVault();
                sendNativeAppNotification('Session Locked', 'Locked notes require passcode authentication to access.');
              }}
              onUnlockSession={() => {
                setSecurityModalNoteId('__global_session__');
                setSecurityModalMode('unlock');
              }}
              onOpenSecurityModal={(mode) => {
                setSecurityModalNoteId('__global_session__');
                setSecurityModalMode(mode);
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Hidden File Input for Image Drag/Drop & Context Menu triggers */}
      <input
        type="file"
        ref={globalImageInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
              handleAddImageFiles(imageFiles, imagePickerCoordRef.current?.x, imagePickerCoordRef.current?.y);
            }
            e.target.value = '';
          }
        }}
      />

      {/* Global Hidden Backup File Picker Input */}
      <input
        type="file"
        ref={globalBackupInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImportBackupFile(file);
            e.target.value = '';
          }
        }}
        accept=".json,.diarynote"
        className="hidden"
      />

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
        notesToUnlock={notesToUnlock}
        setNotesToUnlock={setNotesToUnlock}
        notesToLock={notesToLock}
        setNotesToLock={setNotesToLock}
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
        handleToggleCoverSelectedNotes={handleToggleCoverSelectedNotes}
        handleExportNote={handleExportNote}
        requestDeleteNotes={requestDeleteNotes}
        handleSaveAISettings={handleSaveAISettings}
        onAddImageFiles={handleAddImageFiles}
        onTriggerImagePicker={handleTriggerImagePicker}
        setNotes={setNotes}
        hasCutNotes={cutNoteIds.length > 0}
        onCutNotes={handleCutSelectedNotes}
        onPasteRelocateNotes={handlePasteRelocateNotes}
        onCancelCutNotes={handleCancelCutNotes}
        isDatabaseModalOpen={isDatabaseModalOpen}
        setIsDatabaseModalOpen={setIsDatabaseModalOpen}
        onTriggerImportFile={() => globalBackupInputRef.current?.click()}
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
          cutNoteIds={cutNoteIds}
          snapToGrid={settings.snapToGrid}
          gridType={settings.gridType}
          enableAIServices={settings.enableAIServices}
          isMergingAI={isMergingAI}
          isSaving={isSaving}
          saveError={saveError}
          lastSavedAt={lastSavedAt}
          onCancelCut={handleCancelCutNotes}
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
          onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
          onOpenSearchModal={() => setIsSearchOpen(true)}
          onOpenJournalCalendar={() => setIsJournalCalendarOpen(true)}
        />
      )}
    </div>
  );
}
