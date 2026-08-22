import { BASE_CANVAS_SCALE } from '../constants/canvas';

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
  transform: CameraTransform,
  baseScale: number = BASE_CANVAS_SCALE
): { x: number; y: number } {
  const effectiveZoom = transform.zoom * baseScale;
  return {
    x: (clientX - transform.x) / effectiveZoom,
    y: (clientY - transform.y) / effectiveZoom,
  };
}

/**
 * Transforms canvas world coordinates to screen client coordinates.
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  transform: CameraTransform,
  baseScale: number = BASE_CANVAS_SCALE
): { x: number; y: number } {
  const effectiveZoom = transform.zoom * baseScale;
  return {
    x: canvasX * effectiveZoom + transform.x,
    y: canvasY * effectiveZoom + transform.y,
  };
}
