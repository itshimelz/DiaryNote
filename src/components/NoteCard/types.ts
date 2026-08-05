import { Note, HandFont, PaperTheme } from '../../types';

export interface NoteCardProps {
  note: Note;
  allNotes: Note[];
  zoom: number;
  isSelected: boolean;
  selectedNoteIds?: string[];
  isFocused: boolean;
  onSelectNote: (noteId: string | null, isMultiSelect?: boolean) => void;
  onNavigateToNote: (targetNoteId: string) => void;
  onUpdateNote: (updatedNote: Note) => void;
  onUpdateBatchNotes?: (updatedNotes: Note[]) => void;
  onDeleteNote: (noteId: string) => void;
  onBringToFront: (noteId: string) => void;
  snapToGrid?: boolean;
  isPanMode?: boolean;
  shouldStartEditing?: boolean;
}

export type NoteMode = 'text' | 'image' | 'checklist';

export const FONT_CLASSES: Record<HandFont, string> = {
  sans: 'font-sans',
  caveat: 'font-hand-caveat',
  kalam: 'font-hand-kalam',
  patrick: 'font-hand-patrick',
  architect: 'font-hand-architect',
  mono: 'font-mono-code',
  hind: 'font-hand-hind',
  anek: 'font-hand-anek',
  'noto-bengali': 'font-hand-noto-bengali',
};

export const FONT_NAMES: Record<HandFont, string> = {
  sans: 'Google Sans Flex (Default)',
  caveat: 'Caveat (Cursive)',
  kalam: 'Kalam (Handwriting)',
  patrick: 'Patrick Hand',
  architect: 'Architects Daughter',
  mono: 'Monospace',
  hind: 'Hind Siliguri (বাংলা)',
  anek: 'Anek Bangla (বাংলা)',
  'noto-bengali': 'Noto Serif (বাংলা)',
};

export interface PaperThemeConfig {
  bg: string;
  text: string;
  subtext: string;
  border: string;
  headerBg: string;
  toolbarBg: string;
  divider: string;
  toolbarBtn: string;
  isDark: boolean;
}

export const PAPER_THEMES: Record<PaperTheme, PaperThemeConfig> = {
  white: {
    bg: 'bg-white',
    text: 'text-slate-900',
    subtext: 'text-slate-400',
    border: 'border-slate-200/90',
    headerBg: 'bg-white',
    toolbarBg: 'bg-white',
    divider: 'border-slate-100',
    toolbarBtn: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100',
    isDark: false,
  },
  cream: {
    bg: 'bg-[#faf8f5]',
    text: 'text-slate-800',
    subtext: 'text-slate-400',
    border: 'border-amber-200/60',
    headerBg: 'bg-[#faf8f5]',
    toolbarBg: 'bg-[#faf8f5]',
    divider: 'border-amber-200/40',
    toolbarBtn: 'text-slate-700 hover:text-slate-900 hover:bg-amber-100/60',
    isDark: false,
  },
  ruled: {
    bg: 'bg-note-ruled',
    text: 'text-slate-900',
    subtext: 'text-slate-400',
    border: 'border-slate-300/80',
    headerBg: 'bg-[#fffdf9]',
    toolbarBg: 'bg-[#fffdf9]',
    divider: 'border-slate-200/80',
    toolbarBtn: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100',
    isDark: false,
  },
  dotted: {
    bg: 'bg-note-dotted',
    text: 'text-slate-900',
    subtext: 'text-slate-400',
    border: 'border-slate-300/80',
    headerBg: 'bg-[#fffdf9]',
    toolbarBg: 'bg-[#fffdf9]',
    divider: 'border-slate-200/80',
    toolbarBtn: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100',
    isDark: false,
  },
  'ruled-dark': {
    bg: 'bg-note-ruled-dark',
    text: 'text-slate-100',
    subtext: 'text-slate-400',
    border: 'border-slate-800',
    headerBg: 'bg-slate-900',
    toolbarBg: 'bg-slate-900',
    divider: 'border-slate-800',
    toolbarBtn: 'text-slate-300 hover:text-white hover:bg-slate-800',
    isDark: true,
  },
  kraft: {
    bg: 'bg-[#f6ebd9]',
    text: 'text-[#3d2b1f]',
    subtext: 'text-[#8c7462]',
    border: 'border-[#e4d4ba]',
    headerBg: 'bg-[#ebdcb3]',
    toolbarBg: 'bg-[#ebdcb3]',
    divider: 'border-[#dcc8a3]',
    toolbarBtn: 'text-[#523d2e] hover:text-[#21150c] hover:bg-[#dfceaa]',
    isDark: false,
  },
  dark: {
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    subtext: 'text-slate-400',
    border: 'border-slate-800',
    headerBg: 'bg-slate-900',
    toolbarBg: 'bg-slate-900',
    divider: 'border-slate-800',
    toolbarBtn: 'text-slate-300 hover:text-white hover:bg-slate-800',
    isDark: true,
  },
  graphite: {
    bg: 'bg-slate-950',
    text: 'text-slate-200',
    subtext: 'text-slate-500',
    border: 'border-slate-800',
    headerBg: 'bg-slate-950',
    toolbarBg: 'bg-slate-950',
    divider: 'border-slate-800',
    toolbarBtn: 'text-slate-400 hover:text-slate-100 hover:bg-slate-900',
    isDark: true,
  },
  transparent: {
    bg: 'bg-white/95 backdrop-blur-md',
    text: 'text-slate-900',
    subtext: 'text-slate-400',
    border: 'border-slate-200/80',
    headerBg: 'bg-white/95',
    toolbarBg: 'bg-white/95',
    divider: 'border-slate-100',
    toolbarBtn: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80',
    isDark: false,
  },
};
