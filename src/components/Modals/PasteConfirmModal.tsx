import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard, Check, X } from 'lucide-react';
import { CanvasTheme } from '../../types';

interface PasteConfirmModalProps {
  isOpen: boolean;
  pastedText: string;
  themeMode?: CanvasTheme;
  onClose: () => void;
  onConfirm: (title: string, content: string) => void;
}

export const PasteConfirmModal: React.FC<PasteConfirmModalProps> = ({
  isOpen,
  pastedText,
  themeMode = 'dark',
  onClose,
  onConfirm,
}) => {
  const isDark = themeMode !== 'light';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(pastedText);
      // Auto-extract title from first non-empty line
      const firstLine = pastedText
        .split('\n')
        .map((l) => l.trim().replace(/^#+\s*/, ''))
        .find((l) => l.length > 0);
      setTitle(firstLine ? firstLine.slice(0, 40) : 'Pasted Note');
    }
  }, [isOpen, pastedText]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onConfirm(title.trim() || 'Pasted Note', content);
      onClose();
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-md border p-5 shadow-sm transition-opacity duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 mb-4 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Clipboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Create Note from Clipboard</h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Pasted text detected from external source
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Note Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              className={`w-full px-3 py-2 text-xs rounded-md border outline-none transition-colors ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800 text-slate-100 focus:border-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-300'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Content Preview</label>
            <textarea
              autoFocus
              rows={6}
              value={content}
              onChange={(e) => {
                const newText = e.target.value;
                setContent(newText);
                const firstLine = newText
                  .split('\n')
                  .map((l) => l.trim().replace(/^#+\s*/, ''))
                  .find((l) => l.length > 0);
                if (firstLine && (!title || title === 'Pasted Note' || title === 'Untitled Note')) {
                  setTitle(firstLine.slice(0, 40));
                }
              }}
              placeholder="Paste text here (Ctrl+V) or type content..."
              className={`w-full p-3 text-xs font-sans rounded-md border outline-none resize-none transition-colors ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800 text-slate-200 focus:border-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-300'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/40">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                isDark
                  ? 'bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50'
                  : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Create Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
