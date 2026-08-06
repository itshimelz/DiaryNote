import React, { useState, useEffect } from 'react';
import { Note, CanvasTheme } from '../types';
import { formatDate } from '../lib/markdownMention';
import {
  Search,
  X,
  FileText,
  Calendar,
  Plus,
  Trash2,
  AtSign,
  Layers,
} from 'lucide-react';
import { SmartMarkdownText } from './NoteCard/SmartMarkdownText';

interface NotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
  themeMode?: CanvasTheme;
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  themeMode = 'dark',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'modified' | 'title'>('created');

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

  if (!isOpen) return null;

  const isDark = themeMode === 'dark';

  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  filteredNotes.sort((a, b) => {
    if (sortBy === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'modified') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 border-l shadow-sm backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-200 select-none font-sans ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
          : 'bg-white/95 border-slate-200/90 text-slate-900'
      }`}
    >
      {/* Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between transition-colors ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/70'
        }`}
      >
        <div className="flex items-center gap-2">
          <FileText className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono">ALL NOTES ({notes.length})</h2>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-sm transition-colors ${
            isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Action Controls Bar */}
      <div
        className={`p-3 border-b space-y-2.5 ${
          isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200/60 bg-slate-50/40'
        }`}
      >
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or @mentions..."
            className={`w-full border rounded-sm pl-8 pr-7 py-1.5 text-xs transition-colors outline-none font-sans ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs p-0.5 rounded-sm ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`border rounded-sm px-2 py-1 text-[11px] focus:outline-none transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
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
            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-semibold transition-all active:scale-98 cursor-pointer ${
              isDark
                ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'
                : 'bg-slate-200 text-slate-900 border border-slate-300 hover:bg-slate-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>
      </div>

      {/* Note Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs space-y-1 font-mono">
            <p>No notes found matching "{searchQuery}"</p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const hasMentions = note.content.includes('@');
            return (
              <div
                key={note.id}
                onClick={() => {
                  onSelectNote(note.id);
                  onClose();
                }}
                className={`p-3 border rounded-md cursor-pointer group transition-all space-y-1.5 ${
                  isDark
                    ? 'bg-slate-800/60 hover:bg-slate-800/90 border-slate-700/60 hover:border-slate-600 text-slate-200'
                    : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold shrink-0">
                      ID: {note.id.includes('-') ? note.id.split('-').pop()?.toUpperCase() : note.id.toUpperCase()}
                    </span>
                    <h3
                      className={`font-semibold text-xs transition-colors line-clamp-1 ${
                        isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-900'
                      }`}
                    >
                      {note.isLocked ? 'Locked Note' : note.title || 'Untitled Note'}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title="Delete Note"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-sm transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content preview with markdown and link rendering */}
                <div
                  className={`text-[11px] line-clamp-2 leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {note.isLocked ? (
                    <span>Passcode required to view contents...</span>
                  ) : note.content ? (
                    <SmartMarkdownText
                      content={note.content}
                      allNotes={notes}
                      inline={true}
                      className="line-clamp-2 text-[11px]"
                      onNavigateToNote={(targetId) => {
                        onSelectNote(targetId);
                        onClose();
                      }}
                    />
                  ) : (
                    <span>Empty note...</span>
                  )}
                </div>

                <div
                  className={`flex items-center justify-between text-[10px] font-mono pt-1.5 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(note.createdAt)}</span>
                    </span>

                    {/* Group Badge */}
                    {note.groupId && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-sans font-medium border ${
                          isDark
                            ? 'bg-slate-800/90 border-slate-700 text-slate-300'
                            : 'bg-slate-100/90 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{note.groupName || 'Group'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasMentions && (
                      <span
                        className={`flex items-center gap-0.5 font-medium ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <AtSign className="w-3 h-3" /> Refs
                      </span>
                    )}
                    <span
                      className={`capitalize font-mono text-[9px] px-1 py-0.5 rounded-sm ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {note.fontFamily}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
