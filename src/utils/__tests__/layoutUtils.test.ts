import { describe, it, expect } from 'vitest';
import {
  alignLeft,
  alignCenterHorizontal,
  alignRight,
  alignTop,
  alignCenterVertical,
  alignBottom,
  distributeHorizontally,
  distributeVertically,
  arrangeInGrid,
  calculateGroupBounds,
} from '../layoutUtils';
import { Note } from '../../types';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../../constants/canvas';

const createMockNote = (id: string, x: number, y: number, width = DEFAULT_NOTE_WIDTH, height = DEFAULT_NOTE_HEIGHT): Note => ({
  id,
  title: `Note ${id}`,
  content: 'Content',
  x,
  y,
  width,
  height,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  fontFamily: 'sans',
  fontSize: 'sm',
  paperTheme: 'white',
  zIndex: 1,
});

describe('Layout Utilities (Alignment, Distribution, Grid & Group Bounds)', () => {
  it('alignTop aligns all notes to the minimum Y coordinate without corrupting X', () => {
    const notes = [
      createMockNote('1', 1200, 150),
      createMockNote('2', 800, 50),
      createMockNote('3', 1500, 300),
    ];

    const aligned = alignTop(notes);
    expect(aligned.map((n) => n.y)).toEqual([50, 50, 50]);
    // X positions must remain untouched
    expect(aligned.map((n) => n.x)).toEqual([1200, 800, 1500]);
  });

  it('alignBottom aligns all notes to the bottommost edge', () => {
    const notes = [
      createMockNote('1', 100, 100, 400, 300), // bottom: 400
      createMockNote('2', 200, 200, 400, 500), // bottom: 700
    ];

    const aligned = alignBottom(notes);
    expect(aligned.find((n) => n.id === '1')?.y).toBe(700 - 300);
    expect(aligned.find((n) => n.id === '2')?.y).toBe(700 - 500);
  });

  it('alignLeft aligns all notes to the leftmost X position', () => {
    const notes = [
      createMockNote('1', 500, 100),
      createMockNote('2', 200, 200),
      createMockNote('3', 800, 300),
    ];

    const aligned = alignLeft(notes);
    expect(aligned.map((n) => n.x)).toEqual([200, 200, 200]);
    expect(aligned.map((n) => n.y)).toEqual([100, 200, 300]);
  });

  it('alignRight aligns all notes to the rightmost edge', () => {
    const notes = [
      createMockNote('1', 100, 100, 300, 300), // right: 400
      createMockNote('2', 200, 200, 500, 300), // right: 700
    ];

    const aligned = alignRight(notes);
    expect(aligned.find((n) => n.id === '1')?.x).toBe(700 - 300);
    expect(aligned.find((n) => n.id === '2')?.x).toBe(700 - 500);
  });

  it('alignCenterHorizontal and alignCenterVertical align to average centers', () => {
    const notes = [
      createMockNote('1', 100, 100, 200, 200),
      createMockNote('2', 300, 300, 200, 200),
    ];

    const hAligned = alignCenterHorizontal(notes);
    // note1 center = 200, note2 center = 400, avgCenter = 300 => both x = 300 - 100 = 200
    expect(hAligned.map((n) => n.x)).toEqual([200, 200]);

    const vAligned = alignCenterVertical(notes);
    // note1 center = 200, note2 center = 400, avgCenter = 300 => both y = 300 - 100 = 200
    expect(vAligned.map((n) => n.y)).toEqual([200, 200]);
  });

  it('distributeHorizontally distributes notes with even spacing', () => {
    const notes = [
      createMockNote('1', 0, 0, 100, 100),
      createMockNote('2', 50, 0, 100, 100),
      createMockNote('3', 400, 0, 100, 100),
    ];

    const distributed = distributeHorizontally(notes);
    expect(distributed[0].x).toBe(0);
    expect(distributed[2].x).toBe(400);
    expect(distributed[1].x).toBeGreaterThan(0);
    expect(distributed[1].x).toBeLessThan(400);
  });

  it('distributeVertically distributes notes with even vertical spacing', () => {
    const notes = [
      createMockNote('1', 0, 0, 100, 100),
      createMockNote('2', 0, 60, 100, 100),
      createMockNote('3', 0, 500, 100, 100),
    ];

    const distributed = distributeVertically(notes);
    expect(distributed[0].y).toBe(0);
    expect(distributed[2].y).toBe(500);
    expect(distributed[1].y).toBeGreaterThan(0);
    expect(distributed[1].y).toBeLessThan(500);
  });

  it('arrangeInGrid organizes notes into rows and columns with grid snapping', () => {
    const notes = [
      createMockNote('1', 0, 0, 100, 100),
      createMockNote('2', 0, 0, 100, 100),
      createMockNote('3', 0, 0, 100, 100),
      createMockNote('4', 0, 0, 100, 100),
    ];

    const grid = arrangeInGrid(notes);
    expect(grid.length).toBe(4);
    // Should arrange into 2x2 matrix
    expect(grid[0].x).toBe(grid[2].x);
    expect(grid[1].x).toBe(grid[3].x);
    expect(grid[0].y).toBe(grid[1].y);
    expect(grid[2].y).toBe(grid[3].y);
  });

  it('calculateGroupBounds returns accurate bounding box with padding', () => {
    const notes = [
      createMockNote('1', 100, 100, 200, 200),
      createMockNote('2', 400, 300, 200, 200),
    ];

    const bounds = calculateGroupBounds(notes, 28, 42, 28);
    // minX = 100 - 28 = 72
    // minY = 100 - 42 = 58
    // maxX = (400 + 200) + 28 = 628
    // maxY = (300 + 200) + 28 = 528
    expect(bounds.minX).toBe(72);
    expect(bounds.minY).toBe(58);
    expect(bounds.maxX).toBe(628);
    expect(bounds.maxY).toBe(528);
    expect(bounds.width).toBe(628 - 72);
    expect(bounds.height).toBe(528 - 58);
  });
});
