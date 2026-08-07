import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Note, CanvasTransform, GridType, CanvasTheme } from '../types';
import { NoteCard } from './NoteCard';
import { NoteConnections } from './NoteConnections';
import { Layers, X } from 'lucide-react';

interface InfiniteCanvasProps {
  notes: Note[];
  transform: CanvasTransform;
  onTransformChange: (newTransform: CanvasTransform) => void;
  gridType: GridType;
  themeMode: CanvasTheme;
  showConnections: boolean;
  selectedNoteId: string | null;
  selectedNoteIds?: string[];
  focusedNoteId: string | null;
  onSelectNote: (noteId: string | null, isMultiSelect?: boolean) => void;
  onSelectMultipleNotes?: (noteIds: string[]) => void;
  onNavigateToNote: (noteId: string) => void;
  onUpdateNote: (updatedNote: Note) => void;
  onUpdateBatchNotes?: (updatedNotes: Note[]) => void;
  onDeleteNote: (noteId: string) => void;
  onBringToFront: (noteId: string) => void;
  onDoubleClickCanvas: (x: number, y: number) => void;
  isPanMode: boolean;
  snapToGrid?: boolean;
  editingNoteId?: string | null;
  minZoom?: number;
  maxZoom?: number;
  onAnimateTransform?: (transform: CanvasTransform) => void;
  onRequestLockNote?: (noteId: string) => void;
  onRequestUnlockNote?: (noteId: string) => void;
  onExportNote?: (note: Note, format: 'md' | 'txt' | 'json') => void;
  onContextMenuNote?: (e: React.MouseEvent, noteId: string) => void;
  onContextMenuCanvas?: (e: React.MouseEvent) => void;
}

interface GroupFrameProps {
  groupId: string;
  groupNotes: Note[];
  themeMode: CanvasTheme;
  zoom: number;
  snapToGrid?: boolean;
  onUpdateBatchNotes?: (notes: Note[]) => void;
  onSelectMultipleNotes?: (ids: string[]) => void;
}

