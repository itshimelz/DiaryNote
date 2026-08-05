import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note } from '../types';
import { formatDate } from '../lib/markdownMention';
import { Search, Calendar, Tag, FileText, CornerDownLeft, X, Clock, Hash } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'tags' | 'date'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Extract all unique hashtags from notes
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach((n) => {
      // From note.tags array
      n.tags?.forEach((t) => tagsSet.add(t.startsWith('#') ? t : `#${t}`));
      // From markdown hashtags in content/title
      const matches = (n.title + ' ' + n.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g);
      if (matches) {
        matches.forEach((m) => tagsSet.add(m));
      }
    });
    return Array.from(tagsSet);
  }, [notes]);

  // Fast search filter logic
  const filteredNotes = useMemo(() => {
    if (!query.trim()) {
      // Return notes sorted by updatedAt
      return [...notes].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
    }

    const q = query.toLowerCase().trim();

    return notes.filter((note) => {
      const title = note.title.toLowerCase();
      const content = note.content.toLowerCase();
      const formattedCreated = formatDate(note.createdAt).toLowerCase();
      const formattedUpdated = formatDate(note.updatedAt).toLowerCase();
      const isoCreated = note.createdAt.toLowerCase();

      // Check hashtags or tags
      const noteTags = [
        ...(note.tags || []),
        ...((note.title + ' ' + note.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g) || []),
      ].map((t) => t.toLowerCase());

      if (filterType === 'tags') {
        return noteTags.some((t) => t.includes(q)) || (q.startsWith('#') && noteTags.some((t) => t.includes(q.substring(1))));
      }

      if (filterType === 'date') {
        return (
          formattedCreated.includes(q) ||
          formattedUpdated.includes(q) ||
          isoCreated.includes(q)
        );
      }

      // Default 'all': match title, content, dates, or tags
      const matchesKeyword = title.includes(q) || content.includes(q);
      const matchesDate = formattedCreated.includes(q) || formattedUpdated.includes(q) || isoCreated.includes(q);
      const matchesTag = noteTags.some((t) => t.includes(q));

      return matchesKeyword || matchesDate || matchesTag;
    });
  }, [notes, query, filterType]);

  // Reset selected index when query or filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterType]);

  // Keyboard navigation
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/80 dark:bg-slate-900/80">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, dates (e.g., Aug 5), tags (#ideas)..."
            className="w-full bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Filter Pills & Quick Tags */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 overflow-x-auto text-xs bg-slate-50/40 dark:bg-slate-950/40">
          <div className="flex items-center gap-1.5 shrink-0 font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('tags')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${
                filterType === 'tags'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>Tags</span>
            </button>
            <button
              onClick={() => setFilterType('date')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${
                filterType === 'date'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                  : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Dates</span>
            </button>
          </div>

          {/* Quick Tag suggestions */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto shrink-0 max-w-[50%] no-scrollbar">
              {allTags.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    setFilterType('tags');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] hover:bg-slate-300 dark:hover:bg-slate-700 shrink-0"
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
            <div className="py-12 text-center text-slate-400 text-xs font-mono space-y-1">
              <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No notes found matching "{query}"</p>
              <p className="text-[10px] text-slate-500">Try searching keywords, dates, or tags like #journal</p>
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const isSelected = index === selectedIndex;
              const tags = (note.title + ' ' + note.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g) || note.tags || [];

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="space-y-1 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold shrink-0">
                        ID: {note.id.includes('-') ? note.id.split('-').pop()?.toUpperCase() : note.id.toUpperCase()}
                      </span>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {note.title || 'Untitled Note'}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {note.content.replace(/#|\*|\[|\]|\(|\)/g, '')}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(note.createdAt)}
                      </span>
                      {tags.length > 0 && (
                        <div className="flex gap-1 overflow-hidden">
                          {Array.from(new Set(tags)).slice(0, 3).map((t) => (
                            <span key={t} className="text-blue-600 dark:text-blue-400 font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 shrink-0 self-center">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500">
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
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                ↑
              </kbd>{' '}
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
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
