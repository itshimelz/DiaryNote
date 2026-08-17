export interface CameraTransform {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Transforms screen client coordinates to infinite canvas world coordinates.
 */
export function screenToCanvas(
  clientX: number,
  clientY: number,
  transform: CameraTransform
): { x: number; y: number } {
  return {
    x: (clientX - transform.x) / transform.zoom,
    y: (clientY - transform.y) / transform.zoom,
  };
}

/**
 * Transforms canvas world coordinates to screen client coordinates.
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  transform: CameraTransform
): { x: number; y: number } {
  return {
    x: canvasX * transform.zoom + transform.x,
    y: canvasY * transform.zoom + transform.y,
  };
}
