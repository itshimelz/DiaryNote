import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, AlertTriangle } from 'lucide-react';
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

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-md border p-5 overflow-hidden transition-opacity duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-sm'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 mb-3.5 border-b transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h2 className="font-bold text-sm tracking-tight leading-none">Confirm Deletion</h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5 text-xs">
          <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            {count === 1 ? 'Delete Note?' : `Delete ${count} Selected Notes?`}
          </h3>
          <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {count === 1 ? (
              <>This note will be permanently removed from your canvas.</>
            ) : (
              <>
                Are you sure you want to delete all <strong className="font-semibold text-rose-500">{count}</strong> selected notes? This cannot be undone.
              </>
            )}
          </p>
        </div>

        {/* Note Titles List Preview */}
        {noteTitles.length > 0 && (
          <div
            className={`mt-3 max-h-36 overflow-y-auto rounded-sm p-2.5 border space-y-1 text-xs ${
              isDark
                ? 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                : 'bg-slate-50 border-slate-200/90 text-slate-700'
            }`}
          >
            {noteTitles.slice(0, 5).map((title, idx) => (
              <div key={idx} className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate font-medium">{title || 'Untitled Note'}</span>
              </div>
            ))}
            {noteTitles.length > 5 && (
              <div className={`text-[10px] pt-0.5 pl-3.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                + {noteTitles.length - 5} more notes selected
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-end gap-2 transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200/80'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
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
            className="px-3.5 py-1.5 rounded-sm text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete {count > 1 ? `(${count})` : ''}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
