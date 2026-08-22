import { BoundingBox } from './geometry';
import { CameraTransform } from './camera';
import { BASE_CANVAS_SCALE } from '../constants/canvas';

/**
 * Calculates the dynamic overscan buffer based on viewport dimensions and camera zoom.
 */
export function calculateDynamicOverscan(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number
): { overscanX: number; overscanY: number } {
  const safeZoom = Math.max(0.05, zoom);
  const overscanX = Math.min(2500, Math.max(600, (viewportWidth * 0.85) / safeZoom));
  const overscanY = Math.min(2500, Math.max(600, (viewportHeight * 0.85) / safeZoom));
  return { overscanX, overscanY };
}

/**
 * Computes the visible canvas frustum in world coordinates including the dynamic overscan buffer.
 */
export function getVisibleWorldFrustum(
  viewportWidth: number,
  viewportHeight: number,
  transform: CameraTransform
): BoundingBox {
  const safeZoom = Math.max(0.05, transform.zoom * BASE_CANVAS_SCALE);
  const { overscanX, overscanY } = calculateDynamicOverscan(viewportWidth, viewportHeight, safeZoom);

  const minX = -transform.x / safeZoom - overscanX;
  const minY = -transform.y / safeZoom - overscanY;
  const maxX = (viewportWidth - transform.x) / safeZoom + overscanX;
  const maxY = (viewportHeight - transform.y) / safeZoom + overscanY;

  return { minX, minY, maxX, maxY };
}
