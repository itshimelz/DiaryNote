import React from 'react';
import { Note } from '../../types';
import { normalizeNoteText } from '../../utils';
import { BaseMarkdownRenderer } from './BaseMarkdownRenderer';

interface NoteMarkdownViewProps {
  note: Note;
  allNotes: Note[];
  fontClass: string;
  fontSizeClass: string;
  onNavigateToNote: (targetNoteId: string) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  markdownRef?: React.RefObject<HTMLDivElement | null>;
}

export const NoteMarkdownView: React.FC<NoteMarkdownViewProps> = ({
  note,
  allNotes,
  fontClass,
  fontSizeClass,
  onNavigateToNote,
  onDoubleClick,
  markdownRef,
}) => {
  const isRuled = note.paperTheme === 'ruled' || note.paperTheme === 'ruled-dark';

  return (
    <BaseMarkdownRenderer
      content={normalizeNoteText(note.content)}
      allNotes={allNotes}
      fontClass={fontClass}
      fontSizeClass={fontSizeClass}
      paperTheme={note.paperTheme || 'white'}
      className="w-full flex-1 preview-content cursor-text"
      isRuled={isRuled}
      onNavigateToNote={onNavigateToNote}
      onDoubleClick={onDoubleClick}
      markdownRef={markdownRef}
      emptyPlaceholder="Write your note here..."
    />
  );
};
