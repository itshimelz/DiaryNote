/**
 * DiaryNote UI Design System Tokens
 * Strict, monochromatic, desktop-native styling tokens.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Standard Border Radiuses (Strictly 2px, 4px, or full)
 */
export const RADIUS = {
  xs: 'rounded-xs', // 2px - Kbd, inline badges
  sm: 'rounded-sm', // 4px - Universal standard for buttons, cards, dialogs, inputs, menus
  full: 'rounded-full', // Circular dots, badges
} as const;

/**
 * Standard Surface & Panel Color Tokens
 */
export const SURFACES = {
  dark: {
    canvas: 'bg-slate-950',
    panel: 'bg-slate-900',
    subSurface: 'bg-slate-800/80',
    subSurfaceHover: 'hover:bg-slate-800',
    border: 'border-slate-800',
    borderSubtle: 'border-slate-800/80',
    borderHover: 'hover:border-slate-700',
    text: 'text-slate-100',
    textMuted: 'text-slate-400',
    textDim: 'text-slate-500',
  },
  light: {
    canvas: 'bg-slate-100',
    panel: 'bg-white',
    subSurface: 'bg-slate-50',
    subSurfaceHover: 'hover:bg-slate-100',
    border: 'border-slate-200',
    borderSubtle: 'border-slate-200/80',
    borderHover: 'hover:border-slate-300',
    text: 'text-slate-900',
    textMuted: 'text-slate-600',
    textDim: 'text-slate-400',
  },
} as const;

/**
 * Focus Ring Tokens
 */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500';

/**
 * Transition Tokens
 */
export const TRANSITIONS = {
  fast: 'transition-colors duration-150',
  all: 'transition-all duration-150',
} as const;
