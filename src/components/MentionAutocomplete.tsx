import React, { useEffect, useRef, useMemo } from 'react';
import { Note, PaperTheme } from '../types';
import { FileText, AtSign } from 'lucide-react';
import { PAPER_THEMES } from './NoteCard/types';

interface MentionAutocompleteProps {
  query: string;
  notes: Note[];
  currentNoteId: string;
  selectedIndex: number;
  onSelect: (note: Note) => void;
  onClose: () => void;
  position: { top: number; left: number };
  paperTheme?: string;
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
  paperTheme = 'white',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];

  // Fast memoized search optimized for large databases (1000s of notes)
  const filteredNotes = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    const startsWith: Note[] = [];
    const contains: Note[] = [];

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.id === currentNoteId) continue;
      const title = (n.title || 'Untitled Note').toLowerCase();
      if (!q || title.startsWith(q)) {
        startsWith.push(n);
      } else if (title.includes(q)) {
        contains.push(n);
      }
      if (startsWith.length + contains.length >= 40) break;
    }

    return [...startsWith, ...contains].slice(0, 25);
  }, [notes, currentNoteId, query]);

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
      className={`absolute z-50 w-64 max-w-[calc(100%-2rem)] border rounded-md shadow-sm overflow-hidden py-1 text-xs backdrop-blur-md transition-all select-none ${themeConfig.headerBg} ${themeConfig.border} ${themeConfig.text}`}
    >
      <div
        className={`px-2.5 py-1.5 border-b text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between ${themeConfig.divider} ${themeConfig.subtext}`}
      >
        <div className="flex items-center gap-1 font-mono">
          <AtSign className="w-3 h-3 opacity-80" /> Refer note
        </div>
        <span className="text-[9px] font-mono opacity-70">↑↓ navigate, ↵ select</span>
      </div>

      <div className="max-h-44 overflow-y-auto">
        {filteredNotes.map((note, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={note.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              onClick={() => onSelect(note)}
              className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 transition-colors ${
                isSelected ? `${themeConfig.hoverBg} font-medium` : `hover:${themeConfig.hoverBg}`
              }`}
            >
              <FileText className={`w-3.5 h-3.5 shrink-0 ${themeConfig.subtext}`} />
              <span className="truncate font-sans">{note.title || 'Untitled Note'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

