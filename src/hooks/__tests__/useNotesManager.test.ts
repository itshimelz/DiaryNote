import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotesManager } from '../useNotesManager';
import { useHistoryState } from '../useHistoryState';
import { initDatabase, resetMockStorage } from '../../lib/rustStorage';
import { DEFAULT_SETTINGS, INITIAL_TRANSFORM } from '../../lib/storage';

describe('useNotesManager Hook & Persistence Lifecycle', () => {
  beforeEach(async () => {
    localStorage.clear();
    resetMockStorage();
    vi.clearAllMocks();
  });

  it('hydrates notes from native storage on initialization', async () => {
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

    // Verify written to storage
    const { notes: persistedNotes } = await initDatabase();
    const persisted = persistedNotes.find((n) => n.id === newNoteId);
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

    const { notes: dbRecords } = await initDatabase();
    const dbRecord = dbRecords.find((n) => n.id === pastedId);
    expect(dbRecord).toBeDefined();
    expect(dbRecord?.title).toBe('Pasted Title');
    expect(dbRecord?.content).toBe('Pasted Markdown Body');
  });

  it('performs $O(1)$ deletion from React state and persistent storage', async () => {
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

    const { notes: beforeDeleteNotes } = await initDatabase();
    expect(beforeDeleteNotes.find((n) => n.id === targetId)).toBeDefined();

    // Delete note
    act(() => {
      notesResult.current.handleDeleteNote(targetId);
    });

    expect(notesResult.current.notes.some((n) => n.id === targetId)).toBe(false);

    // Wait a brief moment and verify storage has deleted it directly
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const { notes: afterDeleteNotes } = await initDatabase();
    expect(afterDeleteNotes.find((n) => n.id === targetId)).toBeUndefined();
  });

  it('reconciles and persists history undo/redo operations with storage', async () => {
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

    const { notes: restoredNotes } = await initDatabase();
    const restoredInDb = restoredNotes.find((n) => n.id === createdId);
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
    const createdNote = notesResult.current.notes.find((n) => n.id === noteId);
    expect(createdNote?.isPinned).toBe(false);

    let journalResult = { noteId: '', isNew: false };
    act(() => {
      journalResult = notesResult.current.handleCreateOrFocusDailyEntry(INITIAL_TRANSFORM, DEFAULT_SETTINGS);
    });

    expect(journalResult.noteId).toMatch(/^journal-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(journalResult.isNew).toBe(true);
    const createdJournal = notesResult.current.notes.find((n) => n.id === journalResult.noteId);
    expect(createdJournal?.isPinned).toBe(false);
  });

  it('preserves and persists note layering when bringToFront is called', async () => {
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
      note1Id = notesResult.current.handleAddNote(INITIAL_TRANSFORM, DEFAULT_SETTINGS, 0, 0, 'Card 1');
      note2Id = notesResult.current.handleAddNote(INITIAL_TRANSFORM, DEFAULT_SETTINGS, 50, 50, 'Card 2');
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

    const { notes: layerNotes } = await initDatabase();
    const note1InDb = layerNotes.find((n) => n.id === note1Id);
    expect(note1InDb?.zIndex).toBe(note1After?.zIndex);
  });

  it('creates image notes with polaroid style, pin decoration, and rotation persisted to db', async () => {
    const { result: historyResult } = renderHook(() => useHistoryState());
    const { result: notesResult } = renderHook(() =>
      useNotesManager(historyResult.current.pushHistorySnapshot, historyResult.current.resetHistory)
    );

    await act(async () => {
      await new Promise<void>((resolve) => {
        notesResult.current.initAppDatabase(() => resolve());
      });
    });

    let imageNoteId = '';
    act(() => {
      imageNoteId = notesResult.current.handleAddImageNote(
        INITIAL_TRANSFORM,
        DEFAULT_SETTINGS,
        'data:image/png;base64,test-image-data',
        'image/png',
        250,
        350,
        'Trip to Tokyo',
        'Memories from 2026',
        'polaroid',
        'pushpin-red',
        1.25
      );
    });

    expect(imageNoteId).toBeTruthy();
    const createdNote = notesResult.current.notes.find((n) => n.id === imageNoteId);
    expect(createdNote).toBeDefined();
    expect(createdNote?.imageUrl).toBe('data:image/png;base64,test-image-data');
    expect(createdNote?.frameStyle).toBe('polaroid');
    expect(createdNote?.pinStyle).toBe('pushpin-red');
    expect(createdNote?.imageAspectRatio).toBe(1.25);
    expect(createdNote?.rotation).toBeDefined();

    // Wait for autosave
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    const { notes: imgNotes } = await initDatabase();
    const noteInDb = imgNotes.find((n) => n.id === imageNoteId);
    expect(noteInDb?.imageUrl).toBe('data:image/png;base64,test-image-data');
    expect(noteInDb?.frameStyle).toBe('polaroid');
    expect(noteInDb?.pinStyle).toBe('pushpin-red');
  });
});
