import { Note } from '../../types';

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
  onExportNote?: (note: Note, format: 'md' | 'txt' | 'json') => void;
  isCardDragging?: boolean;
  isCut?: boolean;
  onDragStateChange?: (draggingIds: string[]) => void;
  onContextMenu?: (e: React.MouseEvent, noteId: string) => void;
}

export type NoteMode = 'text' | 'checklist';

export { FONT_CLASSES, FONT_NAMES } from '../../constants/fonts';
export { PAPER_THEMES, type PaperThemeConfig } from '../../constants/paperThemes';

