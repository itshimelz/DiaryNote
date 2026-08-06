import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Check } from 'lucide-react';
import { Note } from '../../types';
import { processMarkdownMentions } from '../../lib/markdownMention';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

interface SmartMarkdownTextProps {
  content: string;
  allNotes?: Note[];
  fontClass?: string;
  fontSizeClass?: string;
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
  className = '',
  inline = false,
  onNavigateToNote,
  onDoubleClick,
}) => {
  const processedContent = useMemo(
    () => processMarkdownMentions(content || '', allNotes),
    [content, allNotes]
  );

  return (
    <div
      onDoubleClick={onDoubleClick}
      className={`break-words ${fontClass} ${fontSizeClass} ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={{
          p: ({ children }) =>
            inline ? (
              <span className="inline leading-snug">{children}</span>
            ) : (
              <p className="mb-2 last:mb-0 leading-relaxed font-inherit">{children}</p>
            ),
          ul: ({ children, className }) => {
            const isTaskList = className?.includes('contains-task-list');
            return (
              <ul className={`my-0 first:mt-0 last:mb-0 space-y-0.5 ${isTaskList ? 'pl-0 list-none' : ''}`}>
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
                <li className="list-none flex items-start gap-2.5 leading-relaxed">
                  {checkbox && <span className="shrink-0 mt-0.5">{checkbox}</span>}
                  <div className="flex-1 min-w-0 font-inherit leading-relaxed break-words">
                    {textChildren}
                  </div>
                </li>
              );
            }

            return <li className="leading-relaxed">{children}</li>;
          },
          input: ({ type, checked }) => {
            if (type === 'checkbox') {
              return (
                <span
                  className={`inline-flex items-center justify-center shrink-0 w-4 h-4 rounded border-2 transition-all select-none ${
                    checked
                      ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                      : 'border-slate-500 bg-white hover:border-slate-900'
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
                    onNavigateToNote?.(targetNoteId);
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
                className="text-blue-600 hover:underline inline"
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
