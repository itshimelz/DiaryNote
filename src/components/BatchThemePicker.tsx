import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PaperTheme } from '../types';
import { PAPER_THEMES, PAPER_THEME_OPTIONS, PAPER_THEME_LABELS } from '../constants/paperThemes';

export interface BatchThemePickerProps {
  isOpen: boolean;
  isDark: boolean;
  onSelectTheme: (theme: PaperTheme) => void;
}

export const BatchThemePicker: React.FC<BatchThemePickerProps> = ({
  isOpen,
  isDark,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const popoverBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`absolute bottom-full mb-2 left-0 z-50 w-60 rounded-md border shadow-sm p-2.5 flex flex-col gap-2 ${popoverBg}`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Change Paper Theme
        </span>
        <div className="grid grid-cols-3 gap-1">
          {PAPER_THEME_OPTIONS.map((themeKey) => {
            const cfg = PAPER_THEMES[themeKey];
            return (
              <button
                key={themeKey}
                type="button"
                onClick={() => onSelectTheme(themeKey)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition-colors text-[10px] ${cfg.bg} ${cfg.border} ${cfg.text} ${
                  isDark
                    ? 'hover:bg-slate-800 hover:border-slate-700'
                    : 'hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="truncate w-full text-center font-medium">
                  {PAPER_THEME_LABELS[themeKey]}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
