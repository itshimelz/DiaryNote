import React, { useEffect, useRef } from 'react';
import { Note } from '../types';
import { FileText, AtSign } from 'lucide-react';

interface MentionAutocompleteProps {
  query: string;
  notes: Note[];
  currentNoteId: string;
  selectedIndex: number;
  onSelect: (note: Note) => void;
  onClose: () => void;
  position: { top: number; left: number };
  themeMode?: 'dark' | 'light' | 'gradient';
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  notes,
  currentNoteId,
  selectedIndex,
  onSelect,
  onClose,
  position,
  themeMode = 'dark',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isDark = themeMode === 'dark';

  const filteredNotes = notes.filter(
    (n) =>
      n.id !== currentNoteId &&
      n.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (filteredNotes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className={`absolute z-50 w-68 border rounded-xl shadow-2xl overflow-hidden py-1 text-xs backdrop-blur-md transition-all select-none ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
          : 'bg-white/95 border-slate-200 text-slate-900'
      }`}
    >
      <div className={`px-3 py-1.5 border-b text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        <div className="flex items-center gap-1 font-mono">
          <AtSign className={`w-3 h-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} /> Refer note
        </div>
        <span className="text-[9px] font-mono text-slate-400">↑↓ to navigate, ↵ select</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filteredNotes.map((note, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={note.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              onClick={() => onSelect(note)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                isSelected
                  ? isDark
                    ? 'bg-slate-800 text-white font-medium'
                    : 'bg-slate-100 text-slate-900 font-medium'
                  : isDark
                  ? 'hover:bg-slate-800/60 text-slate-300'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className="truncate font-sans">{note.title || 'Untitled Note'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

