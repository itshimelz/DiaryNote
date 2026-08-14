import { Note, Connection } from '../types';
import { isNoteAuthorized } from '../services/authPolicyService';

/**
 * Extracts connections between notes based on @[Title] or @[Title](id) or @Title references in content
 */
export function extractNoteConnections(notes: Note[]): Connection[] {
  const connections: Connection[] = [];
  const titleMap = new Map<string, string>(); // lowerTitle -> id
  const idMap = new Map<string, Note>(); // id -> Note

  (notes || []).forEach((n) => {
    if (!n) return;
    const title = (n.title || '').trim().toLowerCase();
    if (title) titleMap.set(title, n.id);
    idMap.set(n.id, n);
  });

  (notes || []).forEach((sourceNote) => {
    // Redact unauthenticated locked note contents from graph indexing
    if (!sourceNote || !sourceNote.content || (sourceNote.isLocked && !isNoteAuthorized(sourceNote))) {
      return;
    }
    const bracketRegex = /@\[([^\]]+)\](?:\(([^)]+)\))?/g;
    let match: RegExpExecArray | null;

    while ((match = bracketRegex.exec(sourceNote.content)) !== null) {
      const title = match[1];
      const targetId = match[2];

      let foundId = targetId;
      if (!foundId) {
        foundId = titleMap.get((title || '').trim().toLowerCase()) || '';
      }

      if (foundId && idMap.has(foundId) && foundId !== sourceNote.id) {
        const targetNote = idMap.get(foundId);
        const targetAuthorized = targetNote ? isNoteAuthorized(targetNote) : true;
        connections.push({
          fromId: sourceNote.id,
          toId: foundId,
          toTitle: targetAuthorized ? (targetNote?.title || title) : '🔒 Locked Note',
        });
      }
    }
  });

  return connections;
}

/**
 * Replaces @[Title] patterns with custom markdown links [@[Title]](#note-targetId)
 */
export function processMarkdownMentions(content: string, notes: Note[]): string {
  if (!content) return '';

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

/**
 * Helper to format date cleanly
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

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
