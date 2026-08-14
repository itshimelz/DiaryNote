import React, { useEffect, useRef, useMemo } from 'react';
import { Note, PaperTheme } from '../types';
import { File01Icon, AtIcon } from '@hugeicons/core-free-icons';
import { Icon } from './ui';
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
  const [adjustedPos, setAdjustedPos] = React.useState<{ top: number; left: number }>({
    top: position.top,
    left: position.left,
  });

  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const parent = el.parentElement;
    const menuHeight = el.offsetHeight || 180;
    const menuWidth = el.offsetWidth || 256;

    let newTop = position.top;
    let newLeft = position.left;

    if (parent) {
      const parentHeight = parent.clientHeight || 300;
      const parentWidth = parent.clientWidth || 360;

      if (position.top + menuHeight > parentHeight - 10) {
        newTop = Math.max(8, position.top - menuHeight - 24);
      }

      newLeft = Math.min(Math.max(8, position.left), Math.max(8, parentWidth - menuWidth - 8));
    }

    setAdjustedPos({ top: newTop, left: newLeft });
  }, [position.top, position.left]);

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

  const isDark = themeConfig.isDark;

  return (
    <div
      ref={containerRef}
      style={{ top: `${adjustedPos.top}px`, left: `${adjustedPos.left}px` }}
      className={`absolute z-50 w-64 max-w-[calc(100%-1rem)] border rounded-sm shadow-sm overflow-hidden py-1 text-xs select-none font-sans transition-colors ${themeConfig.headerBg} ${themeConfig.border} ${themeConfig.text}`}
    >
      <div
        className={`px-2.5 py-1 border-b text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between ${themeConfig.divider} ${themeConfig.subtext}`}
      >
        <div className="flex items-center gap-1 font-mono">
          <Icon icon={AtIcon} size="xs" className="opacity-80" />
          <span>Link to Note</span>
        </div>
        <span className="text-[9px] font-mono opacity-70">↑↓ navigate ↵ select</span>
      </div>

      <div className="max-h-48 overflow-y-auto px-1 py-1 space-y-0.5 scrollbar-thin">
        {filteredNotes.map((note, idx) => {
          const isSelected = idx === selectedIndex;

          const rowClass = isSelected
            ? isDark
              ? 'bg-slate-800 text-white font-medium'
              : 'bg-slate-100 text-slate-900 font-medium'
            : isDark
            ? 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900';

          const iconClass = isSelected
            ? isDark
              ? 'text-slate-200'
              : 'text-slate-900'
            : themeConfig.subtext;

          return (
            <button
              type="button"
              key={note.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              onClick={() => onSelect(note)}
              className={`w-full text-left px-2 py-1.5 rounded-sm flex items-center gap-2 transition-colors cursor-pointer ${rowClass}`}
            >
              <Icon icon={File01Icon} size="xs" className={`shrink-0 ${iconClass}`} />
              <span className="truncate font-sans font-medium">
                {note.title || 'Untitled Note'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
