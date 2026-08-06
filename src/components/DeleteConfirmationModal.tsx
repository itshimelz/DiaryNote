import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { CanvasTheme } from '../types';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  noteTitles?: string[];
  themeMode?: CanvasTheme;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  noteTitles = [],
  themeMode = 'dark',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen || count === 0) return null;

  const isLight = themeMode === 'light';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-md border shadow-lg p-5 overflow-hidden transition-all duration-200 animate-in zoom-in-95 font-sans backdrop-blur-xl ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900'
            : 'bg-slate-900/95 border-slate-800 text-slate-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className={`absolute top-4 right-4 p-1 rounded-sm transition-colors ${
            isLight
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Minimal Header Accent */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/80 dark:border-red-900/50">
            <Trash2 className="w-3 h-3" />
            <span>Confirm Deletion</span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mt-3 space-y-1">
          <h3 className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            {count === 1 ? 'Delete Note?' : `Delete ${count} Selected Notes?`}
          </h3>
          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {count === 1 ? (
              <>This note will be permanently removed from your canvas.</>
            ) : (
              <>
                Are you sure you want to delete all <strong className="font-semibold text-red-500">{count}</strong> selected notes? This cannot be undone.
              </>
            )}
          </p>
        </div>

        {/* Note Titles List Preview */}
        {noteTitles.length > 0 && (
          <div
            className={`mt-3 max-h-36 overflow-y-auto rounded-sm p-2.5 border space-y-1 text-xs ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-850/50 border-slate-800 text-slate-300'
            }`}
          >
            {noteTitles.slice(0, 5).map((title, idx) => (
              <div key={idx} className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 shrink-0" />
                <span className="truncate font-medium">{title || 'Untitled Note'}</span>
              </div>
            ))}
            {noteTitles.length > 5 && (
              <div className={`text-[10px] pt-0.5 pl-3.5 font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                + {noteTitles.length - 5} more notes selected
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-sm text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-98 transition-all shadow-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete {count > 1 ? `(${count})` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
