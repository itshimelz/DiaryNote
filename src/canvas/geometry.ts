export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialItem extends BoundingBox {
  id: string;
}

/**
 * Checks if two bounding boxes intersect.
 */
export function doBoxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Checks if bounding box A completely contains bounding box B.
 */
export function boxContainsBox(parent: BoundingBox, child: BoundingBox): boolean {
  return (
    parent.minX <= child.minX &&
    parent.maxX >= child.maxX &&
    parent.minY <= child.minY &&
    parent.maxY >= child.maxY
  );
}

/**
 * Checks if a point (x, y) is inside a bounding box.
 */
export function isPointInBox(x: number, y: number, box: BoundingBox): boolean {
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
}
