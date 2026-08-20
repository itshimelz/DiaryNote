import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoteResize } from '../useNoteResize';
import { Note } from '../../types';

const mockNote: Note = {
  id: 'note-resize-1',
  title: 'Resize Test Note',
  content: 'Some note text',
  x: 100,
  y: 100,
  width: 432,
  height: 408,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  fontFamily: 'sans',
  fontSize: 'sm',
  paperTheme: 'white',
  zIndex: 1,
};

describe('useNoteResize Hook', () => {
  it('ignores non-primary clicks (e.g. right clicks)', () => {
    const onUpdateNote = vi.fn();
    const { result } = renderHook(() =>
      useNoteResize({
        note: mockNote,
        zoom: 1,
        isPanMode: false,
        onUpdateNote,
      })
    );

    act(() => {
      const rightClick = {
        button: 2,
        clientX: 200,
        clientY: 200,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent;
      result.current.handleResizeMouseDown(rightClick);
    });

    expect(result.current.isResizing).toBe(false);
  });

  it('accurately resizes note width and height on mouse drag', () => {
    const onUpdateNote = vi.fn();
    const cardEl = document.createElement('div');
    const cardRef = { current: cardEl };

    const { result } = renderHook(() =>
      useNoteResize({
        note: mockNote,
        zoom: 1,
        isPanMode: false,
        snapToGrid: false,
        onUpdateNote,
        cardRef,
      })
    );

    act(() => {
      const mouseDownEvent = {
        button: 0,
        clientX: 532,
        clientY: 508,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent;
      result.current.handleResizeMouseDown(mouseDownEvent);
    });

    expect(result.current.isResizing).toBe(true);

    // Simulate mousemove (+50px width, +60px height)
    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 582,
        clientY: 568,
      });
      window.dispatchEvent(moveEvent);
    });

    expect(cardEl.style.width).toBe('482px');
    expect(cardEl.style.minHeight).toBe('468px');

    // Simulate mouseup
    act(() => {
      const mouseUpEvent = new MouseEvent('mouseup');
      window.dispatchEvent(mouseUpEvent);
    });

    expect(result.current.isResizing).toBe(false);
    expect(onUpdateNote).toHaveBeenCalledTimes(1);
    expect(onUpdateNote).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 482,
        height: 468,
        updatedAt: mockNote.updatedAt,
      })
    );
  });

  it('enforces minimum width and height constraints', () => {
    const onUpdateNote = vi.fn();
    const cardEl = document.createElement('div');
    const cardRef = { current: cardEl };

    const { result } = renderHook(() =>
      useNoteResize({
        note: mockNote,
        zoom: 1,
        isPanMode: false,
        snapToGrid: false,
        onUpdateNote,
        cardRef,
      })
    );

    act(() => {
      result.current.handleResizeMouseDown({
        button: 0,
        clientX: 500,
        clientY: 500,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    // Shrink drastically (-400px)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(onUpdateNote).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 280, // MIN_NOTE_WIDTH
        height: 200, // MIN_NOTE_HEIGHT
      })
    );
  });

  it('locks aspect ratio when Shift key is pressed during resize', () => {
    const onUpdateNote = vi.fn();
    const cardEl = document.createElement('div');
    const cardRef = { current: cardEl };

    const { result } = renderHook(() =>
      useNoteResize({
        note: { ...mockNote, width: 400, height: 200 }, // 2:1 ratio
        zoom: 1,
        isPanMode: false,
        snapToGrid: false,
        onUpdateNote,
        cardRef,
      })
    );

    act(() => {
      result.current.handleResizeMouseDown({
        button: 0,
        clientX: 400,
        clientY: 200,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 500, clientY: 200, shiftKey: true })
      );
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(onUpdateNote).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 500,
        height: 250, // Preserves 2:1 ratio (400x200 -> 500x250)
      })
    );
  });
});
