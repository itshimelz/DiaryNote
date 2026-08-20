import { invoke } from '@tauri-apps/api/core';
import { NoteLayoutInput, NoteLayoutOutput, SpatialDirection } from '../types';
import { isTauriEnvironment } from './rustStorage';

export type { NoteLayoutInput, NoteLayoutOutput, SpatialDirection };

export interface WorldFrustumInput {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DragPositionDelta {
  id: string;
  startX: number;
  startY: number;
}

/**
 * Computes batch alignment or grid layout via native Rust.
 */
export async function computeBatchLayout(
  notes: NoteLayoutInput[],
  mode: string,
  spacing?: number | null
): Promise<NoteLayoutOutput[]> {
  if (!isTauriEnvironment()) {
    return [];
  }

  return await invoke<NoteLayoutOutput[]>('compute_batch_layout', {
    notes,
    mode,
    spacing: spacing ?? null,
  });
}

/**
 * Performs fast 2D AABB viewport culling via native Rust.
 */
export async function cullNotesInFrustum(
  notes: NoteLayoutInput[],
  frustum: WorldFrustumInput
): Promise<string[]> {
  if (!isTauriEnvironment()) {
    return notes
      .filter((n) => {
        const w = n.width || 280;
        const h = n.height || 340;
        return (
          n.x + w >= frustum.minX &&
          n.x <= frustum.maxX &&
          n.y + h >= frustum.minY &&
          n.y <= frustum.maxY
        );
      })
      .map((n) => n.id);
  }

  return await invoke<string[]>('cull_notes_in_frustum', {
    notes,
    frustum,
  });
}

/**
 * Computes final snapped positions for multi-note drag completion via native Rust.
 */
export async function computeBatchDragSnapping(
  items: DragPositionDelta[],
  deltaX: number,
  deltaY: number,
  snapToGrid: boolean,
  gridSize?: number | null
): Promise<NoteLayoutOutput[]> {
  if (!isTauriEnvironment()) {
    const grid = gridSize || 20;
    return items.map((item) => {
      const rawX = item.startX + deltaX;
      const rawY = item.startY + deltaY;
      return {
        id: item.id,
        x: snapToGrid ? Math.round(rawX / grid) * grid : Math.round(rawX),
        y: snapToGrid ? Math.round(rawY / grid) * grid : Math.round(rawY),
      };
    });
  }

  return await invoke<NoteLayoutOutput[]>('compute_batch_drag_snapping', {
    items,
    deltaX,
    deltaY,
    snapToGrid,
    gridSize: gridSize ?? null,
  });
}

/**
 * Finds the geometrically nearest note in the given direction relative to currentNoteId via native Rust.
 */
export async function findNearestSpatialNote(
  currentNoteId: string,
  direction: SpatialDirection,
  notes: NoteLayoutInput[]
): Promise<string | null> {
  if (!isTauriEnvironment()) {
    const origin = notes.find((n) => n.id === currentNoteId);
    if (!origin) return null;

    const oW = origin.width || 280;
    const oH = origin.height || 340;
    const oCx = origin.x + oW / 2;
    const oCy = origin.y + oH / 2;
    const oMinX = origin.x;
    const oMaxX = origin.x + oW;
    const oMinY = origin.y;
    const oMaxY = origin.y + oH;

    let bestId: string | null = null;
    let bestScore = Infinity;

    for (const candidate of notes) {
      if (candidate.id === currentNoteId) continue;

      const cW = candidate.width || 280;
      const cH = candidate.height || 340;
      const cCx = candidate.x + cW / 2;
      const cCy = candidate.y + cH / 2;
      const cMinX = candidate.x;
      const cMaxX = candidate.x + cW;
      const cMinY = candidate.y;
      const cMaxY = candidate.y + cH;

      let dPrimary = 0;
      let gapOrthogonal = 0;
      let dSecondaryCenter = 0;

      switch (direction) {
        case 'right': {
          const isForward = cCx > oCx || (cMaxX > oMaxX && cMinX >= oMinX);
          if (!isForward) continue;
          dPrimary = cMinX >= oMaxX ? cMinX - oMaxX : Math.max(1, cCx - oCx);
          gapOrthogonal = Math.max(0, Math.max(oMinY, cMinY) - Math.min(oMaxY, cMaxY));
          dSecondaryCenter = Math.abs(cCy - oCy);
          break;
        }
        case 'left': {
          const isForward = cCx < oCx || (cMinX < oMinX && cMaxX <= oMaxX);
          if (!isForward) continue;
          dPrimary = cMaxX <= oMinX ? oMinX - cMaxX : Math.max(1, oCx - cCx);
          gapOrthogonal = Math.max(0, Math.max(oMinY, cMinY) - Math.min(oMaxY, cMaxY));
          dSecondaryCenter = Math.abs(cCy - oCy);
          break;
        }
        case 'down': {
          const isForward = cCy > oCy || (cMaxY > oMaxY && cMinY >= oMinY);
          if (!isForward) continue;
          dPrimary = cMinY >= oMaxY ? cMinY - oMaxY : Math.max(1, cCy - oCy);
          gapOrthogonal = Math.max(0, Math.max(oMinX, cMinX) - Math.min(oMaxX, cMaxX));
          dSecondaryCenter = Math.abs(cCx - oCx);
          break;
        }
        case 'up': {
          const isForward = cCy < oCy || (cMinY < oMinY && cMaxY <= oMaxY);
          if (!isForward) continue;
          dPrimary = cMaxY <= oMinY ? oMinY - cMaxY : Math.max(1, oCy - cCy);
          gapOrthogonal = Math.max(0, Math.max(oMinX, cMinX) - Math.min(oMaxX, cMaxX));
          dSecondaryCenter = Math.abs(cCx - oCx);
          break;
        }
      }

      const score = dPrimary + 3 * gapOrthogonal + 0.5 * dSecondaryCenter;
      if (score < bestScore) {
        bestScore = score;
        bestId = candidate.id;
      }
    }

    return bestId;
  }

  return await invoke<string | null>('find_nearest_spatial_note', {
    currentNoteId,
    direction,
    notes,
  });
}
