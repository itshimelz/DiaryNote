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
  const previousHeight = textarea.style.height;
  textarea.style.height = '0px';
  const height = Math.max(minimum, textarea.scrollHeight);
  textarea.style.height = previousHeight;
  return height;
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
