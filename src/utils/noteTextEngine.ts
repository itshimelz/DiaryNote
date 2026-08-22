/**
 * Shared text rules for note editing and previewing.
 *
 * The source stays plain Markdown. We only canonicalize line endings so text
 * entered on any platform has one representation, while every intentional
 * blank line remains part of the note.
 */
export const normalizeNoteText = (value: string | undefined): string =>
  (value || '').replace(/\r\n?/g, '\n');

export const isNoteTextEmpty = (value: string | undefined): boolean =>
  normalizeNoteText(value).trim().length === 0;

/**
 * Preserves note tabs, leading line indentation, and multiple consecutive blank lines
 * in Markdown preview mode without accidentally triggering CommonMark 4-space indented code blocks.
 *
 * Rules:
 * 1. Fenced code blocks (``` or ~~~) are left untouched.
 * 2. Markdown structural prefixes (lists -, *, +, 1., blockquotes >, headings #) preserve their indentation for hierarchy.
 * 3. Leading tabs (\t) and multiple spaces on normal lines are converted to non-breaking whitespace so they render with exact visual indentation and never collapse or switch to monospace code blocks.
 * 4. Multiple consecutive blank lines (e.g. 3+ Enters) preserve visual empty space via &nbsp; paragraphs instead of CommonMark collapsing them into a single gap.
 */
export function preserveNoteTabsAndIndentation(text: string | undefined): string {
  if (!text) return '';

  const lines = text.split('\n');
  let inFencedCode = false;

  const processedLines = lines.map((line) => {
    // Check for fenced code block toggle
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inFencedCode = !inFencedCode;
      return line;
    }
    if (inFencedCode) {
      return line;
    }

    // Preserve markdown structural prefixes for list hierarchy, quotes, and headings
    if (
      /^\s*[-*+]\s+/.test(line) ||
      /^\s*\d+[.)]\s+/.test(line) ||
      /^\s*>/.test(line) ||
      /^\s*#{1,6}\s+/.test(line)
    ) {
      return line;
    }

    // Convert leading tabs and spaces on normal text lines to non-breaking whitespace
    const match = line.match(/^([ \t]+)(.*)$/);
    if (match) {
      const leading = match[1];
      const rest = match[2];
      // 1 tab = 4 non-breaking spaces; 1 space = 1 non-breaking space
      const converted = leading.replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0').replace(/ /g, '\u00A0');
      return converted + rest;
    }

    return line;
  });

  const joined = processedLines.join('\n');

  // Preserve multiple consecutive empty lines (beyond standard paragraph separation)
  return joined.replace(/\n([ \t]*\n)+/g, (match) => {
    const count = (match.match(/\n/g) || []).length;
    if (count <= 2) return match;
    const extraLines = count - 2;
    let res = '\n\n';
    for (let i = 0; i < extraLines; i++) {
      res += '&nbsp;\n\n';
    }
    return res;
  });
}

const lastKnownTextLengths = new WeakMap<HTMLTextAreaElement, number>();

export const getEditorHeight = (textarea: HTMLTextAreaElement, minimum = 180): number => {
  if (!textarea) return minimum;
  const currentLength = textarea.value?.length ?? 0;
  const prevLength = lastKnownTextLengths.get(textarea) ?? -1;
  lastKnownTextLengths.set(textarea, currentLength);

  // If text is expanding and scrollHeight already exceeds clientHeight, we grow directly without resetting height
  if (prevLength !== -1 && currentLength >= prevLength && textarea.scrollHeight > textarea.clientHeight) {
    return Math.max(minimum, textarea.scrollHeight);
  }

  // Only reset style.height = 'auto' when text shrank or on initial measurement
  textarea.style.height = 'auto';
  return Math.max(minimum, textarea.scrollHeight);
};

export const resizeNoteEditor = (textarea: HTMLTextAreaElement | null, minimum = 180): void => {
  if (!textarea) return;
  const targetHeight = getEditorHeight(textarea, minimum);
  const currentHeightPx = `${targetHeight}px`;
  if (textarea.style.height !== currentHeightPx) {
    textarea.style.height = currentHeightPx;
  }
};

export type FormattingType = 'bold' | 'italic' | 'strikethrough' | 'code' | 'codeblock' | 'quote' | 'link';

