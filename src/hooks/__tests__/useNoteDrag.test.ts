import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoteDrag } from '../useNoteDrag';
import { Note } from '../../types';

const mockNote: Note = {
  id: 'note-1',
  title: 'Test Note',
  content: 'Content',
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

describe('useNoteDrag Hook', () => {
  it('ignores non-primary mouse clicks (e.g. right-click) and does not mutate selection', () => {
    const onSelectNote = vi.fn();
    const onBringToFront = vi.fn();
    const onUpdateNote = vi.fn();

    const { result } = renderHook(() =>
      useNoteDrag({
        note: mockNote,
        allNotes: [mockNote],
        zoom: 1,
        selectedNoteIds: ['note-1', 'note-2'],
        isPanMode: false,
        snapToGrid: false,
        onSelectNote,
        onNavigateToNote: vi.fn(),
        onUpdateNote,
        onBringToFront,
      })
    );

    // Simulate right-click mousedown (button = 2)
    act(() => {
      const rightClickEvent = {
        button: 2,
        clientX: 150,
        clientY: 150,
        target: document.createElement('div'),
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      result.current.handleMouseDown(rightClickEvent);
    });

    // None of the drag or selection mutations should occur
    expect(onSelectNote).not.toHaveBeenCalled();
    expect(onBringToFront).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
  });
});
