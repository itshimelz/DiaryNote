import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Note, CanvasTheme } from '../types';
import { formatDate } from '../utils';
import {
  Search01Icon,
  Cancel01Icon,
  File01Icon,
  Add01Icon,
  Delete02Icon,
  AtIcon,
  Layers01Icon,
  SecurityLockIcon,
} from '@hugeicons/core-free-icons';
import { Icon, Button, Badge, Input, IconButton, Select } from './ui';
import { isNoteAuthorized } from '../services/authPolicyService';

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
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
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
      const isAuthorized = isNoteAuthorized(n);
      const searchableContent = isAuthorized ? (n.content || '').toLowerCase() : '';
      return (n.title || '').toLowerCase().includes(q) || searchableContent.includes(q);
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
      return (a.title || '').localeCompare(b.title || '');
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
      className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 border-l shadow-sm backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-200 select-none font-sans ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
          : 'bg-white/95 border-slate-200 text-slate-900'
      }`}
    >
      {/* Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between transition-colors ${
          isDark
            ? 'border-slate-800 bg-slate-950/40 text-slate-100'
            : 'border-slate-200 bg-slate-50/80 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon
            icon={File01Icon}
            size="md"
            className={isDark ? 'text-slate-300' : 'text-slate-700'}
          />
          <h2 className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            All notes ({notes.length})
          </h2>
        </div>
        <IconButton
          icon={Cancel01Icon}
          size="sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      </div>

      {/* Search and Sort Toolbar */}
      <div
        className={`p-3 border-b space-y-2.5 ${
          isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/50'
        }`}
      >
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          aria-label="Search notes in sidebar"
          prefixIcon={Search01Icon}
          clearable
          onClear={() => setSearchQuery('')}
        />

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created' | 'modified' | 'title')}
              aria-label="Sort notes by"
              options={[
                { value: 'created', label: 'Newest Created' },
                { value: 'modified', label: 'Recently Updated' },
                { value: 'title', label: 'Title A-Z' },
              ]}
              className="py-0"
            />
          </div>

          <Button
            size="xs"
            variant="primary"
            icon={Add01Icon}
            onClick={() => {
              onAddNote();
              onClose();
            }}
          >
            Add Note
          </Button>
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
          <div
            className={`text-center py-12 text-xs space-y-1 font-mono ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <p>No notes found matching “{searchQuery}”</p>
          </div>
        ) : (
          <div
            style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }}
            className="space-y-1.5"
          >
            {visibleNotes.map((note) => {
              const isAuthorized = isNoteAuthorized(note);
              const isLockedAndUnauthorized = Boolean(note.isLocked && !isAuthorized);
              const hasMentions = isAuthorized && (note.content || '').includes('@');
              const plainSnippet = isLockedAndUnauthorized
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
                  role="button"
                  tabIndex={0}
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectNote(note.id);
                      onClose();
                    }
                  }}
                  aria-label={`Open note ${note.title || 'Untitled Note'}`}
                  className={`w-full text-left p-3 rounded-sm cursor-pointer transition-colors border group flex flex-col gap-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500 ${
                    isDark
                      ? 'border-slate-800/70 bg-slate-900/50 hover:bg-slate-800/80 text-slate-200 hover:border-slate-700'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* Top Row: Icon + Full Title + Delete Button */}
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`p-1.5 rounded-sm shrink-0 mt-0.5 ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon icon={File01Icon} size="xs" />
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                        <h4
                          className={`font-semibold text-xs leading-snug break-words ${
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          }`}
                        >
                          {note.title || 'Untitled Note'}
                        </h4>
                        {note.isLocked && (
                          <Badge variant="warning" size="xs" icon={SecurityLockIcon}>
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>

                    <IconButton
                      size="xs"
                      variant="danger"
                      icon={Delete02Icon}
                      aria-label={`Delete note ${note.title || 'Untitled Note'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="opacity-40 group-hover:opacity-100 group-focus-within:opacity-100 shrink-0 -mr-1 -mt-0.5"
                    />
                  </div>

                  {/* Snippet Preview */}
                  <p
                    className={`text-[11px] line-clamp-2 pl-8 text-left ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {isLockedAndUnauthorized ? (
                      <span className="italic opacity-80">Passcode protected · Content hidden</span>
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
                        <Badge variant="subtle" size="xs" icon={Layers01Icon}>
                          <span className="truncate max-w-[110px]">
                            {note.groupName || 'Group'}
                          </span>
                        </Badge>
                      )}
                      {hasMentions && (
                        <Badge variant="subtle" size="xs" icon={AtIcon}>
                          Refs
                        </Badge>
                      )}
                    </div>

                    <span
                      className={`font-mono text-[10px] shrink-0 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export const NotesSidebar = React.memo(NotesSidebarComponent);
