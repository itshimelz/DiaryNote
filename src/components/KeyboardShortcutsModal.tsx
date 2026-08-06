import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X, Search, Command, Sparkles } from 'lucide-react';
import { CanvasTheme } from '../types';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  themeMode?: CanvasTheme;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Global & General',
    shortcuts: [
      { keys: ['Ctrl', '/'], description: 'Open Keyboard Shortcuts cheatsheet' },
      { keys: ['Ctrl', 'K'], description: 'Search notes & command palette' },
      { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
      { keys: ['Ctrl', 'Y'], description: 'Redo last action (or Ctrl+Shift+Z)' },
      { keys: ['Z'], description: 'Toggle Zen Mode (hide UI)' },
      { keys: ['Esc'], description: 'Clear selection / close modal' },
    ],
  },
  {
    title: 'Canvas & Navigation',
    shortcuts: [
      { keys: ['Space', 'Drag'], description: 'Pan across infinite canvas' },
      { keys: ['P'], description: 'Toggle Pan vs Select Mode' },
      { keys: ['F'], description: 'Fit all notes on canvas view' },
      { keys: ['H'], description: 'Reset zoom (100% at center)' },
      { keys: ['Ctrl', 'Scroll'], description: 'Smooth zoom in / out' },
      { keys: ['Shift', 'Z'], description: 'Focus & zoom to selected note' },
    ],
  },
  {
    title: 'Note Creation & Editing',
    shortcuts: [
      { keys: ['N'], description: 'Create new note at canvas center' },
      { keys: ['Ctrl', 'N'], description: 'Create new note' },
      { keys: ['Double Click'], description: 'Create new note at click position' },
      { keys: ['Enter'], description: 'Edit selected note' },
      { keys: ['Delete'], description: 'Delete selected note(s)' },
      { keys: ['Ctrl', 'L'], description: 'Lock / unlock selected note(s)' },
      { keys: ['@'], description: 'Mention & link another note in content' },
      { keys: ['#'], description: 'Add tag to note' },
    ],
  },
  {
    title: 'Batch & Selection',
    shortcuts: [
      { keys: ['Shift', 'Click'], description: 'Multi-select multiple notes' },
      { keys: ['Drag Canvas'], description: 'Box marquee select multiple notes' },
      { keys: ['Ctrl', 'G'], description: 'Group selected notes' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Ungroup selected notes' },
      { keys: ['Esc'], description: 'Clear batch selection' },
    ],
  },
  {
    title: 'View & Settings Toggles',
    shortcuts: [
      { keys: ['T'], description: 'Toggle Dark / Light Canvas Theme' },
      { keys: ['S'], description: 'Toggle Snap to Grid (24px grid)' },
      { keys: ['C'], description: 'Toggle Reference Connection Lines' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  themeMode = 'dark',
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isDark = themeMode === 'dark';

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUT_CATEGORIES;

    const query = searchQuery.toLowerCase().trim();

    return SHORTCUT_CATEGORIES.map((cat) => ({
      ...cat,
      shortcuts: cat.shortcuts.filter(
        (item) =>
          item.description.toLowerCase().includes(query) ||
          item.keys.some((k) => k.toLowerCase().includes(query)) ||
          cat.title.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.shortcuts.length > 0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight flex items-center gap-2">
                <span>Keyboard Shortcuts</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Ctrl + /
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Quick references and hotkeys for DiaryNote canvas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-800'
            }`}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className={`p-3 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200/60'}`}>
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcut (e.g. zoom, group, lock, undo)..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition-colors ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-blue-500/60'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500/60'
              }`}
              autoFocus
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center select-none">
              <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                No shortcuts found for "{searchQuery}"
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.title} className="space-y-2">
                <h3
                  className={`text-[11px] font-bold uppercase tracking-wider px-1 ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`}
                >
                  {category.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {category.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                        isDark
                          ? 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/70'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/80'
                      }`}
                    >
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {shortcut.keys.map((key, kIdx) => (
                          <React.Fragment key={kIdx}>
                            {kIdx > 0 && <span className="text-[10px] text-slate-400 font-mono">+</span>}
                            <kbd
                              className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold shadow-xs border ${
                                isDark
                                  ? 'bg-slate-800 border-slate-700 text-slate-200 shadow-black/40'
                                  : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/80'
                              }`}
                            >
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2.5 border-t text-[11px] flex items-center justify-between ${
            isDark ? 'border-slate-800/80 bg-slate-900/60 text-slate-400' : 'border-slate-200/80 bg-slate-50 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Tip: Press <kbd className="font-mono font-bold px-1 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">Ctrl + /</kbd> anytime to toggle this menu</span>
          </div>
          <button
            onClick={onClose}
            className="font-medium hover:underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
