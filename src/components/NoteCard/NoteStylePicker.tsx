import React, { useRef, useEffect } from 'react';
import { Note, HandFont, PaperTheme } from '../../types';
import { FONT_NAMES, PAPER_THEMES, PaperThemeConfig } from './types';
import {
  PaintBoardIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Icon, IconButton, Select, SegmentedControl } from '../ui';

interface NoteStylePickerProps {
  note: Note;
  themeConfig?: PaperThemeConfig;
  onUpdateNote: (updated: Note) => void;
  onClose: () => void;
}

const PAPER_THEME_OPTIONS: PaperTheme[] = [
  'white',
  'cream',
  'ruled',
  'dotted',
  'kraft',
  'dark',
  'ruled-dark',
  'transparent',
];
const PAPER_THEME_LABELS: Record<PaperTheme, string> = {
  white: 'White',
  cream: 'Cream',
  ruled: 'Ruled',
  dotted: 'Dotted',
  kraft: 'Kraft',
  dark: 'Dark',
  'ruled-dark': 'Ruled dark',
  graphite: 'Graphite',
  transparent: 'Transparent',
};

export const NoteStylePicker: React.FC<NoteStylePickerProps> = ({
  note,
  themeConfig,
  onUpdateNote,
  onClose,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const isDarkCard = themeConfig?.isDark ?? false;

  // Click outside and Escape handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute bottom-14 left-1/2 -translate-x-1/2 z-50 w-76 sm:w-84 rounded-sm shadow-sm border p-4 flex flex-col gap-3.5 text-sm animate-in fade-in zoom-in-95 duration-150 select-none ${
        isDarkCard
          ? 'bg-slate-900/98 border-slate-800 text-slate-100'
          : 'bg-white/98 border-slate-200 text-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
          <Icon icon={PaintBoardIcon} size="md" className="text-blue-500" />
          <span>Card Style & Typography</span>
        </div>
        <IconButton
          size="sm"
          variant="ghost"
          icon={Cancel01Icon}
          aria-label="Close style picker"
          onClick={onClose}
        />
      </div>

      {/* 1. Paper Theme Picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Paper Theme
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {PAPER_THEME_OPTIONS.map((themeKey) => {
            const theme = PAPER_THEMES[themeKey];
            const isSelected = note.paperTheme === themeKey;
            return (
              <button
                key={themeKey}
                type="button"
                onClick={() =>
                  onUpdateNote({
                    ...note,
                    paperTheme: themeKey,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className={`h-8 px-1 rounded-sm border transition-colors flex items-center justify-center font-medium text-[11px] cursor-pointer truncate ${
                  theme.bg
                } ${theme.text} ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
                title={PAPER_THEME_LABELS[themeKey]}
              >
                <span className="truncate">{PAPER_THEME_LABELS[themeKey]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Handwriting & Font Selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Handwriting & Font
        </span>
        <Select
          value={note.fontFamily || 'sans'}
          onChange={(e) =>
            onUpdateNote({
              ...note,
              fontFamily: e.target.value as HandFont,
              updatedAt: new Date().toISOString(),
            })
          }
          options={Object.entries(FONT_NAMES).map(([key, name]) => ({
            value: key,
            label: name,
          }))}
        />
      </div>

      {/* 3. Text Size Segmented Control */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Text Size
        </span>
        <SegmentedControl
          size="sm"
          value={note.fontSize || 'md'}
          onChange={(val) =>
            onUpdateNote({
              ...note,
              fontSize: val as any,
              updatedAt: new Date().toISOString(),
            })
          }
          options={[
            { value: 'sm', label: 'SM' },
            { value: 'md', label: 'MD' },
            { value: 'lg', label: 'LG' },
            { value: 'xl', label: 'XL' },
          ]}
        />
      </div>
    </div>
  );
};
