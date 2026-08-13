import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Handle ESC key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const isDark = themeMode !== 'light';

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

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-md shadow-sm border p-5 flex flex-col gap-3.5 transition-opacity duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Download className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            <div>
              <h2 className="font-bold text-sm tracking-tight leading-none">Import Backup Preview</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`p-2.5 rounded-sm border text-center ${
              isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="block text-base font-bold">{incomingNotes.length}</span>
            <span className="text-[10px] text-slate-400 font-medium">Total Incoming</span>
          </div>
          <div
            className={`p-2.5 rounded-sm border text-center ${
              isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="block text-base font-bold">{newNotes.length}</span>
            <span className="text-[10px] text-slate-400 font-medium">New Cards</span>
          </div>
          <div
            className={`p-2.5 rounded-sm border text-center ${
              isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="block text-base font-bold">{conflictingNotes.length}</span>
            <span className="text-[10px] text-slate-400 font-medium">Duplicate IDs</span>
          </div>
        </div>

        {/* Conflict Resolution Strategy */}
        {conflictingNotes.length > 0 && (
          <div
            className={`p-3 rounded-sm border flex flex-col gap-2 ${
              isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>{conflictingNotes.length} ID conflict(s) detected. Choose strategy:</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setConflictMode('keep-both')}
                className={`flex flex-col items-center justify-center p-2 rounded-sm border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  conflictMode === 'keep-both'
                    ? isDark
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-slate-900 text-white border-slate-900'
                    : isDark
                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <CopyPlus className="w-3.5 h-3.5 mb-1" />
                <span className="text-[11px]">Keep Both</span>
                <span className={`text-[9px] ${conflictMode === 'keep-both' ? (isDark ? 'text-slate-700' : 'text-slate-300') : 'text-slate-400'}`}>New UUIDs</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictMode('overwrite')}
                className={`flex flex-col items-center justify-center p-2 rounded-sm border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  conflictMode === 'overwrite'
                    ? isDark
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-slate-900 text-white border-slate-900'
                    : isDark
                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 mb-1" />
                <span className="text-[11px]">Overwrite</span>
                <span className={`text-[9px] ${conflictMode === 'overwrite' ? (isDark ? 'text-slate-700' : 'text-slate-300') : 'text-slate-400'}`}>Replace old</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictMode('skip')}
                className={`flex flex-col items-center justify-center p-2 rounded-sm border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  conflictMode === 'skip'
                    ? isDark
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-slate-900 text-white border-slate-900'
                    : isDark
                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <X className="w-3.5 h-3.5 mb-1" />
                <span className="text-[11px]">Skip</span>
                <span className={`text-[9px] ${conflictMode === 'skip' ? (isDark ? 'text-slate-700' : 'text-slate-300') : 'text-slate-400'}`}>Ignore duplicates</span>
              </button>
            </div>
          </div>
        )}

        {/* Tags breakdown */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto">
            <span className="text-[11px] font-semibold text-slate-400">Tags:</span>
            {allTags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono border ${
                  isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
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

        {/* Optional Settings Import Checkbox */}
        {incomingSettings && (
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSettings}
              onChange={(e) => setIncludeSettings(e.target.checked)}
              className="rounded-sm border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              Import canvas theme & workspace preferences from backup
            </span>
          </label>
        )}

        {/* Action Buttons */}
        <div
          className={`flex items-center justify-end gap-2 pt-3 border-t transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-sm border font-semibold text-xs transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm font-semibold text-xs transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-slate-900 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Commit Import</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
