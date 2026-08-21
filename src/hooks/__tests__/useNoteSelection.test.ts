import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoteSelection } from '../useNoteSelection';
import { Note } from '../../types';

describe('useNoteSelection Hook & Shortcuts', () => {
  const dummyNotes: Note[] = [
    {
      id: 'note-1',
      title: 'First Note',
      content: 'Hello World',
      x: 100,
      y: 200,
      width: 320,
      height: 240,
      fontFamily: 'caveat',
      fontSize: 'md',
      paperTheme: 'white',
      isPinned: false,
      isLocked: false,
      zIndex: 1,
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: 'Testing',
      x: 400,
      y: 500,
      width: 320,
      height: 240,
      fontFamily: 'caveat',
      fontSize: 'md',
      paperTheme: 'white',
      isPinned: false,
      isLocked: false,
      zIndex: 2,
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
    },
  ];

  it('triggers onCutNotes when Ctrl+X is pressed on selected notes', () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();
    const onCutNotes = vi.fn();
    const onPasteRelocateNotes = vi.fn();
    const onCancelCutNotes = vi.fn();

    const { result } = renderHook(() =>
      useNoteSelection(
        dummyNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onCutNotes,
        onPasteRelocateNotes,
        onCancelCutNotes
      )
    );

    // Select a note
    act(() => {
      result.current.handleSelectNote('note-1');
    });
    expect(result.current.selectedNoteIds).toEqual(['note-1']);

    // Fire Ctrl+X
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'x',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(onCutNotes).toHaveBeenCalledTimes(1);
    expect(result.current.selectedNoteIds).toEqual([]);
  });

  it('triggers onPasteRelocateNotes when Ctrl+Shift+V or Ctrl+V is pressed', () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();
    const onCutNotes = vi.fn();
    const onPasteRelocateNotes = vi.fn();
    const onCancelCutNotes = vi.fn();

    renderHook(() =>
      useNoteSelection(
        dummyNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onCutNotes,
        onPasteRelocateNotes,
        onCancelCutNotes,
        true
      )
    );

    // Fire Ctrl+Shift+V
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(onPasteRelocateNotes).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancelCutNotes and clears selection on Escape when hasCutNotes is true', () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();
    const onCutNotes = vi.fn();
    const onPasteRelocateNotes = vi.fn();
    const onCancelCutNotes = vi.fn();

    const { result } = renderHook(() =>
      useNoteSelection(
        dummyNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onCutNotes,
        onPasteRelocateNotes,
        onCancelCutNotes,
        true
      )
    );

    act(() => {
      result.current.handleSelectNote('note-1');
    });
    expect(result.current.selectedNoteIds).toEqual(['note-1']);

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(onCancelCutNotes).toHaveBeenCalledTimes(1);
    expect(result.current.selectedNoteIds).toEqual([]);
  });

  it('does not trigger onCancelCutNotes on Escape when hasCutNotes is false', () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();
    const onCutNotes = vi.fn();
    const onPasteRelocateNotes = vi.fn();
    const onCancelCutNotes = vi.fn();

    const { result } = renderHook(() =>
      useNoteSelection(
        dummyNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onCutNotes,
        onPasteRelocateNotes,
        onCancelCutNotes,
        false
      )
    );

    act(() => {
      result.current.handleSelectNote('note-1');
    });
    expect(result.current.selectedNoteIds).toEqual(['note-1']);

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(onCancelCutNotes).not.toHaveBeenCalled();
    expect(result.current.selectedNoteIds).toEqual([]);
  });

  it('navigates to nearest spatial note on Arrow keys when a note is selected', async () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();

    const { result } = renderHook(() =>
      useNoteSelection(
        dummyNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen
      )
    );

    // Select first note
    act(() => {
      result.current.handleSelectNote('note-1');
    });
    expect(result.current.selectedNoteIds).toEqual(['note-1']);

    // Press ArrowRight (moves from note-1 at (100, 200) to note-2 at (400, 500))
    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedNoteIds).toEqual(['note-2']);
  });

  it('triggers onToggleCoverSelectedNotes when Alt+C is pressed on selected notes', () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();
    const onToggleCoverSelectedNotes = vi.fn();

    const { result } = renderHook(() =>
      useNoteSelection(
        dummyNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        onToggleCoverSelectedNotes
      )
    );

    // Select note-1
    act(() => {
      result.current.handleSelectNote('note-1');
    });

    // Press Alt+C
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        altKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(onToggleCoverSelectedNotes).toHaveBeenCalledWith(['note-1']);

    // Shift+C alone no longer toggles the cover (collapsed to Alt+C only)
    const callCountAfterAltC = onToggleCoverSelectedNotes.mock.calls.length;
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(onToggleCoverSelectedNotes).toHaveBeenCalledTimes(callCountAfterAltC);
  });

  it('ensures handleSelectMultipleNotes clears editingNoteId', () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();

    const { result } = renderHook(() =>
      useNoteSelection(
        dummyNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen
      )
    );

    act(() => {
      result.current.setEditingNoteId('note-1');
    });
    expect(result.current.editingNoteId).toBe('note-1');

    act(() => {
      result.current.handleSelectMultipleNotes(['note-1', 'note-2']);
    });
    expect(result.current.editingNoteId).toBeNull();
    expect(result.current.selectedNoteIds).toEqual(['note-1', 'note-2']);
  });

  it('does NOT trigger edit mode on Enter key if selected note is covered', () => {
    const coveredNotes: Note[] = [
      {
        ...dummyNotes[0],
        id: 'covered-note-1',
        isCovered: true,
      },
    ];
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();
    const requestDeleteNotes = vi.fn();
    const setIsSearchOpen = vi.fn();

    const { result } = renderHook(() =>
      useNoteSelection(
        coveredNotes,
        handleUndo,
        handleRedo,
        requestDeleteNotes,
        setIsSearchOpen
      )
    );

    act(() => {
      result.current.handleSelectNote('covered-note-1');
    });

    expect(result.current.selectedNoteIds).toEqual(['covered-note-1']);
    expect(result.current.editingNoteId).toBeNull();

    // Press Enter
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    // Remains null, does not enter edit mode
    expect(result.current.editingNoteId).toBeNull();
  });
});
