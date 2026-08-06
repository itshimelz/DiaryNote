import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note, CanvasTheme } from '../types';
import { formatDate } from '../lib/markdownMention';
import { Search, Calendar, Tag, FileText, CornerDownLeft, X, Layers } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  themeMode?: CanvasTheme;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  themeMode = 'dark',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'tags' | 'date'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = themeMode === 'dark';

  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Auto focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Auto-scroll selected item into view when navigating with Keyboard Arrow keys
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Extract unique user tags (filtering out auto-generated group tags)
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach((n) => {
      n.tags?.forEach((t) => {
        if (!/^#?Group\s/i.test(t)) {
          tagsSet.add(t.startsWith('#') ? t : `#${t}`);
        }
      });
      const matches = (n.title + ' ' + n.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g);
      if (matches) {
        matches.forEach((m) => {
          if (!/^#?Group\s/i.test(m)) {
            tagsSet.add(m);
          }
        });
      }
    });
    return Array.from(tagsSet);
  }, [notes]);

  // Fast search filter logic
  const filteredNotes = useMemo(() => {
    if (!query.trim()) {
      return [...notes].sort((a, b) => {
        const timeA = a.updatedAt || a.createdAt || '';
        const timeB = b.updatedAt || b.createdAt || '';
        return timeB > timeA ? 1 : timeB < timeA ? -1 : 0;
      });
    }

    const q = query.toLowerCase().trim();

    return notes.filter((note) => {
      // If note is locked, do not leak text content or tags in search query matching
      if (note.isLocked) {
        const title = 'locked note'.toLowerCase();
        return title.includes(q);
      }

      const title = (note.title || '').toLowerCase();
      const content = (note.content || '').toLowerCase();

      const matchesKeyword = title.includes(q) || content.includes(q);
      if (filterType === 'all' && matchesKeyword) return true;

      const noteTags = [
        ...(note.tags || []).filter((t) => !/^#?Group\s/i.test(t)),
        ...((note.title + ' ' + note.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g) || []).filter(
          (t) => !/^#?Group\s/i.test(t)
        ),
      ].map((t) => t.toLowerCase());

      if (filterType === 'tags') {
        return noteTags.some((t) => t.includes(q)) || (q.startsWith('#') && noteTags.some((t) => t.includes(q.substring(1))));
      }

      const isoCreated = (note.createdAt || '').toLowerCase();
      const formattedCreated = formatDate(note.createdAt).toLowerCase();
      const formattedUpdated = formatDate(note.updatedAt).toLowerCase();
      const matchesDate = formattedCreated.includes(q) || formattedUpdated.includes(q) || isoCreated.includes(q);

      if (filterType === 'date') {
        return matchesDate;
      }

      const matchesTag = noteTags.some((t) => t.includes(q));
      return matchesKeyword || matchesDate || matchesTag;
    });
  }, [notes, query, filterType]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterType]);

  // Keyboard navigation inside search modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredNotes.length > 0 ? (prev + 1) % filteredNotes.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredNotes.length > 0 ? (prev - 1 + filteredNotes.length) % filteredNotes.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNotes[selectedIndex]) {
          onSelectNote(filteredNotes[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNotes, selectedIndex, onClose, onSelectNote]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 transition-all duration-200 animate-in fade-in select-none ${
        isDark ? 'bg-black/60 backdrop-blur-md' : 'bg-slate-900/30 backdrop-blur-md'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-md shadow-lg overflow-hidden flex flex-col max-h-[80vh] border transition-all duration-200 backdrop-blur-xl ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        {/* Search Header */}
        <div
          className={`p-3.5 border-b flex items-center gap-3 transition-colors ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/70'
          }`}
        >
          <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, dates (e.g. Aug 5), tags (#ideas)..."
            className={`w-full bg-transparent border-none text-xs sm:text-sm font-sans focus:outline-none ${
              isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
            }`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className={`p-1 rounded-sm text-xs transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd
            className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm border ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            ESC
          </kbd>
        </div>

        {/* Filter Pills & Quick Tags Bar */}
        <div
          className={`px-3 py-2 border-b flex items-center justify-between gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs ${
            isDark ? 'border-slate-800/60 bg-slate-950/30' : 'border-slate-200/60 bg-slate-50/40'
          }`}
        >
          <div className="flex items-center gap-1.5 shrink-0 font-sans">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? isDark
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'bg-slate-200 text-slate-900 border border-slate-300'
                  : isDark
                  ? 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('tags')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterType === 'tags'
                  ? isDark
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'bg-slate-200 text-slate-900 border border-slate-300'
                  : isDark
                  ? 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Tags</span>
            </button>
            <button
              onClick={() => setFilterType('date')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterType === 'date'
                  ? isDark
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'bg-slate-200 text-slate-900 border border-slate-300'
                  : isDark
                  ? 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Dates</span>
            </button>
          </div>

          {/* Quick Tag suggestions */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto shrink-0 max-w-[45%] no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {allTags.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    setFilterType('tags');
                  }}
                  className={`px-2 py-0.5 rounded-sm font-mono text-[10px] shrink-0 transition-colors ${
                    isDark
                      ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-xs font-sans space-y-1">
              <FileText className={`w-7 h-7 mx-auto ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>No notes found matching "{query}"</p>
              <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                Try searching keywords, dates, or tags like #journal
              </p>
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const isSelected = index === selectedIndex;
              const userHashtags = (
                (note.title + ' ' + note.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g) ||
                note.tags ||
                []
              ).filter((t) => !/^#?Group\s/i.test(t));

              return (
                <div
                  key={note.id}
                  ref={isSelected ? selectedItemRef : null}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-md cursor-pointer transition-all flex items-start justify-between gap-3 border ${
                    isSelected
                      ? isDark
                        ? 'bg-slate-800/90 border-slate-700 text-slate-100 shadow-sm'
                        : 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
                      : isDark
                      ? 'border-transparent hover:bg-slate-800/50 text-slate-200'
                      : 'border-transparent hover:bg-slate-100/70 text-slate-800'
                  }`}
                >
                  <div className="space-y-1 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono uppercase font-semibold shrink-0 ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        ID: {note.id.includes('-') ? note.id.split('-').pop()?.toUpperCase() : note.id.toUpperCase()}
                      </span>
                      <h4 className="font-semibold text-xs truncate">
                        {note.isLocked ? 'Locked Note' : note.title || 'Untitled Note'}
                      </h4>
                    </div>

                    <p
                      className={`text-[11px] line-clamp-2 leading-relaxed ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {note.isLocked
                        ? 'Passcode required to view contents...'
                        : note.content.replace(/#|\*|\[|\]|\(|\)/g, '') || 'Empty note...'}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] font-mono pt-1">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(note.createdAt)}
                      </span>

                      {/* Display Group Badge ONLY if note is currently in a group */}
                      {note.groupId && (
                        <span className={`flex items-center gap-1 font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          <Layers className="w-3 h-3" />
                          <span>{note.groupName || 'Group'}</span>
                        </span>
                      )}

                      {/* User Hashtags */}
                      {userHashtags.length > 0 && (
                        <div className="flex gap-1 overflow-hidden">
                          {Array.from(new Set(userHashtags)).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className={`font-semibold ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-center">
                    {isSelected && (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-mono font-medium ${
                          isDark ? 'text-blue-400' : 'text-blue-600'
                        }`}
                      >
                        <span>Jump</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          className={`px-4 py-2.5 border-t text-[10px] font-mono flex items-center justify-between ${
            isDark
              ? 'border-slate-800/80 bg-slate-950/80 text-slate-400'
              : 'border-slate-100 bg-slate-50/90 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>
              <kbd
                className={`px-1.5 py-0.5 rounded border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-200/80 border-slate-300 text-slate-700'
                }`}
              >
                ↑
              </kbd>{' '}
              <kbd
                className={`px-1.5 py-0.5 rounded border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-200/80 border-slate-300 text-slate-700'
                }`}
              >
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd
                className={`px-1.5 py-0.5 rounded border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-200/80 border-slate-300 text-slate-700'
                }`}
              >
                ↵
              </kbd>{' '}
              Select Note
            </span>
          </div>
          <span>{filteredNotes.length} matching notes</span>
        </div>
      </div>
    </div>
  );
};
