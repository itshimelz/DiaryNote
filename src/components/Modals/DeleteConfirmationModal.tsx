import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { CanvasTheme } from '../../types';

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

  const isDark = themeMode !== 'light';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in select-none ${
        isDark ? 'bg-black/60 backdrop-blur-md' : 'bg-slate-900/30 backdrop-blur-md'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-md border p-5 overflow-hidden transition-opacity duration-200 animate-in zoom-in-95 font-sans backdrop-blur-xl ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-sm'
            : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-sm'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className={`absolute top-3.5 right-3.5 p-1 rounded-sm transition-colors ${
            isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Minimal Header Accent */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-semibold border ${
              isDark
                ? 'bg-red-950/40 text-red-400 border-red-900/60'
                : 'bg-red-50 text-red-600 border-red-200/90'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>Confirm Deletion</span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mt-3 space-y-1">
          <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {count === 1 ? 'Delete Note?' : `Delete ${count} Selected Notes?`}
          </h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
              isDark
                ? 'bg-slate-950/40 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}
          >
            {noteTitles.slice(0, 5).map((title, idx) => (
              <div key={idx} className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate font-medium">{title || 'Untitled Note'}</span>
              </div>
            ))}
            {noteTitles.length > 5 && (
              <div className={`text-[10px] pt-0.5 pl-3.5 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                + {noteTitles.length - 5} more notes selected
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2 font-sans">
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold border transition-colors ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-sm text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete {count > 1 ? `(${count})` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
