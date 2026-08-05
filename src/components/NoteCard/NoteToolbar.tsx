import React, { useState, useRef, useEffect } from 'react';
import { ListChecks, Palette, MoreVertical, Trash2, Copy } from 'lucide-react';
import { NoteMode, PaperThemeConfig } from './types';
import { Note } from '../../types';

interface NoteToolbarProps {
  note: Note;
  activeMode: NoteMode;
  onSelectMode: (mode: NoteMode) => void;
  onToggleStylePicker: () => void;
  onDuplicateNote?: () => void;
  onDeleteNote: () => void;
  themeConfig?: PaperThemeConfig;
}

const TypeIcon = () => (
  <span className="font-sans font-bold text-sm sm:text-base leading-none select-none">T</span>
);

export const NoteToolbar: React.FC<NoteToolbarProps> = ({
  note,
  activeMode,
  onSelectMode,
  onToggleStylePicker,
  onDuplicateNote,
  onDeleteNote,
  themeConfig,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toolbarBg = themeConfig?.toolbarBg || 'bg-white';
  const divider = themeConfig?.divider || 'border-slate-100';
  const normalBtnClass = themeConfig?.toolbarBtn || 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80';
  const isDarkCard = themeConfig?.isDark ?? false;

  // Text mode active: blue icon, no border
  const textActiveBtnClass = 'text-[#2563eb] font-bold';
  // Checklist mode active: violet icon, no border
  const checklistActiveBtnClass = isDarkCard
    ? 'text-violet-400 font-bold'
    : 'text-violet-500 font-bold';

  const getTextBtnClass = (isActive: boolean) =>
    `flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
      isActive ? textActiveBtnClass : normalBtnClass
    }`;

  const getChecklistBtnClass = (isActive: boolean) =>
    `flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
      isActive ? checklistActiveBtnClass : normalBtnClass
    }`;

  return (
    <div className={`relative border-t ${divider} ${toolbarBg} backdrop-blur-xs px-3 py-2 flex items-center justify-between gap-1 select-none rounded-b-2xl`}>
      {/* 1. Text Mode Button */}
      <button
        type="button"
        onClick={() => onSelectMode('text')}
        className={getTextBtnClass(activeMode === 'text')}
        title="Text mode"
        aria-label="Text mode"
      >
        <TypeIcon />
      </button>

      {/* 2. Checklist Mode Button */}
      <button
        type="button"
        onClick={() => onSelectMode('checklist')}
        className={getChecklistBtnClass(activeMode === 'checklist')}
        title="Checklist mode"
        aria-label="Checklist mode"
      >
        <ListChecks className="w-4 h-4" />
      </button>

      {/* 3. Palette / Style Theme Button */}
      <button
        type="button"
        onClick={onToggleStylePicker}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${normalBtnClass}`}
        title="Theme & Font settings"
        aria-label="Theme and font settings"
      >
        <Palette className="w-4 h-4" />
      </button>

      {/* 4. More Options Button */}
      <div className="relative" ref={moreRef}>
        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${normalBtnClass}`}
          title="More options"
          aria-label="More note options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* More Options Popover */}
        {showMoreMenu && (
          <div className={`absolute bottom-10 right-0 z-50 w-44 rounded-2xl shadow-xl border py-1.5 flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150 ${
            isDarkCard ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {onDuplicateNote && (
              <button
                type="button"
                onClick={() => {
                  onDuplicateNote();
                  setShowMoreMenu(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 transition-colors text-left ${
                  isDarkCard ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Duplicate Note
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onDeleteNote();
                setShowMoreMenu(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 text-rose-600 transition-colors text-left ${
                isDarkCard ? 'hover:bg-rose-950/40 text-rose-400' : 'hover:bg-rose-50'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              Delete Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
