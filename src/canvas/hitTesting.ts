import { BoundingBox, isPointInBox } from './geometry';
import { SpatialIndex } from './spatialIndex';

/**
 * Finds all note IDs located at a specific canvas world point (x, y).
 */
export function hitTestPoint(x: number, y: number, index: SpatialIndex): string[] {
  const pointBox: BoundingBox = { minX: x, minY: y, maxX: x, maxY: y };
  const candidates = index.search(pointBox);
  return candidates.filter((item) => isPointInBox(x, y, item)).map((item) => item.id);
}

/**
 * Finds all note IDs intersecting a selection rectangle.
 */
export function hitTestBox(selectionBox: BoundingBox, index: SpatialIndex): string[] {
  return index.search(selectionBox).map((item) => item.id);
}
