import React, { useRef, useEffect } from 'react';
import { Note, HandFont, PaperTheme, FrameStyle, PinStyle } from '../../types';
import { FONT_NAMES, PAPER_THEMES, PaperThemeConfig } from './types';
import {
  PaintBoardIcon,
  Cancel01Icon,
  SparklesIcon,
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

const PIN_STYLE_OPTIONS: { value: PinStyle; label: string; preview: string }[] = [
  { value: 'none', label: 'None', preview: '∅' },
  { value: 'pushpin-red', label: 'Red Pin', preview: '🔴' },
  { value: 'pushpin-blue', label: 'Blue Pin', preview: '🔵' },
  { value: 'pushpin-yellow', label: 'Yellow Pin', preview: '🟡' },
  { value: 'pushpin-green', label: 'Green Pin', preview: '🟢' },
  { value: 'tape-teal', label: 'Teal Tape', preview: '🩵' },
  { value: 'tape-pink', label: 'Pink Tape', preview: '🩷' },
  { value: 'tape-beige', label: 'Beige Tape', preview: '🏷️' },
];

export const NoteStylePicker: React.FC<NoteStylePickerProps> = ({
  note,
  onUpdateNote,
  onClose,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

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

  const isImageCard = Boolean(note.imageUrl);

  return (
    <div
      ref={pickerRef}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 w-80 sm:w-92 max-h-[80vh] overflow-y-auto rounded-sm shadow-xl border p-4 flex flex-col gap-3.5 text-sm animate-in fade-in zoom-in-95 duration-150 select-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-150 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
          <Icon icon={PaintBoardIcon} size="md" className="text-blue-500" />
          <span>Card Style & Framing</span>
        </div>
        <IconButton
          size="sm"
          variant="ghost"
          icon={Cancel01Icon}
          aria-label="Close style picker"
          onClick={onClose}
        />
      </div>

      {/* 1. Frame Style (For Image or Photo Cards) */}
      {isImageCard && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Photo Frame Style
          </span>
          <SegmentedControl
            size="sm"
            value={note.frameStyle || 'polaroid'}
            onChange={(val) =>
              onUpdateNote({
                ...note,
                frameStyle: val as FrameStyle,
                updatedAt: new Date().toISOString(),
              })
            }
            options={[
              { value: 'polaroid', label: 'Polaroid' },
              { value: 'photo', label: 'Photo Print' },
              { value: 'frameless', label: 'Frameless' },
            ]}
          />
        </div>
      )}

      {/* 2. Pin & Washi Tape Decoration */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Pin & Tape Decoration
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {PIN_STYLE_OPTIONS.map((pin) => {
            const isSelected = (note.pinStyle || 'none') === pin.value;
            return (
              <button
                key={pin.value}
                type="button"
                onClick={() =>
                  onUpdateNote({
                    ...note,
                    pinStyle: pin.value,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className={`h-8 px-1.5 rounded-sm border transition-all flex items-center justify-center gap-1 font-medium text-[11px] cursor-pointer truncate ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
                title={pin.label}
              >
                <span>{pin.preview}</span>
                <span className="truncate text-[10px]">{pin.label.replace(' Pin', '').replace(' Tape', '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tilt / Rotation */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Bulletin Tilt ({note.rotation || 0}°)
          </span>
          <button
            type="button"
            onClick={() => {
              const randomTilt = parseFloat(((Math.random() * 6 - 3)).toFixed(1));
              onUpdateNote({
                ...note,
                rotation: randomTilt,
                updatedAt: new Date().toISOString(),
              });
            }}
            className="text-[11px] text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Icon icon={SparklesIcon} size="xs" />
            <span>Randomize</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          {[-3, -1.5, 0, 1.5, 3].map((angle) => (
            <button
              key={angle}
              type="button"
              onClick={() =>
                onUpdateNote({
                  ...note,
                  rotation: angle,
                  updatedAt: new Date().toISOString(),
                })
              }
              className={`flex-1 py-1 rounded-sm border text-[11px] font-medium transition-all cursor-pointer ${
                (note.rotation || 0) === angle
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-600 dark:text-blue-300 font-bold'
                  : 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
              }`}
            >
              {angle === 0 ? 'Flat' : `${angle > 0 ? '+' : ''}${angle}°`}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Paper Theme Picker (If not Polaroid/Frameless) */}
      {(!isImageCard || note.frameStyle === 'standard') && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                  className={`h-8 px-1 rounded-sm border transition-all flex items-center justify-center font-medium text-[11px] cursor-pointer truncate shadow-2xs ${
                    theme.bg
                  } ${theme.text} ${
                    isSelected
                      ? 'ring-2 ring-blue-500 border-blue-500 font-bold'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                  title={PAPER_THEME_LABELS[themeKey]}
                >
                  <span className="truncate">{PAPER_THEME_LABELS[themeKey]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Handwriting & Font Selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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

      {/* 6. Text Size Segmented Control (if text note) */}
      {!isImageCard && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
      )}
    </div>
  );
};
