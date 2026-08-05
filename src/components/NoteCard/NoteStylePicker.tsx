import React from 'react';
import { Note, HandFont, PaperTheme } from '../../types';
import { FONT_NAMES, PAPER_THEMES } from './types';
import { Type, Palette, X } from 'lucide-react';

interface NoteStylePickerProps {
  note: Note;
  onUpdateNote: (updated: Note) => void;
  onClose: () => void;
}

export const NoteStylePicker: React.FC<NoteStylePickerProps> = ({
  note,
  onUpdateNote,
  onClose,
}) => {
  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 flex flex-col gap-3 text-xs animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <Palette className="w-4 h-4 text-blue-500" />
          <span>Card Style & Typography</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Paper Theme Picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Paper Theme</span>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(PAPER_THEMES) as PaperTheme[]).map((themeKey) => {
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
                className={`h-8 rounded-xl border transition-all flex items-center justify-center font-medium capitalize text-[10px] ${
                  theme.bg
                } ${theme.text} ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-500 font-bold' : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                {themeKey.replace('-', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Family Picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Handwriting & Font</span>
        <select
          value={note.fontFamily || 'sans'}
          onChange={(e) =>
            onUpdateNote({
              ...note,
              fontFamily: e.target.value as HandFont,
              updatedAt: new Date().toISOString(),
            })
          }
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
        >
          {Object.entries(FONT_NAMES).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size Picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Text Size</span>
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() =>
                onUpdateNote({
                  ...note,
                  fontSize: size,
                  updatedAt: new Date().toISOString(),
                })
              }
              className={`py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                note.fontSize === size
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
