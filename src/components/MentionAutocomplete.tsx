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
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  notes,
  currentNoteId,
  selectedIndex,
  onSelect,
  onClose,
  position,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
      className="absolute z-50 w-68 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden py-1 text-xs text-neutral-200 backdrop-blur-md"
    >
      <div className="px-3 py-1.5 border-b border-neutral-800 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
        <div className="flex items-center gap-1">
          <AtSign className="w-3 h-3 text-blue-400" /> Refer to note
        </div>
        <span className="text-[9px] font-mono text-neutral-500">↑↓ to navigate, ↵ select</span>
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
              className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 group transition-colors ${
                isSelected
                  ? 'bg-blue-600/30 text-white font-semibold border-l-2 border-blue-400'
                  : 'hover:bg-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileText
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isSelected ? 'text-blue-400' : 'text-neutral-400 group-hover:text-blue-400'
                  }`}
                />
                <span className="truncate">{note.title || 'Untitled Note'}</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">@{note.fontFamily}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

