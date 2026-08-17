import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types';
import { isTauriEnvironment as isTauriAvailable } from './rustStorage';

export interface MarkdownLink {
  text: string;
  target: string;
}

export interface ParsedLinks {
  mentions: string[];
  wikilinks: string[];
  tags: string[];
  markdown_links: MarkdownLink[];
}

export interface NoteConnection {
  from_note_id: string;
  to_note_id: string;
  link_type: string;
  label: string;
}

export interface BacklinkItem {
  source_note_id: string;
  source_note_title: string;
  link_type: string;
  context_snippet: string;
}


/**
 * Parses Markdown content using native pulldown-cmark AST parser to extract mentions, wikilinks, tags, and links.
 */
export async function parseNoteMarkdownLinks(content: string): Promise<ParsedLinks> {
  if (!isTauriAvailable()) {
    // Basic fallback regex parser
    const mentions: string[] = [];
    const mentionMatches = content.matchAll(/@\[(.*?)\]/g);
    for (const m of mentionMatches) {
      if (m[1]) mentions.push(m[1].trim());
    }

    const wikilinks: string[] = [];
    const wikiMatches = content.matchAll(/\[\[(.*?)\]\]/g);
    for (const w of wikiMatches) {
      if (w[1]) wikilinks.push(w[1].trim());
    }

    const tags: string[] = [];
    const tagMatches = content.matchAll(/#([a-zA-Z0-9_-]+)/g);
    for (const t of tagMatches) {
      if (t[1]) tags.push(t[1].toLowerCase());
    }

    return {
      mentions,
      wikilinks,
      tags,
      markdown_links: [],
    };
  }

  return await invoke<ParsedLinks>('parse_note_markdown_links', { content });
}

/**
 * Computes all directional link graph edges across notes via Rust.
 */
export async function getNoteGraphConnections(notes: Note[]): Promise<NoteConnection[]> {
  if (!isTauriAvailable()) {
    return [];
  }

  return await invoke<NoteConnection[]>('get_note_graph_connections', { notes });
}

/**
 * Computes all incoming backlinks for a specific note via Rust.
 */
export async function getNoteBacklinks(
  targetNoteId: string,
  notes: Note[]
): Promise<BacklinkItem[]> {
  if (!isTauriAvailable()) {
    return [];
  }

  return await invoke<BacklinkItem[]>('get_note_backlinks', {
    targetNoteId,
    notes,
  });
}
