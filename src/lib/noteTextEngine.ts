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
