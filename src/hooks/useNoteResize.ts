import { useState, useRef, useEffect, RefObject } from 'react';
import { Note } from '../types';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, GRID_SIZE } from '../constants/canvas';

const MIN_NOTE_WIDTH = 280;
const MIN_NOTE_HEIGHT = 200;
const MAX_NOTE_WIDTH = 1400;
const MAX_NOTE_HEIGHT = 1600;

interface UseNoteResizeOptions {
  note: Note;
  zoom: number;
  isPanMode: boolean;
  snapToGrid?: boolean;
  onUpdateNote: (updatedNote: Note) => void;
  cardRef?: RefObject<HTMLDivElement | null>;
}

export function useNoteResize({
  note,
  zoom,
  isPanMode,
  snapToGrid = false,
  onUpdateNote,
  cardRef,
}: UseNoteResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });
  const currentSizeRef = useRef<{ w: number; h: number }>({
    w: note.width || DEFAULT_NOTE_WIDTH,
    h: note.height || DEFAULT_NOTE_HEIGHT,
  });

  const activeMouseHandlersRef = useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null);

  // Clean up any lingering mouse listeners and global styles on unmount
  useEffect(() => {
    return () => {
      if (activeMouseHandlersRef.current) {
        window.removeEventListener('mousemove', activeMouseHandlersRef.current.move);
        window.removeEventListener('mouseup', activeMouseHandlersRef.current.up);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
      }
    };
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isPanMode) return;
    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    const initialW = note.width || DEFAULT_NOTE_WIDTH;
    const initialH = note.height || DEFAULT_NOTE_HEIGHT;

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: initialW,
      h: initialH,
    };
    currentSizeRef.current = { w: initialW, h: initialH };

    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentZoom = zoom > 0 ? zoom : 1;
      const dx = (moveEvent.clientX - resizeStartRef.current.x) / currentZoom;
      const dy = (moveEvent.clientY - resizeStartRef.current.y) / currentZoom;

      let rawW = resizeStartRef.current.w + dx;
      let rawH = resizeStartRef.current.h + dy;

      if (snapToGrid) {
        rawW = Math.round(rawW / GRID_SIZE) * GRID_SIZE;
        rawH = Math.round(rawH / GRID_SIZE) * GRID_SIZE;
      } else {
        rawW = Math.round(rawW);
        rawH = Math.round(rawH);
      }

      const clampedW = Math.max(MIN_NOTE_WIDTH, Math.min(MAX_NOTE_WIDTH, rawW));
      const clampedH = Math.max(MIN_NOTE_HEIGHT, Math.min(MAX_NOTE_HEIGHT, rawH));

      currentSizeRef.current = { w: clampedW, h: clampedH };

      // Direct DOM style mutation to achieve 60 FPS without triggering React canvas-wide re-renders
      if (cardRef?.current) {
        cardRef.current.style.width = `${clampedW}px`;
        cardRef.current.style.minHeight = `${clampedH}px`;
        cardRef.current.style.removeProperty('height');
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      activeMouseHandlersRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');

      const finalW = currentSizeRef.current.w;
      const finalH = currentSizeRef.current.h;

      // Commit final size once to React and IndexedDB storage without changing note content timestamp
      onUpdateNote({ ...note, width: finalW, height: finalH });
    };

    activeMouseHandlersRef.current = { move: handleMouseMove, up: handleMouseUp };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return { isResizing, handleResizeMouseDown };
}
