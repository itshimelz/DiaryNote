import { describe, it, expect } from 'vitest';
import { screenToWorld, worldToScreen } from '../useCanvasTransform';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../../constants/canvas';
import { CanvasTransform } from '../../types';

describe('Canvas Coordinate Transformation (screenToWorld / worldToScreen)', () => {
  const defaultTransform: CanvasTransform = { x: 0, y: 0, zoom: 1 };

  it('correctly maps screen click to world coordinates centering the note at 100% zoom', () => {
    const screenX = 800;
    const screenY = 600;

    const { worldX, worldY } = screenToWorld(screenX, screenY, defaultTransform);

    // Expected center: screenX - cardWidth / 2, screenY - cardHeight / 2
    expect(worldX).toBe(800 - DEFAULT_NOTE_WIDTH / 2);
    expect(worldY).toBe(600 - DEFAULT_NOTE_HEIGHT / 2);
  });

  it('correctly accounts for canvas pan offsets in screenToWorld', () => {
    const pannedTransform: CanvasTransform = { x: -400, y: 250, zoom: 1 };
    const screenX = 500;
    const screenY = 400;

    const { worldX, worldY } = screenToWorld(screenX, screenY, pannedTransform);

    // (500 - (-400)) / 1 - DEFAULT_NOTE_WIDTH / 2 = 900 - 216 = 684
    expect(worldX).toBe(684);
    // (400 - 250) / 1 - DEFAULT_NOTE_HEIGHT / 2 = 150 - 204 = -54
    expect(worldY).toBe(-54);
  });

  it('correctly accounts for zoom scale factors in screenToWorld', () => {
    const zoomedOutTransform: CanvasTransform = { x: 0, y: 0, zoom: 0.5 };
    const screenX = 600;
    const screenY = 400;

    const { worldX, worldY } = screenToWorld(screenX, screenY, zoomedOutTransform);

    // (600 - 0) / 0.5 - 216 = 1200 - 216 = 984
    expect(worldX).toBe(984);
    // (400 - 0) / 0.5 - 204 = 800 - 204 = 596
    expect(worldY).toBe(596);

    const zoomedInTransform: CanvasTransform = { x: 100, y: 100, zoom: 2.0 };
    const { worldX: zoomedInX, worldY: zoomedInY } = screenToWorld(screenX, screenY, zoomedInTransform);

    // (600 - 100) / 2.0 - 216 = 250 - 216 = 34
    expect(zoomedInX).toBe(34);
    // (400 - 100) / 2.0 - 204 = 150 - 204 = -54
    expect(zoomedInY).toBe(-54);
  });

  it('correctly maps world coordinates back to screen coordinates with worldToScreen', () => {
    const transform: CanvasTransform = { x: -200, y: 150, zoom: 1.5 };
    const worldX = 400;
    const worldY = 300;

    const { screenX, screenY } = worldToScreen(worldX, worldY, transform);

    expect(screenX).toBe(Math.round(400 * 1.5 + -200));
    expect(screenY).toBe(Math.round(300 * 1.5 + 150));
  });

  it('allows custom card width and height overrides', () => {
    const customWidth = 300;
    const customHeight = 200;
    const { worldX, worldY } = screenToWorld(500, 500, defaultTransform, customWidth, customHeight);

    expect(worldX).toBe(500 - 150);
    expect(worldY).toBe(500 - 100);
  });
});
