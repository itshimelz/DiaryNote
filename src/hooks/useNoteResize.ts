import { useState, useRef, useEffect, RefObject } from 'react';
import { Note } from '../types';

interface UseNoteResizeOptions {
  note: Note;
  zoom: number;
  isPanMode: boolean;
  onUpdateNote: (updatedNote: Note) => void;
  cardRef?: RefObject<HTMLDivElement | null>;
}

export function useNoteResize({
  note,
  zoom,
  isPanMode,
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
    w: note.width || 340,
    h: note.height || 360,
  });

  const activeMouseHandlersRef = useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null);

  // Clean up any lingering mouse listeners on unmount
  useEffect(() => {
    return () => {
      if (activeMouseHandlersRef.current) {
        window.removeEventListener('mousemove', activeMouseHandlersRef.current.move);
        window.removeEventListener('mouseup', activeMouseHandlersRef.current.up);
      }
    };
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isPanMode) return;
    e.stopPropagation();
    setIsResizing(true);
    const initialW = note.width || 340;
    const initialH = note.height || 360;

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: initialW,
      h: initialH,
    };
    currentSizeRef.current = { w: initialW, h: initialH };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - resizeStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(260, Math.round(resizeStartRef.current.w + dx));
      const newH = Math.max(220, Math.round(resizeStartRef.current.h + dy));

      currentSizeRef.current = { w: newW, h: newH };

      // Direct DOM style mutation to achieve 60 FPS without triggering React canvas-wide re-renders
      if (cardRef?.current) {
        cardRef.current.style.width = `${newW}px`;
        cardRef.current.style.height = `${newH}px`;
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      activeMouseHandlersRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const finalW = currentSizeRef.current.w;
      const finalH = currentSizeRef.current.h;

      // Commit final size once to React and IndexedDB storage
      onUpdateNote({ ...note, width: finalW, height: finalH });
    };

    activeMouseHandlersRef.current = { move: handleMouseMove, up: handleMouseUp };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return { isResizing, handleResizeMouseDown };
}
