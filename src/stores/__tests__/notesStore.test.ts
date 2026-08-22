import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Rust storage bridge before importing the store (module-scoped timers/dirty
// sets make isolated module registries necessary).
vi.mock('../../lib/rustStorage', () => {
  const storage = new Map<string, unknown>();
  return {
    initDatabase: vi.fn(async () => ({ notes: [], transform: null, settings: null })),
    saveDirtyNotesToDB: vi.fn(async () => true),
    saveCanvasTransformToDB: vi.fn(async () => {}),
    saveAppSettingsToDB: vi.fn(async () => {}),
    deleteNoteFromDB: vi.fn(async () => true),
    deleteMultipleNotesFromDB: vi.fn(async () => true),
    resetMockStorage: () => storage.clear(),
  };
});

import {
  useNotesStore,
  registerNotesHistoryBridge,
  getNotesArray,
} from '../notesStore';
import {
  saveDirtyNotesToDB,
  deleteNoteFromDB,
  deleteMultipleNotesFromDB,
} from '../../lib/rustStorage';

const makeNote = (id: string, over: Partial<Record<string, unknown>> = {}): any => ({
  id,
  title: id,
  content: '',
  x: 0,
  y: 0,
  width: 320,
  height: 360,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  fontFamily: 'sans',
  fontSize: 'md',
  paperTheme: 'white',
  zIndex: 1,
  ...over,
});

describe('notesStore', () => {
  let commitLog: string[][];
  let resets = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    commitLog = [];
    resets = 0;
    registerNotesHistoryBridge({
      commitSnapshot: (list) => {
        commitLog.push(list.map((n) => n.id));
      },
      resetHistory: () => resets++,
    });
    useNotesStore.getState().hydrate([]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('insert always assigns top z-index and commits history immediately', () => {
    useNotesStore.getState().insert(makeNote('a', { zIndex: 5 }));
    useNotesStore.getState().insert(makeNote('b'));

    const arr = getNotesArray();
    expect(arr.map((n) => n.id)).toEqual(['a', 'b']);
    expect(arr[0].zIndex).toBe(2); // creator-provided z is ignored (legacy parity)
    expect(arr[1].zIndex).toBe(3);
    expect(commitLog.at(-1)).toEqual(['a', 'b']);
  });

  it('update coalesces history pushes within the debounce window', async () => {
    useNotesStore.getState().insert(makeNote('a'));
    await vi.advanceTimersByTimeAsync(500); // flush insert's autosave
    commitLog = [];

    useNotesStore.getState().update(makeNote('a', { updatedAt: 't2' }));
    useNotesStore.getState().update(makeNote('a', { updatedAt: 't3' }));

    // No immediate commit; one coalesced push after 400ms
    await vi.advanceTimersByTimeAsync(399);
    expect(commitLog.length).toBe(0);
    await vi.advanceTimersByTimeAsync(2);
    expect(commitLog.length).toBe(1);
  });

  it('autosave persists only dirty notes after the debounce', async () => {
    useNotesStore.getState().insert(makeNote('keep'));
    useNotesStore.getState().insert(makeNote('edit-me'));
    await vi.advanceTimersByTimeAsync(900); // flush baseline dirtiness from inserts
    vi.mocked(saveDirtyNotesToDB).mockClear();

    useNotesStore.getState().update(makeNote('edit-me', { updatedAt: 't9' }));

    await vi.advanceTimersByTimeAsync(500);
    expect(saveDirtyNotesToDB).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(saveDirtyNotesToDB).mock.calls[0][0] as any[];
    expect(saved.map((n) => n.id)).toEqual(['edit-me']);
    // min 350ms "isSaving" display window elapses
    await vi.advanceTimersByTimeAsync(400);
    expect(useNotesStore.getState().isSaving).toBe(false);
    expect(useNotesStore.getState().lastSavedAt).not.toBeNull();
  });

  it('keeps notes dirty when re-edited while a save is in flight (lost-update race)', async () => {
    let resolveSave!: (v: boolean) => void;
    vi.mocked(saveDirtyNotesToDB).mockImplementationOnce(
      () => new Promise<boolean>((res) => (resolveSave = res))
    );

    useNotesStore.getState().insert(makeNote('x'));
    useNotesStore.getState().update(makeNote('x', { updatedAt: 's1' }));
    await vi.advanceTimersByTimeAsync(500); // save starts, hangs

    // Re-edit while save is in flight
    useNotesStore.getState().update(makeNote('x', { updatedAt: 's2' }));
    resolveSave(true);
    await vi.advanceTimersByTimeAsync(350);

    // The second edit must still be dirty -> next debounce saves it again
    vi.mocked(saveDirtyNotesToDB).mockClear();
    await vi.advanceTimersByTimeAsync(500);
    expect(saveDirtyNotesToDB).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(saveDirtyNotesToDB).mock.calls[0][0] as any[];
    expect(saved.map((n) => n.id)).toEqual(['x']);
    expect(saved[0].updatedAt).toBe('s2');
  });

  it('bringToFront bumps z-order and skips when already top-unique', () => {
    useNotesStore.getState().insert(makeNote('a'));
    useNotesStore.getState().insert(makeNote('b'));

    useNotesStore.getState().bringToFront('a');
    expect(useNotesStore.getState().notesById['a'].zIndex).toBe(4);

    useNotesStore.getState().bringToFront('a');
    expect(useNotesStore.getState().notesById['a'].zIndex).toBe(4); // already top-unique
  });

  it('remove deletes from state, calls IPC, and commits history now', () => {
    useNotesStore.getState().insert(makeNote('a'));
    useNotesStore.getState().insert(makeNote('b'));

    useNotesStore.getState().remove('a');

    expect(getNotesArray().map((n) => n.id)).toEqual(['b']);
    expect(deleteNoteFromDB).toHaveBeenCalledWith('a');
    expect(commitLog.at(-1)).toEqual(['b']);
  });

  it('restore reconciles dirty flags and issues IPC deletes for removed ids', () => {
    useNotesStore.getState().insert(makeNote('stay'));
    useNotesStore.getState().insert(makeNote('gone'));
    vi.clearAllMocks();

    const restored = [makeNote('stay'), makeNote('new', { updatedAt: 'r1' })];
    useNotesStore.getState().restore(restored as any[]);

    expect(getNotesArray().map((n) => n.id)).toEqual(['stay', 'new']);
    expect(deleteMultipleNotesFromDB).toHaveBeenCalledWith(['gone']);
    expect(useNotesStore.getState().saveError).toBeNull();
  });

  it('hydrate replaces contents and resets the history bridge', () => {
    useNotesStore.getState().insert(makeNote('old'));
    useNotesStore.getState().hydrate([makeNote('fresh')]);

    expect(getNotesArray().map((n) => n.id)).toEqual(['fresh']);
    expect(resets).toBeGreaterThan(0);
  });
});
