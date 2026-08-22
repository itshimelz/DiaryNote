import { describe, it, expect } from 'vitest';
import { screenToWorld, worldToScreen } from '../useCanvasTransform';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, BASE_CANVAS_SCALE } from '../../constants/canvas';
import { CanvasTransform } from '../../types';

describe('Canvas Coordinate Transformation (screenToWorld / worldToScreen)', () => {
  const defaultTransform: CanvasTransform = { x: 0, y: 0, zoom: 1 };

  it('correctly maps screen click to world coordinates centering the note at calibrated 100% zoom', () => {
    const screenX = 800;
    const screenY = 600;

    const { worldX, worldY } = screenToWorld(screenX, screenY, defaultTransform);

    // Expected center: screenX / (zoom * BASE_CANVAS_SCALE) - cardWidth / 2
    expect(worldX).toBe(Math.round(800 / BASE_CANVAS_SCALE - DEFAULT_NOTE_WIDTH / 2));
    expect(worldY).toBe(Math.round(600 / BASE_CANVAS_SCALE - DEFAULT_NOTE_HEIGHT / 2));
  });

  it('correctly accounts for canvas pan offsets in screenToWorld', () => {
    const pannedTransform: CanvasTransform = { x: -400, y: 250, zoom: 1 };
    const screenX = 500;
    const screenY = 400;

    const { worldX, worldY } = screenToWorld(screenX, screenY, pannedTransform);

    // (500 - (-400)) / 0.8 - DEFAULT_NOTE_WIDTH / 2 = 1125 - 216 = 909
    expect(worldX).toBe(909);
    // (400 - 250) / 0.8 - DEFAULT_NOTE_HEIGHT / 2 = 188 - 204 = -16
    expect(worldY).toBe(-16);
  });

  it('correctly accounts for zoom scale factors in screenToWorld', () => {
    const zoomedOutTransform: CanvasTransform = { x: 0, y: 0, zoom: 0.5 };
    const screenX = 600;
    const screenY = 400;

    const { worldX, worldY } = screenToWorld(screenX, screenY, zoomedOutTransform);

    // (600 - 0) / (0.5 * 0.8) - 216 = 1500 - 216 = 1284
    expect(worldX).toBe(1284);
    // (400 - 0) / (0.5 * 0.8) - 204 = 1000 - 204 = 796
    expect(worldY).toBe(796);

    const zoomedInTransform: CanvasTransform = { x: 100, y: 100, zoom: 2.0 };
    const { worldX: zoomedInX, worldY: zoomedInY } = screenToWorld(screenX, screenY, zoomedInTransform);

    // (600 - 100) / (2.0 * 0.8) - 216 = 313 - 216 = 97
    expect(zoomedInX).toBe(97);
    // (400 - 100) / (2.0 * 0.8) - 204 = 188 - 204 = -16
    expect(zoomedInY).toBe(-16);
  });

  it('correctly maps world coordinates back to screen coordinates with worldToScreen', () => {
    const transform: CanvasTransform = { x: -200, y: 150, zoom: 1.5 };
    const worldX = 400;
    const worldY = 300;

    const { screenX, screenY } = worldToScreen(worldX, worldY, transform);

    expect(screenX).toBe(Math.round(400 * (1.5 * BASE_CANVAS_SCALE) + -200));
    expect(screenY).toBe(Math.round(300 * (1.5 * BASE_CANVAS_SCALE) + 150));
  });

  it('allows custom card width and height overrides', () => {
    const customWidth = 300;
    const customHeight = 200;
    const { worldX, worldY } = screenToWorld(500, 500, defaultTransform, customWidth, customHeight);

    expect(worldX).toBe(Math.round(500 / BASE_CANVAS_SCALE - 150));
    expect(worldY).toBe(Math.round(500 / BASE_CANVAS_SCALE - 100));
  });
});
