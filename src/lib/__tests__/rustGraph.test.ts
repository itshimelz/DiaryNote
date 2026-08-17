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
      wikilinks: ['Roadmap'],
      tags: ['rust', 'tauri'],
      markdown_links: [{ text: 'Docs', target: 'https://docs.rs' }],
    };
    (invoke as any).mockResolvedValueOnce(mockLinks);

    const parsed = await parseNoteMarkdownLinks('See @[Database Design] and #rust');
    expect(invoke).toHaveBeenCalledWith('parse_note_markdown_links', {
      content: 'See @[Database Design] and #rust',
    });
    expect(parsed.mentions).toEqual(['Database Design']);
    expect(parsed.tags).toEqual(['rust', 'tauri']);
  });

  it('delegates getNoteGraphConnections to Tauri invoke', async () => {
    const mockConnections = [
      {
        from_note_id: 'n1',
        to_note_id: 'n2',
        link_type: 'mention',
        label: 'Database Design',
      },
    ];
    (invoke as any).mockResolvedValueOnce(mockConnections);

    const connections = await getNoteGraphConnections([]);
    expect(invoke).toHaveBeenCalledWith('get_note_graph_connections', { notes: [] });
    expect(connections.length).toBe(1);
    expect(connections[0].from_note_id).toBe('n1');
  });

  it('delegates getNoteBacklinks to Tauri invoke', async () => {
    const mockBacklinks = [
      {
        source_note_id: 'n1',
        source_note_title: 'Architecture',
        link_type: 'mention',
        context_snippet: 'Refer to @[Database Design]...',
      },
    ];
    (invoke as any).mockResolvedValueOnce(mockBacklinks);

    const backlinks = await getNoteBacklinks('n2', []);
    expect(invoke).toHaveBeenCalledWith('get_note_backlinks', {
      targetNoteId: 'n2',
      notes: [],
    });
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].source_note_id).toBe('n1');
  });
});
