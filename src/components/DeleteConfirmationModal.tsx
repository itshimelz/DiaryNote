import React, { useEffect } from 'react';
import { Trash2, X, AlertCircle } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-5 overflow-hidden transition-all duration-200 animate-in zoom-in-95 font-sans ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-900/10'
            : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/50'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            isLight
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Minimal Header Accent */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400 border border-red-200/80 dark:border-red-500/30">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Deletion</span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mt-3 space-y-1">
          <h3 className={`text-base font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
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
            className={`mt-3.5 max-h-36 overflow-y-auto rounded-xl p-3 border space-y-1.5 text-xs ${
              isLight
                ? 'bg-slate-50 border-slate-200/80 text-slate-700'
                : 'bg-slate-800/40 border-slate-800 text-slate-300'
            }`}
          >
            {noteTitles.slice(0, 5).map((title, idx) => (
              <div key={idx} className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 shrink-0" />
                <span className="truncate font-medium">{title || 'Untitled Note'}</span>
              </div>
            ))}
            {noteTitles.length > 5 && (
              <div className={`text-[11px] pt-0.5 pl-3.5 font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
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
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/30 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete {count > 1 ? `(${count})` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
