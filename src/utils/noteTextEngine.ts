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

export const getEditorHeight = (textarea: HTMLTextAreaElement, minimum = 180): number => {
  textarea.style.height = 'auto';
  return Math.max(minimum, textarea.scrollHeight);
};

export const resizeNoteEditor = (textarea: HTMLTextAreaElement, minimum = 180): void => {
  textarea.style.height = `${getEditorHeight(textarea, minimum)}px`;
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


