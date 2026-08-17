import { BoundingBox } from './geometry';
import { CameraTransform } from './camera';

/**
 * Calculates the dynamic overscan buffer based on viewport dimensions and camera zoom.
 */
export function calculateDynamicOverscan(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number
): { overscanX: number; overscanY: number } {
  const safeZoom = Math.max(0.05, zoom);
  const overscanX = Math.min(1500, Math.max(300, (viewportWidth * 0.35) / safeZoom));
  const overscanY = Math.min(1500, Math.max(300, (viewportHeight * 0.35) / safeZoom));
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
  const safeZoom = Math.max(0.05, transform.zoom);
  const { overscanX, overscanY } = calculateDynamicOverscan(viewportWidth, viewportHeight, safeZoom);

  const minX = -transform.x / safeZoom - overscanX;
  const minY = -transform.y / safeZoom - overscanY;
  const maxX = (viewportWidth - transform.x) / safeZoom + overscanX;
  const maxY = (viewportHeight - transform.y) / safeZoom + overscanY;

  return { minX, minY, maxX, maxY };
}
