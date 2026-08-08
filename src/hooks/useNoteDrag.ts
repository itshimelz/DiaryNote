import { useState, useRef } from 'react';
import { Note } from '../types';
import { GRID_SIZE } from '../constants/canvas';

interface UseNoteDragOptions {
  note: Note;
  allNotes: Note[];
  zoom: number;
  selectedNoteIds: string[];
  isPanMode: boolean;
  snapToGrid: boolean;
  onSelectNote: (noteId: string | null, isMultiSelect?: boolean) => void;
  onNavigateToNote: (targetNoteId: string) => void;
  onUpdateNote: (updatedNote: Note) => void;
  onUpdateBatchNotes?: (updatedNotes: Note[]) => void;
  onBringToFront: (noteId: string) => void;
  onDragStateChange?: (draggingIds: string[]) => void;
}

export function useNoteDrag({
  note,
  allNotes,
  zoom,
  selectedNoteIds,
  isPanMode,
  snapToGrid,
  onSelectNote,
  onNavigateToNote,
  onUpdateNote,
  onUpdateBatchNotes,
  onBringToFront,
  onDragStateChange,
}: UseNoteDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const noteRef = useRef(note);
  noteRef.current = note;

  const dragStartRef = useRef<{ x: number; y: number; noteX: number; noteY: number }>({
    x: 0,
    y: 0,
    noteX: 0,
    noteY: 0,
  });
  const groupDragStartRef = useRef<{ id: string; startX: number; startY: number }[]>([]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      isPanMode ||
      (e.target as HTMLElement).closest(
        'button, input, textarea, a, select, .no-drag, .note-editor-container'
      )
    ) {
      return;
    }

    // Alt + Click shortcut: zoom directly to this note
    if (e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      onNavigateToNote(note.id);
      return;
    }

    onBringToFront(note.id);

    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
    const isAlreadySelected = selectedNoteIds.includes(note.id);

    if (isMulti) {
      onSelectNote(note.id, true);
    } else if (!isAlreadySelected) {
      onSelectNote(note.id, false);
    }

    const activeSelectedIds = isMulti
      ? isAlreadySelected
        ? selectedNoteIds
        : [...selectedNoteIds, note.id]
      : isAlreadySelected
      ? selectedNoteIds
      : [note.id];

    const currentPosRef = { current: { x: noteRef.current.x, y: noteRef.current.y } };
    const currentBatchRef = { current: [] as Note[] };

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      noteX: noteRef.current.x,
      noteY: noteRef.current.y,
    };

    if (activeSelectedIds.length > 1) {
      groupDragStartRef.current = activeSelectedIds.map((id) => {
        const targetNote = allNotes.find((n) => n.id === id);
        return {
          id,
          startX: targetNote ? targetNote.x : 0,
          startY: targetNote ? targetNote.y : 0,
        };
      });
    } else {
      groupDragStartRef.current = [];
    }

    let hasMoved = false;
    let frame: number | null = null;
    let pendingSingle: Note | null = null;
    let pendingBatch: Note[] | null = null;

    const flushMove = () => {
      if (pendingBatch && onUpdateBatchNotes) onUpdateBatchNotes(pendingBatch);
      else if (pendingSingle) onUpdateNote(pendingSingle);
      pendingSingle = null;
      pendingBatch = null;
      frame = null;
    };

    const scheduleMove = () => {
      if (frame === null) frame = requestAnimationFrame(flushMove);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const distanceX = Math.abs(moveEvent.clientX - dragStartRef.current.x);
      const distanceY = Math.abs(moveEvent.clientY - dragStartRef.current.y);

      if (!hasMoved && distanceX < 4 && distanceY < 4) {
        return;
      }

      if (!hasMoved) {
        hasMoved = true;
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
        if (groupDragStartRef.current.length > 1) {
          onDragStateChange?.(activeSelectedIds);
        } else {
          onDragStateChange?.([note.id]);
        }
      }

      const dx = (moveEvent.clientX - dragStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - dragStartRef.current.y) / zoom;

      if (groupDragStartRef.current.length > 1 && onUpdateBatchNotes) {
        const updatedBatch = allNotes
          .filter((n) => activeSelectedIds.includes(n.id))
          .map((n) => {
            const startPos = groupDragStartRef.current.find((item) => item.id === n.id);
            if (!startPos) return n;
            let rawX = startPos.startX + dx;
            let rawY = startPos.startY + dy;
            if (snapToGrid) {
              rawX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
              rawY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
            }
            return { ...n, x: rawX, y: rawY };
          });
        currentBatchRef.current = updatedBatch;
        pendingBatch = updatedBatch;
        scheduleMove();
      } else {
        let newX = dragStartRef.current.noteX + dx;
        let newY = dragStartRef.current.noteY + dy;
        if (snapToGrid) {
          newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
          newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        }
        currentPosRef.current = { x: newX, y: newY };
        pendingSingle = {
          ...noteRef.current,
          x: newX,
          y: newY,
        };
        scheduleMove();
      }
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      if (hasMoved) {
        if (
          groupDragStartRef.current.length > 1 &&
          onUpdateBatchNotes &&
          currentBatchRef.current.length > 0
        ) {
          const finalBatch = currentBatchRef.current.map((n) => ({
            ...n,
            x: snapToGrid ? Math.round(n.x / GRID_SIZE) * GRID_SIZE : n.x,
            y: snapToGrid ? Math.round(n.y / GRID_SIZE) * GRID_SIZE : n.y,
          }));
          onUpdateBatchNotes(finalBatch);
        } else {
          const finalX = snapToGrid
            ? Math.round(currentPosRef.current.x / GRID_SIZE) * GRID_SIZE
            : currentPosRef.current.x;
          const finalY = snapToGrid
            ? Math.round(currentPosRef.current.y / GRID_SIZE) * GRID_SIZE
            : currentPosRef.current.y;
          onUpdateNote({
            ...noteRef.current,
            x: finalX,
            y: finalY,
          });
        }
      } else if (!isMulti && isAlreadySelected && selectedNoteIds.length > 1) {
        onSelectNote(note.id, false);
      }
      pendingSingle = null;
      pendingBatch = null;
      currentBatchRef.current = [];
      frame = null;

      setIsDragging(false);
      requestAnimationFrame(() => {
        onDragStateChange?.([]);
      });

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return { isDragging, handleMouseDown };
}
