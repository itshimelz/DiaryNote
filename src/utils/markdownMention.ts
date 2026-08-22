import { Note } from '../types';

let lastNotesRef: Note[] | null = null;
let cachedIdMap = new Map<string, Note>();
let cachedTitleMap = new Map<string, Note>();

/**
 * Returns O(1) indexed lookup maps for note IDs and lowercase titles.
 * Uses reference caching to avoid reconstructing maps on unchanged note arrays.
 */
export function getNoteLookupMaps(notes: Note[]): {
  idMap: Map<string, Note>;
  titleMap: Map<string, Note>;
} {
  if (notes === lastNotesRef) {
    return { idMap: cachedIdMap, titleMap: cachedTitleMap };
  }

  const idMap = new Map<string, Note>();
  const titleMap = new Map<string, Note>();

  (notes || []).forEach((n) => {
    if (n) {
      idMap.set(n.id, n);
      if (n.title) {
        titleMap.set(n.title.trim().toLowerCase(), n);
      }
    }
  });

  lastNotesRef = notes;
  cachedIdMap = idMap;
  cachedTitleMap = titleMap;

  return { idMap, titleMap };
}

/**
 * Replaces @[Title] patterns with custom markdown links [@[Title]](#note-targetId)
 */
export function processMarkdownMentions(content: string, notes: Note[]): string {
  if (!content) return '';

  const { idMap, titleMap } = getNoteLookupMaps(notes);

  return content.replace(/@\[([^\]]+)\](?:\(([^)]+)\))?/g, (fullMatch, title, explicitId) => {
    let targetNote = explicitId ? idMap.get(explicitId) : null;
    if (!targetNote && title) {
      targetNote = titleMap.get(title.trim().toLowerCase()) || null;
    }

    if (targetNote) {
      return `[${targetNote.title || 'Untitled'}](#note-${targetNote.id})`;
    }
    return `@${title}`;
  });
}

import { formatDate } from './dateUtils';
export { formatDate };

/**
 * Ensures a note title is unique among notes created on the same calendar day.
 */
export function getUniqueTitleForDay(rawTitle: string, noteId: string, allNotes: Note[]): string {
  const baseTitle = (rawTitle || '').trim() || 'Untitled Note';
  const todayStr = new Date().toDateString();

  const sameDayNotes = (allNotes || []).filter(
    (n) => n && n.id !== noteId && n.createdAt && new Date(n.createdAt).toDateString() === todayStr
  );

  const existingTitles = new Set(sameDayNotes.map((n) => (n.title || '').trim().toLowerCase()));

  if (!existingTitles.has(baseTitle.toLowerCase())) {
    return baseTitle;
  }

  let counter = 2;
  while (existingTitles.has(`${baseTitle} (${counter})`.toLowerCase())) {
    counter++;
  }

  return `${baseTitle} (${counter})`;
}

/**
 * Inserts a note mention @[Title](id) into content at cursor position
 */
export function insertMentionIntoText(
  content: string,
  cursorIndex: number,
  targetNote: Note
): { newContent: string; newCursorPos: number } {
  const val = content || '';
  const textBeforeCursor = val.slice(0, cursorIndex);
  const textAfterCursor = val.slice(cursorIndex);

  const newBefore = textBeforeCursor.replace(/(?:^|\s)@([a-zA-Z0-9\s_-]*)$/, (m) => {
    const leadingSpace = m.startsWith(' ') || m.startsWith('\n') ? m[0] : '';
    return `${leadingSpace}@[${targetNote.title || 'Untitled Note'}](${targetNote.id}) `;
  });

  return {
    newContent: newBefore + textAfterCursor,
    newCursorPos: newBefore.length,
  };
}
