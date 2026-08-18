import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeBatchLayout,
  findNearestSpatialNote,
} from '../rustLayout';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('rustLayout bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it('delegates computeBatchLayout to Tauri invoke', async () => {
    const mockOutput = [
      { id: 'n1', x: 100, y: 50 },
      { id: 'n2', x: 100, y: 150 },
    ];
    (invoke as any).mockResolvedValueOnce(mockOutput);

    const result = await computeBatchLayout([], 'align-left');
    expect(invoke).toHaveBeenCalledWith('compute_batch_layout', {
      notes: [],
      mode: 'align-left',
      spacing: null,
    });
    expect(result).toEqual(mockOutput);
  });

  it('delegates findNearestSpatialNote to Tauri invoke', async () => {
    (invoke as any).mockResolvedValueOnce('note-target');

    const result = await findNearestSpatialNote('note-origin', 'right', []);
    expect(invoke).toHaveBeenCalledWith('find_nearest_spatial_note', {
      currentNoteId: 'note-origin',
      direction: 'right',
      notes: [],
    });
    expect(result).toBe('note-target');
  });

  it('executes in-memory spatial navigation fallback when not in Tauri', async () => {
    delete (window as any).__TAURI_INTERNALS__;

    const notes = [
      { id: 'origin', x: 500, y: 500, width: 200, height: 200 },
      { id: 'right_node', x: 800, y: 500, width: 200, height: 200 },
      { id: 'left_node', x: 200, y: 500, width: 200, height: 200 },
      { id: 'down_node', x: 500, y: 800, width: 200, height: 200 },
      { id: 'up_node', x: 500, y: 200, width: 200, height: 200 },
    ];

    const right = await findNearestSpatialNote('origin', 'right', notes);
    expect(right).toBe('right_node');

    const left = await findNearestSpatialNote('origin', 'left', notes);
    expect(left).toBe('left_node');

    const down = await findNearestSpatialNote('origin', 'down', notes);
    expect(down).toBe('down_node');

    const up = await findNearestSpatialNote('origin', 'up', notes);
    expect(up).toBe('up_node');
  });
});
