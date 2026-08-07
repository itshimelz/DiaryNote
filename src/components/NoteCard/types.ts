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
  onRequestLockNote?: (noteId: string) => void;
  onRequestUnlockNote?: (noteId: string) => void;
  onExportNote?: (note: Note, format: 'md' | 'txt') => void;
  isCardDragging?: boolean;
  onDragStateChange?: (draggingIds: string[]) => void;
  onContextMenu?: (e: React.MouseEvent, noteId: string) => void;
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
  inputBg: string;
  inputBorder: string;
  checkboxUnchecked: string;
  checkboxChecked: string;
  hoverBg: string;
  linkColor: string;
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
    inputBg: 'bg-slate-50 focus:bg-white text-slate-900',
    inputBorder: 'border-slate-200 focus:border-blue-400',
    checkboxUnchecked: 'border-slate-400 bg-white hover:border-slate-700',
    checkboxChecked: 'bg-slate-900 border-slate-900 text-white',
    hoverBg: 'hover:bg-slate-100/70',
    linkColor: 'text-blue-600 hover:text-blue-700',
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
    inputBg: 'bg-amber-50/60 focus:bg-white text-slate-800',
    inputBorder: 'border-amber-200 focus:border-amber-400',
    checkboxUnchecked: 'border-amber-400 bg-white hover:border-amber-600',
    checkboxChecked: 'bg-amber-800 border-amber-800 text-amber-50',
    hoverBg: 'hover:bg-amber-100/40',
    linkColor: 'text-amber-800 hover:text-amber-900',
    isDark: false,
  },
  ruled: {
    bg: 'bg-note-ruled',
    text: 'text-stone-900',
    subtext: 'text-stone-400',
    border: 'border-stone-300/80',
    headerBg: 'bg-[#f8f3e8]',
    toolbarBg: 'bg-[#f8f3e8]',
    divider: 'border-stone-200/80',
    toolbarBtn: 'text-stone-700 hover:text-stone-900 hover:bg-stone-100',
    inputBg: 'bg-[#f0e8d8] focus:bg-[#fffdf9] text-stone-900',
    inputBorder: 'border-stone-300 focus:border-stone-400',
    checkboxUnchecked: 'border-stone-400 bg-[#fffdf9] hover:border-stone-700',
    checkboxChecked: 'bg-stone-800 border-stone-800 text-stone-100',
    hoverBg: 'hover:bg-stone-200/40',
    linkColor: 'text-amber-800 hover:text-amber-900',
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
    inputBg: 'bg-slate-100/80 focus:bg-white text-slate-900',
    inputBorder: 'border-slate-200 focus:border-blue-400',
    checkboxUnchecked: 'border-slate-400 bg-white hover:border-slate-700',
    checkboxChecked: 'bg-slate-900 border-slate-900 text-white',
    hoverBg: 'hover:bg-slate-100/70',
    linkColor: 'text-blue-600 hover:text-blue-700',
    isDark: false,
  },
  'ruled-dark': {
    bg: 'bg-note-ruled-dark',
    text: 'text-slate-200',
    subtext: 'text-slate-500',
    border: 'border-slate-700/80',
    headerBg: 'bg-[#0f1729]',
    toolbarBg: 'bg-[#0f1729]',
    divider: 'border-slate-700/60',
    toolbarBtn: 'text-slate-400 hover:text-white hover:bg-slate-800',
    inputBg: 'bg-slate-800/80 focus:bg-slate-800 text-slate-100',
    inputBorder: 'border-slate-700 focus:border-blue-500',
    checkboxUnchecked: 'border-slate-600 bg-slate-800/90 hover:border-slate-400',
    checkboxChecked: 'bg-blue-600 border-blue-600 text-white',
    hoverBg: 'hover:bg-slate-800/60',
    linkColor: 'text-blue-400 hover:text-blue-300',
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
    inputBg: 'bg-[#ebdcb3]/60 focus:bg-[#f6ebd9] text-[#3d2b1f]',
    inputBorder: 'border-[#dcc8a3] focus:border-[#a08269]',
    checkboxUnchecked: 'border-[#8c7462] bg-[#fdf8f0] hover:border-[#3d2b1f]',
    checkboxChecked: 'bg-[#523d2e] border-[#523d2e] text-[#f6ebd9]',
    hoverBg: 'hover:bg-[#dfceaa]/40',
    linkColor: 'text-[#8b4513] hover:text-[#523d2e]',
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
    inputBg: 'bg-slate-800/90 focus:bg-slate-800 text-slate-100',
    inputBorder: 'border-slate-700 focus:border-blue-500',
    checkboxUnchecked: 'border-slate-600 bg-slate-800 hover:border-slate-400',
    checkboxChecked: 'bg-blue-600 border-blue-600 text-white',
    hoverBg: 'hover:bg-slate-800/60',
    linkColor: 'text-blue-400 hover:text-blue-300',
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
    inputBg: 'bg-slate-900 focus:bg-slate-900 text-slate-100',
    inputBorder: 'border-slate-800 focus:border-blue-500',
    checkboxUnchecked: 'border-slate-700 bg-slate-900 hover:border-slate-500',
    checkboxChecked: 'bg-blue-600 border-blue-600 text-white',
    hoverBg: 'hover:bg-slate-900/80',
    linkColor: 'text-blue-400 hover:text-blue-300',
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
    inputBg: 'bg-slate-50/90 focus:bg-white text-slate-900',
    inputBorder: 'border-slate-200 focus:border-blue-400',
    checkboxUnchecked: 'border-slate-400 bg-white hover:border-slate-700',
    checkboxChecked: 'bg-slate-900 border-slate-900 text-white',
    hoverBg: 'hover:bg-slate-100/60',
    linkColor: 'text-blue-600 hover:text-blue-700',
    isDark: false,
  },
};
