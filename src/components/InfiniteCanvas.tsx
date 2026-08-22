import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Image01Icon } from '@hugeicons/core-free-icons';
import { Icon } from './ui';
import { Note, CanvasTransform, GridType, CanvasTheme } from '../types';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';
import { NoteConnections } from './NoteConnections';
import { GroupFrame } from './GroupFrame';
import { isTauriEnvironment } from '../hooks/useNativeFileDrop';
import { SpatialIndex, getVisibleWorldFrustum } from '../canvas';
import { useNotesStore, getNotesArray } from '../stores/notesStore';
import { CanvasCard } from './NoteCard/ConnectedCards';

interface InfiniteCanvasProps {
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
  onDoubleClickCanvas: (screenX: number, screenY: number) => void;
  onDropImageFiles?: (files: File[], clientX: number, clientY: number) => void;
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
  cutNoteIds?: string[];
  onMouseMoveCoord?: (clientX: number, clientY: number) => void;
}

/**
 * 2D HTML5 Canvas Minimap component.
 * Decoupled into two hardware-composited canvas layers:
 * 1. Background notes layer: cached and redrawn only when notes/theme change.
 * 2. Foreground viewport layer: draws active viewport rectangle in O(1) time on pan/zoom.
 */
/**
 * Draws the active viewport rectangle on the minimap foreground canvas.
 * Shared by the reactive effect (state-driven transforms) and the imperative
 * pan-gesture path (direct DOM transforms that bypass React).
 */
function drawMinimapViewport(
  ctx: CanvasRenderingContext2D,
  transform: CanvasTransform,
  minX: number,
  minY: number,
  minimapScale: number,
  viewportWidth: number,
  viewportHeight: number,
  themeMode: CanvasTheme
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const isCork = themeMode === 'cork';
  const vpX = (-transform.x / transform.zoom - minX) * minimapScale;
  const vpY = (-transform.y / transform.zoom - minY) * minimapScale;
  const vpW = (viewportWidth / transform.zoom) * minimapScale;
  const vpH = (viewportHeight / transform.zoom) * minimapScale;

  ctx.fillStyle = isCork ? 'rgba(217, 119, 6, 0.2)' : 'rgba(59, 130, 246, 0.15)';
  ctx.fillRect(vpX, vpY, vpW, vpH);
  ctx.strokeStyle = isCork ? '#d97706' : '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(vpX, vpY, vpW, vpH);
}

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
  fgCanvasRef: React.RefObject<HTMLCanvasElement | null>;
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
  fgCanvasRef,
}) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  // Pass 1: Draw background notes layer only when notes, spatial bounds, selection, or canvas theme changes
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isCork = themeMode === 'cork';
    const isLight = themeMode === 'light';
    const noteFill = isCork
      ? 'rgba(254, 243, 199, 0.85)'
      : isLight
      ? 'rgba(148, 163, 184, 0.75)'
      : 'rgba(100, 116, 139, 0.75)';
    const selectedFill = isCork ? '#d97706' : '#3b82f6';

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const mx = (n.x - minX) * minimapScale;
      const my = (n.y - minY) * minimapScale;
      const mw = Math.max(3, (n.width || DEFAULT_NOTE_WIDTH) * minimapScale);
      const mh = Math.max(3, (n.height || DEFAULT_NOTE_HEIGHT) * minimapScale);

      ctx.fillStyle = n.id === selectedNoteId ? selectedFill : noteFill;
      ctx.fillRect(mx, my, mw, mh);
    }
  }, [notes, minX, minY, minimapScale, selectedNoteId, themeMode]);

  // Pass 2: Draw foreground active viewport box on pan/zoom (O(1) operation, 0 note iterations)
  useEffect(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawMinimapViewport(ctx, transform, minX, minY, minimapScale, viewportWidth, viewportHeight, themeMode);
  }, [transform, minX, minY, minimapScale, viewportWidth, viewportHeight, themeMode, fgCanvasRef]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={bgCanvasRef}
        width={170}
        height={110}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-xs"
      />
      <canvas
        ref={fgCanvasRef}
        width={170}
        height={110}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-xs"
      />
    </div>
  );
};

