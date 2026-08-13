import React, { useState, useMemo } from 'react';
import { Download, AlertTriangle, CheckCircle2, CopyPlus, RefreshCw, X } from 'lucide-react';
import { Note, CanvasTransform, CanvasTheme } from '../../types';
import { AppSettings } from '../../lib/storage';

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
  themeMode = 'dark',
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
    const tagSet = new Set<string>();

    for (const note of incomingNotes) {
      if (existingIdSet.has(note.id)) {
        conflictingItems.push(note);
      } else {
        newItems.push(note);
      }
      (note.tags || []).forEach((t) => tagSet.add(t));
    }

    return {
      newNotes: newItems,
      conflictingNotes: conflictingItems,
      allTags: Array.from(tagSet),
    };
  }, [incomingNotes, existingIdSet]);

  if (!isOpen) return null;

  const isDark = themeMode !== 'light';

  const handleExecuteImport = () => {
    let resolvedList: Note[] = [];

    if (conflictMode === 'overwrite') {
      // Overwrite matching existing IDs, and append new ones
      const incomingIdMap = new Map(incomingNotes.map((n) => [n.id, n]));
      const untouchedExisting = existingNotes.filter((n) => !incomingIdMap.has(n.id));
      resolvedList = [...untouchedExisting, ...incomingNotes];
    } else if (conflictMode === 'keep-both') {
      // Re-assign new UUIDs to conflicting incoming notes
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className={`w-full max-w-lg rounded-lg shadow-xl border p-6 flex flex-col gap-4 transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight">Import Backup Preview</h2>
              <p className="text-xs text-slate-400">Review staged cards before writing to database</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`p-3 rounded-md border text-center ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="block text-2xl font-black text-blue-500">{incomingNotes.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">Total Incoming</span>
          </div>
          <div
            className={`p-3 rounded-md border text-center ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="block text-2xl font-black text-emerald-500">{newNotes.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">New Cards</span>
          </div>
          <div
            className={`p-3 rounded-md border text-center ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span
              className={`block text-2xl font-black ${
                conflictingNotes.length > 0 ? 'text-amber-500' : 'text-slate-400'
              }`}
            >
              {conflictingNotes.length}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Duplicate IDs</span>
          </div>
        </div>

        {/* Conflict Resolution Strategy */}
        {conflictingNotes.length > 0 && (
          <div
            className={`p-3 rounded-md border flex flex-col gap-2 ${
              isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-amber-500 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{conflictingNotes.length} note ID conflict(s) detected. Choose strategy:</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setConflictMode('keep-both')}
                className={`flex flex-col items-center justify-center p-2 rounded border text-center text-xs font-medium transition-all ${
                  conflictMode === 'keep-both'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-sm'
                    : isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                <CopyPlus className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">Keep Both</span>
                <span className="text-[9px] text-slate-400">New UUIDs</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictMode('overwrite')}
                className={`flex flex-col items-center justify-center p-2 rounded border text-center text-xs font-medium transition-all ${
                  conflictMode === 'overwrite'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-sm'
                    : isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                <RefreshCw className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">Overwrite</span>
                <span className="text-[9px] text-slate-400">Replace old</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictMode('skip')}
                className={`flex flex-col items-center justify-center p-2 rounded border text-center text-xs font-medium transition-all ${
                  conflictMode === 'skip'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-sm'
                    : isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">Skip</span>
                <span className="text-[9px] text-slate-400">Ignore duplicates</span>
              </button>
            </div>
          </div>
        )}

        {/* Tags breakdown */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto">
            <span className="text-[11px] font-semibold text-slate-400">Tags included:</span>
            {allTags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tag}
              </span>
            ))}
            {allTags.length > 8 && (
              <span className="text-[10px] text-slate-400 font-mono">+{allTags.length - 8} more</span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div
          className={`flex items-center justify-end gap-2 pt-3 border-t ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Commit Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
