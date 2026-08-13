import React, { useState, useEffect, useMemo } from 'react';
import { Note, CanvasTheme } from '../types';
import { formatDate } from '../utils';
import {
  Search,
  X,
  FileText,
  Plus,
  Trash2,
  AtSign,
  Layers,
} from 'lucide-react';

interface NotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
  themeMode?: CanvasTheme;
}

const NotesSidebarComponent: React.FC<NotesSidebarProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  themeMode = 'dark',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'modified' | 'title'>('created');

  // Debounce search query input (150ms) to prevent UI micro-stutters
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredNotes = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    const filtered = notes.filter((n) => {
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });

    filtered.sort((a, b) => {
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'modified') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.title.localeCompare(b.title);
    });
    return filtered;
  }, [notes, debouncedQuery, sortBy]);

  const isDark = themeMode !== 'light';

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 border-l shadow-2xl backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-200 select-none font-sans ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
          : 'bg-white/95 border-slate-200 text-slate-900'
      }`}
    >
      {/* Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between transition-colors ${
          isDark ? 'border-slate-800 bg-slate-950/40 text-slate-100' : 'border-slate-200 bg-slate-50/80 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <FileText className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
          <h2 className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            All notes ({notes.length})
          </h2>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-sm transition-colors ${
            isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-200/70 text-slate-600 hover:text-slate-900'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Action Controls Bar */}
      <div
        className={`p-3 border-b space-y-2.5 ${
          isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50/50'
        }`}
      >
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or @mentions..."
            className={`w-full border rounded-md pl-8 pr-7 py-1.5 text-xs transition-colors outline-none font-sans ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500 shadow-xs'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-sm transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span className="text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`border rounded-md px-2 py-1 text-[11px] focus:outline-none transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800 shadow-xs'
              }`}
            >
              <option value="created">Newest Created</option>
              <option value="modified">Recently Updated</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>

          <button
            onClick={() => {
              onAddNote();
              onClose();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'
                : 'bg-slate-900 text-white border border-slate-800 hover:bg-slate-800 shadow-xs'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>
      </div>

      {/* Note Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredNotes.length === 0 ? (
          <div className={`text-center py-12 text-xs space-y-1 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <p>No notes found matching “{searchQuery}”</p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const hasMentions = note.content.includes('@');
            const plainSnippet = note.isLocked
              ? ''
              : (note.content || '')
                  .replace(/^#+\s+/gm, '')
                  .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, '✓ ')
                  .replace(/^[-*+]\s+/gm, '• ')
                  .replace(/[*_~`#]/g, '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 120);
            return (
              <div
                key={note.id}
                onClick={() => {
                  onSelectNote(note.id);
                  onClose();
                }}
                className={`p-3 rounded-lg cursor-pointer transition-colors border group flex flex-col gap-1.5 ${
                  isDark
                    ? 'border-slate-800/70 bg-slate-900/50 hover:bg-slate-800/80 text-slate-200 hover:border-slate-700'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Top Row: Icon + Full Title + Delete Button */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <h4 className={`font-semibold text-xs leading-snug break-words flex-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {note.isLocked ? 'Locked Note' : note.title || 'Untitled Note'}
                    </h4>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title="Delete Note"
                    className={`opacity-40 group-hover:opacity-100 group-focus-within:opacity-100 p-1 hover:bg-rose-500/20 rounded-sm transition-colors shrink-0 -mr-1 -mt-0.5 ${
                      isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-500 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Snippet Preview */}
                <p className={`text-[11px] line-clamp-2 pl-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {note.isLocked ? (
                    <span className="italic">Passcode required</span>
                  ) : plainSnippet ? (
                    plainSnippet
                  ) : (
                    <span className="italic opacity-60">Empty note</span>
                  )}
                </p>

                {/* Footer Row: Badges (Group / Refs) & Creation Date */}
                <div className="flex items-center justify-between gap-2 pl-8 pt-0.5 text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {note.groupId && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-medium border shrink-0 ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Layers className="w-2.5 h-2.5 text-blue-500" />
                        <span className="truncate max-w-[110px]">{note.groupName || 'Group'}</span>
                      </span>
                    )}
                    {hasMentions && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0 ${
                          isDark
                            ? 'bg-slate-800/80 border-slate-700 text-amber-400/90'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        <AtSign className="w-2.5 h-2.5" /> Refs
                      </span>
                    )}
                  </div>

                  <span className={`font-mono text-[10px] shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatDate(note.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const NotesSidebar = React.memo(NotesSidebarComponent);
