import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard, Check, X } from 'lucide-react';
import { CanvasTheme } from '../types';

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
  const isDark = themeMode === 'dark';

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
    <div className="fixed inset-[#0] z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Create Note from Clipboard</h2>
              <p className="text-xs text-slate-400">Pasted text detected from external source</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Note Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              className={`w-full px-3 py-2 text-sm rounded-xl border outline-none transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Content Preview</label>
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
              className={`w-full p-3 text-xs font-mono rounded-xl border outline-none resize-none transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-medium rounded-xl transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-md ${
                isDark
                  ? 'bg-white hover:bg-slate-200 text-slate-900 disabled:opacity-50'
                  : 'bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
