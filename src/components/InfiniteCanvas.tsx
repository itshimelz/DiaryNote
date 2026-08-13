import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Note, CanvasTransform, GridType, CanvasTheme } from '../types';
import { NoteCard } from './NoteCard';
import { NoteConnections } from './NoteConnections';
import { GroupFrame } from './GroupFrame';

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

/**
 * 2D HTML5 Canvas Minimap component.
 * Renders all notes and active viewport box in a single GPU draw call with 0 extra DOM elements.
 */
const MinimapCanvas: React.FC<{
  notes: Note[];
  transform: CanvasTransform;
  minX: number;
  minY: number;
  minimapScale: number;
  viewportWidth: number;
  viewportHeight: number;
  selectedNoteId: string | null;
  themeMode?: CanvasTheme;
}> = ({
  notes,
  transform,
  minX,
  minY,
  minimapScale,
  viewportWidth,
  viewportHeight,
  selectedNoteId,
  themeMode = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isLight = themeMode === 'light';
    const noteFill = isLight ? 'rgba(148, 163, 184, 0.75)' : 'rgba(100, 116, 139, 0.75)';
    const selectedFill = '#3b82f6';

    // Draw all notes in a single batch
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const mx = (n.x - minX) * minimapScale;
      const my = (n.y - minY) * minimapScale;
      const mw = Math.max(3, (n.width || 340) * minimapScale);
      const mh = Math.max(3, (n.height || 300) * minimapScale);

      ctx.fillStyle = n.id === selectedNoteId ? selectedFill : noteFill;
      ctx.fillRect(mx, my, mw, mh);
    }

    // Draw active viewport box
    const vpX = (-transform.x / transform.zoom - minX) * minimapScale;
    const vpY = (-transform.y / transform.zoom - minY) * minimapScale;
    const vpW = (viewportWidth / transform.zoom) * minimapScale;
    const vpH = (viewportHeight / transform.zoom) * minimapScale;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fillRect(vpX, vpY, vpW, vpH);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
  }, [notes, transform, minX, minY, minimapScale, viewportWidth, viewportHeight, selectedNoteId, themeMode]);

  return (
    <canvas
      ref={canvasRef}
      width={170}
      height={110}
      className="w-full h-full pointer-events-none rounded-xs"
    />
  );
};

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

  // Update viewport dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewport({
          width: containerRef.current.clientWidth || window.innerWidth,
          height: containerRef.current.clientHeight || window.innerHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Debounce minimap synchronization to prevent layout pressure
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimapNotes(notes);
    }, 250);
    return () => clearTimeout(timer);
  }, [notes]);

  // Synchronize CSS custom properties directly on the world element
  useEffect(() => {
    if (worldLayerRef.current) {
      worldLayerRef.current.style.setProperty('--canvas-x', `${transform.x}px`);
      worldLayerRef.current.style.setProperty('--canvas-y', `${transform.y}px`);
      worldLayerRef.current.style.setProperty('--canvas-zoom', `${transform.zoom}`);
    }
  }, [transform.x, transform.y, transform.zoom]);

  // Synchronize CSS custom properties directly on the background element
  useEffect(() => {
    if (gridBgRef.current) {
      gridBgRef.current.style.setProperty('--grid-pos-x', `${transform.x}px`);
      gridBgRef.current.style.setProperty('--grid-pos-y', `${transform.y}px`);
      gridBgRef.current.style.setProperty('--grid-size', `${24 * transform.zoom}px`);
    }
  }, [transform.x, transform.y, transform.zoom]);

  // Track dragging state from child NoteCards
  const handleDragStateChange = useCallback((ids: string[]) => {
    setDraggingNoteIds(ids);
  }, []);

  // Wheel handling: zoom and pan with requestAnimationFrame throttling
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        let curr = e.target as HTMLElement | null;
        let canScroll = false;
        while (curr && curr !== containerRef.current) {
          if (
            curr.tagName === 'TEXTAREA' ||
            curr.classList.contains('notes-card-content') ||
            curr.classList.contains('overflow-y-auto')
          ) {
            const hasVerticalScroll = curr.scrollHeight > curr.clientHeight;
            if (hasVerticalScroll) {
              const atTop = curr.scrollTop <= 0 && e.deltaY < 0;
              const atBottom = curr.scrollTop + curr.clientHeight >= curr.scrollHeight - 1 && e.deltaY > 0;
              if (!atTop && !atBottom) {
                canScroll = true;
                break;
              }
            }
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
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let zoomFactor: number;
        if (e.deltaMode === 1 || Math.abs(e.deltaY) >= 40) {
          const ticks = Math.sign(e.deltaY);
          zoomFactor = ticks > 0 ? (1 / 1.12) : 1.12;
        } else {
          zoomFactor = Math.exp(-e.deltaY * 0.0025);
        }

        const newZoom = Math.max(minZoom, Math.min(maxZoom, baseTransform.zoom * zoomFactor));

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

  // Canvas gestures: select by default, pan with Space / pan mode / middle mouse
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

        // Zero-reflow world coordinate intersection calculation
        const boxMinX = (selLeft - transform.x) / transform.zoom;
        const boxMaxX = (selRight - transform.x) / transform.zoom;
        const boxMinY = (selTop - transform.y) / transform.zoom;
        const boxMaxY = (selBottom - transform.y) / transform.zoom;

        const newlyMatchedIds: string[] = [];
        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          const w = n.width || 340;
          const h = n.height || 300;
          if (n.x + w >= boxMinX && n.x <= boxMaxX && n.y + h >= boxMinY && n.y <= boxMaxY) {
            newlyMatchedIds.push(n.id);
          }
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
      const dx = moveEvt.clientX - panStartRef.current.x;
      const dy = moveEvt.clientY - panStartRef.current.y;
      nextPosition = {
        x: Math.round(panStartRef.current.transformX + dx),
        y: Math.round(panStartRef.current.transformY + dy),
      };
      onTransformChange({
        ...transform,
        x: nextPosition.x,
        y: nextPosition.y,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('.note-card')) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = (clickX - transform.x) / transform.zoom;
    const worldY = (clickY - transform.y) / transform.zoom;
    onDoubleClickCanvas(Math.round(worldX), Math.round(worldY));
  };

  const getBackgroundClass = () => {
    if (themeMode === 'gradient') return 'bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6]';
    if (gridType === 'blank') return themeMode === 'dark' ? 'bg-slate-950' : 'bg-[#f8fafc]';
    const isDark = themeMode === 'dark';
    if (gridType === 'dots') return isDark ? 'bg-canvas-dots-dark bg-slate-950' : 'bg-canvas-dots-light bg-[#f8fafc]';
    if (gridType === 'grid') return isDark ? 'bg-canvas-grid-dark bg-slate-950' : 'bg-canvas-grid-light bg-[#f8fafc]';
    if (gridType === 'ruled') return isDark ? 'bg-canvas-ruled-dark bg-slate-950' : 'bg-canvas-ruled-light bg-[#f8fafc]';
    return isDark ? 'bg-slate-950' : 'bg-[#f8fafc]';
  };

  // Viewport Culling for high performance
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;
  const renderBuffer = 600 / transform.zoom;

  const visibleMinX = -transform.x / transform.zoom - renderBuffer;
  const visibleMaxX = (viewportWidth - transform.x) / transform.zoom + renderBuffer;
  const visibleMinY = -transform.y / transform.zoom - renderBuffer;
  const visibleMaxY = (viewportHeight - transform.y) / transform.zoom + renderBuffer;

  const visibleNotes = useMemo(() => {
    return notes.filter(
      (n) =>
        n.id === selectedNoteId ||
        selectedNoteIds.includes(n.id) ||
        n.id === focusedNoteId ||
        n.isPinned ||
        (n.x + (n.width || 340) >= visibleMinX &&
          n.x <= visibleMaxX &&
          n.y + (n.height || 300) >= visibleMinY &&
          n.y <= visibleMaxY)
    );
  }, [notes, selectedNoteId, selectedNoteIds, focusedNoteId, visibleMinX, visibleMaxX, visibleMinY, visibleMaxY]);

  // Minimap scale and bounds in a single memoized calculation
  const { minX, minY, minimapScale } = useMemo(() => {
    if (notes.length === 0) {
      return { minX: -100, minY: -100, minimapScale: 0.12 };
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

    return { minX: minXBoundary, minY: minYBoundary, minimapScale: scale };
  }, [notes]);

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
        const target = e.target as HTMLElement;
        if (!target.closest('.note-card')) {
          onContextMenuCanvas?.(e);
        }
      }}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${
        isPanMode || isSpacePressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
      }`}
    >
      {/* Background layer */}
      <div
        ref={gridBgRef}
        className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${getBackgroundClass()}`}
      />

      {/* World layer */}
      <div
        ref={worldLayerRef}
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.zoom})`,
        }}
      >
        {/* Render group bounding frames */}
        {Array.from(noteGroups.entries()).map(([groupId, groupNotes]) => (
          <GroupFrame
            key={groupId}
            groupId={groupId}
            groupNotes={groupNotes}
            zoom={transform.zoom}
            themeMode={themeMode}
            onUpdateBatchNotes={onUpdateBatchNotes}
          />
        ))}

        {/* Bi-directional markdown connection lines */}
        {showConnections && (
          <NoteConnections
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={onNavigateToNote}
            themeMode={themeMode}
            viewportBounds={{
              minX: visibleMinX,
              maxX: visibleMaxX,
              minY: visibleMinY,
              maxY: visibleMaxY,
            }}
          />
        )}

        {/* Note Cards */}
        {visibleNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            allNotes={notes}
            zoom={transform.zoom}
            isSelected={selectedNoteId === note.id || selectedNoteIds.includes(note.id)}
            selectedNoteIds={selectedNoteIds}
            isFocused={focusedNoteId === note.id}
            isCardDragging={draggingNoteIds.includes(note.id)}
            onDragStateChange={handleDragStateChange}
            shouldStartEditing={editingNoteId === note.id}
            onSelectNote={handleSelectNoteStable}
            onNavigateToNote={onNavigateToNote}
            onUpdateNote={onUpdateNote}
            onUpdateBatchNotes={onUpdateBatchNotes}
            onDeleteNote={onDeleteNote}
            onBringToFront={onBringToFront}
            isPanMode={isPanMode || isSpacePressed}
            snapToGrid={snapToGrid}
            onRequestLockNote={onRequestLockNote}
            onRequestUnlockNote={onRequestUnlockNote}
            onExportNote={onExportNote}
            onContextMenu={onContextMenuNote}
          />
        ))}
      </div>

      {/* Selection Box overlay */}
      {selectionBox && (
        <div
          className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none rounded-xs z-30"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}

      {/* Floating 2D HTML5 Canvas Minimap */}
      <div className="absolute bottom-6 right-6 z-20 hidden md:block">
        <div
          className={`p-2 rounded-sm border backdrop-blur-md shadow-2xl transition-all select-none w-48 ${
            themeMode === 'light'
              ? 'bg-white/80 border-slate-200 text-slate-900'
              : 'bg-slate-900/85 border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-sans font-medium text-slate-400 mb-1.5 px-0.5">
            <span>Canvas map</span>
          </div>
          <div
            className={`relative w-full h-22 rounded-sm border overflow-hidden cursor-pointer transition-colors ${
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
            <MinimapCanvas
              notes={minimapNotes}
              transform={transform}
              minX={minX}
              minY={minY}
              minimapScale={minimapScale}
              viewportWidth={viewportWidth}
              viewportHeight={viewportHeight}
              selectedNoteId={selectedNoteId}
              themeMode={themeMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const InfiniteCanvas = React.memo(InfiniteCanvasComponent);
