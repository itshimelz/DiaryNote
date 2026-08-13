import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Check } from 'lucide-react';
import { Note, PaperTheme } from '../../types';
import { processMarkdownMentions } from '../../utils';
import { PAPER_THEMES } from './types';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

export interface BaseMarkdownRendererProps {
  content: string;
  allNotes?: Note[];
  fontClass?: string;
  fontSizeClass?: string;
  paperTheme?: string;
  className?: string;
  inline?: boolean;
  isRuled?: boolean;
  onNavigateToNote?: (targetNoteId: string) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  markdownRef?: React.RefObject<HTMLDivElement | null>;
  emptyPlaceholder?: string;
}

const BaseMarkdownRendererComponent: React.FC<BaseMarkdownRendererProps> = ({
  content,
  allNotes = [],
  fontClass = 'font-sans',
  fontSizeClass = 'text-sm',
  paperTheme = 'white',
  className = '',
  inline = false,
  isRuled = false,
  onNavigateToNote,
  onDoubleClick,
  markdownRef,
  emptyPlaceholder,
}) => {
  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];

  const processedContent = useMemo(() => {
    const withMentions = processMarkdownMentions(content || '', allNotes);
    if (!isRuled) return withMentions;
    return withMentions.replace(/(\n[ \t]*\n)((?=[ \t]*[-*+] ))/g, '\n\n---\n\n');
  }, [content, allNotes, isRuled]);

  const isEmpty = !content || content.trim().length === 0;

  const components = useMemo(
    () => ({
      p: ({ children }: any) =>
        inline ? (
          <span className="inline leading-snug">{children}</span>
        ) : (
          <p
            className={`font-inherit ${
              isRuled
                ? 'ruled-text-alignment mb-8 last:mb-0'
                : 'mb-3.5 last:mb-0 leading-relaxed'
            }`}
          >
            {children}
          </p>
        ),
      h1: ({ children }: any) => (
        <h1
          className={`font-bold tracking-tight text-xl my-2 ${
            isRuled ? 'ruled-text-alignment' : ''
          }`}
        >
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2
          className={`font-bold tracking-tight text-lg my-1.5 ${
            isRuled ? 'ruled-text-alignment' : ''
          }`}
        >
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3
          className={`font-semibold text-base my-1 ${
            isRuled ? 'ruled-text-alignment' : ''
          }`}
        >
          {children}
        </h3>
      ),
      h4: ({ children }: any) => (
        <h4
          className={`font-semibold text-sm my-1 ${
            isRuled ? 'ruled-text-alignment' : ''
          }`}
        >
          {children}
        </h4>
      ),
      hr: () =>
        isRuled ? (
          <div className="h-8" aria-hidden="true" />
        ) : (
          <div className="h-3.5" aria-hidden="true" />
        ),
      ul: ({ children, className: ulClassName }: any) => {
        const isTaskList = ulClassName?.includes('contains-task-list');
        return (
          <ul
            className={`my-0.5 first:mt-0 last:mb-0 space-y-0.5 ${
              isTaskList ? 'pl-0 list-none' : 'list-disc pl-5'
            }`}
          >
            {children}
          </ul>
        );
      },
      ol: ({ children }: any) => (
        <ol className="my-0.5 first:mt-0 last:mb-0 space-y-0.5 list-decimal pl-5">
          {children}
        </ol>
      ),
      li: ({ children, className: liClassName }: any) => {
        const isTaskList = liClassName?.includes('task-list-item');
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
              <div
                className={`flex-1 min-w-0 font-inherit break-words ${
                  isRuled ? '' : 'leading-relaxed'
                }`}
              >
                {textChildren}
              </div>
            </li>
          );
        }

        return (
          <li
            className={`leading-relaxed ${
              isRuled ? 'ruled-text-alignment' : ''
            }`}
          >
            {children}
          </li>
        );
      },
      blockquote: ({ children }: any) => (
        <blockquote
          className={`border-l-3 border-blue-500/70 pl-3 my-2 italic opacity-95 ${
            isRuled ? 'ruled-text-alignment' : ''
          }`}
        >
          {children}
        </blockquote>
      ),
      code: ({ children }: any) => (
        <code className="font-mono font-medium text-[0.92em] text-inherit tracking-tight">
          {children}
        </code>
      ),
      pre: ({ children }: any) => (
        <pre className="font-mono text-xs my-1.5 font-medium leading-relaxed whitespace-pre-wrap select-text cursor-text">
          {children}
        </pre>
      ),
      table: ({ children }: any) => (
        <div className="overflow-x-auto my-2">
          <table className="w-full border-collapse text-xs rounded border border-slate-300/60 dark:border-slate-700/60">
            {children}
          </table>
        </div>
      ),
      th: ({ children }: any) => (
        <th className="border border-slate-300/60 dark:border-slate-700/60 px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 font-bold text-left">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="border border-slate-300/60 dark:border-slate-700/60 px-2.5 py-1.5">
          {children}
        </td>
      ),
      input: ({ type, checked }: any) => {
        if (type === 'checkbox') {
          return (
            <span
              className={`inline-flex items-center justify-center shrink-0 w-4 h-4 rounded border-2 transition-colors select-none ${
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
      a: ({ href, children }: any) => {
        if (href?.startsWith('#note-')) {
          const targetNoteId = href.replace('#note-', '');
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToNote?.(targetNoteId);
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
            className={`${themeConfig.linkColor} hover:underline inline`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </a>
        );
      },
    }),
    [inline, isRuled, themeConfig, onNavigateToNote]
  );

  const isPlainInlineText = useMemo(
    () => inline && !/[*`_~#\[@\\]/.test(processedContent),
    [inline, processedContent]
  );

  return (
    <div
      ref={markdownRef}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
        if (onDoubleClick) onDoubleClick(e);
      }}
      className={`break-words ${
        isRuled ? 'ruled-text-alignment' : ''
      } ${fontClass} ${fontSizeClass} ${themeConfig.text} ${className}`}
    >
      {isPlainInlineText ? (
        <span className="inline leading-snug">
          {isEmpty && emptyPlaceholder ? emptyPlaceholder : processedContent}
        </span>
      ) : (
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
          {isEmpty && emptyPlaceholder ? emptyPlaceholder : processedContent}
        </ReactMarkdown>
      )}
    </div>
  );
};

export const BaseMarkdownRenderer = React.memo(BaseMarkdownRendererComponent);
