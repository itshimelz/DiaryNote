import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X, Search } from 'lucide-react';
import { CanvasTheme } from '../types';
import { SHORTCUT_CATEGORIES } from '../constants/shortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  themeMode?: CanvasTheme;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({

  isOpen,
  themeMode = 'dark',
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isDark = themeMode !== 'light';

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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-150 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl max-h-[85vh] rounded-md shadow-sm border overflow-hidden flex flex-col transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Keyboard className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
            <h2 className="font-bold text-sm tracking-tight">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Minimal Search Input */}
        <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter shortcuts..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs outline-none border transition-colors ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-300'
              }`}
              autoFocus
            />
          </div>
        </div>

        {/* Minimal Table Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filteredCategories.length === 0 ? (
            <div className="py-8 text-center select-none">
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                No shortcuts found for "{searchQuery}"
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              {filteredCategories.map((category, catIdx) => (
                <tbody key={category.title}>
                  <tr>
                    <td
                      colSpan={2}
                      className={catIdx === 0 ? 'pt-2 pb-2 px-0' : 'pt-5 pb-2 px-0'}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            isDark ? 'text-blue-400/90' : 'text-blue-600/90'
                          }`}
                        >
                          {category.title}
                        </span>
                        <div
                          className={`h-px flex-1 ${
                            isDark ? 'bg-slate-800' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                  {category.shortcuts.map((shortcut, idx) => (
                    <tr
                      key={idx}
                      className={`border-b ${
                        isDark ? 'border-slate-800/40' : 'border-slate-100'
                      }`}
                    >
                      <td className={`py-1.5 pr-4 text-xs font-normal ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {shortcut.description}
                      </td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {shortcut.keys.map((key, kIdx) => (
                            <React.Fragment key={kIdx}>
                              {kIdx > 0 && <span className="text-[10px] text-slate-400 font-mono">+</span>}
                              <kbd
                                className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border shadow-sm ${
                                  isDark
                                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                                    : 'bg-slate-100 border-slate-200 text-slate-800'
                                }`}
                              >
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}
        </div>

        {/* Minimal Footer */}
        <div
          className={`px-4 py-2 border-t text-[10px] flex items-center justify-between ${
            isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}
        >
          <span>Press <kbd className="font-mono font-semibold px-1 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300">Ctrl + /</kbd> anytime to toggle</span>
          <button onClick={onClose} className="hover:underline">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
