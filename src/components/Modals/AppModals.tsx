import React, { Suspense, lazy } from 'react';
import { Note, CanvasTransform } from '../../types';
import { AppSettings, exportNotesBackup } from '../../lib/storage';
import { NoteContextMenu } from '../NoteContextMenu';
import { HiddenClipboardListener } from '../HiddenClipboardListener';
import { sendNativeAppNotification } from '../../utils';

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

interface AppModalsProps {
  notes: Note[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  transform: CanvasTransform;
  selectedNoteIds: string[];
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  setEditingNoteId: (id: string | null) => void;
  securityModalNote: Note | null;
  securityModalNoteId: string | null;
  setSecurityModalNoteId: (id: string | null) => void;
  securityModalMode: 'set' | 'unlock';
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
  handleExportNote: (note: Note, format: 'md' | 'txt' | 'json') => void;
  requestDeleteNotes: (ids: string[]) => void;
  handleSaveAISettings: (newSettings: Partial<AppSettings>) => void;
  setNotes?: React.Dispatch<React.SetStateAction<Note[]>>;
}

export const AppModals: React.FC<AppModalsProps> = ({
  notes,
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
  handleExportNote,
  requestDeleteNotes,
  handleSaveAISettings,
  setNotes: _setNotes,
}) => {
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
            setSettings((prev) => ({
              ...prev,
              masterPasswordHash,
              masterSecurityQuestion,
              masterSecurityAnswerHash,
            }));

            if (securityModalNote) {
              handleUpdateNote({
                ...securityModalNote,
                isLocked: true,
              });
            }
          }}
          onSuccessUnlock={() => {
            if (!securityModalNote) return;

            if (notesToDelete.length > 0) {
              handleDeleteMultipleNotes(notesToDelete);
              setSelectedNoteIds((prev) => prev.filter((id) => !notesToDelete.includes(id)));
              const count = notesToDelete.length;
              sendNativeAppNotification(
                'Note Deleted',
                count === 1
                  ? `Deleted protected note "${securityModalNote.title || 'Untitled Note'}"`
                  : `Deleted ${count} protected notes`
              );
              setNotesToDelete([]);
              return;
            }

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

        {/* Journal Calendar Modal */}
        <JournalCalendarModal
          isOpen={isJournalCalendarOpen}
          onClose={() => setIsJournalCalendarOpen(false)}
          notes={notes}
          onSelectOrCreateDate={(dateStr) => handleOpenOrCreateTodayJournal(dateStr)}
          themeMode={settings.themeMode}
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
        onGroupNotes={() => {
          if (selectedNoteIds.length < 2) return;
          const targets = notes.filter((n) => selectedNoteIds.includes(n.id));
          const newGroupId = `group-${crypto.randomUUID()}`;
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
        onPasteFromClipboard={() => {
          setPasteModalState({ isOpen: true, text: '' });
        }}
        onCreateNoteHere={() => handleCreateNote(contextMenuState.x, contextMenuState.y)}
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
            sendNativeAppNotification(
              'Note Created',
              `Created note "${pastedTitle}" from clipboard paste`
            );
          }}
        />

        {/* Hidden Native Clipboard Paste Listener */}
        <HiddenClipboardListener
          onPasteText={(text) => setPasteModalState({ isOpen: true, text })}
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
