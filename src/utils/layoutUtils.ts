import { Note } from '../types';
import { GRID_SIZE, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';

/**
 * Gets the actual live DOM width of a note card element, falling back to note.width or DEFAULT_NOTE_WIDTH.
 */
export function getNoteWidth(n: Note): number {
  const el = typeof document !== 'undefined' ? document.getElementById(`note-card-${n.id}`) : null;
  return el ? el.offsetWidth : n.width || DEFAULT_NOTE_WIDTH;
}

/**
 * Gets the actual live DOM height of a note card element, falling back to note.height or DEFAULT_NOTE_HEIGHT.
 */
export function getNoteHeight(n: Note): number {
  const el = typeof document !== 'undefined' ? document.getElementById(`note-card-${n.id}`) : null;
  return el ? el.offsetHeight : n.height || DEFAULT_NOTE_HEIGHT;
}

/**
 * Batch-reads all note dimensions in a single layout pass to prevent forced reflow thrashing.
 */
export function getNoteDimensionsMap(notes: Note[]): Map<string, { width: number; height: number }> {
  const dims = new Map<string, { width: number; height: number }>();
  if (typeof document === 'undefined') {
    notes.forEach((n) => dims.set(n.id, { width: n.width || DEFAULT_NOTE_WIDTH, height: n.height || DEFAULT_NOTE_HEIGHT }));
    return dims;
  }
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const el = document.getElementById(`note-card-${n.id}`);
    dims.set(n.id, {
      width: el ? el.offsetWidth : n.width || DEFAULT_NOTE_WIDTH,
      height: el ? el.offsetHeight : n.height || DEFAULT_NOTE_HEIGHT,
    });
  }
  return dims;
}

/**
 * Aligns selected notes to the leftmost X position.
 */
export function alignLeft(notes: Note[]): Note[] {
  if (notes.length < 2) return notes;
  const minX = Math.min(...notes.map((n) => n.x));
  return notes.map((n) => ({ ...n, x: minX }));
}

/**
 * Aligns selected notes to their average horizontal center position.
 */
export function alignCenterHorizontal(notes: Note[]): Note[] {
  if (notes.length < 2) return notes;
  const dims = getNoteDimensionsMap(notes);
  const avgCenterX = Math.round(
    notes.reduce((acc, n) => acc + (n.x + (dims.get(n.id)?.width || DEFAULT_NOTE_WIDTH) / 2), 0) / notes.length
  );
  return notes.map((n) => {
    const w = dims.get(n.id)?.width || DEFAULT_NOTE_WIDTH;
    return { ...n, x: Math.round(avgCenterX - w / 2) };
  });
}

/**
 * Aligns selected notes to the rightmost edge.
 */
export function alignRight(notes: Note[]): Note[] {
  if (notes.length < 2) return notes;
  const dims = getNoteDimensionsMap(notes);
  const maxRight = Math.max(...notes.map((n) => n.x + (dims.get(n.id)?.width || DEFAULT_NOTE_WIDTH)));
  return notes.map((n) => {
    const w = dims.get(n.id)?.width || DEFAULT_NOTE_WIDTH;
    return { ...n, x: Math.round(maxRight - w) };
  });
}

/**
 * Aligns selected notes to the topmost Y position.
 */
export function alignTop(notes: Note[]): Note[] {
  if (notes.length < 2) return notes;
  const minY = Math.min(...notes.map((n) => n.y));
  return notes.map((n) => ({ ...n, y: minY }));
}

/**
 * Aligns selected notes to their average vertical center position.
 */
export function alignCenterVertical(notes: Note[]): Note[] {
  if (notes.length < 2) return notes;
  const dims = getNoteDimensionsMap(notes);
  const avgCenterY = Math.round(
    notes.reduce((acc, n) => acc + (n.y + (dims.get(n.id)?.height || DEFAULT_NOTE_HEIGHT) / 2), 0) / notes.length
  );
  return notes.map((n) => {
    const h = dims.get(n.id)?.height || DEFAULT_NOTE_HEIGHT;
    return { ...n, y: Math.round(avgCenterY - h / 2) };
  });
}

/**
 * Aligns selected notes to the bottommost edge.
 */
export function alignBottom(notes: Note[]): Note[] {
  if (notes.length < 2) return notes;
  const dims = getNoteDimensionsMap(notes);
  const maxBottom = Math.max(...notes.map((n) => n.y + (dims.get(n.id)?.height || DEFAULT_NOTE_HEIGHT)));
  return notes.map((n) => {
    const h = dims.get(n.id)?.height || DEFAULT_NOTE_HEIGHT;
    return { ...n, y: Math.round(maxBottom - h) };
  });
}

