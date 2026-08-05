import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Note } from '../../types';
import { processMarkdownMentions } from '../../lib/markdownMention';
import { isNoteTextEmpty, normalizeNoteText } from '../../lib/noteTextEngine';
import { PAPER_THEMES } from './types';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

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
  const sourceText = useMemo(() => normalizeNoteText(note.content), [note.content]);
  const processedContent = useMemo(
    () => processMarkdownMentions(sourceText, allNotes),
    [sourceText, allNotes]
  );
  const themeConfig = PAPER_THEMES[note.paperTheme || 'white'];

  const isRuled = note.paperTheme === 'ruled' || note.paperTheme === 'ruled-dark';

  return (
    <div
      ref={markdownRef}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
        if (onDoubleClick) onDoubleClick(e);
      }}
      className={`w-full flex-1 break-words preview-content cursor-text ${
        isRuled ? 'ruled-text-alignment' : 'leading-relaxed'
      } ${fontClass} ${fontSizeClass} ${themeConfig.text}`}
    >
      <div>
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          components={{
            p: ({ children }) => (
              <p
                className={`font-inherit ${
                  isRuled ? 'ruled-text-alignment mb-8 last:mb-0' : 'mb-3.5 last:mb-0 leading-relaxed'
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
          {isNoteTextEmpty(sourceText) ? 'Write your note here...' : processedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};
