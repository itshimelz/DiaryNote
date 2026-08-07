import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Check } from 'lucide-react';
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
  const processedContent = useMemo(() => {
    const withMentions = processMarkdownMentions(sourceText, allNotes);
    // In CommonMark/GFM, a blank line between list items creates a "loose list"
    // but keeps them ALL in ONE <ul>. To visually separate list groups with a
    // blank line, we insert a thematic break (---) which forces the parser to
    // split them into separate <ul> elements. We render <hr> as an invisible
    // spacer with exact height.
    return withMentions.replace(
      /(\n[ \t]*\n)((?=[ \t]*[-*+] ))/g,
      '\n\n---\n\n'
    );
  }, [sourceText, allNotes]);

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
            h1: ({ children }) => (
              <h1 className={`font-bold tracking-tight text-xl my-2 ${isRuled ? 'ruled-text-alignment' : ''}`}>
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className={`font-bold tracking-tight text-lg my-1.5 ${isRuled ? 'ruled-text-alignment' : ''}`}>
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className={`font-semibold text-base my-1 ${isRuled ? 'ruled-text-alignment' : ''}`}>
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className={`font-semibold text-sm my-1 ${isRuled ? 'ruled-text-alignment' : ''}`}>
                {children}
              </h4>
            ),
            hr: () => (
              <div
                className={isRuled ? 'h-8' : 'h-3.5'}
                aria-hidden="true"
              />
            ),
            ul: ({ children, className }) => {
              const isTaskList = className?.includes('contains-task-list');
              return (
                <ul
                  className={`mt-0 mb-0 space-y-0 ${
                    isTaskList ? 'pl-0 list-none' : 'list-disc pl-5'
                  }`}
                >
                  {children}
                </ul>
              );
            },
            ol: ({ children }) => (
              <ol className="my-1 first:mt-0 last:mb-0 space-y-1 list-decimal pl-5">{children}</ol>
            ),
            li: ({ children, className }) => {
              const isTaskList = className?.includes('task-list-item');
              if (isTaskList && Array.isArray(children)) {
                const checkbox = children.find(
                  (c: any) =>
                    c &&
                    typeof c === 'object' &&
                    (c.type === 'input' || (c.props && c.props.type === 'checkbox'))
                );
                const textChildren = children.filter((c: any) => c !== checkbox);

                return (
                  <li
                    className={`list-none flex items-start gap-2.5 leading-relaxed ${
                      isRuled ? 'ruled-text-alignment' : ''
                    }`}
                  >
                    {checkbox && (
                      <span
                        className="shrink-0 flex items-center"
                        style={isRuled ? { height: '32px' } : { height: '24px' }}
                      >
                        {checkbox}
                      </span>
                    )}
                    <div className={`flex-1 min-w-0 font-inherit break-words ${isRuled ? '' : 'leading-relaxed'}`}>
                      {textChildren}
                    </div>
                  </li>
                );
              }

              return (
                <li className={`leading-relaxed ${isRuled ? 'ruled-text-alignment' : ''}`}>
                  {children}
                </li>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className={`border-l-3 border-blue-500/70 pl-3 my-2 italic opacity-95 ${isRuled ? 'ruled-text-alignment' : ''}`}>
                {children}
              </blockquote>
            ),
            code: ({ children }: any) => (
              <code className="font-mono font-medium text-[0.92em] text-blue-600 dark:text-blue-400 tracking-tight">
                {children}
              </code>
            ),
            pre: ({ children }: any) => (
              <pre className="font-mono text-xs my-1.5 font-medium leading-relaxed whitespace-pre-wrap select-text cursor-text">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="w-full border-collapse text-xs rounded border border-slate-300/60 dark:border-slate-700/60">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-slate-300/60 dark:border-slate-700/60 px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 font-bold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-slate-300/60 dark:border-slate-700/60 px-2.5 py-1.5">
                {children}
              </td>
            ),
            input: ({ type, checked }) => {
              if (type === 'checkbox') {
                return (
                  <span
                    className={`inline-flex items-center justify-center shrink-0 w-4 h-4 rounded border-2 transition-all select-none ${
                      checked
                        ? themeConfig.checkboxChecked
                        : themeConfig.checkboxUnchecked
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                );
              }
              return null;
            },
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
                    className={`inline font-medium ${themeConfig.linkColor} hover:underline cursor-pointer transition-colors`}
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
                  className={`${themeConfig.linkColor} hover:underline`}
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
