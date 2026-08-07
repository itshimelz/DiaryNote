import React from 'react';
import { Note } from '../../types';
import { BaseMarkdownRenderer } from './BaseMarkdownRenderer';

interface SmartMarkdownTextProps {
  content: string;
  allNotes?: Note[];
  fontClass?: string;
  fontSizeClass?: string;
  paperTheme?: string;
  className?: string;
  inline?: boolean;
  onNavigateToNote?: (targetNoteId: string) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export const SmartMarkdownText: React.FC<SmartMarkdownTextProps> = ({
  content,
  allNotes = [],
  fontClass = 'font-sans',
  fontSizeClass = 'text-sm',
  paperTheme = 'white',
  className = '',
  inline = false,
  onNavigateToNote,
  onDoubleClick,
}) => {
  return (
    <BaseMarkdownRenderer
      content={content}
      allNotes={allNotes}
      fontClass={fontClass}
      fontSizeClass={fontSizeClass}
      paperTheme={paperTheme}
      className={className}
      inline={inline}
      onNavigateToNote={onNavigateToNote}
      onDoubleClick={onDoubleClick}
    />
  );
};
