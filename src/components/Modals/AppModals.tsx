import React, { Suspense, lazy } from 'react';
import { useNotesList } from '../../stores/notesStore';
import { Note, CanvasTransform } from '../../types';
import { AppSettings, exportNotesBackup } from '../../lib/storage';
import { NoteContextMenu } from '../NoteContextMenu';
import { HiddenClipboardListener } from '../HiddenClipboardListener';
import { sendNativeAppNotification, formatGroupTime } from '../../utils';
import { indexVaultNotesFts, clearVaultFtsIndex } from '../../lib/rustSearch';
import { SecurityModalMode } from './SecurityModal';


// Lazy-loaded modal components
const SearchModal = lazy(() =>
  import('./SearchModal').then((m) => ({ default: m.SearchModal }))
);
const DeleteConfirmationModal = lazy(() =>
  import('./DeleteConfirmationModal').then((m) => ({ default: m.DeleteConfirmationModal }))
);
const SecurityModal = lazy(() =>
  import('./SecurityModal').then((m) => ({ default: m.SecurityModal }))
);
const KeyboardShortcutsModal = lazy(() =>
  import('./KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal }))
);
const PasteConfirmModal = lazy(() =>
  import('./PasteConfirmModal').then((m) => ({ default: m.PasteConfirmModal }))
);
const AboutModal = lazy(() =>
  import('./AboutModal').then((m) => ({ default: m.AboutModal }))
);
const JournalCalendarModal = lazy(() =>
  import('./JournalCalendarModal').then((m) => ({ default: m.JournalCalendarModal }))
);
const AISettingsModal = lazy(() =>
  import('./AISettingsModal').then((m) => ({ default: m.AISettingsModal }))
);
const ImportPreviewModal = lazy(() =>
  import('./ImportPreviewModal').then((m) => ({ default: m.ImportPreviewModal }))
);
const DatabaseOperationsModal = lazy(() =>
  import('./DatabaseOperationsModal').then((m) => ({ default: m.DatabaseOperationsModal }))
);

/**
 * Prefetches all lazy modal chunks during idle periods for instant 0ms modal opening.
 */
export function prefetchAppModals() {
  if (typeof window === 'undefined') return;

  const prefetch = () => {
    import('./SearchModal');
    import('./DeleteConfirmationModal');
    import('./SecurityModal');
    import('./KeyboardShortcutsModal');
    import('./PasteConfirmModal');
    import('./AboutModal');
    import('./JournalCalendarModal');
    import('./AISettingsModal');
    import('./ImportPreviewModal');
    import('./DatabaseOperationsModal');
    import('./CanvasSettingsModal');
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 3000 });
  } else {
    setTimeout(prefetch, 1000);
  }
}

