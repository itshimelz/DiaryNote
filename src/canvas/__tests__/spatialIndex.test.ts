import { describe, it, expect, beforeEach } from 'vitest';
import {
  SpatialIndex,
  getVisibleWorldFrustum,
  calculateDynamicOverscan,
  hitTestPoint,
  hitTestBox,
  screenToCanvas,
  canvasToScreen,
} from '../index';

describe('SpatialIndex R-Tree and Canvas Viewport', () => {
  let index: SpatialIndex;

  beforeEach(() => {
    index = new SpatialIndex();
  });

  it('inserts and retrieves items inside bounding box query', () => {
    index.insert({ id: 'note-1', minX: 0, minY: 0, maxX: 100, maxY: 100 });
    index.insert({ id: 'note-2', minX: 200, minY: 200, maxX: 300, maxY: 300 });
    index.insert({ id: 'note-3', minX: 1000, minY: 1000, maxX: 1200, maxY: 1200 });

    expect(index.size()).toBe(3);

    const results = index.search({ minX: 50, minY: 50, maxX: 250, maxY: 250 });
    const ids = results.map((r) => r.id).sort();

    expect(ids).toEqual(['note-1', 'note-2']);
  });

  it('handles item updates and deletions accurately', () => {
    index.insert({ id: 'note-1', minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(index.size()).toBe(1);

    // Update position
    index.update({ id: 'note-1', minX: 500, minY: 500, maxX: 600, maxY: 600 });
    expect(index.size()).toBe(1);

    const oldResults = index.search({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(oldResults.length).toBe(0);

    const newResults = index.search({ minX: 450, minY: 450, maxX: 550, maxY: 550 });
    expect(newResults.length).toBe(1);
    expect(newResults[0].id).toBe('note-1');

    // Remove
    const removed = index.remove('note-1');
    expect(removed).toBe(true);
    expect(index.size()).toBe(0);
  });

  it('calculates dynamic overscan frustum correctly', () => {
    const { overscanX, overscanY } = calculateDynamicOverscan(1920, 1080, 1.0);
    expect(overscanX).toBeGreaterThanOrEqual(300);
    expect(overscanY).toBeGreaterThanOrEqual(300);

    const frustum = getVisibleWorldFrustum(1920, 1080, { x: 0, y: 0, zoom: 1.0 });
    expect(frustum.minX).toBeLessThan(0);
    expect(frustum.maxX).toBeGreaterThan(1920);
    expect(frustum.minY).toBeLessThan(0);
    expect(frustum.maxY).toBeGreaterThan(1080);
  });

  it('performs hit testing on point and selection rectangle', () => {
    index.insert({ id: 'card-a', minX: 100, minY: 100, maxX: 300, maxY: 300 });
    index.insert({ id: 'card-b', minX: 400, minY: 400, maxX: 600, maxY: 600 });

    const pointHits = hitTestPoint(150, 150, index);
    expect(pointHits).toEqual(['card-a']);

    const pointMiss = hitTestPoint(350, 350, index);
    expect(pointMiss).toEqual([]);

    const boxHits = hitTestBox({ minX: 50, minY: 50, maxX: 450, maxY: 450 }, index);
    expect(boxHits.sort()).toEqual(['card-a', 'card-b']);
  });

  it('converts between screen and canvas coordinates seamlessly', () => {
    const transform = { x: 200, y: 100, zoom: 2.0 };
    const canvasPoint = screenToCanvas(400, 300, transform);
    expect(canvasPoint.x).toBe(125);
    expect(canvasPoint.y).toBe(125);

    const screenPoint = canvasToScreen(125, 125, transform);
    expect(screenPoint.x).toBe(400);
    expect(screenPoint.y).toBe(300);
  });
});
