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
  position: { top: number; left: number; lineHeight?: number };
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
    top: position.top + (position.lineHeight ?? 24) + 4,
    left: position.left,
  });

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

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const parent = el.parentElement;
    const menuHeight = el.offsetHeight || 180;
    const menuWidth = el.offsetWidth || 256;

    const cursorTop = position.top;
    const cursorLeft = position.left;
    const lineHeight = position.lineHeight ?? 24;

    if (!parent) {
      setAdjustedPos({ top: cursorTop + lineHeight + 4, left: cursorLeft });
      return;
    }

    const parentHeight = parent.clientHeight || parent.offsetHeight || 300;
    const parentWidth = parent.clientWidth || parent.offsetWidth || 360;

    // 1. Vertical Positioning:
    // Check available space below vs above the cursor line
    const spaceBelow = parentHeight - (cursorTop + lineHeight + 4);
    const spaceAbove = cursorTop - 4;

    let targetTop: number;

    if (spaceBelow >= menuHeight) {
      // Fits cleanly below cursor line
      targetTop = cursorTop + lineHeight + 4;
    } else if (spaceAbove >= menuHeight) {
      // Not enough room below, but fits cleanly above cursor line
      targetTop = cursorTop - menuHeight - 4;
    } else if (spaceAbove > spaceBelow) {
      // Constrained space: more room above, clamp to top boundary
      targetTop = Math.max(6, cursorTop - menuHeight - 4);
    } else {
      // Constrained space: more room below, clamp to bottom boundary
      targetTop = Math.min(cursorTop + lineHeight + 4, Math.max(6, parentHeight - menuHeight - 6));
    }

    // 2. Horizontal Positioning & Note Edge Clamping:
    // Align with cursor left, but ensure the menu fits within [8, parentWidth - menuWidth - 8]
    let targetLeft = cursorLeft;
    if (targetLeft + menuWidth > parentWidth - 8) {
      targetLeft = Math.max(8, parentWidth - menuWidth - 8);
    } else {
      targetLeft = Math.max(8, targetLeft);
    }

    setAdjustedPos({
      top: Math.round(targetTop),
      left: Math.round(targetLeft),
    });
  }, [position.top, position.left, position.lineHeight, filteredNotes.length]);

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