const GroupFrame: React.FC<GroupFrameProps> = ({
  groupId,
  groupNotes,
  themeMode,
  zoom,
  snapToGrid = false,
  onUpdateBatchNotes,
  onSelectMultipleNotes,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const currentGroupName = groupNotes[0]?.groupName || '';
  const [titleInput, setTitleInput] = useState(currentGroupName);
  const [measuredBounds, setMeasuredBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);

  const dragStartRef = useRef<{ startX: number; startY: number; notePositions: { id: string; x: number; y: number }[] } | null>(null);

  useEffect(() => {
    setTitleInput(currentGroupName);
  }, [currentGroupName]);

  // Dynamic ResizeObserver to adapt frame size smoothly to live card heights
  useEffect(() => {
    const updateBounds = () => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      groupNotes.forEach((n) => {
        const el = document.getElementById(`note-card-${n.id}`);
        const realW = el ? el.offsetWidth : n.width || 340;
        const realH = el ? el.offsetHeight : n.height || 340;

        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + realW);
        maxY = Math.max(maxY, n.y + realH);
      });

      if (minX !== Infinity) {
        setMeasuredBounds({
          minX: minX - 24,
          minY: minY - 36,
          maxX: maxX + 24,
          maxY: maxY + 24,
        });
      }
    };

    updateBounds();

    const observers: ResizeObserver[] = [];
    groupNotes.forEach((n) => {
      const el = document.getElementById(`note-card-${n.id}`);
      if (el) {
        const observer = new ResizeObserver(() => updateBounds());
        observer.observe(el);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [groupNotes]);

  // Mouse Down Drag Handler for Group Frame Header Badge
  const handleBadgeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isEditing) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT') return;

    e.preventDefault();
    e.stopPropagation();

    // Select all notes in group
    onSelectMultipleNotes?.(groupNotes.map((n) => n.id));

    setIsDraggingGroup(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      notePositions: groupNotes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
    };

    const GRID_SIZE = 24;
    let pendingUpdate: Note[] | null = null;
    let frameId: number | null = null;

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (moveEvt.clientX - dragStartRef.current.startX) / zoom;
      const dy = (moveEvt.clientY - dragStartRef.current.startY) / zoom;

      pendingUpdate = groupNotes.map((n) => {
        const startPos = dragStartRef.current?.notePositions.find((item) => item.id === n.id);
        if (!startPos) return n;
        let rawX = startPos.x + dx;
        let rawY = startPos.y + dy;
        if (snapToGrid) {
          rawX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
          rawY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
        }
        return { ...n, x: rawX, y: rawY };
      });

      if (frameId === null) {
        frameId = requestAnimationFrame(() => {
          if (pendingUpdate && onUpdateBatchNotes) {
            onUpdateBatchNotes(pendingUpdate);
          }
          frameId = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (pendingUpdate && onUpdateBatchNotes) {
        onUpdateBatchNotes(pendingUpdate);
      }
      setIsDraggingGroup(false);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const fallbackMinX = Math.min(...groupNotes.map((n) => n.x)) - 24;
  const fallbackMinY = Math.min(...groupNotes.map((n) => n.y)) - 36;
  const fallbackMaxX = Math.max(...groupNotes.map((n) => n.x + (n.width || 340))) + 24;
  const fallbackMaxY = Math.max(...groupNotes.map((n) => n.y + (n.height || 340))) + 24;

  const minX = measuredBounds ? measuredBounds.minX : fallbackMinX;
  const minY = measuredBounds ? measuredBounds.minY : fallbackMinY;
  const maxX = measuredBounds ? measuredBounds.maxX : fallbackMaxX;
  const maxY = measuredBounds ? measuredBounds.maxY : fallbackMaxY;

  const width = Math.max(100, maxX - minX);
  const height = Math.max(100, maxY - minY);

  const isLight = themeMode === 'light';

  const containerBorder = isLight
    ? 'border-2 border-dashed border-slate-300/80 bg-slate-200/20'
    : 'border-2 border-dashed border-slate-700/80 bg-slate-900/30';

  const badgeStyle = isLight
    ? 'bg-white/95 border border-slate-200/90 text-slate-800 shadow-sm backdrop-blur-md'
    : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 shadow-sm backdrop-blur-md';

  const handleSaveTitle = () => {
    setIsEditing(false);
    const trimmed = titleInput.trim();
    const updated = groupNotes.map((n) => ({
      ...n,
      groupName: trimmed || undefined,
    }));
    onUpdateBatchNotes?.(updated);
  };

  const displayName = currentGroupName || `Group (${groupNotes.length} notes)`;

  const transitionClass = isDraggingGroup
    ? 'transition-none'
    : 'transition-[width,height,transform] duration-200 ease-out';

  return (
    <div
      style={{
        transform: `translate3d(${minX}px, ${minY}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={`absolute rounded-md pointer-events-none ${transitionClass} ${containerBorder}`}
    >
      {/* Group Header Badge matching bottom dock bar style */}
      <div
        onMouseDown={handleBadgeMouseDown}
        className={`absolute -top-3.5 left-3 px-2.5 py-0.5 rounded-sm text-xs font-semibold tracking-wide flex items-center gap-2 pointer-events-auto select-none cursor-grab active:cursor-grabbing ${badgeStyle}`}
      >
        <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        {isEditing ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
            }}
            autoFocus
            placeholder={`Group (${groupNotes.length} notes)`}
            className="bg-transparent border-b border-blue-500 text-xs font-semibold focus:outline-none px-0.5 py-0 min-w-[120px] cursor-text"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="hover:underline flex items-center gap-1 font-semibold"
            title="Click to rename group"
          >
            <span>{displayName}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  notes,
  transform,
  onTransformChange,
  gridType,
  themeMode,
  showConnections,
  selectedNoteId,
  selectedNoteIds = [],
  focusedNoteId,
  onSelectNote,
  onSelectMultipleNotes,
  onNavigateToNote,
  onUpdateNote,
  onUpdateBatchNotes,
  onDeleteNote,
  onBringToFront,
  onDoubleClickCanvas,
  isPanMode,
  snapToGrid = false,
  editingNoteId,
  minZoom = 0.15,
  maxZoom = 3,
  onAnimateTransform,
  onRequestLockNote,
  onRequestUnlockNote,
  onExportNote,
  onContextMenuNote,
  onContextMenuCanvas,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [draggingNoteIds, setDraggingNoteIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const wheelFrameRef = useRef<number | null>(null);
  const pendingWheelTransformRef = useRef<CanvasTransform | null>(null);
  const panStartRef = useRef<{ x: number; y: number; transformX: number; transformY: number }>({
    x: 0,
    y: 0,
    transformX: 0,
    transformY: 0,
  });

  // Spacebar key tracking for pan shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.isContentEditable) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => () => {
    if (wheelFrameRef.current !== null) cancelAnimationFrame(wheelFrameRef.current);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateViewport = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Wheel zoom around mouse cursor & wheel pan
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && (target.closest('.note-card') || target.closest('[id^="note-card-"]'))) {
        // Do NOT zoom/pan canvas when mouse is scrolling inside a note
        return;
      }

      e.preventDefault();
      if (!containerRef.current) return;
      const baseTransform = pendingWheelTransformRef.current || transform;
      const scheduleWheelTransform = (nextTransform: CanvasTransform) => {
        pendingWheelTransformRef.current = nextTransform;
        if (wheelFrameRef.current !== null) return;
        wheelFrameRef.current = requestAnimationFrame(() => {
          const next = pendingWheelTransformRef.current;
          pendingWheelTransformRef.current = null;
          wheelFrameRef.current = null;
          if (next) onTransformChange(next);
        });
      };

      if (e.ctrlKey || e.metaKey) {
        // Pinch / Ctrl + Wheel -> zoom around the pointer.
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, baseTransform.zoom * zoomFactor));

        // Keep point under mouse fixed in world coordinates
        const worldX = (mouseX - baseTransform.x) / baseTransform.zoom;
        const worldY = (mouseY - baseTransform.y) / baseTransform.zoom;

        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        scheduleWheelTransform({
          x: Math.round(newX),
          y: Math.round(newY),
          zoom: newZoom,
        });
      } else {
        // Wheel pans naturally; Shift makes a vertical wheel movement horizontal.
        const horizontalDelta = e.shiftKey ? (e.deltaY || e.deltaX) : e.deltaX;
        const verticalDelta = e.shiftKey ? 0 : e.deltaY;
        scheduleWheelTransform({
          ...baseTransform,
          x: Math.round(baseTransform.x - horizontalDelta),
          y: Math.round(baseTransform.y - verticalDelta),
        });
      }
    },
    [transform, onTransformChange, minZoom, maxZoom]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Canvas gestures: select by default, pan with Space / pan mode / middle mouse.
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    const isCanvasClick = !target.closest('.note-card');
    if (!isCanvasClick) return;

    const shouldPan = e.button === 1 || isSpacePressed || isPanMode;
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    if (!shouldPan) {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setSelectionBox({ startX, startY, currentX: startX, currentY: startY });

      let hasDragged = false;
      const handleMouseMove = (moveEvt: MouseEvent) => {
        const curX = moveEvt.clientX - rect.left;
        const curY = moveEvt.clientY - rect.top;
        if (Math.abs(curX - startX) > 3 || Math.abs(curY - startY) > 3) {
          hasDragged = true;
        }
        setSelectionBox({ startX, startY, currentX: curX, currentY: curY });

        const minPx = Math.min(startX, curX);
        const maxPx = Math.max(startX, curX);
        const minPy = Math.min(startY, curY);
        const maxPy = Math.max(startY, curY);

        const boxMinX = (minPx - transform.x) / transform.zoom;
        const boxMaxX = (maxPx - transform.x) / transform.zoom;
        const boxMinY = (minPy - transform.y) / transform.zoom;
        const boxMaxY = (maxPy - transform.y) / transform.zoom;

        const matchedIds = notes
          .filter((n) => {
            const w = n.width || 340;
            const h = n.height || 340;
            return n.x + w >= boxMinX && n.x <= boxMaxX && n.y + h >= boxMinY && n.y <= boxMaxY;
          })
          .map((n) => n.id);

        onSelectMultipleNotes?.(matchedIds);
      };

      const handleMouseUp = () => {
        setSelectionBox(null);
        if (!hasDragged && !e.shiftKey) {
          onSelectNote(null);
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return;
    }

    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, transformX: transform.x, transformY: transform.y };
    let frame: number | null = null;
    let nextPosition = { x: transform.x, y: transform.y };
    const handleMouseMove = (moveEvt: MouseEvent) => {
      nextPosition = {
        x: Math.round(panStartRef.current.transformX + moveEvt.clientX - panStartRef.current.x),
        y: Math.round(panStartRef.current.transformY + moveEvt.clientY - panStartRef.current.y),
      };
      if (frame === null) {
        frame = requestAnimationFrame(() => {
          onTransformChange({ ...transform, ...nextPosition });
          frame = null;
        });
      }
    };
    const handleMouseUp = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      onTransformChange({ ...transform, ...nextPosition });
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Double click canvas to add note at mouse pointer location
  const handleDoubleClick = (e: React.MouseEvent) => {
    const isCanvasClick = !(e.target as HTMLElement).closest('.note-card');
    if (isCanvasClick && containerRef.current && !isPanMode && !isSpacePressed) {
      onDoubleClickCanvas(e.clientX, e.clientY);
    }
  };

  // Background CSS pattern class
  const getBackgroundClass = () => {
    if (themeMode === 'gradient') return 'bg-gradient-to-br from-[#2b59c3] via-[#5d5fef] to-[#e879f9]';
    if (gridType === 'blank') return themeMode === 'dark' ? 'bg-slate-950' : 'bg-[#f8fafc]';
    const isDark = themeMode === 'dark';
    if (gridType === 'dots') return isDark ? 'bg-canvas-dots-dark bg-slate-950' : 'bg-canvas-dots-light bg-[#f8fafc]';
    if (gridType === 'grid') return isDark ? 'bg-canvas-grid-dark bg-slate-950' : 'bg-canvas-grid-light bg-[#f8fafc]';
    if (gridType === 'ruled') return isDark ? 'bg-canvas-ruled-dark bg-slate-950' : 'bg-canvas-ruled-light bg-[#f8fafc]';
    return isDark ? 'bg-slate-950' : 'bg-[#f8fafc]';
  };

  // Viewport Culling (Canvas Virtualization) for high performance with tens of thousands of notes
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;
  const renderBuffer = 600 / transform.zoom; // buffer margin in world coordinates

  const visibleMinX = -transform.x / transform.zoom - renderBuffer;
  const visibleMaxX = (viewportWidth - transform.x) / transform.zoom + renderBuffer;
  const visibleMinY = -transform.y / transform.zoom - renderBuffer;
  const visibleMaxY = (viewportHeight - transform.y) / transform.zoom + renderBuffer;

  // Only render NoteCards that are within or touching the active viewport
  const visibleNotes = useMemo(() => {
    if (notes.length <= 60) return notes;
    return notes.filter(
      (n) =>
        n.id === selectedNoteId ||
        n.id === focusedNoteId ||
        n.isPinned ||
        (n.x + n.width >= visibleMinX &&
          n.x <= visibleMaxX &&
          n.y + n.height >= visibleMinY &&
          n.y <= visibleMaxY)
    );
  }, [notes, selectedNoteId, focusedNoteId, visibleMinX, visibleMaxX, visibleMinY, visibleMaxY]);

  // Minimap bounding calculations memoized in a single O(N) pass
  const { minX, minY, worldWidth, worldHeight, minimapScale } = useMemo(() => {
    if (notes.length === 0) {
      return { minX: -100, minY: -100, worldWidth: 1200, worldHeight: 1000, minimapScale: 0.12 };
    }
    let minXVal = 0;
    let maxXVal = 1000;
    let minYVal = 0;
    let maxYVal = 800;

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.x < minXVal) minXVal = n.x;
      if (n.x + n.width > maxXVal) maxXVal = n.x + n.width;
      if (n.y < minYVal) minYVal = n.y;
      if (n.y + n.height > maxYVal) maxYVal = n.y + n.height;
    }

    const padding = 100;
    const minXBoundary = minXVal - padding;
    const maxXBoundary = maxXVal + padding;
    const minYBoundary = minYVal - padding;
    const maxYBoundary = maxYVal + padding;

    const wWidth = maxXBoundary - minXBoundary;
    const wHeight = maxYBoundary - minYBoundary;
    const scale = Math.min(150 / wWidth, 90 / wHeight);

    return { minX: minXBoundary, minY: minYBoundary, worldWidth: wWidth, worldHeight: wHeight, minimapScale: scale };
  }, [notes]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenuCanvas?.(e);
      }}
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-300 ${getBackgroundClass()} ${
        isPanning || isSpacePressed || isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* Background Grid Pattern element */}
      <div
        id="canvas-grid-bg"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundPosition: `${transform.x}px ${transform.y}px`,
          backgroundSize: `${24 * transform.zoom}px ${24 * transform.zoom}px`,
        }}
      />

      {showConnections && (
        <NoteConnections
          notes={notes}
          transform={transform}
          selectedNoteId={selectedNoteId}
          onSelectNote={onNavigateToNote}
          themeMode={themeMode}
        />
      )}

      {/* Rubber-band Drag Selection Box Overlay */}
      {selectionBox && (
        <div
          style={{
            left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
            top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
            width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
            height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
          }}
          className="fixed border-2 border-blue-500 bg-blue-500/20 rounded-md pointer-events-none z-50 shadow-sm"
        />
      )}

      {/* Scaled World Coordinates Canvas Layer */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scale(${transform.zoom})`,
        }}
      >
        <div className="pointer-events-auto">
          {/* Visual Group Frame Containers */}
          {Array.from(
            notes.reduce((acc, n) => {
              if (n.groupId) {
                const list = acc.get(n.groupId) || [];
                list.push(n);
                acc.set(n.groupId, list);
              }
              return acc;
            }, new Map<string, Note[]>())
          ).map(([groupId, groupNotes]) => (
            <GroupFrame
              key={groupId}
              groupId={groupId}
              groupNotes={groupNotes}
              themeMode={themeMode}
              zoom={transform.zoom}
              snapToGrid={snapToGrid}
              onUpdateBatchNotes={onUpdateBatchNotes}
              onSelectMultipleNotes={onSelectMultipleNotes}
            />
          ))}

          {visibleNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              allNotes={notes}
              zoom={transform.zoom}
              isSelected={selectedNoteIds.includes(note.id) || selectedNoteId === note.id}
              selectedNoteIds={selectedNoteIds}
              isFocused={focusedNoteId === note.id}
              onSelectNote={(id, isMulti) => onSelectNote(id, isMulti)}
              onNavigateToNote={onNavigateToNote}
              onUpdateNote={onUpdateNote}
              onUpdateBatchNotes={onUpdateBatchNotes}
              onDeleteNote={onDeleteNote}
              onBringToFront={onBringToFront}
              snapToGrid={snapToGrid}
              isPanMode={isPanMode || isSpacePressed}
              shouldStartEditing={editingNoteId === note.id}
              onRequestLockNote={onRequestLockNote}
              onRequestUnlockNote={onRequestUnlockNote}
              onExportNote={onExportNote}
              isCardDragging={draggingNoteIds.includes(note.id)}
              onDragStateChange={setDraggingNoteIds}
              onContextMenu={onContextMenuNote}
            />
          ))}
        </div>
      </div>

      {/* Upgraded Canvas MiniMap placed at Top Right */}
      <div className={`fixed top-4 right-4 z-30 w-44 h-32 border rounded-md shadow-sm backdrop-blur-md overflow-hidden p-2.5 hidden md:block select-none transition-all ${
        themeMode === 'light'
          ? 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-200/50'
          : 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-black/50'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 mb-1.5 px-0.5">
          <span className="uppercase tracking-wider">CANVAS MAP</span>
        </div>
        <div
          className={`relative w-full h-22 rounded-md border overflow-hidden cursor-pointer transition-colors ${
            themeMode === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            const targetWorldX = minX + clickX / minimapScale;
            const targetWorldY = minY + clickY / minimapScale;

            const nextTransform = {
              ...transform,
              x: Math.round(viewportWidth / 2 - targetWorldX * transform.zoom),
              y: Math.round(viewportHeight / 2 - targetWorldY * transform.zoom),
            };
            if (onAnimateTransform) onAnimateTransform(nextTransform);
            else onTransformChange(nextTransform);
          }}
        >
          {/* Note bounding boxes on minimap */}
          {notes.map((n) => {
            const mx = (n.x - minX) * minimapScale;
            const my = (n.y - minY) * minimapScale;
            const mw = Math.max(3, n.width * minimapScale);
            const mh = Math.max(3, n.height * minimapScale);

            return (
              <div
                key={n.id}
                style={{
                  left: `${mx}px`,
                  top: `${my}px`,
                  width: `${mw}px`,
                  height: `${mh}px`,
                }}
                className={`absolute rounded-[1px] transition-all ${
                  selectedNoteId === n.id
                    ? 'bg-blue-500 ring-1 ring-blue-300 z-10'
                    : themeMode === 'light'
                    ? 'bg-slate-400/70 hover:bg-blue-400'
                    : 'bg-slate-500/70 hover:bg-blue-400'
                }`}
              />
            );
          })}

          {/* Current Viewport box */}
          {containerRef.current && (
            <div
              style={{
                left: `${(-transform.x / transform.zoom - minX) * minimapScale}px`,
                top: `${(-transform.y / transform.zoom - minY) * minimapScale}px`,
                width: `${(viewportWidth / transform.zoom) * minimapScale}px`,
                height: `${(viewportHeight / transform.zoom) * minimapScale}px`,
              }}
              className="absolute border-2 border-blue-500 bg-blue-500/15 pointer-events-none rounded-[2px] shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};
