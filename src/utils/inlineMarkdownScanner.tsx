import React from 'react';
import { Note } from '../types';
import { getNoteLookupMaps } from './markdownMention';

export interface InlineMarkdownOptions {
  allNotes?: Note[];
  linkColor?: string;
  onNavigateToNote?: (targetNoteId: string) => void;
}

// Regex matching inline markdown tokens:
// 1/2: @[Title](id?)
// 3/4: [Text](url)
// 5: `code`
// 6/7: ***bold-italic*** / ___bold-italic___
// 8/9: **bold** / __bold__
// 10/11: *italic* / _italic_
// 12: ~~strikethrough~~
const INLINE_TOKEN_REGEX =
  /(?:@\[([^\]]+)\](?:\(([^)]+)\))?)|(?:\[([^\]]+)\]\(([^)]+)\))|(?:`([^`]+)`)|(?:\*\*\*([^*]+)\*\*\*)|(?:___([^_]+)___)|(?:\*\*([^*]+)\*\*)|(?:__([^_]+)__)|(?:\*([^*\n]+)\*)|(?:_([^_]+)_)|(?:~~([^~]+)~~)/g;

/**
 * Fast-path inline markdown scanner.
 * Converts inline markdown strings directly to React elements in O(N) single-pass,
 * bypassing heavy Unified/Remark AST parsers for massive CPU savings.
 */
export function renderInlineMarkdown(
  content: string | undefined,
  options: InlineMarkdownOptions = {}
): React.ReactNode {
  if (!content) return '';

  const { allNotes = [], linkColor = 'text-blue-500 hover:text-blue-600', onNavigateToNote } = options;

  // Fast-path bypass if string contains no markdown trigger characters
  if (!/[[*`_~#@\\]/.test(content)) {
    return content;
  }

  const { idMap, titleMap } = getNoteLookupMaps(allNotes);

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;

  INLINE_TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_TOKEN_REGEX.exec(content)) !== null) {
    const matchStart = match.index;
    const matchEnd = INLINE_TOKEN_REGEX.lastIndex;

    // Push preceding plain text
    if (matchStart > lastIndex) {
      elements.push(content.slice(lastIndex, matchStart));
    }

    const [
      ,
      mentionTitle,
      mentionId,
      linkText,
      linkHref,
      codeText,
      boldItalic1,
      boldItalic2,
      bold1,
      bold2,
      italic1,
      italic2,
      strikethroughText,
    ] = match;

    const key = `inline-md-${keyIndex++}`;

    if (mentionTitle !== undefined) {
      // 1. Mention: @[Title](id?) or @[Title]
      let targetNote = mentionId ? idMap.get(mentionId) : null;
      if (!targetNote && mentionTitle) {
        targetNote = titleMap.get(mentionTitle.trim().toLowerCase()) || null;
      }

      if (targetNote) {
        const targetId = targetNote.id;
        const displayTitle = targetNote.title || mentionTitle || 'Untitled Note';
        elements.push(
          <button
            key={key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToNote?.(targetId);
            }}
            className={`inline font-medium ${linkColor} hover:underline cursor-pointer transition-colors`}
          >
            {displayTitle}
          </button>
        );
      } else {
        elements.push(`@${mentionTitle}`);
      }
    } else if (linkText !== undefined && linkHref !== undefined) {
      // 2. Link: [Text](url) or [Text](#note-id)
      if (linkHref.startsWith('#note-')) {
        const targetNoteId = linkHref.replace('#note-', '');
        elements.push(
          <button
            key={key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToNote?.(targetNoteId);
            }}
            className={`inline font-medium ${linkColor} hover:underline cursor-pointer transition-colors`}
          >
            {linkText}
          </button>
        );
      } else {
        elements.push(
          <a
            key={key}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkColor} hover:underline inline`}
            onClick={(e) => e.stopPropagation()}
          >
            {linkText}
          </a>
        );
      }
    } else if (codeText !== undefined) {
      // 3. Inline Code: `code`
      elements.push(
        <code key={key} className="font-mono font-medium text-[0.92em] text-inherit tracking-tight">
          {codeText}
        </code>
      );
    } else if (boldItalic1 !== undefined || boldItalic2 !== undefined) {
      // 4. Bold + Italic: ***text*** or ___text___
      const inner = boldItalic1 ?? boldItalic2;
      elements.push(
        <strong key={key} className="font-bold">
          <em className="italic">{inner}</em>
        </strong>
      );
    } else if (bold1 !== undefined || bold2 !== undefined) {
      // 5. Bold: **text** or __text__
      const inner = bold1 ?? bold2;
      elements.push(
        <strong key={key} className="font-bold">
          {renderInlineMarkdown(inner, options)}
        </strong>
      );
    } else if (italic1 !== undefined || italic2 !== undefined) {
      // 6. Italic: *text* or _text_
      const inner = italic1 ?? italic2;
      elements.push(
        <em key={key} className="italic">
          {renderInlineMarkdown(inner, options)}
        </em>
      );
    } else if (strikethroughText !== undefined) {
      // 7. Strikethrough: ~~text~~
      elements.push(
        <del key={key} className="line-through opacity-85">
          {renderInlineMarkdown(strikethroughText, options)}
        </del>
      );
    }

    lastIndex = matchEnd;
  }

  // Push any trailing text
  if (lastIndex < content.length) {
    elements.push(content.slice(lastIndex));
  }

  if (elements.length === 0) return '';
  if (elements.length === 1 && typeof elements[0] === 'string') return elements[0];

  return <>{elements}</>;
}
