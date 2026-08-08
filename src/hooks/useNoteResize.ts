import { useState, useRef, useEffect } from 'react';
import { Note } from '../types';

interface UseNoteResizeOptions {
  note: Note;
  zoom: number;
  isPanMode: boolean;
  onUpdateNote: (updatedNote: Note) => void;
}

export function useNoteResize({
  note,
  zoom,
  isPanMode,
  onUpdateNote,
}: UseNoteResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  const activeMouseHandlersRef = useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null);
  const activeFrameRef = useRef<number | null>(null);

  // Clean up any lingering mouse listeners and animation frames on unmount
  useEffect(() => {
    return () => {
      if (activeMouseHandlersRef.current) {
        window.removeEventListener('mousemove', activeMouseHandlersRef.current.move);
        window.removeEventListener('mouseup', activeMouseHandlersRef.current.up);
      }
      if (activeFrameRef.current !== null) {
        cancelAnimationFrame(activeFrameRef.current);
      }
    };
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isPanMode) return;
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: note.width || 340,
      h: note.height || 360,
    };

    let frame: number | null = null;
    let pendingSize: Pick<Note, 'width' | 'height'> | null = null;

    const flushResize = () => {
      if (pendingSize) {
        onUpdateNote({ ...note, ...pendingSize });
        pendingSize = null;
      }
      frame = null;
      activeFrameRef.current = null;
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - resizeStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(260, resizeStartRef.current.w + dx);
      const newH = Math.max(220, resizeStartRef.current.h + dy);

      pendingSize = { width: newW, height: newH };
      if (frame === null) {
        frame = requestAnimationFrame(flushResize);
        activeFrameRef.current = frame;
      }
    };

    const handleMouseUp = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        flushResize();
      }
      setIsResizing(false);
      activeFrameRef.current = null;
      activeMouseHandlersRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    activeMouseHandlersRef.current = { move: handleMouseMove, up: handleMouseUp };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return { isResizing, handleResizeMouseDown };
}
