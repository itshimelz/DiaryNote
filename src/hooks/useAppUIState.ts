import { useState, useCallback } from 'react';
import { ReleaseInfo } from '../utils/updateChecker';

export function useAppUIState() {
  const [isNotesListOpen, setIsNotesListOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isJournalCalendarOpen, setIsJournalCalendarOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isMergingAI, setIsMergingAI] = useState(false);
  const [mergedSelectionKeys, setMergedSelectionKeys] = useState<Set<string>>(new Set());
  const [updateReleaseAlert, setUpdateReleaseAlert] = useState<ReleaseInfo | null>(null);
  const [isPanMode, setIsPanMode] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notesToDelete, setNotesToDelete] = useState<string[]>([]);

  const [isZenMode, setIsZenMode] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState<boolean>(() => {
    const saved = localStorage.getItem('diarynote_show_statusbar');
    return saved !== null ? saved === 'true' : true;
  });
  const [securityModalNoteId, setSecurityModalNoteId] = useState<string | null>(null);
  const [securityModalMode, setSecurityModalMode] = useState<'set' | 'unlock'>('set');
  const [notesToUnlock, setNotesToUnlock] = useState<string[]>([]);
  const [notesToLock, setNotesToLock] = useState<string[]>([]);

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

  const handleToggleStatusBar = useCallback(() => {
    setShowStatusBar((prev) => {
      const next = !prev;
      localStorage.setItem('diarynote_show_statusbar', String(next));
      return next;
    });
  }, []);

  const handleTogglePanMode = useCallback(() => {
    setIsPanMode((prev) => !prev);
  }, []);

  return {
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
    setIsPanMode,
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
  };
}
