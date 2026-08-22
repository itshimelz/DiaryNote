import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { NoteCard } from '../index';
import { ImageNoteCard } from '../ImageNoteCard';
import { Note } from '../../../types';

type ResizeCallback = (entries: Partial<ResizeObserverEntry>[]) => void;

let resizeCallbacks: ResizeCallback[] = [];

class ControllableResizeObserver {
  private callback: ResizeCallback;
  constructor(cb: ResizeCallback) {
    this.callback = cb;
    resizeCallbacks.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    resizeCallbacks = resizeCallbacks.filter((c) => c !== this.callback);
  }
}

const originalResizeObserver = window.ResizeObserver;

describe('NoteCard Dynamic Auto-Height Synchronization & Stale Closure Fix', () => {
  beforeEach(() => {
    resizeCallbacks = [];
    window.ResizeObserver = ControllableResizeObserver as any;
  });

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  it('preserves newly typed content and custom title when ResizeObserver triggers auto-expansion', async () => {
    const initialNote: Note = {
      id: 'test-note-1',
      title: 'Initial Title',
      content: '',
      x: 100,
      y: 100,
      width: 280,
      height: 200,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
      fontFamily: 'sans',
      fontSize: 'md',
      paperTheme: 'white',
      zIndex: 1,
    };

    const onUpdateNote = vi.fn();

    const { rerender } = render(
      <NoteCard
        note={initialNote}
        allNotes={[initialNote]}
        zoom={1}
        isSelected={true}
        isFocused={true}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    // NoteCard is mounted and ResizeObserver is registered with the initial note state
    expect(resizeCallbacks.length).toBeGreaterThanOrEqual(1);

    // Simulate typing: title and multi-paragraph content are updated in state, re-rendering NoteCard
    const updatedNote: Note = {
      ...initialNote,
      title: 'My Important Meeting Notes',
      content: 'Line 1: Meeting agenda\nLine 2: Action item 1\nLine 3: Action item 2\nLine 4: Conclusions',
      updatedAt: '2026-08-20T00:01:00.000Z',
    };

    rerender(
      <NoteCard
        note={updatedNote}
        allNotes={[updatedNote]}
        zoom={1}
        isSelected={true}
        isFocused={true}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    // Now simulate DOM auto-expansion to 320px triggered by the multi-line text
    await act(async () => {
      for (const cb of resizeCallbacks) {
        cb([
          {
            borderBoxSize: [{ blockSize: 320, inlineSize: 280 }] as any,
            contentRect: { height: 320, width: 280 } as any,
          },
        ]);
      }
      // Allow requestAnimationFrame to execute
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    // onUpdateNote must be called with the new height (320) AND the live title & content
    expect(onUpdateNote).toHaveBeenCalled();
    const lastCallArg = onUpdateNote.mock.calls[onUpdateNote.mock.calls.length - 1][0];
    expect(lastCallArg.height).toBe(320);
    expect(lastCallArg.title).toBe('My Important Meeting Notes');
    expect(lastCallArg.content).toContain('Line 1: Meeting agenda');
    expect(lastCallArg.content).toContain('Line 4: Conclusions');
  });

  it('preserves checklist items when ResizeObserver triggers on expanding checklist', async () => {
    const initialChecklistNote: Note = {
      id: 'checklist-note-1',
      title: 'Sprint Tasks',
      content: '- [ ] First task',
      x: 100,
      y: 100,
      width: 280,
      height: 200,
      activeMode: 'checklist',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
      fontFamily: 'sans',
      fontSize: 'md',
      paperTheme: 'white',
      zIndex: 1,
    };

    const onUpdateNote = vi.fn();

    const { rerender } = render(
      <NoteCard
        note={initialChecklistNote}
        allNotes={[initialChecklistNote]}
        zoom={1}
        isSelected={true}
        isFocused={true}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    // User adds several checklist tasks
    const multiTaskNote: Note = {
      ...initialChecklistNote,
      content: '- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3\n- [ ] Task 4\n- [ ] Task 5\n- [ ] Task 6',
      updatedAt: '2026-08-20T00:02:00.000Z',
    };

    rerender(
      <NoteCard
        note={multiTaskNote}
        allNotes={[multiTaskNote]}
        zoom={1}
        isSelected={true}
        isFocused={true}
        onSelectNote={vi.fn()}
        onNavigateToNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
        onBringToFront={vi.fn()}
      />
    );

    // Simulate checklist expansion to 380px
    await act(async () => {
      for (const cb of resizeCallbacks) {
        cb([
          {
            borderBoxSize: [{ blockSize: 380, inlineSize: 280 }] as any,
            contentRect: { height: 380, width: 280 } as any,
          },
        ]);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(onUpdateNote).toHaveBeenCalled();
    const lastCallArg = onUpdateNote.mock.calls[onUpdateNote.mock.calls.length - 1][0];
    expect(lastCallArg.height).toBe(380);
    expect(lastCallArg.title).toBe('Sprint Tasks');
    expect(lastCallArg.content).toContain('Task 6');
  });

  it('preserves ImageNoteCard caption and title when ResizeObserver triggers', async () => {
    const initialImageNote: Note = {
      id: 'img-note-auto-1',
      title: 'Initial Photo',
      content: '',
      x: 100,
      y: 100,
      width: 340,
      height: 360,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
      fontFamily: 'caveat',
      fontSize: 'md',
      paperTheme: 'white',
      imageUrl: 'data:image/png;base64,test',
      zIndex: 1,
    };

    const onUpdateNote = vi.fn();

    const { rerender } = render(
      <ImageNoteCard
        note={initialImageNote}
        allNotes={[initialImageNote]}
        onSelectNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
      />
    );

    const updatedImageNote: Note = {
      ...initialImageNote,
      title: 'Summer Vacation Photo',
      content: 'Beautiful memories from our trip to Kyoto and Osaka',
      updatedAt: '2026-08-20T00:03:00.000Z',
    };

    rerender(
      <ImageNoteCard
        note={updatedImageNote}
        allNotes={[updatedImageNote]}
        onSelectNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
      />
    );

    // Simulate image card auto-expansion to 440px
    await act(async () => {
      for (const cb of resizeCallbacks) {
        cb([
          {
            borderBoxSize: [{ blockSize: 440, inlineSize: 340 }] as any,
            contentRect: { height: 440, width: 340 } as any,
          },
        ]);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(onUpdateNote).toHaveBeenCalled();
    const lastCallArg = onUpdateNote.mock.calls[onUpdateNote.mock.calls.length - 1][0];
    expect(lastCallArg.height).toBe(440);
    expect(lastCallArg.title).toBe('Summer Vacation Photo');
    expect(lastCallArg.content).toBe('Beautiful memories from our trip to Kyoto and Osaka');
  });
});
