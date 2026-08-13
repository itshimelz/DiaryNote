import React from 'react';
import { Note, HandFont, PaperTheme } from '../../types';
import { FONT_NAMES, PAPER_THEMES } from './types';
import { Palette, X } from 'lucide-react';

interface NoteStylePickerProps {
  note: Note;
  onUpdateNote: (updated: Note) => void;
  onClose: () => void;
}

// Graphite remains supported for existing notes, but is intentionally omitted here because Dark provides the same use case.
const PAPER_THEME_OPTIONS: PaperTheme[] = ['white', 'cream', 'ruled', 'dotted', 'kraft', 'dark', 'ruled-dark', 'transparent'];
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
  onUpdateNote,
  onClose,
}) => {
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const [positionStyle, setPositionStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    if (!pickerRef.current) return;
    const rect = pickerRef.current.getBoundingClientRect();
    const styles: React.CSSProperties = {};

    // Vertical clamping: if popover top overflows off-screen (<12px), flip to render below card toolbar
    if (rect.top < 12) {
      styles.top = '100%';
      styles.bottom = 'auto';
      styles.marginTop = '8px';
    }

    // Horizontal clamping: keep popover bounded within screen edges
    if (rect.left < 12) {
      const overflowLeft = 12 - rect.left;
      styles.transform = `translateX(calc(-50% + ${overflowLeft}px))`;
    } else if (rect.right > window.innerWidth - 12) {
      const overflowRight = rect.right - (window.innerWidth - 12);
      styles.transform = `translateX(calc(-50% - ${overflowRight}px))`;
    }

    setPositionStyle(styles);
  }, []);

  return (
    <div
      ref={pickerRef}
      style={positionStyle}
      className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 w-84 sm:w-92 bg-white rounded-xl shadow-sm border border-slate-200 p-4.5 flex flex-col gap-4 text-sm animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100vh-32px)] overflow-y-auto"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 font-bold text-base text-slate-800">
          <Palette className="w-5.5 h-5.5 text-blue-500" />
          <span>Card Style & Typography</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Paper Theme Picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paper Theme</span>
        <div className="grid grid-cols-3 gap-1.5">
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
                  })
                }
                className={`h-10 min-w-0 px-2 rounded-sm border transition-colors flex items-center justify-center whitespace-nowrap font-semibold text-xs ${
                  theme.bg
                } ${theme.text} ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-500 font-bold' : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                {PAPER_THEME_LABELS[themeKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Family Picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Handwriting & Font</span>
        <select
          value={note.fontFamily || 'sans'}
          onChange={(e) =>
            onUpdateNote({
              ...note,
              fontFamily: e.target.value as HandFont,
            })
          }
          className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer font-medium"
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
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Text Size</span>
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-sm">
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() =>
                onUpdateNote({
                  ...note,
                  fontSize: size,
                })
              }
              className={`py-1.5 rounded-sm text-xs sm:text-sm font-bold uppercase transition-colors ${
                note.fontSize === size
                  ? 'bg-white text-slate-900 shadow-2xs'
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


