import React, { useState } from 'react';
import { Note } from '../types';
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
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onAddNote,
  onDeleteNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'modified' | 'title'>('created');

  if (!isOpen) return null;

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
    <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-800 dark:text-slate-200" />
          <h2 className="font-bold text-xs uppercase tracking-wider font-mono">ALL NOTES ({notes.length})</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search & Action Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or @mentions..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
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
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
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
            className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
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
                className="p-3.5 bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg cursor-pointer group transition-all space-y-1.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">
                      ID: {note.id.includes('-') ? note.id.split('-').pop()?.toUpperCase() : note.id.toUpperCase()}
                    </span>
                    <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {note.title || 'Untitled Note'}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title="Delete Note"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {note.content.replace(/#|\*|\[|\]|\(|\)/g, '') || 'Empty note...'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Created: {formatDate(note.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasMentions && (
                      <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">
                        <AtSign className="w-3 h-3" /> Refs
                      </span>
                    )}
                    <span className="capitalize font-mono text-[9px] bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
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
