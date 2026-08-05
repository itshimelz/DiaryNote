import React from 'react';
import { Note, Connection } from '../types';

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
    if (!sourceNote || !sourceNote.content) return;
    // Match @[Title] or @[Title](id)
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
        connections.push({
          fromId: sourceNote.id,
          toId: foundId,
          toTitle: idMap.get(foundId)?.title || title,
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

  // Replace @[Title] or @[Title](id) with custom markdown link syntax
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
  } catch (e) {
    return isoString;
  }
}

/**
 * Ensures a note title is unique among notes created on the same calendar day.
 * If a duplicate exists, appends (2), (3), etc.
 */
export function getUniqueTitleForDay(rawTitle: string, noteId: string, allNotes: Note[]): string {
  const baseTitle = (rawTitle || '').trim() || 'Untitled Note';
  const todayStr = new Date().toDateString();

  // Find all notes created on the same day (excluding the current note)
  const sameDayNotes = (allNotes || []).filter(
    (n) => n && n.id !== noteId && n.createdAt && new Date(n.createdAt).toDateString() === todayStr
  );

  const existingTitles = new Set(sameDayNotes.map((n) => (n.title || '').trim().toLowerCase()));

  if (!existingTitles.has(baseTitle.toLowerCase())) {
    return baseTitle;
  }

  // If baseTitle already exists for today, find next available suffix e.g. "Title (2)"
  let counter = 2;
  while (existingTitles.has(`${baseTitle} (${counter})`.toLowerCase())) {
    counter++;
  }

  return `${baseTitle} (${counter})`;
}
