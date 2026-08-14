import React, { useState, useMemo } from 'react';
import {
  Download01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  RotateLeft01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Note, CanvasTransform, CanvasTheme } from '../../types';
import { AppSettings } from '../../lib/storage';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Badge, Icon } from '../ui';

export type ConflictResolutionMode = 'keep-both' | 'overwrite' | 'skip';

export interface ImportPreviewModalProps {
  isOpen: boolean;
  themeMode?: CanvasTheme;
  incomingNotes: Note[];
  existingNotes: Note[];
  incomingTransform?: CanvasTransform;
  incomingSettings?: AppSettings;
  onClose: () => void;
  onConfirmImport: (
    resolvedNotes: Note[],
    transform?: CanvasTransform,
    settings?: AppSettings
  ) => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  themeMode: _themeMode,
  incomingNotes,
  existingNotes,
  incomingTransform,
  incomingSettings,
  onClose,
  onConfirmImport,
}) => {
  const [conflictMode, setConflictMode] = useState<ConflictResolutionMode>('keep-both');
  const [includeSettings, setIncludeSettings] = useState(false);

  const existingIdSet = useMemo(() => new Set(existingNotes.map((n) => n.id)), [existingNotes]);

  const { newNotes, conflictingNotes, allTags } = useMemo(() => {
    const newItems: Note[] = [];
    const conflictingItems: Note[] = [];
    const tagsSet = new Set<string>();

    incomingNotes.forEach((n) => {
      if (existingIdSet.has(n.id)) {
        conflictingItems.push(n);
      } else {
        newItems.push(n);
      }
      n.tags?.forEach((t) => tagsSet.add(t));
    });

    return {
      newNotes: newItems,
      conflictingNotes: conflictingItems,
      allTags: Array.from(tagsSet),
    };
  }, [incomingNotes, existingIdSet]);

  if (!isOpen) return null;

  const handleExecuteImport = () => {
    let resolvedList: Note[] = [];

    if (conflictMode === 'overwrite') {
      // Incoming notes take precedence for overlapping IDs
      const incomingIdSet = new Set(incomingNotes.map((n) => n.id));
      const untouchedExisting = existingNotes.filter((n) => !incomingIdSet.has(n.id));
      resolvedList = [...untouchedExisting, ...incomingNotes];
    } else if (conflictMode === 'keep-both') {
      // Re-assign fresh IDs to incoming duplicates
      const processedIncoming = incomingNotes.map((n) => {
        if (existingIdSet.has(n.id)) {
          return {
            ...n,
            id: `note-${crypto.randomUUID()}`,
            title: `${n.title || 'Untitled Note'} (Imported)`,
          };
        }
        return n;
      });
      resolvedList = [...existingNotes, ...processedIncoming];
    } else if (conflictMode === 'skip') {
      // Only append truly new notes
      resolvedList = [...existingNotes, ...newNotes];
    }

    onConfirmImport(
      resolvedList,
      incomingTransform,
      includeSettings ? incomingSettings : undefined
    );
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={Download01Icon} size="md" />
            <span>Import Backup Preview</span>
          </span>
        }
        onClose={onClose}
      />

      <DialogBody className="space-y-4 text-xs pr-1">
        {/* Summary Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
            <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
              {incomingNotes.length}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Total Incoming
            </span>
          </div>
          <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
            <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
              {newNotes.length}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              New Cards
            </span>
          </div>
          <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
            <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
              {conflictingNotes.length}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Duplicate IDs
            </span>
          </div>
        </div>

        {/* Conflict Resolution Strategy */}
        {conflictingNotes.length > 0 && (
          <div className="p-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Icon icon={Alert02Icon} size="xs" className="shrink-0 text-amber-500" />
              <span>{conflictingNotes.length} ID conflict(s) detected. Choose strategy:</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setConflictMode('keep-both')}
                className={`flex flex-col items-center justify-center p-2 rounded-sm border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  conflictMode === 'keep-both'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon icon={Copy01Icon} size="xs" className="mb-1" />
                <span className="text-[11px]">Keep Both</span>
                <span className="text-[9px] opacity-70">New UUIDs</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictMode('overwrite')}
                className={`flex flex-col items-center justify-center p-2 rounded-sm border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  conflictMode === 'overwrite'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon icon={RotateLeft01Icon} size="xs" className="mb-1" />
                <span className="text-[11px]">Overwrite</span>
                <span className="text-[9px] opacity-70">Replace old</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictMode('skip')}
                className={`flex flex-col items-center justify-center p-2 rounded-sm border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  conflictMode === 'skip'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon icon={Cancel01Icon} size="xs" className="mb-1" />
                <span className="text-[11px]">Skip</span>
                <span className="text-[9px] opacity-70">Ignore dups</span>
              </button>
            </div>
          </div>
        )}

        {/* Tags breakdown */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto">
            <span className="text-[11px] font-semibold text-slate-400">Tags:</span>
            {allTags.slice(0, 8).map((tag) => (
              <Badge key={tag} variant="default" size="xs">
                {tag}
              </Badge>
            ))}
            {allTags.length > 8 && (
              <span className="text-[10px] text-slate-400 font-mono">
                +{allTags.length - 8} more
              </span>
            )}
          </div>
        )}

        {/* Optional Settings Import Checkbox */}
        {incomingSettings && (
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeSettings}
              onChange={(e) => setIncludeSettings(e.target.checked)}
              className="rounded-sm border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-400"
            />
            <span>Import canvas theme & workspace preferences from backup</span>
          </label>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          icon={CheckmarkCircle02Icon}
          onClick={handleExecuteImport}
        >
          Commit Import
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
