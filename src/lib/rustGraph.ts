import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types';
import { isTauriEnvironment as isTauriAvailable } from './rustStorage';
import type {
  MarkdownLink,
  MentionLink,
  ParsedLinks,
  NoteConnection,
  BacklinkItem,
} from '../types/generated';

export type { MarkdownLink, MentionLink, ParsedLinks, NoteConnection, BacklinkItem };

/**
 * Parses Markdown content using native pulldown-cmark AST parser to extract mentions, wikilinks, tags, and links.
 */
export async function parseNoteMarkdownLinks(content: string): Promise<ParsedLinks> {
  if (!isTauriAvailable()) {
    // Test environment fallback parser
    const mentions: string[] = [];
    const mentionLinks: MentionLink[] = [];
    const mentionMatches = content.matchAll(/@\[([^\]]+)\](?:\(([^)]+)\))?/g);
    for (const m of mentionMatches) {
      if (m[1]) {
        const title = m[1].trim();
        const targetId = m[2] ? m[2].trim() : null;
        if (!mentions.includes(title)) mentions.push(title);
        mentionLinks.push({ title, targetId });
      }
    }

    const wikilinks: string[] = [];
    const wikiMatches = content.matchAll(/\[\[([^\]]+)\]\]/g);
    for (const w of wikiMatches) {
      if (w[1]) {
        const raw = w[1].trim();
        const target = raw.includes('|') ? raw.split('|')[0].trim() : raw;
        if (!wikilinks.includes(target)) wikilinks.push(target);
      }
    }

    const tags: string[] = [];
    const tagMatches = content.matchAll(/#([a-zA-Z0-9_-]+)/g);
    for (const t of tagMatches) {
      if (t[1]) {
        const tag = t[1].toLowerCase();
        if (!tags.includes(tag)) tags.push(tag);
      }
    }

    const markdownLinks: MarkdownLink[] = [];
    const mdLinkMatches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const ml of mdLinkMatches) {
      if (ml[1] && ml[2]) {
        markdownLinks.push({ text: ml[1], target: ml[2] });
      }
    }

    return {
      mentions,
      mentionLinks,
      wikilinks,
      tags,
      markdownLinks,
    };
  }

  return await invoke<ParsedLinks>('parse_note_markdown_links', { content });
}

/**
 * Computes all directional link graph edges across notes via native Rust.
 */
export async function getNoteGraphConnections(notes: Note[]): Promise<NoteConnection[]> {
  if (!isTauriAvailable()) {
    // In-memory fallback for test runners
    const connections: NoteConnection[] = [];
    const titleToId = new Map<string, string>();
    const idToTitle = new Map<string, string>();

    for (const n of notes) {
      if (n.title && n.title.trim()) {
        titleToId.set(n.title.trim().toLowerCase(), n.id);
      }
      idToTitle.set(n.id, n.title || 'Untitled Note');
    }

    const seenEdges = new Set<string>();

    for (const note of notes) {
      if (!note.content) continue;
      const parsed = await parseNoteMarkdownLinks(note.content);

      for (const m of parsed.mentionLinks) {
        const targetId = m.targetId && idToTitle.has(m.targetId)
          ? m.targetId
          : titleToId.get(m.title.trim().toLowerCase());

        if (targetId && targetId !== note.id) {
          const edgeKey = `${note.id}->${targetId}`;
          if (!seenEdges.has(edgeKey)) {
            seenEdges.add(edgeKey);
            connections.push({
              fromNoteId: note.id,
              toNoteId: targetId,
              linkType: 'mention',
              label: idToTitle.get(targetId) || m.title,
            });
          }
        }
      }

      for (const w of parsed.wikilinks) {
        const targetId = titleToId.get(w.trim().toLowerCase());
        if (targetId && targetId !== note.id) {
          const edgeKey = `${note.id}->${targetId}`;
          if (!seenEdges.has(edgeKey)) {
            seenEdges.add(edgeKey);
            connections.push({
              fromNoteId: note.id,
              toNoteId: targetId,
              linkType: 'wikilink',
              label: w,
            });
          }
        }
      }
    }

    return connections;
  }

  return await invoke<NoteConnection[]>('get_note_graph_connections', { notes });
}

/**
 * Computes all incoming backlinks for a specific note via native Rust.
 */
export async function getNoteBacklinks(
  targetNoteId: string,
  notes: Note[]
): Promise<BacklinkItem[]> {
  if (!isTauriAvailable()) {
    const backlinks: BacklinkItem[] = [];
    const targetNote = notes.find((n) => n.id === targetNoteId);
    const targetTitleNorm = targetNote?.title?.trim().toLowerCase();

    for (const note of notes) {
      if (note.id === targetNoteId || !note.content) continue;
      const parsed = await parseNoteMarkdownLinks(note.content);
      const isMatch = parsed.mentionLinks.some(
        (m) => m.targetId === targetNoteId || (targetTitleNorm && m.title.trim().toLowerCase() === targetTitleNorm)
      ) || parsed.wikilinks.some((w) => targetTitleNorm && w.trim().toLowerCase() === targetTitleNorm);

      if (isMatch) {
        backlinks.push({
          sourceNoteId: note.id,
          sourceNoteTitle: note.title || 'Untitled Note',
          linkType: 'mention',
          contextSnippet: note.content.slice(0, 140),
        });
      }
    }
    return backlinks;
  }

  return await invoke<BacklinkItem[]>('get_note_backlinks', {
    targetNoteId,
    notes,
  });
}

