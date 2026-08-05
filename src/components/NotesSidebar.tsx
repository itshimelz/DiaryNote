import React, { useState } from 'react';
import { Note, CanvasTheme } from '../types';
import { formatDate } from '../lib/markdownMention';
import {
  Search,
  X,
  FileText,
  Calendar,
  Clock,
  Plus,
  Trash2,
  ArrowUpRight,
  Tag,
  AtSign,
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
    <div className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 border-l shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none ${
      isDark
        ? 'bg-slate-900/95 border-slate-800 text-slate-100'
        : 'bg-white/95 border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <FileText className={`w-5 h-5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`} />
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono">ALL NOTES ({notes.length})</h2>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search & Action Bar */}
      <div className={`p-4 border-b space-y-3 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or @mentions..."
            className={`w-full border rounded-lg pl-9 pr-3 py-2 text-xs transition-colors outline-none ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/80 text-slate-100 placeholder-slate-400 focus:border-slate-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-500">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm ${
              isDark
                ? 'bg-white text-slate-900 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>
      </div>

      {/* Note Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs space-y-2 font-mono">
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
                className={`p-3.5 border rounded-xl cursor-pointer group transition-all space-y-1.5 shadow-sm ${
                  isDark
                    ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
                    : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">
                      ID: {note.id.includes('-') ? note.id.split('-').pop()?.toUpperCase() : note.id.toUpperCase()}
                    </span>
                    <h3 className={`font-semibold text-xs transition-colors line-clamp-1 ${
                      isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-900'
                    }`}>
                      {note.isLocked ? 'Locked Note' : note.title || 'Untitled Note'}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title="Delete Note"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {note.isLocked
                    ? 'Passcode required to view contents...'
                    : note.content.replace(/#|\*|\[|\]|\(|\)/g, '') || 'Empty note...'}
                </p>

                <div className={`flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t ${
                  isDark ? 'border-slate-800' : 'border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Created: {formatDate(note.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasMentions && (
                      <span className={`flex items-center gap-0.5 font-medium ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        <AtSign className="w-3 h-3" /> Refs
                      </span>
                    )}
                    <span className={`capitalize font-mono text-[9px] px-1.5 py-0.5 rounded ${
                      isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}>
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