/**
 * Distributes selected notes evenly across their total horizontal span.
 */
export function distributeHorizontally(notes: Note[]): Note[] {
  if (notes.length < 3) return notes;
  const dims = getNoteDimensionsMap(notes);
  const sorted = [...notes].sort((a, b) => a.x - b.x);
  const widths = sorted.map((n) => dims.get(n.id)?.width || DEFAULT_NOTE_WIDTH);

  const firstX = sorted[0].x;
  const lastNote = sorted[sorted.length - 1];
  const lastWidth = widths[widths.length - 1];
  const lastRight = lastNote.x + lastWidth;

  const totalSpan = lastRight - firstX;
  const totalNotesWidth = widths.reduce((sum, w) => sum + w, 0);

  let gap = (totalSpan - totalNotesWidth) / (sorted.length - 1);
  if (gap < 24) gap = 24;

  let currentX = firstX;
  return sorted.map((n, idx) => {
    const xPos = Math.round(currentX);
    currentX += widths[idx] + gap;
    return { ...n, x: xPos };
  });
}

/**
 * Distributes selected notes evenly across their total vertical span.
 */
export function distributeVertically(notes: Note[]): Note[] {
  if (notes.length < 3) return notes;
  const dims = getNoteDimensionsMap(notes);
  const sorted = [...notes].sort((a, b) => a.y - b.y);
  const heights = sorted.map((n) => dims.get(n.id)?.height || DEFAULT_NOTE_HEIGHT);

  const firstY = sorted[0].y;
  const lastNote = sorted[sorted.length - 1];
  const lastHeight = heights[heights.length - 1];
  const lastBottom = lastNote.y + lastHeight;

  const totalSpan = lastBottom - firstY;
  const totalNotesHeight = heights.reduce((sum, h) => sum + h, 0);

  let gap = (totalSpan - totalNotesHeight) / (sorted.length - 1);
  if (gap < 24) gap = 24;

  let currentY = firstY;
  return sorted.map((n, idx) => {
    const yPos = Math.round(currentY);
    currentY += heights[idx] + gap;
    return { ...n, y: yPos };
  });
}

/**
 * Arranges selected notes into a balanced 2D grid matrix snapping to grid increments.
 */
export function arrangeInGrid(notes: Note[]): Note[] {
  if (notes.length < 2) return notes;
  const dims = getNoteDimensionsMap(notes);
  const cols = Math.ceil(Math.sqrt(notes.length));
  const minX = Math.min(...notes.map((n) => n.x));
  const minY = Math.min(...notes.map((n) => n.y));

  const maxW = Math.max(...notes.map((n) => dims.get(n.id)?.width || DEFAULT_NOTE_WIDTH));
  const maxH = Math.max(...notes.map((n) => dims.get(n.id)?.height || DEFAULT_NOTE_HEIGHT));

  const gapX = 32;
  const gapY = 32;

  return notes.map((n, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    let targetX = minX + col * (maxW + gapX);
    let targetY = minY + row * (maxH + gapY);

    targetX = Math.round(targetX / GRID_SIZE) * GRID_SIZE;
    targetY = Math.round(targetY / GRID_SIZE) * GRID_SIZE;

    return { ...n, x: targetX, y: targetY };
  });
}

export interface GroupBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculates the bounding box coordinates and dimensions for a set of grouped notes.
 */
export function calculateGroupBounds(
  groupNotes: Note[],
  paddingX = 28,
  paddingYTop = 42,
  paddingYBottom = 28,
  existingDimsMap?: Map<string, { width: number; height: number }>
): GroupBounds {
  if (!groupNotes || groupNotes.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  const dims = existingDimsMap || getNoteDimensionsMap(groupNotes);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  groupNotes.forEach((n) => {
    const d = dims.get(n.id);
    const realW = d ? d.width : n.width || DEFAULT_NOTE_WIDTH;
    const realH = d ? d.height : n.height || DEFAULT_NOTE_HEIGHT;

    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + realW);
    maxY = Math.max(maxY, n.y + realH);
  });

  const boundMinX = minX - paddingX;
  const boundMinY = minY - paddingYTop;
  const boundMaxX = maxX + paddingX;
  const boundMaxY = maxY + paddingYBottom;

  return {
    minX: boundMinX,
    minY: boundMinY,
    maxX: boundMaxX,
    maxY: boundMaxY,
    width: Math.max(100, boundMaxX - boundMinX),
    height: Math.max(100, boundMaxY - boundMinY),
  };
}
