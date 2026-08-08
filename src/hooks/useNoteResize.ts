import { useState, useRef } from 'react';
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
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - resizeStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(260, resizeStartRef.current.w + dx);
      const newH = Math.max(220, resizeStartRef.current.h + dy);

      pendingSize = { width: newW, height: newH };
      if (frame === null) frame = requestAnimationFrame(flushResize);
    };

    const handleMouseUp = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        flushResize();
      }
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return { isResizing, handleResizeMouseDown };
}
