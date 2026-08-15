import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotesManager } from '../useNotesManager';
import { useHistoryState } from '../useHistoryState';
import { db } from '../../lib/indexedDbStorage';
import { DEFAULT_SETTINGS, INITIAL_TRANSFORM } from '../../lib/storage';

describe('useNotesManager Hook & Persistence Lifecycle', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.notes.clear();
    await db.settings.clear();
    await db.transform.clear();
    vi.clearAllMocks();
  });

  it('hydrates notes from IndexedDB on initialization', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        notesResult.current.initAppDatabase(() => {
          resolve();
        });
      });
    });

    expect(notesResult.current.notes.length).toBeGreaterThan(0);
    expect(notesResult.current.lastSavedAt).not.toBeNull();
  });

  it('immediately marks newly created notes dirty and persists them across restart', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        notesResult.current.initAppDatabase(() => resolve());
      });
    });

    let newNoteId = '';
    act(() => {
      newNoteId = notesResult.current.handleAddNote(
        INITIAL_TRANSFORM,
        DEFAULT_SETTINGS,
        200,
        300,
        'My Special Note',
        'Hello World Content'
      );
    });

    expect(newNoteId).toBeTruthy();
    expect(notesResult.current.notes.some((n) => n.id === newNoteId)).toBe(true);

    // Wait for debounced autosave flush (500ms + buffer)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    // Verify written to IndexedDB
    const persisted = await db.notes.get(newNoteId);
    expect(persisted).toBeDefined();
    expect(persisted?.title).toBe('My Special Note');
    expect(persisted?.content).toBe('Hello World Content');

    // Simulate app restart: mount a fresh hook and initialize
    const { result: restartHistory } = renderHook(() => useHistoryState());
    const { result: restartNotes } = renderHook(() =>
      useNotesManager(restartHistory.current.pushHistorySnapshot, restartHistory.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        restartNotes.current.initAppDatabase(() => resolve());
      });
    });

    expect(restartNotes.current.notes.some((n) => n.id === newNoteId)).toBe(true);
    const restartedNote = restartNotes.current.notes.find((n) => n.id === newNoteId);
    expect(restartedNote?.title).toBe('My Special Note');
    expect(restartedNote?.content).toBe('Hello World Content');
  });

  it('persists clipboard paste note creation immediately without direct setNotes override', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        notesResult.current.initAppDatabase(() => resolve());
      });
    });

    let pastedId = '';
    act(() => {
      pastedId = notesResult.current.handleAddNote(
        INITIAL_TRANSFORM,
        DEFAULT_SETTINGS,
        undefined,
        undefined,
        'Pasted Title',
        'Pasted Markdown Body'
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    const dbRecord = await db.notes.get(pastedId);
    expect(dbRecord).toBeDefined();
    expect(dbRecord?.title).toBe('Pasted Title');
    expect(dbRecord?.content).toBe('Pasted Markdown Body');
  });

  it('performs $O(1)$ deletion from React state and IndexedDB', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        notesResult.current.initAppDatabase(() => resolve());
      });
    });

    let targetId = '';
    act(() => {
      targetId = notesResult.current.handleAddNote(
        INITIAL_TRANSFORM,
        DEFAULT_SETTINGS,
        100,
        100,
        'To Delete',
        'Bye'
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(await db.notes.get(targetId)).toBeDefined();

    // Delete note
    act(() => {
      notesResult.current.handleDeleteNote(targetId);
    });

    expect(notesResult.current.notes.some((n) => n.id === targetId)).toBe(false);

    // Wait a brief moment and verify IndexedDB has deleted it directly
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(await db.notes.get(targetId)).toBeUndefined();
  });

  it('reconciles and persists history undo/redo operations with IndexedDB', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        notesResult.current.initAppDatabase(() => resolve());
      });
    });

    let createdId = '';
    act(() => {
      createdId = notesResult.current.handleAddNote(
        INITIAL_TRANSFORM,
        DEFAULT_SETTINGS,
        10,
        10,
        'Note Before Delete',
        'Content'
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    // Delete note
    act(() => {
      notesResult.current.handleDeleteNote(createdId);
    });

    expect(notesResult.current.notes.some((n) => n.id === createdId)).toBe(false);

    // Undo deletion using historyResult.handleUndo + notesResult.handleRestoreNotes
    act(() => {
      historyResult.current.handleUndo(notesResult.current.handleRestoreNotes);
    });

    expect(notesResult.current.notes.some((n) => n.id === createdId)).toBe(true);

    // Allow autosave to persist the restored note
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    const restoredInDb = await db.notes.get(createdId);
    expect(restoredInDb).toBeDefined();
    expect(restoredInDb?.title).toBe('Note Before Delete');
  });

  it('generates standard UUIDs for new notes and daily journal entries', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    let noteId = '';
    act(() => {
      noteId = notesResult.current.handleAddNote(INITIAL_TRANSFORM, DEFAULT_SETTINGS);
    });
    expect(noteId).toMatch(/^note-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    let journalRes = { noteId: '', isNew: false };
    act(() => {
      journalRes = notesResult.current.handleCreateOrFocusDailyEntry(
        INITIAL_TRANSFORM,
        DEFAULT_SETTINGS,
        '2026-08-14'
      );
    });
    expect(journalRes.noteId).toMatch(
      /^journal-2026-08-14-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('marks note dirty and persists updated zIndex on bringToFront', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        notesResult.current.initAppDatabase(() => resolve());
      });
    });

    let note1Id = '';
    let note2Id = '';
    act(() => {
      note1Id = notesResult.current.handleAddNote(INITIAL_TRANSFORM, DEFAULT_SETTINGS);
    });
    act(() => {
      note2Id = notesResult.current.handleAddNote(INITIAL_TRANSFORM, DEFAULT_SETTINGS);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    // Bring note 1 to front
    act(() => {
      notesResult.current.bringToFront(note1Id);
    });

    const note1After = notesResult.current.notes.find((n) => n.id === note1Id);
    const note2After = notesResult.current.notes.find((n) => n.id === note2Id);
    expect((note1After?.zIndex || 0)).toBeGreaterThan(note2After?.zIndex || 0);

    // Wait for autosave
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    const note1InDb = await db.notes.get(note1Id);
    expect(note1InDb?.zIndex).toBe(note1After?.zIndex);
  });
});
