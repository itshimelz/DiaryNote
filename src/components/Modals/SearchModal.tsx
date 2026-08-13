import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Note, CanvasTheme } from '../../types';
import { formatDate } from '../../utils';
import { Search, Calendar, Tag, FileText, CornerDownLeft, X, Layers, Lock, CheckSquare } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  themeMode?: CanvasTheme;
}

const SearchModalComponent: React.FC<SearchModalProps> = ({
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

  const isDark = themeMode !== 'light';

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

  // Pre-process notes once for search rendering (clean snippet + hashtags)
  const processedNotesMap = useMemo(() => {
    const map = new Map<string, { plainSnippet: string; userHashtags: string[] }>();
    notes.forEach((note) => {
      const userHashtags = (
        (note.title + ' ' + note.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g) ||
        note.tags ||
        []
      ).filter((t) => !/^#?Group\s/i.test(t));

      const plainSnippet = note.content
        ? note.content
            .replace(/^#+\s+/gm, '')
            .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, '✓ ')
            .replace(/^[-*+]\s+/gm, '• ')
            .replace(/[*_~`#]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

      map.set(note.id, {
        plainSnippet,
        userHashtags: Array.from(new Set(userHashtags)),
      });
    });
    return map;
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
      const tags = (note.tags || []).map((t) => t.toLowerCase());
      const processed = processedNotesMap.get(note.id);
      const userHashtags = (processed?.userHashtags || []).map((t) => t.toLowerCase());

      if (filterType === 'tags') {
        const queryTag = q.startsWith('#') ? q : `#${q}`;
        return (
          tags.some((t) => (t.startsWith('#') ? t : `#${t}`).includes(queryTag)) ||
          userHashtags.some((t) => t.includes(queryTag))
        );
      }

      if (filterType === 'date') {
        const createdDate = formatDate(note.createdAt).toLowerCase();
        const updatedDate = formatDate(note.updatedAt).toLowerCase();
        return createdDate.includes(q) || updatedDate.includes(q);
      }

      return (
        title.includes(q) ||
        content.includes(q) ||
        tags.some((t) => t.includes(q)) ||
        userHashtags.some((t) => t.includes(q))
      );
    });
  }, [notes, query, filterType, processedNotesMap]);

  // Keyboard navigation inside search results
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredNotes.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : Math.max(0, filteredNotes.length - 1)
        );
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

  const [searchScrollTop, setSearchScrollTop] = useState(0);

  // Virtualization windowing calculations for SearchModal
  const searchStartIndex = Math.max(0, Math.floor(searchScrollTop / 52) - 3);
  const searchEndIndex = Math.min(filteredNotes.length, searchStartIndex + 15);
  const visibleFilteredNotes = useMemo(() => {
    return filteredNotes.slice(searchStartIndex, searchEndIndex);
  }, [filteredNotes, searchStartIndex, searchEndIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 transition-opacity duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-md shadow-sm overflow-hidden flex flex-col max-h-[80vh] border transition-opacity duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Search Header */}
        <div
          className={`p-3.5 border-b flex items-center gap-3 transition-colors ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/70'
          }`}
        >
          <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, dates, tags (#journal)..."
            className={`w-full bg-transparent border-none text-xs sm:text-sm font-sans focus:outline-none ${
              isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
            }`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className={`p-1 rounded-sm text-xs transition-colors cursor-pointer ${
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
          className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs ${
            isDark ? 'border-slate-800/60 bg-slate-950/20' : 'border-slate-200/60 bg-slate-50/40'
          }`}
        >
          <div className="flex items-center gap-1.5 shrink-0 font-sans">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                filterType === 'all'
                  ? isDark
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('tags')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterType === 'tags'
                  ? isDark
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Tags</span>
            </button>
            <button
              onClick={() => setFilterType('date')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterType === 'date'
                  ? isDark
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
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
                  className={`px-2 py-0.5 rounded-sm font-mono text-[10px] shrink-0 border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results List (Virtualized) */}
        <div
          onScroll={(e) => setSearchScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto p-2"
          role="listbox"
          aria-label="Search results"
        >
          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-xs font-sans space-y-1">
              <FileText className={`w-7 h-7 mx-auto ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>No notes found matching "{query}"</p>
              <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                Try searching keywords, dates, or tags like #journal
              </p>
            </div>
          ) : (
            <div
              style={{
                paddingTop: `${searchStartIndex * 52}px`,
                paddingBottom: `${Math.max(0, (filteredNotes.length - searchEndIndex) * 52)}px`,
              }}
              className="space-y-1"
            >
              {visibleFilteredNotes.map((note, idx) => {
                const actualIndex = searchStartIndex + idx;
                const isSelected = actualIndex === selectedIndex;
                const processed = processedNotesMap.get(note.id) || { plainSnippet: '', userHashtags: [] };
                const userHashtags = processed.userHashtags;
                const plainSnippet = processed.plainSnippet;

                return (
                  <div
                    key={note.id}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => {
                      onSelectNote(note.id);
                      onClose();
                    }}
                    onMouseEnter={() => {
                      if (selectedIndex !== actualIndex) setSelectedIndex(actualIndex);
                    }}
                    role="option"
                    aria-selected={isSelected}
                    className={`px-3 py-2 rounded-sm cursor-pointer transition-colors flex items-center justify-between gap-3 border ${
                      isSelected
                        ? isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-100'
                          : 'bg-slate-100 border-slate-300 text-slate-900'
                        : isDark
                        ? 'border-transparent hover:bg-slate-800/40 text-slate-300'
                        : 'border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* Left: Icon + Title & 1-Line Clean Preview */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`p-1.5 rounded-sm shrink-0 ${
                          isSelected
                            ? isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {note.isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        ) : note.content?.includes('- [') ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs truncate">
                            {note.isLocked ? 'Locked Note' : note.title || 'Untitled Note'}
                          </h4>
                          {note.groupId && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-sans font-medium border shrink-0 ${
                                isDark
                                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                                  : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <Layers className="w-2.5 h-2.5" />
                              <span>{note.groupName || 'Group'}</span>
                            </span>
                          )}
                        </div>

                        <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {note.isLocked ? (
                            <span className="italic">Passcode required</span>
                          ) : (
                            plainSnippet || <span className="italic opacity-60">Empty note</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Tags, Date & Jump Shortcut */}
                    <div className="flex items-center gap-3 shrink-0 text-[10px]">
                      {userHashtags.length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {Array.from(new Set(userHashtags)).slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] border ${
                                isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <span className={`font-mono text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatDate(note.createdAt)}
                      </span>

                      {isSelected && (
                        <span
                          className={`flex items-center gap-1 font-mono font-medium ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          <span>Jump</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          className={`px-4 py-2.5 border-t text-[10px] font-mono flex items-center justify-between transition-colors ${
            isDark
              ? 'border-slate-800 bg-slate-950/80 text-slate-400'
              : 'border-slate-200/80 bg-slate-50/90 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>
              <kbd
                className={`px-1.5 py-0.5 rounded-sm border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                ↑
              </kbd>{' '}
              <kbd
                className={`px-1.5 py-0.5 rounded-sm border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd
                className={`px-1.5 py-0.5 rounded-sm border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
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
    </div>,
    document.body
  );
};

export const SearchModal = React.memo(SearchModalComponent);
