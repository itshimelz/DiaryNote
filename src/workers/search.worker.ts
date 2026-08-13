/**
 * Web Worker for Off-Main-Thread Search Indexing & Querying
 * Executes full-text token matching, hashtag filters, and date lookups with zero main-thread overhead.
 */

export interface IndexedNoteItem {
  id: string;
  title: string;
  plainSnippet: string;
  userHashtags: string[];
  isLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdTimestamp?: number;
  updatedTimestamp?: number;
  tokens: string[];
}

let indexedNotes: IndexedNoteItem[] = [];

self.onmessage = (e: MessageEvent<{ type: string; payload: any }>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INDEX_NOTES': {
      const rawNotes: any[] = payload.notes || [];
      indexedNotes = rawNotes.map((note) => {
        const title = (note.title || '').toLowerCase();
        const content = (note.content || '').toLowerCase();
        const tags = (note.tags || []).map((t: string) => t.toLowerCase());

        const hashtags: string[] = (
          (note.title + ' ' + note.content).match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g) ||
          note.tags ||
          []
        ).filter((t: string) => !/^#?Group\s/i.test(t));

        const plainSnippet = note.content
          ? note.content
              .replace(/^#+\s+/gm, '')
              .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, '✓ ')
              .replace(/^[-*+]\s+/gm, '• ')
              .replace(/[*_~`#]/g, '')
              .replace(/\s+/g, ' ')
              .trim()
          : '';

        const tokenSet = new Set<string>();
        title.split(/\s+/).forEach((w: string) => w && tokenSet.add(w));
        content.split(/\s+/).forEach((w: string) => w && tokenSet.add(w));
        tags.forEach((t: string) => tokenSet.add(t));
        hashtags.forEach((h: string) => tokenSet.add(h.toLowerCase()));

        return {
          id: note.id,
          title: note.title || '',
          plainSnippet,
          userHashtags: Array.from(new Set(hashtags)),
          isLocked: note.isLocked,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          createdTimestamp: note.createdTimestamp || new Date(note.createdAt || 0).getTime(),
          updatedTimestamp: note.updatedTimestamp || new Date(note.updatedAt || 0).getTime(),
          tokens: Array.from(tokenSet),
        };
      });

      self.postMessage({ type: 'INDEX_COMPLETE', count: indexedNotes.length });
      break;
    }

    case 'SEARCH': {
      const { query = '', filterType = 'all', requestId } = payload;
      const q = query.toLowerCase().trim();

      if (!q) {
        // Return sorted by updated timestamp
        const sorted = [...indexedNotes].sort((a, b) => (b.updatedTimestamp || 0) - (a.updatedTimestamp || 0));
        self.postMessage({
          type: 'SEARCH_RESULTS',
          requestId,
          results: sorted.map((n) => n.id),
        });
        return;
      }

      const results = indexedNotes.filter((note) => {
        if (note.isLocked) {
          return 'locked note'.includes(q);
        }

        if (filterType === 'tags') {
          const queryTag = q.startsWith('#') ? q : `#${q}`;
          return note.userHashtags.some((t) => t.toLowerCase().includes(queryTag));
        }

        if (filterType === 'date') {
          const cDate = (note.createdAt || '').toLowerCase();
          const uDate = (note.updatedAt || '').toLowerCase();
          return cDate.includes(q) || uDate.includes(q);
        }

        return (
          note.title.toLowerCase().includes(q) ||
          note.plainSnippet.toLowerCase().includes(q) ||
          note.tokens.some((token) => token.includes(q))
        );
      });

      self.postMessage({
        type: 'SEARCH_RESULTS',
        requestId,
        results: results.map((n) => n.id),
      });
      break;
    }

    default:
      break;
  }
};
