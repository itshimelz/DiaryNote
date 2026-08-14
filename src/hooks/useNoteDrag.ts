import { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { GRID_SIZE, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';

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

function updateGroupFramesDOM(
  allNotes: Note[],
  updatedPosMap: Map<string, { x: number; y: number }>,
  cardDimsMap: Map<string, { width: number; height: number }>
) {
  const affectedGroupIds = new Set<string>();
  allNotes.forEach((n) => {
    if (n.groupId && updatedPosMap.has(n.id)) {
      affectedGroupIds.add(n.groupId);
    }
  });

  affectedGroupIds.forEach((gId) => {
    const frameEl = document.getElementById(`group-frame-${gId}`);
    if (!frameEl) return;

    const groupNotes = allNotes.filter((n) => n.groupId === gId);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    groupNotes.forEach((n) => {
      const pos = updatedPosMap.get(n.id) || { x: n.x, y: n.y };
      const dims = cardDimsMap.get(n.id) || { width: n.width || DEFAULT_NOTE_WIDTH, height: n.height || DEFAULT_NOTE_HEIGHT };

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + dims.width);
      maxY = Math.max(maxY, pos.y + dims.height);
    });

    if (minX === Infinity) return;

    const frameMinX = Math.round(minX - 28);
    const frameMinY = Math.round(minY - 42);
    const frameWidth = Math.max(100, Math.round(maxX + 28 - frameMinX));
    const frameHeight = Math.max(100, Math.round(maxY + 28 - frameMinY));

    frameEl.style.transform = `translate3d(${frameMinX}px, ${frameMinY}px, 0)`;
    frameEl.style.width = `${frameWidth}px`;
    frameEl.style.height = `${frameHeight}px`;
  });
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
  const allNotesRef = useRef(allNotes);
  allNotesRef.current = allNotes;
  const selectedNoteIdsRef = useRef(selectedNoteIds);
  selectedNoteIdsRef.current = selectedNoteIds;

  const dragStartRef = useRef<{ x: number; y: number; noteX: number; noteY: number }>({
    x: 0,
    y: 0,
    noteX: 0,
    noteY: 0,
  });
  const groupDragStartRef = useRef<{ id: string; startX: number; startY: number }[]>([]);
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
      document.body.style.cursor = '';
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.button !== 0 ||
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
    const currentSelectedIds = selectedNoteIdsRef.current;
    const isAlreadySelected = currentSelectedIds.includes(note.id);

    if (isMulti) {
      onSelectNote(note.id, true);
    } else if (!isAlreadySelected) {
      onSelectNote(note.id, false);
    }

    const activeSelectedIds = isMulti
      ? isAlreadySelected
        ? currentSelectedIds
        : [...currentSelectedIds, note.id]
      : isAlreadySelected
      ? currentSelectedIds
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
        const targetNote = allNotesRef.current.find((n) => n.id === id);
        const fallbackX = id === noteRef.current.id ? noteRef.current.x : 0;
        const fallbackY = id === noteRef.current.id ? noteRef.current.y : 0;
        return {
          id,
          startX: targetNote ? targetNote.x : fallbackX,
          startY: targetNote ? targetNote.y : fallbackY,
        };
      });
    } else {
      groupDragStartRef.current = [];
    }

    const cardDimsMap = new Map<string, { width: number; height: number }>();
    allNotesRef.current.forEach((n) => {
      const cardEl = document.getElementById(`note-card-${n.id}`);
      cardDimsMap.set(n.id, {
        width: cardEl ? cardEl.offsetWidth : n.width || DEFAULT_NOTE_WIDTH,
        height: cardEl ? cardEl.offsetHeight : n.height || DEFAULT_NOTE_HEIGHT,
      });
    });

    let hasMoved = false;
    let moveFrame: number | null = null;
    let latestMoveEvt: MouseEvent | null = null;

    const processMoveDOM = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - dragStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - dragStartRef.current.y) / zoom;

      const updatedMap = new Map<string, { x: number; y: number }>();

      if (groupDragStartRef.current.length > 1) {
        const updatedBatch = allNotesRef.current
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
            const el = document.getElementById(`note-card-${n.id}`);
            if (el) {
              el.style.transform = `translate3d(${Math.round(rawX)}px, ${Math.round(rawY)}px, 0)`;
            }
            updatedMap.set(n.id, { x: rawX, y: rawY });
            return { ...n, x: rawX, y: rawY };
          });
        currentBatchRef.current = updatedBatch;
      } else {
        let newX = dragStartRef.current.noteX + dx;
        let newY = dragStartRef.current.noteY + dy;
        if (snapToGrid) {
          newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
          newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        }
        currentPosRef.current = { x: newX, y: newY };
        const el = document.getElementById(`note-card-${noteRef.current.id}`);
        if (el) {
          el.style.transform = `translate3d(${Math.round(newX)}px, ${Math.round(newY)}px, 0)`;
        }
        updatedMap.set(noteRef.current.id, { x: newX, y: newY });
      }

      updateGroupFramesDOM(allNotesRef.current, updatedMap, cardDimsMap);
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

      latestMoveEvt = moveEvent;
      if (moveFrame === null) {
        moveFrame = requestAnimationFrame(() => {
          if (latestMoveEvt) processMoveDOM(latestMoveEvt);
          moveFrame = null;
        });
      }
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      if (moveFrame !== null) {
        cancelAnimationFrame(moveFrame);
        moveFrame = null;
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
      currentBatchRef.current = [];
      activeFrameRef.current = null;
      activeMouseHandlersRef.current = null;

      setIsDragging(false);
      requestAnimationFrame(() => {
        onDragStateChange?.([]);
      });

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    activeMouseHandlersRef.current = { move: handleMouseMove, up: handleMouseUp };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return { isDragging, handleMouseDown };
}