const InfiniteCanvasComponent: React.FC<InfiniteCanvasProps> = ({
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
  onDropImageFiles,
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
  cutNoteIds = [],
  onMouseMoveCoord,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldLayerRef = useRef<HTMLDivElement>(null);
  const gridBgRef = useRef<HTMLDivElement>(null);
  const minimapFgRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [draggingNoteIds, setDraggingNoteIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [minimapNotes, setMinimapNotes] = useState<Note[]>(() => getNotesArray());
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

  // Debounce minimap synchronization to prevent layout pressure. Subscribes outside
  // React so content-only edits never re-render the canvas shell.
  useEffect(() => {
    let timer: number | undefined;
    const unsub = useNotesStore.subscribe(
      (st) => st.notesById,
      () => {
        if (timer !== undefined) clearTimeout(timer);
        timer = window.setTimeout(() => setMinimapNotes(getNotesArray()), 250);
      }
    );
    return () => {
      unsub();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

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
        // Direct DOM update for 0ms latency hardware-accelerated wheel motion
        if (worldLayerRef.current) {
          worldLayerRef.current.style.transform = `translate3d(${nextTransform.x}px, ${nextTransform.y}px, 0) scale(${nextTransform.zoom})`;
        }
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
    if (target.closest('dialog') || target.closest('[role="dialog"]') || target.closest('.modal-portal')) return;

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

      // Live card dimensions: reads mounted DOM card bounds if available, fallback to model dimensions
      const noteBounds = getNotesArray().map((n) => {
        const el = document.getElementById(`note-card-${n.id}`);
        return {
          id: n.id,
          x: n.x,
          y: n.y,
          w: el && el.offsetWidth > 0 ? el.offsetWidth : (n.width || DEFAULT_NOTE_WIDTH),
          h: el && el.offsetHeight > 0 ? el.offsetHeight : (n.height || DEFAULT_NOTE_HEIGHT),
        };
      });

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
        for (let i = 0; i < noteBounds.length; i++) {
          const nb = noteBounds[i];
          // Check 2D Axis-Aligned Bounding Box (AABB) intersection:
          // A note card is selected as soon as the selection box touches ANY part of the card
          const overlapsX = nb.x + nb.w >= boxMinX && nb.x <= boxMaxX;
          const overlapsY = nb.y + nb.h >= boxMinY && nb.y <= boxMaxY;
          if (overlapsX && overlapsY) {
            newlyMatchedIds.push(nb.id);
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
    if (e.button === 1) {
      e.stopPropagation();
    }
    setIsPanning(true);
    // Cancel any running navigation glide immediately: its per-frame state writes would
    // otherwise fight the direct-DOM pan writes below until the first throttled commit.
    onTransformChange({ ...transform });
    panStartRef.current = { x: e.clientX, y: e.clientY, transformX: transform.x, transformY: transform.y };
    
    let panFrame: number | null = null;
    let pendingTransform: CanvasTransform | null = null;
    let lastSyncX = transform.x;
    let lastSyncY = transform.y;

    const handleMouseMove = (moveEvt: MouseEvent) => {
      onMouseMoveCoord?.(moveEvt.clientX, moveEvt.clientY);
      const dx = moveEvt.clientX - panStartRef.current.x;
      const dy = moveEvt.clientY - panStartRef.current.y;
      const nextX = Math.round(panStartRef.current.transformX + dx);
      const nextY = Math.round(panStartRef.current.transformY + dy);

      pendingTransform = {
        ...transform,
        x: nextX,
        y: nextY,
      };

      if (panFrame === null) {
        panFrame = requestAnimationFrame(() => {
          panFrame = null;
          if (!pendingTransform) return;

          // Direct DOM transform: 0ms latency hardware-accelerated GPU translation
          if (worldLayerRef.current) {
            worldLayerRef.current.style.transform = `translate3d(${pendingTransform.x}px, ${pendingTransform.y}px, 0) scale(${pendingTransform.zoom})`;
          }

          // Keep the minimap viewport rect glued to the gesture without React commits
          const fgCtx = minimapFgRef.current?.getContext('2d');
          if (fgCtx) {
            drawMinimapViewport(fgCtx, pendingTransform, minX, minY, minimapScale, viewport.width, viewport.height, themeMode);
          }

          // Frustum-hysteresis sync: commit to React only after travelling ~0.5 of a
          // viewport dimension. With 0.85x overscan buffer, notes are pre-mounted well
          // before reaching the viewport boundary, eliminating mid-pan jank.
          const travelledX = Math.abs(pendingTransform.x - lastSyncX);
          const travelledY = Math.abs(pendingTransform.y - lastSyncY);
          if (travelledX > viewport.width * 0.5 || travelledY > viewport.height * 0.5) {
            lastSyncX = pendingTransform.x;
            lastSyncY = pendingTransform.y;
            onTransformChange(pendingTransform);
          }
        });
      }
    };

    const handleMouseUp = (upEvt: MouseEvent) => {
      if (upEvt.button === 1) {
        upEvt.preventDefault();
        upEvt.stopPropagation();
      }
      if (panFrame !== null) {
        cancelAnimationFrame(panFrame);
        panFrame = null;
      }
      if (pendingTransform) {
        onTransformChange(pendingTransform);
        pendingTransform = null;
      }
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
    if (target.closest('.note-card') || target.closest('dialog') || target.closest('[role="dialog"]') || target.closest('.modal-portal')) return;
    onDoubleClickCanvas(e.clientX, e.clientY);
  };

  const getBackgroundClass = () => {
    if (themeMode === 'cork') {
      if (gridType === 'dots') return 'canvas-theme-cork bg-canvas-dots-cork';
      if (gridType === 'grid') return 'canvas-theme-cork bg-canvas-grid-cork';
      if (gridType === 'ruled') return 'canvas-theme-cork bg-canvas-ruled-cork';
      return 'canvas-theme-cork';
    }
    if (themeMode === 'gradient') return 'bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6]';
    if (gridType === 'blank') return themeMode === 'dark' ? 'bg-slate-950' : 'bg-[#f8fafc]';
    const isDark = themeMode === 'dark';
    if (gridType === 'dots') return isDark ? 'bg-canvas-dots-dark bg-slate-950' : 'bg-canvas-dots-light bg-[#f8fafc]';
    if (gridType === 'grid') return isDark ? 'bg-canvas-grid-dark bg-slate-950' : 'bg-canvas-grid-light bg-[#f8fafc]';
    if (gridType === 'ruled') return isDark ? 'bg-canvas-ruled-dark bg-slate-950' : 'bg-canvas-ruled-light bg-[#f8fafc]';
    return isDark ? 'bg-slate-950' : 'bg-[#f8fafc]';
  };

  // Canvas-shell layout scope: recompute heavy derivations only when geometry or
  // membership changes (layoutVersion), NOT on content edits (typing) — those now
  // touch exactly one subscribed card and nothing else in this subtree.
  const layoutVersion = useNotesStore((st) => st.layoutVersion);

  // Viewport Culling & R-Tree Spatial Virtualization
  const spatialIndex = useMemo(() => {
    const index = new SpatialIndex();
    for (const n of getNotesArray()) {
      const w = n.width || DEFAULT_NOTE_WIDTH;
      const h = n.height || DEFAULT_NOTE_HEIGHT;
      index.insert({
        id: n.id,
        minX: n.x,
        minY: n.y,
        maxX: n.x + w,
        maxY: n.y + h,
      });
    }
    return index;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion]);

  const worldFrustum = useMemo(() => {
    return getVisibleWorldFrustum(viewport.width, viewport.height, transform);
  }, [viewport.width, viewport.height, transform]);

  const visibleNoteIds = useMemo(() => {
    const visibleIds = spatialIndex.searchIds(worldFrustum);
    const selectedSet = new Set(selectedNoteIds);

    return getNotesArray()
      .filter(
        (n) =>
          n.id === selectedNoteId ||
          selectedSet.has(n.id) ||
          n.id === focusedNoteId ||
          n.isPinned ||
          visibleIds.has(n.id)
      )
      .map((n) => n.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion, spatialIndex, worldFrustum, selectedNoteId, selectedNoteIds, focusedNoteId]);

  // Minimap scale and bounds in a single memoized calculation
  const { minX, minY, minimapScale } = useMemo(() => {
    const notes = getNotesArray();
    if (notes.length === 0) {
      return { minX: -100, minY: -100, minimapScale: 0.12 };
    }
    let minXVal = 0;
    let maxXVal = 1000;
    let minYVal = 0;
    let maxYVal = 800;

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const cardW = n.width || DEFAULT_NOTE_WIDTH;
      const cardH = n.height || DEFAULT_NOTE_HEIGHT;
      if (n.x < minXVal) minXVal = n.x;
      if (n.x + cardW > maxXVal) maxXVal = n.x + cardW;
      if (n.y < minYVal) minYVal = n.y;
      if (n.y + cardH > maxYVal) maxYVal = n.y + cardH;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion]);

  const noteGroups = useMemo(() => {
    const groups = new Map<string, Note[]>();
    for (const n of getNotesArray()) {
      if (n.groupId) {
        const list = groups.get(n.groupId);
        if (list) list.push(n);
        else groups.set(n.groupId, [n]);
      }
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion]);

  const handleSelectNoteStable = useCallback(
    (id: string | null, isMulti?: boolean) => onSelectNote(id, isMulti),
    [onSelectNote]
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerMove={(e) => onMouseMoveCoord?.(e.clientX, e.clientY)}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.note-card')) {
          onContextMenuCanvas?.(e);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!isDragOverCanvas) setIsDragOverCanvas(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOverCanvas(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverCanvas(false);
        // In Tauri desktop environment, native OS drag-drop is handled exclusively by useNativeFileDrop
        if (isTauriEnvironment()) {
          return;
        }
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
          if (imageFiles.length > 0) {
            onDropImageFiles?.(imageFiles, e.clientX, e.clientY);
          }
        }
      }}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${
        isPanning ? 'cursor-grabbing' : isPanMode || isSpacePressed ? 'cursor-grab' : 'cursor-default'
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
        className={`absolute inset-0 origin-top-left will-change-transform ${isPanning ? 'pointer-events-none' : ''}`}
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
            snapToGrid={snapToGrid}
            onUpdateBatchNotes={onUpdateBatchNotes}
            onSelectMultipleNotes={onSelectMultipleNotes}
            onDragStateChange={handleDragStateChange}
          />
        ))}

        {/* Bi-directional markdown connection lines */}
        {showConnections && (
          <NoteConnections
            selectedNoteId={selectedNoteId}
            onSelectNote={onNavigateToNote}
            themeMode={themeMode}
            viewportBounds={{
              minX: worldFrustum.minX,
              maxX: worldFrustum.maxX,
              minY: worldFrustum.minY,
              maxY: worldFrustum.maxY,
            }}
          />
        )}

        {/* Note Cards */}
        {visibleNoteIds.map((noteId) => (
          <CanvasCard
            key={noteId}
            noteId={noteId}
            editingRequested={editingNoteId === noteId}
            zoom={transform.zoom}
            isSelected={selectedNoteId === noteId || selectedNoteIds.includes(noteId)}
            selectedNoteIds={selectedNoteIds}
            isFocused={focusedNoteId === noteId}
            isCardDragging={draggingNoteIds.includes(noteId)}
            isCut={cutNoteIds.includes(noteId)}
            onDragStateChange={handleDragStateChange}
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
      <div className="absolute top-4 right-4 z-20 hidden md:block">
        <div
          className={`p-2 rounded-sm border shadow-sm transition-all select-none w-48 ${
            themeMode === 'light'
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-slate-900 border-slate-800 text-slate-100'
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
                x: Math.round(viewport.width / 2 - targetWorldX * transform.zoom),
                y: Math.round(viewport.height / 2 - targetWorldY * transform.zoom),
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
              viewportWidth={viewport.width}
              viewportHeight={viewport.height}
              selectedNoteId={selectedNoteId}
              themeMode={themeMode}
              fgCanvasRef={minimapFgRef}
            />
          </div>
        </div>
      </div>

      {/* Drag & Drop Visual Indicator Overlay */}
      {isDragOverCanvas && (
        <div className="absolute inset-4 z-50 pointer-events-none rounded-lg border-2 border-dashed border-blue-500/80 bg-blue-500/10 backdrop-blur-xs flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 gap-2 animate-in fade-in zoom-in-95 duration-150 select-none">
          <div className="p-3.5 rounded-full bg-blue-500 text-white shadow-sm">
            <Icon icon={Image01Icon} size="xl" />
          </div>
          <span className="font-semibold text-sm tracking-wide bg-white/95 dark:bg-slate-900/95 px-3 py-1 rounded-sm shadow-sm">
            Drop images to pin onto canvas
          </span>
        </div>
      )}
    </div>
  );
};

export const InfiniteCanvas = React.memo(InfiniteCanvasComponent);
