import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Note, CanvasTransform, GridType, CanvasTheme } from '../types';
import { NoteCard } from './NoteCard';
import { NoteConnections } from './NoteConnections';
import { GroupFrame } from './GroupFrame';
import { Layers, X, FolderOutput } from 'lucide-react';


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

const InfiniteCanvasComponent: React.FC<InfiniteCanvasProps> = ({
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
  const worldLayerRef = useRef<HTMLDivElement>(null);
  const gridBgRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [draggingNoteIds, setDraggingNoteIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [minimapNotes, setMinimapNotes] = useState<Note[]>(notes);
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

  // Throttle minimap notes — update at most every 100ms, not every pan frame
  useEffect(() => {
    const timer = setTimeout(() => setMinimapNotes(notes), 100);
    return () => clearTimeout(timer);
  }, [notes]);

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
      const noteCardEl = target ? (target.closest('.note-card') as HTMLElement) : null;

      if (!e.ctrlKey && !e.metaKey && noteCardEl) {
        let curr: HTMLElement | null = target;
        let canScroll = false;
        while (curr && curr !== noteCardEl) {
          const isScrollY = curr.scrollHeight > curr.clientHeight + 1;
          const isScrollX = curr.scrollWidth > curr.clientWidth + 1;

          if (isScrollY && e.deltaY !== 0) {
            if (e.deltaY < 0 && curr.scrollTop > 0) canScroll = true;
            if (e.deltaY > 0 && curr.scrollTop + curr.clientHeight < curr.scrollHeight - 1) canScroll = true;
          }
          if (isScrollX && e.deltaX !== 0) {
            if (e.deltaX < 0 && curr.scrollLeft > 0) canScroll = true;
            if (e.deltaX > 0 && curr.scrollLeft + curr.clientWidth < curr.scrollWidth - 1) canScroll = true;
          }
          if (canScroll) break;
          curr = curr.parentElement;
        }
        if (canScroll) return;
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
        // Smooth exponential zoom around mouse pointer
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const sensitivity = e.deltaMode === 1 ? 0.03 : 0.0015;
        const zoomFactor = Math.exp(-e.deltaY * sensitivity);
        const newZoom = Math.max(minZoom, Math.min(maxZoom, baseTransform.zoom * zoomFactor));

        // Keep point under mouse fixed in world coordinates
        const worldX = (mouseX - baseTransform.x) / baseTransform.zoom;
        const worldY = (mouseY - baseTransform.y) / baseTransform.zoom;

        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        scheduleWheelTransform({
          x: Math.round(newX),
          y: Math.round(newY),
          zoom: Number(newZoom.toFixed(4)),
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

    const shouldPan = e.button === 1 || isSpacePressed || isPanMode;
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }

    if (!shouldPan) {
      const isCanvasClick = !target.closest('.note-card');
      if (!isCanvasClick) return;
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      const initialSelectedIds = e.shiftKey ? selectedNoteIds : [];
      let hasDragged = false;
      let prevSelectedIds: string[] = initialSelectedIds;
      let selectionFrame: number | null = null;
      let latestMouseEvt: MouseEvent | null = null;

      const areArraysEqual = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      };

      // Query note card DOM elements for pixel-perfect bounding box matching (supports long/expanded notes)
      const cardElements = containerRef.current
        ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('.note-card[data-note-id]'))
        : [];

      const processSelectionUpdate = (moveEvt: MouseEvent) => {
        const curX = moveEvt.clientX - rect.left;
        const curY = moveEvt.clientY - rect.top;
        const deltaX = Math.abs(curX - startX);
        const deltaY = Math.abs(curY - startY);

        if (deltaX > 3 || deltaY > 3) {
          hasDragged = true;
        }

        if (!hasDragged) return;

        setSelectionBox({ startX, startY, currentX: curX, currentY: curY });

        const selLeft = Math.min(startX, curX);
        const selRight = Math.max(startX, curX);
        const selTop = Math.min(startY, curY);
        const selBottom = Math.max(startY, curY);

        const newlyMatchedIds: string[] = [];

        if (cardElements.length > 0) {
          for (let i = 0; i < cardElements.length; i++) {
            const el = cardElements[i];
            const noteId = el.getAttribute('data-note-id');
            if (!noteId) continue;
            const r = el.getBoundingClientRect();
            const cardLeft = r.left - rect.left;
            const cardRight = r.right - rect.left;
            const cardTop = r.top - rect.top;
            const cardBottom = r.bottom - rect.top;

            if (selLeft <= cardRight && selRight >= cardLeft && selTop <= cardBottom && selBottom >= cardTop) {
              newlyMatchedIds.push(noteId);
            }
          }
        } else {
          // Fallback to world coordinate calculations
          const boxMinX = (selLeft - transform.x) / transform.zoom;
          const boxMaxX = (selRight - transform.x) / transform.zoom;
          const boxMinY = (selTop - transform.y) / transform.zoom;
          const boxMaxY = (selBottom - transform.y) / transform.zoom;

          notes.forEach((n) => {
            const w = n.width || 340;
            const h = n.height || 340;
            if (n.x + w >= boxMinX && n.x <= boxMaxX && n.y + h >= boxMinY && n.y <= boxMaxY) {
              newlyMatchedIds.push(n.id);
            }
          });
        }

        const combinedIds = Array.from(new Set([...initialSelectedIds, ...newlyMatchedIds]));

        if (!areArraysEqual(combinedIds, prevSelectedIds)) {
          prevSelectedIds = combinedIds;
          onSelectMultipleNotes?.(combinedIds);
        }
      };

      const handleMouseMove = (moveEvt: MouseEvent) => {
        latestMouseEvt = moveEvt;
        if (selectionFrame === null) {
          selectionFrame = requestAnimationFrame(() => {
            if (latestMouseEvt) processSelectionUpdate(latestMouseEvt);
            selectionFrame = null;
          });
        }
      };

      const handleMouseUp = () => {
        if (selectionFrame !== null) cancelAnimationFrame(selectionFrame);
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
    let nextPosition = { x: transform.x, y: transform.y };
    const handleMouseMove = (moveEvt: MouseEvent) => {
      nextPosition = {
        x: Math.round(panStartRef.current.transformX + moveEvt.clientX - panStartRef.current.x),
        y: Math.round(panStartRef.current.transformY + moveEvt.clientY - panStartRef.current.y),
      };
      if (worldLayerRef.current) {
        worldLayerRef.current.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0) scale(${transform.zoom})`;
      }
      if (gridBgRef.current) {
        gridBgRef.current.style.backgroundPosition = `${nextPosition.x}px ${nextPosition.y}px`;
      }
    };
    const handleMouseUp = () => {
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

  // Viewport Culling (Canvas Virtualization) for high performance
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;
  const renderBuffer = 600 / transform.zoom; // buffer margin in world coordinates

  const visibleMinX = -transform.x / transform.zoom - renderBuffer;
  const visibleMaxX = (viewportWidth - transform.x) / transform.zoom + renderBuffer;
  const visibleMinY = -transform.y / transform.zoom - renderBuffer;
  const visibleMaxY = (viewportHeight - transform.y) / transform.zoom + renderBuffer;

  // Only render NoteCards that are within or touching the active viewport
  const visibleNotes = useMemo(() => {
    return notes.filter(
      (n) =>
        n.id === selectedNoteId ||
        n.id === focusedNoteId ||
        n.isPinned ||
        (n.x + (n.width || 340) >= visibleMinX &&
          n.x <= visibleMaxX &&
          n.y + (n.height || 340) >= visibleMinY &&
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

  // Memoize note grouping (was computed inline in JSX on every render)
  const noteGroups = useMemo(() => {
    const groups = new Map<string, Note[]>();
    for (const n of notes) {
      if (n.groupId) {
        const list = groups.get(n.groupId);
        if (list) list.push(n);
        else groups.set(n.groupId, [n]);
      }
    }
    return groups;
  }, [notes]);

  // Stabilize onSelectNote to avoid breaking NoteCard's React.memo
  const handleSelectNoteStable = useCallback(
    (id: string | null, isMulti?: boolean) => onSelectNote(id, isMulti),
    [onSelectNote]
  );

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
        ref={gridBgRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundPosition: `${transform.x}px ${transform.y}px`,
          backgroundSize: `${24 * transform.zoom}px ${24 * transform.zoom}px`,
        }}
      />

      {/* Rubber-band Drag Selection Box Overlay */}
      {selectionBox && Math.max(Math.abs(selectionBox.currentX - selectionBox.startX), Math.abs(selectionBox.currentY - selectionBox.startY)) > 2 && (
        <div
          style={{
            left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
            top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
            width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
            height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
          }}
          className="fixed border border-blue-500/80 bg-blue-500/15 rounded-xs pointer-events-none z-50 shadow-2xs backdrop-blur-[0.5px] transition-none"
        />
      )}

      {/* Scaled World Coordinates Canvas Layer */}
      <div
        ref={worldLayerRef}
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scale(${transform.zoom})`,
        }}
      >
        {showConnections && (
          <NoteConnections
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={onNavigateToNote}
            themeMode={themeMode}
          />
        )}

        <div className="pointer-events-auto">
          {/* Visual Group Frame Containers */}
          {Array.from(noteGroups).map(([groupId, groupNotes]) => (
            <GroupFrame
              key={groupId}
              groupId={groupId}
              groupNotes={groupNotes}
              themeMode={themeMode}
              zoom={transform.zoom}
              snapToGrid={snapToGrid}
              onUpdateBatchNotes={onUpdateBatchNotes}
              onSelectMultipleNotes={onSelectMultipleNotes}
              onDragStateChange={setDraggingNoteIds}
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
              onSelectNote={handleSelectNoteStable}
              onNavigateToNote={onNavigateToNote}
              onUpdateNote={onUpdateNote}
              onUpdateBatchNotes={onUpdateBatchNotes}
              onDeleteNote={onDeleteNote}
              onBringToFront={onBringToFront}
              snapToGrid={snapToGrid}
              isPanMode={isPanMode || isSpacePressed || isPanning}
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
          {minimapNotes.map((n) => {
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

export const InfiniteCanvas = React.memo(InfiniteCanvasComponent);
