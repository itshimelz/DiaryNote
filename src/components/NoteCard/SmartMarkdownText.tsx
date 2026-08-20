import React from 'react';
import { Note, PaperTheme } from '../../types';
import { renderInlineMarkdown } from '../../utils';
import { BaseMarkdownRenderer } from './BaseMarkdownRenderer';
import { PAPER_THEMES } from './types';

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

const SmartMarkdownTextComponent: React.FC<SmartMarkdownTextProps> = ({
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
  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];

  if (inline) {
    const rendered = renderInlineMarkdown(content, {
      allNotes,
      linkColor: themeConfig.linkColor,
      onNavigateToNote,
    });

    return (
      <span
        onDoubleClick={onDoubleClick}
        className={`inline leading-snug break-words ${fontClass} ${fontSizeClass} ${themeConfig.text} ${className}`}
      >
        {rendered}
      </span>
    );
  }

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

export const SmartMarkdownText = React.memo(SmartMarkdownTextComponent);