export function applyMarkdownFormatting(
  textarea: HTMLTextAreaElement,
  type: FormattingType
): { newContent: string; newSelectionStart: number; newSelectionEnd: number } {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = value.slice(start, end);

  let prefix = '';
  let suffix = '';
  let defaultPlaceholder = '';

  switch (type) {
    case 'bold':
      prefix = '**';
      suffix = '**';
      defaultPlaceholder = 'bold text';
      break;
    case 'italic':
      prefix = '*';
      suffix = '*';
      defaultPlaceholder = 'italic text';
      break;
    case 'strikethrough':
      prefix = '~~';
      suffix = '~~';
      defaultPlaceholder = 'strikethrough text';
      break;
    case 'code':
      prefix = '`';
      suffix = '`';
      defaultPlaceholder = 'code';
      break;
    case 'codeblock':
      prefix = '```\n';
      suffix = '\n```';
      defaultPlaceholder = 'code block';
      break;
    case 'quote':
      prefix = '> ';
      suffix = '';
      defaultPlaceholder = 'quote';
      break;
    case 'link':
      prefix = '[';
      suffix = '](url)';
      defaultPlaceholder = 'link text';
      break;
  }

  // Toggle formatting if already wrapped
  if (
    selectedText &&
    prefix &&
    suffix &&
    value.slice(start - prefix.length, start) === prefix &&
    value.slice(end, end + suffix.length) === suffix
  ) {
    const unformatted = value.slice(0, start - prefix.length) + selectedText + value.slice(end + suffix.length);
    return {
      newContent: unformatted,
      newSelectionStart: start - prefix.length,
      newSelectionEnd: end - prefix.length,
    };
  }

  const textToWrap = selectedText || defaultPlaceholder;
  const newContent = value.slice(0, start) + prefix + textToWrap + suffix + value.slice(end);

  const newSelectionStart = selectedText ? start : start + prefix.length;
  const newSelectionEnd = selectedText ? end + prefix.length + suffix.length : start + prefix.length + textToWrap.length;

  return { newContent, newSelectionStart, newSelectionEnd };
}

export function handleSmartEnterList(textarea: HTMLTextAreaElement): {
  handled: boolean;
  newContent: string;
  newCursorPos: number;
} | null {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // Only handle single cursor without multi-character selection range
  if (start !== end) return null;

  const textBeforeCursor = value.slice(0, start);
  const textAfterCursor = value.slice(start);

  const linesBefore = textBeforeCursor.split('\n');
  const currentLine = linesBefore[linesBefore.length - 1];

  // 1. Check for Numbered List e.g. "1. ", "  2. ", "1) ", "  12) "
  const numberMatch = currentLine.match(/^(\s*)(\d+)([.)])(\s+)(.*)$/);
  if (numberMatch) {
    const indent = numberMatch[1];
    const num = parseInt(numberMatch[2], 10);
    const delim = numberMatch[3];
    const itemContent = numberMatch[5];

    // Empty list item: clear prefix line and terminate numbered list
    if (itemContent.trim() === '') {
      const lineStartIndex = start - currentLine.length;
      const newContent = value.slice(0, lineStartIndex) + textAfterCursor;
      return {
        handled: true,
        newContent,
        newCursorPos: lineStartIndex,
      };
    }

    // Continue numbered list with incremented number
    const nextNum = num + 1;
    const prefix = `\n${indent}${nextNum}${delim} `;
    const newContent = textBeforeCursor + prefix + textAfterCursor;
    return {
      handled: true,
      newContent,
      newCursorPos: start + prefix.length,
    };
  }

  // 2. Check for Checklist e.g. "- [ ] ", "- [x] ", "* [ ] "
  const checkMatch = currentLine.match(/^(\s*)([-*+]\s+\[[ xX]\])(\s+)(.*)$/);
  if (checkMatch) {
    const indent = checkMatch[1];
    const itemContent = checkMatch[4];

    if (itemContent.trim() === '') {
      const lineStartIndex = start - currentLine.length;
      const newContent = value.slice(0, lineStartIndex) + textAfterCursor;
      return {
        handled: true,
        newContent,
        newCursorPos: lineStartIndex,
      };
    }

    const prefix = `\n${indent}- [ ] `;
    const newContent = textBeforeCursor + prefix + textAfterCursor;
    return {
      handled: true,
      newContent,
      newCursorPos: start + prefix.length,
    };
  }

  // 3. Check for Bullet List e.g. "- ", "* ", "+ "
  const bulletMatch = currentLine.match(/^(\s*)([-*+])(\s+)(.*)$/);
  if (bulletMatch) {
    const indent = bulletMatch[1];
    const bulletChar = bulletMatch[2];
    const itemContent = bulletMatch[4];

    if (itemContent.trim() === '') {
      const lineStartIndex = start - currentLine.length;
      const newContent = value.slice(0, lineStartIndex) + textAfterCursor;
      return {
        handled: true,
        newContent,
        newCursorPos: lineStartIndex,
      };
    }

    const prefix = `\n${indent}${bulletChar} `;
    const newContent = textBeforeCursor + prefix + textAfterCursor;
    return {
      handled: true,
      newContent,
      newCursorPos: start + prefix.length,
    };
  }

  return null;
}

