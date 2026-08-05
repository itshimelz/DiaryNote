import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, CanvasTransform, GridType, CanvasTheme } from '../types';
import { NoteCard } from './NoteCard';

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
}

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; transformX: number; transformY: number }>({
    x: 0,
    y: 0,
    transformX: 0,
    transformY: 0,
  });

  // Spacebar key tracking for pan shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
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

      if (e.ctrlKey || e.metaKey || !e.shiftKey) {
        // Pinch / Ctrl + Wheel -> Zooming
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        const newZoom = Math.max(0.15, Math.min(3.0, transform.zoom * zoomFactor));

        // Keep point under mouse fixed in world coordinates
        const worldX = (mouseX - transform.x) / transform.zoom;
        const worldY = (mouseY - transform.y) / transform.zoom;

        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        onTransformChange({
          x: Math.round(newX),
          y: Math.round(newY),
          zoom: newZoom,
        });
      } else {
        // Shift + Wheel -> Horizontal / Vertical Pan
        onTransformChange({
          ...transform,
          x: Math.round(transform.x - e.deltaX),
          y: Math.round(transform.y - e.deltaY),
        });
      }
    },
    [transform, onTransformChange]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan canvas drag or Ctrl+drag box selection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only

    const isDirectCanvasClick = e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-grid-bg';

    // Ctrl + Left Mouse Drag on Canvas -> Rubber-band multi selection box
    if ((e.ctrlKey || e.metaKey) && isDirectCanvasClick) {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setSelectionBox({ startX, startY, currentX: startX, currentY: startY });

      const handleMouseMove = (moveEvt: MouseEvent) => {
        const curX = moveEvt.clientX - rect.left;
        const curY = moveEvt.clientY - rect.top;
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
          .filter((n) => n.x + n.width >= boxMinX && n.x <= boxMaxX && n.y + n.height >= boxMinY && n.y <= boxMaxY)
          .map((n) => n.id);

        if (onSelectMultipleNotes) {
          onSelectMultipleNotes(matchedIds);
        }
      };

      const handleMouseUp = () => {
        setSelectionBox(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return;
    }

    // Pan if clicking canvas directly or space key pressed or pan mode active
    if (isDirectCanvasClick || isSpacePressed || isPanMode) {
      setIsPanning(true);
      onSelectNote(null);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        transformX: transform.x,
        transformY: transform.y,
      };

      const handleMouseMove = (moveEvt: MouseEvent) => {
        const dx = moveEvt.clientX - panStartRef.current.x;
        const dy = moveEvt.clientY - panStartRef.current.y;

        onTransformChange({
          ...transform,
          x: Math.round(panStartRef.current.transformX + dx),
          y: Math.round(panStartRef.current.transformY + dy),
        });
      };

      const handleMouseUp = () => {
        setIsPanning(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Double click canvas to add note at mouse pointer location
  const handleDoubleClick = (e: React.MouseEvent) => {
    const isDirectCanvasClick = e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-grid-bg';
    if (isDirectCanvasClick && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Convert screen coords to world coords
      const worldX = Math.round((mouseX - transform.x) / transform.zoom);
      const worldY = Math.round((mouseY - transform.y) / transform.zoom);

      onDoubleClickCanvas(worldX, worldY);
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
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const renderBuffer = 600 / transform.zoom; // buffer margin in world coordinates

  const visibleMinX = -transform.x / transform.zoom - renderBuffer;
  const visibleMaxX = (viewportWidth - transform.x) / transform.zoom + renderBuffer;
  const visibleMinY = -transform.y / transform.zoom - renderBuffer;
  const visibleMaxY = (viewportHeight - transform.y) / transform.zoom + renderBuffer;

  // Only render NoteCards that are within or touching the active viewport
  const visibleNotes = notes.length > 60
    ? notes.filter(
        (n) =>
          n.id === selectedNoteId ||
          n.id === focusedNoteId ||
          n.isPinned ||
          (n.x + n.width >= visibleMinX &&
            n.x <= visibleMaxX &&
            n.y + n.height >= visibleMinY &&
            n.y <= visibleMaxY)
      )
    : notes;

  // Minimap bounding calculations
  const minimapPadding = 100;
  const minX = Math.min(...notes.map((n) => n.x), 0) - minimapPadding;
  const maxX = Math.max(...notes.map((n) => n.x + n.width), 1000) + minimapPadding;
  const minY = Math.min(...notes.map((n) => n.y), 0) - minimapPadding;
  const maxY = Math.max(...notes.map((n) => n.y + n.height), 800) + minimapPadding;

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;
  const minimapScale = Math.min(150 / worldWidth, 90 / worldHeight);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
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
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.zoom})`,
        }}
      >
        <div className="pointer-events-auto">
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
            />
          ))}
        </div>
      </div>

      {/* Upgraded Canvas MiniMap placed at Top Right */}
      <div className={`fixed top-4 right-4 z-30 w-44 h-32 border rounded-lg shadow-lg backdrop-blur-md overflow-hidden p-2.5 hidden md:block select-none transition-all ${
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

            onTransformChange({
              ...transform,
              x: Math.round(window.innerWidth / 2 - targetWorldX * transform.zoom),
              y: Math.round(window.innerHeight / 2 - targetWorldY * transform.zoom),
            });
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
                width: `${(window.innerWidth / transform.zoom) * minimapScale}px`,
                height: `${(window.innerHeight / transform.zoom) * minimapScale}px`,
              }}
              className="absolute border-2 border-blue-500 bg-blue-500/15 pointer-events-none rounded-[2px] shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};
