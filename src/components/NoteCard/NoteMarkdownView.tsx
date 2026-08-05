import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note } from '../../types';
import { processMarkdownMentions } from '../../lib/markdownMention';
import { PAPER_THEMES } from './types';

interface NoteMarkdownViewProps {
  note: Note;
  allNotes: Note[];
  fontClass: string;
  fontSizeClass: string;
  onNavigateToNote: (targetNoteId: string) => void;
  onDoubleClick?: () => void;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const processedContent = processMarkdownMentions(note.content, allNotes);
  const themeConfig = PAPER_THEMES[note.paperTheme || 'white'];

  const isLongContent = (note.content || '').length > 280;

  const isRuled = note.paperTheme === 'ruled' || note.paperTheme === 'ruled-dark';

  return (
    <div
      ref={markdownRef}
      onDoubleClick={onDoubleClick}
      className={`w-full flex-1 break-words preview-content ${
        isRuled ? 'ruled-text-alignment' : 'leading-relaxed'
      } ${fontClass} ${fontSizeClass} ${themeConfig.text}`}
    >
      <div className={!isExpanded && isLongContent ? 'line-clamp-6' : ''}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p
                className={`font-inherit whitespace-pre-wrap ${
                  isRuled ? 'ruled-text-alignment mb-0' : 'mb-3.5 last:mb-0 leading-relaxed'
                }`}
              >
                {children}
              </p>
            ),
            a: ({ href, children }) => {
              if (href?.startsWith('#note-')) {
                const targetNoteId = href.replace('#note-', '');
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToNote(targetNoteId);
                    }}
                    className="inline font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                  >
                    {children}
                  </button>
                );
              }
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {processedContent || 'Write your note here...'}
        </ReactMarkdown>
      </div>

      {/* Read More button if text is long */}
      {isLongContent && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};