const PAIR_MAP: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
  '*': '*',
  '_': '_',
  '~': '~',
};

const CLOSING_CHARS = new Set([')', ']', '}', '"', "'", '`']);

/**
 * Handles typing auto-pairs (e.g. typing '[' wraps selection in '[]' or inserts '[]' with cursor inside).
 */
export function handleSmartAutoPairing(
  textarea: HTMLTextAreaElement,
  char: string
): {
  handled: boolean;
  newContent: string;
  newSelectionStart: number;
  newSelectionEnd: number;
} | null {
  const closing = PAIR_MAP[char];
  if (!closing) return null;

  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = value.slice(start, end);

  // If text is selected, wrap the selection in the pair
  if (selectedText.length > 0) {
    const prefix = char === '~' ? '~~' : char;
    const suffix = char === '~' ? '~~' : closing;

    const newContent = value.slice(0, start) + prefix + selectedText + suffix + value.slice(end);
    return {
      handled: true,
      newContent,
      newSelectionStart: start + prefix.length,
      newSelectionEnd: end + prefix.length,
    };
  }

  // If no selection and typing an opening pair: insert pair with cursor between
  if (char === '(' || char === '[' || char === '{' || char === '`') {
    const newContent = value.slice(0, start) + char + closing + value.slice(end);
    return {
      handled: true,
      newContent,
      newSelectionStart: start + 1,
      newSelectionEnd: start + 1,
    };
  }

  return null;
}

/**
 * Handles typing a closing character when cursor is already right before that closing character (step-over).
 */
export function handleSmartClosingPair(
  textarea: HTMLTextAreaElement,
  char: string
): { handled: boolean; newCursorPos: number } | null {
  if (!CLOSING_CHARS.has(char)) return null;

  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start === end && value[start] === char) {
    return {
      handled: true,
      newCursorPos: start + 1,
    };
  }

  return null;
}

/**
 * Handles backspace between an empty pair (e.g. '|' between '()', '[]', '{}', '""', "''", '``').
 * Deletes both characters simultaneously.
 */
export function handleSmartPairBackspace(textarea: HTMLTextAreaElement): {
  handled: boolean;
  newContent: string;
  newCursorPos: number;
} | null {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start !== end || start === 0 || start >= value.length) return null;

  const charBefore = value[start - 1];
  const charAfter = value[start];

  if (
    (charBefore === '(' && charAfter === ')') ||
    (charBefore === '[' && charAfter === ']') ||
    (charBefore === '{' && charAfter === '}') ||
    (charBefore === '"' && charAfter === '"') ||
    (charBefore === "'" && charAfter === "'") ||
    (charBefore === '`' && charAfter === '`')
  ) {
    const newContent = value.slice(0, start - 1) + value.slice(start + 1);
    return {
      handled: true,
      newContent,
      newCursorPos: start - 1,
    };
  }

  return null;
}

/**
 * When text is selected and user pastes a URL from clipboard, automatically formats as [selected text](url).
 */
export function applySmartUrlPaste(
  textarea: HTMLTextAreaElement,
  clipboardText: string
): {
  handled: boolean;
  newContent: string;
  newSelectionStart: number;
  newSelectionEnd: number;
} | null {
  const trimmed = (clipboardText || '').trim();
  const isUrl = /^https?:\/\/[^\s]+$/i.test(trimmed);

  if (!isUrl) return null;

  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = value.slice(start, end);

  if (!selectedText || selectedText.trim().length === 0) return null;

  // Format as [selectedText](url)
  const formatted = `[${selectedText}](${trimmed})`;
  const newContent = value.slice(0, start) + formatted + value.slice(end);

  return {
    handled: true,
    newContent,
    newSelectionStart: start + formatted.length,
    newSelectionEnd: start + formatted.length,
  };
}