interface AppModalsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  transform: CanvasTransform;
  selectedNoteIds: string[];
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  setEditingNoteId: (id: string | null) => void;
  securityModalNote: Note | null;
  securityModalNoteId: string | null;
  setSecurityModalNoteId: (id: string | null) => void;
  securityModalMode: SecurityModalMode;
  notesToUnlock?: string[];
  setNotesToUnlock?: (ids: string[]) => void;
  notesToLock?: string[];
  setNotesToLock?: (ids: string[]) => void;
  notesToDelete: string[];
  setNotesToDelete: (ids: string[]) => void;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isJournalCalendarOpen: boolean;
  setIsJournalCalendarOpen: (open: boolean) => void;
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: (open: boolean) => void;
  isAboutModalOpen: boolean;
  setIsAboutModalOpen: (open: boolean) => void;
  isAISettingsOpen: boolean;
  setIsAISettingsOpen: (open: boolean) => void;
  isDatabaseModalOpen?: boolean;
  setIsDatabaseModalOpen?: (open: boolean) => void;
  onTriggerImportFile?: () => void;
  stagedImportData: { isOpen: boolean; notes: Note[]; transform?: CanvasTransform; settings?: AppSettings };
  setStagedImportData: React.Dispatch<React.SetStateAction<{ isOpen: boolean; notes: Note[]; transform?: CanvasTransform; settings?: AppSettings }>>;
  handleCommitImport: (resolvedNotes: Note[], transform?: CanvasTransform, settings?: AppSettings) => void;
  contextMenuState: { isOpen: boolean; x: number; y: number };
  setContextMenuState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; x: number; y: number }>>;
  pasteModalState: { isOpen: boolean; text: string };
  setPasteModalState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; text: string }>>;
  handleUpdateNote: (note: Note) => void;
  handleUpdateBatchNotes: (updatedNotes: Note[]) => void;
  handleDeleteMultipleNotes: (ids: string[]) => void;
  handleConfirmDelete: () => void;
  handleCreateNote: (x?: number, y?: number) => void | string;
  handleAddNote: (
    transform: CanvasTransform,
    settings: AppSettings,
    customX?: number,
    customY?: number,
    initialTitle?: string,
    initialContent?: string
  ) => string;
  handleOpenOrCreateTodayJournal: (dateStr?: string) => void;
  handleNavigateToNote: (id: string, setSelectedNoteIds: any) => void;
  handleLockSelectedNotes: (ids: string[]) => void;
  handleToggleCoverSelectedNotes: (ids: string[]) => void;
  handleExportNote: (note: Note, format: 'md' | 'txt' | 'json') => void;
  requestDeleteNotes: (ids: string[]) => void;
  handleSaveAISettings: (newSettings: Partial<AppSettings>) => void;
  onAddImageFiles?: (files: File[], customClientX?: number, customClientY?: number) => void;
  onTriggerImagePicker?: (clientX?: number, clientY?: number) => void;
  hasCutNotes?: boolean;
  onCutNotes?: (ids: string[]) => void;
  onPasteRelocateNotes?: () => void;
  onCancelCutNotes?: () => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  settings,
  setSettings,
  transform,
  selectedNoteIds,
  setSelectedNoteIds,
  setEditingNoteId,
  securityModalNote,
  securityModalNoteId,
  setSecurityModalNoteId,
  securityModalMode,
  notesToUnlock = [],
  setNotesToUnlock,
  notesToLock = [],
  setNotesToLock,
  notesToDelete,
  setNotesToDelete,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
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
  isDatabaseModalOpen = false,
  setIsDatabaseModalOpen,
  onTriggerImportFile,
  stagedImportData,
  setStagedImportData,
  handleCommitImport,
  contextMenuState,
  setContextMenuState,
  pasteModalState,
  setPasteModalState,
  handleUpdateNote,
  handleUpdateBatchNotes,
  handleDeleteMultipleNotes,
  handleConfirmDelete,
  handleCreateNote,
  handleAddNote,
  handleOpenOrCreateTodayJournal,
  handleNavigateToNote,
  handleLockSelectedNotes,
  handleToggleCoverSelectedNotes,
  handleExportNote,
  requestDeleteNotes,
  handleSaveAISettings,
  onAddImageFiles,
  onTriggerImagePicker,
  hasCutNotes = false,
  onCutNotes,
  onPasteRelocateNotes,
  onCancelCutNotes,
}) => {
  const notes = useNotesList();
  React.useEffect(() => {
    prefetchAppModals();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        {/* Staged Import Preview & Conflict Resolution Modal */}
        <ImportPreviewModal
          isOpen={stagedImportData.isOpen}
          themeMode={settings.themeMode}
          incomingNotes={stagedImportData.notes}
          existingNotes={notes}
          incomingTransform={stagedImportData.transform}
          incomingSettings={stagedImportData.settings}
          onClose={() => setStagedImportData({ isOpen: false, notes: [] })}
          onConfirmImport={handleCommitImport}
        />
        {/* AI Features & Key Settings Modal */}
        <AISettingsModal
          isOpen={isAISettingsOpen}
          themeMode={settings.themeMode}
          enableAIServices={settings.enableAIServices}
          aiProvider={settings.aiProvider}
          encryptedApiKey={settings.encryptedApiKey}
          apiKeyIv={settings.apiKeyIv}
          customBaseUrl={settings.customBaseUrl}
          customModelName={settings.customModelName}
          aiProviderProfiles={settings.aiProviderProfiles}
          onClose={() => setIsAISettingsOpen(false)}
          onSaveAISettings={handleSaveAISettings}
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
          noteTitles={notes.filter((n) => notesToDelete.includes(n.id)).map((n) => n.title || 'Untitled Note')}
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
          onClose={() => {
            setSecurityModalNoteId(null);
            setNotesToUnlock?.([]);
            setNotesToLock?.([]);
          }}
          onSuccessRemove={() => {
            setSettings((prev) => ({
              ...prev,
              masterPasswordHash: '',
              masterSecurityQuestion: '',
              masterSecurityAnswerHash: '',
            }));
            const locked = notes.filter((n) => n.isLocked);
            if (locked.length > 0) {
              const unlocked = locked.map((n) => ({ ...n, isLocked: false }));
              handleUpdateBatchNotes(unlocked);
              indexVaultNotesFts(unlocked);
            }
          }}
          onSuccessSet={(masterPasswordHash, masterSecurityQuestion, masterSecurityAnswerHash) => {
            setSettings((prev) => ({
              ...prev,
              masterPasswordHash,
              masterSecurityQuestion,
              masterSecurityAnswerHash,
            }));

            const targets = notesToLock.length > 0
              ? notes.filter((n) => notesToLock.includes(n.id))
              : securityModalNote
              ? [securityModalNote]
              : [];

            if (targets.length > 0) {
              const updated = targets.map((n) => ({ ...n, isLocked: true }));
              handleUpdateBatchNotes(updated);
              clearVaultFtsIndex();
            }
            setNotesToLock?.([]);
          }}
          onSuccessUnlock={() => {
            if (notesToDelete.length > 0) {
              handleDeleteMultipleNotes(notesToDelete);
              setSelectedNoteIds((prev) => prev.filter((id) => !notesToDelete.includes(id)));
              const count = notesToDelete.length;
              sendNativeAppNotification(
                'Note Deleted',
                count === 1
                  ? `Deleted protected note "${securityModalNote?.title || 'Untitled Note'}"`
                  : `Deleted ${count} protected notes`
              );
              setNotesToDelete([]);
              return;
            }

            const targetsToUnlock = notesToUnlock.length > 0
              ? notes.filter((n) => notesToUnlock.includes(n.id))
              : securityModalNote
              ? [securityModalNote]
              : [];

            if (targetsToUnlock.length > 0) {
              const updated = targetsToUnlock.map((n) => ({ ...n, isLocked: false }));
              handleUpdateBatchNotes(updated);
              indexVaultNotesFts(updated);
              setNotesToUnlock?.([]);
            }
          }}
        />

        {/* Keyboard Shortcuts Cheatsheet Modal */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          themeMode={settings.themeMode}
          onClose={() => setIsShortcutsModalOpen(false)}
        />

        {/* Journal Calendar Modal */}
        <JournalCalendarModal
          isOpen={isJournalCalendarOpen}
          onClose={() => setIsJournalCalendarOpen(false)}
          notes={notes}
          onSelectOrCreateDate={(dateStr) => handleOpenOrCreateTodayJournal(dateStr)}
          themeMode={settings.themeMode}
        />

        {/* Database & Storage Operations Modal */}
        <DatabaseOperationsModal
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen?.(false)}
          notes={notes}
          transform={transform}
          settings={settings}
          onTriggerImportFile={() => {
            setIsDatabaseModalOpen?.(false);
            onTriggerImportFile?.();
          }}
        />
      </Suspense>

      {/* Right-Click Context Menu for Selected Note(s) */}
      <NoteContextMenu
        x={contextMenuState.x}
        y={contextMenuState.y}
        isOpen={contextMenuState.isOpen}
        selectedNoteIds={selectedNoteIds}
        notes={notes}
        themeMode={settings.themeMode}
        zoom={transform.zoom}
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
        onToggleCover={(ids) => handleToggleCoverSelectedNotes(ids)}
        onGroupNotes={() => {
          if (selectedNoteIds.length < 2) return;
          const targets = notes.filter((n) => selectedNoteIds.includes(n.id));
          const newGroupId = `group-${crypto.randomUUID()}`;
          const groupName = `Group ${formatGroupTime()}`;
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
          const newDuplicates: Note[] = [];
          const newIds: string[] = [];
          ids.forEach((id) => {
            const target = notes.find((n) => n.id === id);
            if (target) {
              const newId = `note-${crypto.randomUUID()}`;
              const dupNote: Note = {
                ...target,
                id: newId,
                title: `${target.title || 'Untitled'} (Copy)`,
                x: target.x + 30,
                y: target.y + 30,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              newDuplicates.push(dupNote);
              newIds.push(newId);
            }
          });

          if (newDuplicates.length > 0) {
            newDuplicates.forEach((n) => handleUpdateNote(n));
            setSelectedNoteIds(newIds);
          }
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
        onPasteFromClipboard={() => {
          setPasteModalState({ isOpen: true, text: '' });
        }}
        hasCutNotes={hasCutNotes}
        onCutNotes={onCutNotes}
        onPasteRelocateNotes={onPasteRelocateNotes}
        onCreateNoteHere={() => handleCreateNote(contextMenuState.x, contextMenuState.y)}
        onAddImageHere={() => onTriggerImagePicker?.(contextMenuState.x, contextMenuState.y)}
        onSelectAllNotes={() => setSelectedNoteIds(notes.map((n) => n.id))}
      />

      <Suspense fallback={null}>
        {/* Clipboard Ctrl+V Paste Confirm Modal */}
        <PasteConfirmModal
          isOpen={pasteModalState.isOpen}
          pastedText={pasteModalState.text}
          themeMode={settings.themeMode}
          onClose={() => setPasteModalState({ isOpen: false, text: '' })}
          onConfirm={(pastedTitle, pastedContent) => {
            const newId = handleAddNote(transform, settings, undefined, undefined, pastedTitle, pastedContent);
            setSelectedNoteIds([newId]);
          }}
        />

        {/* Hidden Native Clipboard Paste Listener */}
        <HiddenClipboardListener
          hasCutNotes={hasCutNotes}
          onPasteRelocateNotes={onPasteRelocateNotes}
          onCancelCutNotes={onCancelCutNotes}
          onPasteText={(text) => setPasteModalState({ isOpen: true, text })}
          onPasteImage={(file) => onAddImageFiles?.([file])}
        />

        {/* About Application Modal */}
        <AboutModal
          isOpen={isAboutModalOpen}
          themeMode={settings.themeMode}
          onClose={() => setIsAboutModalOpen(false)}
        />
      </Suspense>
    </>
  );
};
