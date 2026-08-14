import React, { useState, useRef, useEffect } from 'react';
import { Layers01Icon } from '@hugeicons/core-free-icons';
import { Icon, Badge } from './ui';
import { Note, CanvasTheme } from '../types';
import { GRID_SIZE } from '../constants/canvas';
import { calculateGroupBounds } from '../utils/layoutUtils';

export interface GroupFrameProps {
  groupId: string;
  groupNotes: Note[];
  themeMode: CanvasTheme;
  zoom: number;
  snapToGrid?: boolean;
  onUpdateBatchNotes?: (notes: Note[]) => void;
  onSelectMultipleNotes?: (ids: string[]) => void;
  onDragStateChange?: (ids: string[]) => void;
}

const GroupFrameComponent: React.FC<GroupFrameProps> = ({
  groupId,
  groupNotes,
  themeMode,
  zoom,
  snapToGrid = false,
  onUpdateBatchNotes,
  onSelectMultipleNotes,
  onDragStateChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const currentGroupName = groupNotes[0]?.groupName || '';
  const [titleInput, setTitleInput] = useState(currentGroupName);
  const [measuredBounds, setMeasuredBounds] = useState<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null>(null);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    notePositions: { id: string; x: number; y: number }[];
  } | null>(null);

  useEffect(() => {
    setTitleInput(currentGroupName);
  }, [currentGroupName]);

  // Dynamic ResizeObserver to adapt frame size smoothly to live card heights
  useEffect(() => {
    let frameId: number | null = null;
    const updateBounds = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(() => {
        const bounds = calculateGroupBounds(groupNotes, 28, 42, 28);
        setMeasuredBounds({
          minX: bounds.minX,
          minY: bounds.minY,
          maxX: bounds.maxX,
          maxY: bounds.maxY,
        });
        frameId = null;
      });
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
      if (frameId !== null) cancelAnimationFrame(frameId);
      observers.forEach((obs) => obs.disconnect());
    };
  }, [groupNotes]);

  const isSavingRef = useRef(false);

  // Mouse Down Drag Handler for Group Frame Header Badge
  const handleBadgeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || isEditing) {
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Select all notes in group
    onSelectMultipleNotes?.(groupNotes.map((n) => n.id));
    onDragStateChange?.(groupNotes.map((n) => n.id));

    const initialFrameBounds = measuredBounds || calculateGroupBounds(groupNotes, 28, 42, 28);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      notePositions: groupNotes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
    };

    let pendingUpdate: Note[] | null = null;

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
        // Direct DOM update for note card elements
        const cardEl = document.getElementById(`note-card-${n.id}`);
        if (cardEl) {
          cardEl.style.transform = `translate3d(${Math.round(rawX)}px, ${Math.round(rawY)}px, 0)`;
        }
        return { ...n, x: rawX, y: rawY };
      });

      // Direct DOM update for group frame boundary element
      const frameEl = document.getElementById(`group-frame-${groupId}`);
      if (frameEl) {
        const frameX = Math.round(initialFrameBounds.minX + dx);
        const frameY = Math.round(initialFrameBounds.minY + dy);
        frameEl.style.transform = `translate3d(${frameX}px, ${frameY}px, 0)`;
      }
    };

    const handleMouseUp = () => {
      onDragStateChange?.([]);

      if (pendingUpdate && onUpdateBatchNotes) {
        onUpdateBatchNotes(pendingUpdate);
      }
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const bounds = measuredBounds || calculateGroupBounds(groupNotes, 28, 42, 28);
  const minX = bounds.minX;
  const minY = bounds.minY;
  const maxX = bounds.maxX;
  const maxY = bounds.maxY;

  const width = Math.max(100, maxX - minX);
  const height = Math.max(100, maxY - minY);

  const isLight = themeMode === 'light';

  const containerBorder = isLight
    ? 'border-2 border-dashed border-blue-500/35 bg-blue-500/[0.03] backdrop-blur-[0.5px]'
    : 'border-2 border-dashed border-blue-500/40 bg-blue-500/[0.04] backdrop-blur-[0.5px]';

  const badgeStyle = isLight
    ? 'bg-white/95 border border-slate-200/90 text-slate-800 shadow-sm backdrop-blur-md hover:border-blue-400'
    : 'bg-slate-900/95 border border-slate-800/90 text-slate-200 shadow-sm backdrop-blur-md hover:border-blue-500';

  const handleSaveTitle = () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsEditing(false);
    const trimmed = titleInput.trim();
    const updated = groupNotes.map((n) => ({
      ...n,
      groupName: trimmed || undefined,
    }));
    onUpdateBatchNotes?.(updated);
    setTimeout(() => {
      isSavingRef.current = false;
    }, 100);
  };

  const displayName = currentGroupName || `Group (${groupNotes.length} notes)`;

  return (
    <div
      id={`group-frame-${groupId}`}
      style={{
        transform: `translate3d(${minX}px, ${minY}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={`absolute rounded-sm pointer-events-none transition-none ${containerBorder}`}
    >
      {/* Group Header Badge */}
      <div
        onMouseDown={handleBadgeMouseDown}
        className={`absolute -top-3.5 left-3 px-2.5 py-1 rounded-sm text-xs font-semibold tracking-wide flex items-center gap-2 pointer-events-auto select-none cursor-grab active:cursor-grabbing ${badgeStyle}`}
      >
        <Icon icon={Layers01Icon} size="xs" className="text-blue-500 shrink-0" />
        {isEditing ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
            }}
            autoFocus
            placeholder={`Group (${groupNotes.length} notes)`}
            className="bg-transparent border-b border-blue-500 text-xs font-semibold focus:outline-none px-0.5 py-0 min-w-[120px] cursor-text text-slate-900 dark:text-slate-100"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="hover:underline flex items-center gap-1.5 font-semibold cursor-pointer"
            title="Click to rename group"
          >
            <span>{displayName}</span>
          </button>
        )}
        <Badge variant="subtle" size="xs">
          {groupNotes.length}
        </Badge>
      </div>
    </div>
  );
};

export const GroupFrame = React.memo(GroupFrameComponent);
