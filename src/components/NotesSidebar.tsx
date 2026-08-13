import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

const ITEM_HEIGHT = 112; // Average height of note row in px
const BUFFER_ITEMS = 5;

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
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
        const bTime = b.createdTimestamp || new Date(b.createdAt).getTime();
        const aTime = a.createdTimestamp || new Date(a.createdAt).getTime();
        return bTime - aTime;
      }
      if (sortBy === 'modified') {
        const bTime = b.updatedTimestamp || new Date(b.updatedAt).getTime();
        const aTime = a.updatedTimestamp || new Date(a.updatedAt).getTime();
        return bTime - aTime;
      }
      return a.title.localeCompare(b.title);
    });
    return filtered;
  }, [notes, debouncedQuery, sortBy]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // List virtualization windowing
  const totalItems = filteredNotes.length;
  const containerHeight = typeof window !== 'undefined' ? window.innerHeight - 160 : 600;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + 2 * BUFFER_ITEMS;
  const endIndex = Math.min(totalItems, startIndex + visibleCount);

  const visibleNotes = useMemo(() => {
    return filteredNotes.slice(startIndex, endIndex);
  }, [filteredNotes, startIndex, endIndex]);

  const topPadding = startIndex * ITEM_HEIGHT;
  const bottomPadding = Math.max(0, (totalItems - endIndex) * ITEM_HEIGHT);

  const isDark = themeMode !== 'light';

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Notes sidebar"
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
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className={`p-1 rounded-md transition-colors cursor-pointer ${
            isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Sort Toolbar */}
      <div className={`p-3 border-b space-y-2.5 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/50'}`}>
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            aria-label="Search notes in sidebar"
            className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs font-sans border transition-colors outline-none focus:ring-1 focus:ring-blue-500 ${
              isDark
                ? 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-400'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-xs'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort notes by"
              className={`text-[11px] font-medium py-1 px-2 rounded-md border outline-none cursor-pointer transition-colors ${
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
            type="button"
            onClick={() => {
              onAddNote();
              onClose();
            }}
            aria-label="Add new note"
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

      {/* Note Items List (Virtualized Windowing) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2"
        role="feed"
        aria-label="Notes list"
      >
        {totalItems === 0 ? (
          <div className={`text-center py-12 text-xs space-y-1 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <p>No notes found matching “{searchQuery}”</p>
          </div>
        ) : (
          <div style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }} className="space-y-1.5">
            {visibleNotes.map((note) => {
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
                <button
                  type="button"
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  aria-label={`Open note ${note.title || 'Untitled Note'}`}
                  className={`w-full text-left p-3 rounded-lg cursor-pointer transition-colors border group flex flex-col gap-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? 'border-slate-800/70 bg-slate-900/50 hover:bg-slate-800/80 text-slate-200 hover:border-slate-700'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* Top Row: Icon + Full Title + Delete Button */}
                  <div className="flex items-start justify-between gap-2 w-full">
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
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      aria-label={`Delete note ${note.title || 'Untitled Note'}`}
                      title="Delete Note"
                      className={`opacity-40 group-hover:opacity-100 group-focus-within:opacity-100 p-1 hover:bg-rose-500/20 rounded-sm transition-colors shrink-0 -mr-1 -mt-0.5 cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-500 hover:text-rose-600'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Snippet Preview */}
                  <p className={`text-[11px] line-clamp-2 pl-8 text-left ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {note.isLocked ? (
                      <span className="italic">Passcode required</span>
                    ) : plainSnippet ? (
                      plainSnippet
                    ) : (
                      <span className="italic opacity-60">Empty note</span>
                    )}
                  </p>

                  {/* Footer Row: Badges (Group / Refs) & Creation Date */}
                  <div className="flex items-center justify-between gap-2 pl-8 pt-0.5 text-[10px] w-full">
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export const NotesSidebar = React.memo(NotesSidebarComponent);
