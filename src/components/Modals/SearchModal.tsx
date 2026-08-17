import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note, CanvasTheme } from '../../types';
import { formatDate } from '../../utils';
import { searchNotesFts, SearchItemMatch } from '../../lib/rustSearch';
import { isTauriEnvironment } from '../../hooks/useNativeFileDrop';
import {
  Search01Icon,
  Calendar03Icon,
  Tag01Icon,
  File01Icon,
  Cancel01Icon,
  Layers01Icon,
  SecurityLockIcon,
} from '@hugeicons/core-free-icons';
import { Dialog, Input, Kbd, Badge, Icon, SegmentedControl, Menu, MenuItem, MenuGroupHeader, IconButton } from '../ui';


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
  themeMode: _themeMode = 'dark',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'tags' | 'date'>('all');
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);
  const [ftsMatches, setFtsMatches] = useState<SearchItemMatch[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Auto focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setIsTagsDropdownOpen(false);
      setFtsMatches(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Dual-Tier SQLite FTS5 Query Effect in Tauri Desktop Mode
  useEffect(() => {
    if (!isOpen) {
      setFtsMatches(null);
      return;
    }

    const cleanQuery = query.trim();
    if (!cleanQuery || !isTauriEnvironment()) {
      setFtsMatches(null);
      return;
    }

    let isCancelled = false;
    const filter =
      filterType === 'tags'
        ? { tag: cleanQuery.replace(/^#/, '') }
        : filterType === 'date'
        ? { entry_date: cleanQuery }
        : undefined;

    const timer = setTimeout(async () => {
      try {
        const res = await searchNotesFts(cleanQuery, filter);
        if (!isCancelled && res && res.matches) {
          setFtsMatches(res.matches);
        }
      } catch (e) {
        console.warn('Native FTS search failed, falling back to in-memory filter:', e);
      }
    }, 40);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, query, filterType]);

  // Click outside to close tag dropdown
  useEffect(() => {
    if (!isTagsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(e.target as Node)) {
        setIsTagsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTagsDropdownOpen]);

  // Auto-scroll selected item into view when navigating with Keyboard Arrow keys
  useEffect(() => {
    if (selectedItemRef.current && typeof selectedItemRef.current.scrollIntoView === 'function') {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Extract and rank all unique user tags by frequency
  const tagStats = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => {
      const noteTags = new Set<string>();
      n.tags?.forEach((t) => {
        if (!/^#?Group\s/i.test(t)) {
          noteTags.add(t.startsWith('#') ? t : `#${t}`);
        }
      });
      const matches = (n.title + ' ' + n.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g);
      if (matches) {
        matches.forEach((m) => {
          if (!/^#?Group\s/i.test(m)) {
            noteTags.add(m);
          }
        });
      }
      noteTags.forEach((t) => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [notes]);

  // Pre-process notes once for search rendering
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

  // Map of Rust SQLite FTS5 snippets with native highlights
  const ftsSnippetMap = useMemo(() => {
    const map = new Map<string, string>();
    if (ftsMatches) {
      ftsMatches.forEach((m) => {
        if (m.snippet) map.set(m.note_id, m.snippet);
      });
    }
    return map;
  }, [ftsMatches]);

  // Filter notes based on query and filter type (Native SQLite FTS5 rank priority + in-memory fallback)
  const filteredNotes = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();

    if (cleanQuery && ftsMatches && ftsMatches.length > 0) {
      const noteMap = new Map<string, Note>();
      notes.forEach((n) => noteMap.set(n.id, n));
      const ranked: Note[] = [];
      ftsMatches.forEach((m) => {
        const n = noteMap.get(m.note_id);
        if (n) ranked.push(n);
      });
      if (ranked.length > 0) {
        return ranked;
      }
    }

    return notes.filter((note) => {
      if (!cleanQuery) {
        if (filterType === 'tags') return (note.tags && note.tags.length > 0) || (note.title + note.content).includes('#');
        if (filterType === 'date') return Boolean(note.entryDate || note.isDailyEntry);
        return true;
      }

      if (filterType === 'tags') {
        const hasTag =
          note.tags?.some((t) => t.toLowerCase().includes(cleanQuery.replace('#', ''))) ||
          note.title.toLowerCase().includes(cleanQuery) ||
          note.content.toLowerCase().includes(cleanQuery);
        return hasTag;
      }

      if (filterType === 'date') {
        const dateMatch =
          (note.entryDate && note.entryDate.includes(cleanQuery)) ||
          formatDate(note.createdAt).toLowerCase().includes(cleanQuery);
        return dateMatch;
      }

      // Default 'all'
      return (
        note.title.toLowerCase().includes(cleanQuery) ||
        note.content.toLowerCase().includes(cleanQuery) ||
        note.tags?.some((t) => t.toLowerCase().includes(cleanQuery.replace('#', ''))) ||
        (note.groupName && note.groupName.toLowerCase().includes(cleanQuery))
      );
    });
  }, [notes, query, filterType, ftsMatches]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterType]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredNotes.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNotes[selectedIndex]) {
        onSelectNote(filteredNotes[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Helper to highlight matching terms safely
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark
          key={i}
          className="bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-yellow-200 px-0.5 rounded-xs"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      className="p-0 overflow-hidden"
    >
      <div onKeyDown={handleKeyDown} className="flex flex-col h-[75vh] max-h-[640px] select-none font-sans">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-850">
          <Input
            ref={inputRef}
            prefixIcon={Search01Icon}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, dates, tags (#journal)..."
            rightElement={
              query ? (
                <IconButton
                  size="xs"
                  variant="ghost"
                  icon={Cancel01Icon}
                  aria-label="Clear query"
                  onClick={() => setQuery('')}
                />
              ) : (
                <Kbd>ESC</Kbd>
              )
            }
          />
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30 text-xs">
          <SegmentedControl
            size="xs"
            fullWidth={false}
            value={filterType}
            onChange={(val) => setFilterType(val as any)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'tags', label: 'Tags', icon: Tag01Icon },
              { value: 'date', label: 'Dates', icon: Calendar03Icon },
            ]}
          />

          {/* Tag Quick Filters */}
          {tagStats.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 relative" ref={tagsDropdownRef}>
              <div className="flex items-center gap-1.5 overflow-hidden">
                {tagStats.slice(0, 3).map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      setFilterType('tags');
                    }}
                    className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    title={`Filter by ${tag} (${count} notes)`}
                  >
                    <Badge variant="subtle" size="xs">
                      <span className="max-w-[110px] truncate">{tag}</span>
                      <span className="opacity-60 text-[9px] ml-0.5">({count})</span>
                    </Badge>
                  </button>
                ))}
              </div>

              {tagStats.length > 3 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTagsDropdownOpen((prev) => !prev)}
                    className="px-2 py-0.5 rounded-sm text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    +{tagStats.length - 3} more
                  </button>

                  {isTagsDropdownOpen && (
                    <div className="absolute right-0 top-7 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <Menu minWidth="w-56 max-h-64 overflow-y-auto">
                        <MenuGroupHeader>All Tags ({tagStats.length})</MenuGroupHeader>
                        {tagStats.map(({ tag, count }) => (
                          <MenuItem
                            key={tag}
                            label={tag}
                            badge={<span className="text-[10px] font-mono opacity-60">{count}</span>}
                            onClick={() => {
                              setQuery(tag);
                              setFilterType('tags');
                              setIsTagsDropdownOpen(false);
                            }}
                          />
                        ))}
                      </Menu>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3" role="listbox" aria-label="Search results">
          {filterType === 'tags' && !query && tagStats.length > 0 ? (
            <div className="p-1 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tag Directory ({tagStats.length} unique tags)
                </span>
                <span className="text-[10px] text-slate-500">Click any tag to search</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {tagStats.map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tag)}
                    className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 text-left flex items-center justify-between gap-2 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon icon={Tag01Icon} size="xs" className="text-blue-500 shrink-0" />
                      <span className="font-semibold text-xs truncate text-slate-900 dark:text-slate-100">{tag}</span>
                    </div>
                    <Badge variant="subtle" size="xs">
                      {count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
              <Icon icon={Search01Icon} size="xl" className="opacity-30 mb-2" />
              <p className="text-sm font-semibold">No matching notes found</p>
              <p className="text-xs opacity-70">Try searching for a different keyword or tag</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotes.map((note, index) => {
                const isSelected = index === selectedIndex;
                const processed = processedNotesMap.get(note.id);
                const plainSnippet = processed?.plainSnippet || '';
                const userHashtags = processed?.userHashtags || [];

                return (
                  <div
                    key={note.id}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => {
                      onSelectNote(note.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-2.5 rounded-sm border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800/90 border-blue-500/50 dark:border-blue-500/50 ring-1 ring-blue-500/20'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon icon={File01Icon} size="xs" className="text-slate-400 shrink-0" />
                        <span className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">
                          {highlightMatch(note.title || 'Untitled Note', query)}
                        </span>
                        {note.groupName && (
                          <Badge variant="subtle" size="xs" icon={Layers01Icon}>
                            {note.groupName}
                          </Badge>
                        )}
                        {note.isLocked && (
                          <Badge variant="warning" size="xs" icon={SecurityLockIcon}>
                            Locked
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {formatDate(note.updatedAt || note.createdAt)}
                      </span>
                    </div>

                    {ftsSnippetMap.get(note.id) ? (
                      <p
                        className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-1.5 leading-relaxed [&>mark]:bg-amber-200 dark:[&>mark]:bg-amber-900/60 dark:[&>mark]:text-amber-200 [&>mark]:px-0.5 [&>mark]:rounded-xs"
                        dangerouslySetInnerHTML={{ __html: ftsSnippetMap.get(note.id)! }}
                      />
                    ) : plainSnippet ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-1.5 leading-relaxed">
                        {highlightMatch(plainSnippet, query)}
                      </p>
                    ) : null}

                    {userHashtags.length > 0 && (
                      <div className="flex items-center gap-1 overflow-hidden">
                        {userHashtags.map((tag) => (
                          <Badge key={tag} variant="subtle" size="xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> Open Note
            </span>
          </div>
          <span>{filteredNotes.length} notes found</span>
        </div>
      </div>
    </Dialog>
  );
};

export const SearchModal = React.memo(SearchModalComponent);
