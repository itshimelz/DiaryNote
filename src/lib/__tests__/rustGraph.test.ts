import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseNoteMarkdownLinks,
  getNoteGraphConnections,
  getNoteBacklinks,
} from '../rustGraph';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('rustGraph bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it('delegates parseNoteMarkdownLinks to Tauri invoke', async () => {
    const mockLinks = {
      mentions: ['Database Design'],
      mentionLinks: [{ title: 'Database Design', targetId: 'note-2' }],
      wikilinks: ['Roadmap'],
      tags: ['rust', 'tauri'],
      markdownLinks: [{ text: 'Docs', target: 'https://docs.rs' }],
    };
    (invoke as any).mockResolvedValueOnce(mockLinks);

    const parsed = await parseNoteMarkdownLinks('See @[Database Design](note-2) and #rust');
    expect(invoke).toHaveBeenCalledWith('parse_note_markdown_links', {
      content: 'See @[Database Design](note-2) and #rust',
    });
    expect(parsed.mentions).toEqual(['Database Design']);
    expect(parsed.tags).toEqual(['rust', 'tauri']);
  });

  it('delegates getNoteGraphConnections to Tauri invoke', async () => {
    const mockConnections = [
      {
        fromNoteId: 'n1',
        toNoteId: 'n2',
        linkType: 'mention',
        label: 'Database Design',
      },
    ];
    (invoke as any).mockResolvedValueOnce(mockConnections);

    const connections = await getNoteGraphConnections([]);
    expect(invoke).toHaveBeenCalledWith('get_note_graph_connections', { notes: [] });
    expect(connections.length).toBe(1);
    expect(connections[0].fromNoteId).toBe('n1');
  });

  it('delegates getNoteBacklinks to Tauri invoke', async () => {
    const mockBacklinks = [
      {
        sourceNoteId: 'n1',
        sourceNoteTitle: 'Architecture',
        linkType: 'mention',
        contextSnippet: 'Refer to @[Database Design]...',
      },
    ];
    (invoke as any).mockResolvedValueOnce(mockBacklinks);

    const backlinks = await getNoteBacklinks('n2', []);
    expect(invoke).toHaveBeenCalledWith('get_note_backlinks', {
      targetNoteId: 'n2',
      notes: [],
    });
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].sourceNoteId).toBe('n1');
  });

  it('executes in-memory fallback when not in Tauri environment', async () => {
    delete (window as any).__TAURI_INTERNALS__;
    const testNotes: any[] = [
      { id: 'n1', title: 'Note 1', content: 'Links to @[Note 2](n2)' },
      { id: 'n2', title: 'Note 2', content: 'Back to [[Note 1]]' },
    ];

    const connections = await getNoteGraphConnections(testNotes);
    expect(connections.length).toBe(2);
    expect(connections[0].fromNoteId).toBe('n1');
    expect(connections[0].toNoteId).toBe('n2');
  });
});

