
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, PaperTheme, CanvasTheme } from '../types';
import { PAPER_THEMES, PAPER_THEME_OPTIONS, PAPER_THEME_LABELS } from '../constants/paperThemes';

import { exportNotesBackup } from '../lib/storage';
import {
  CheckSquare,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignJustify,
  LayoutGrid,
  Pin,
  PinOff,
  Trash2,
  X,
  Layers,
  Columns3,
  Rows3,
  Download,
} from 'lucide-react';

interface BatchActionBarProps {
  selectedNoteIds: string[];
  notes: Note[];
  themeMode?: CanvasTheme;
  onUpdateBatchNotes: (updatedNotes: Note[]) => void;
  onDeleteNotes: (ids: string[]) => void;
  onClearSelection: () => void;
}

const BatchActionBarComponent: React.FC<BatchActionBarProps> = ({
  selectedNoteIds,
  notes,
  themeMode = 'dark',
  onUpdateBatchNotes,
  onDeleteNotes,
  onClearSelection,
}) => {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  const themeRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<HTMLDivElement>(null);

  const isDark = themeMode !== 'light';

  const selectedNotes = useMemo(
    () => notes.filter((n) => selectedNoteIds.includes(n.id)),
    [notes, selectedNoteIds]
  );

  const isAllPinned = selectedNotes.every((n) => n.isPinned);

  // Click outside popovers cleanup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
      if (alignRef.current && !alignRef.current.contains(e.target as Node)) {
        setShowAlignMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Batch Theme Change
  const handleBatchThemeChange = (newTheme: PaperTheme) => {
    const updated = selectedNotes.map((n) => ({
      ...n,
      paperTheme: newTheme,
    }));
    onUpdateBatchNotes(updated);
    setShowThemePicker(false);
  };

  // 2. Batch Pin / Unpin Toggle
  const handleBatchTogglePin = () => {
    const targetState = !isAllPinned;
    const updated = selectedNotes.map((n) => ({
      ...n,
      isPinned: targetState,
    }));
    onUpdateBatchNotes(updated);
  };

  // Helper to get real live width of note card
  const getNoteWidth = (n: Note): number => {
    const el = document.getElementById(`note-card-${n.id}`);
    return el ? el.offsetWidth : n.width || 340;
  };

  // Helper to get real live height of note card
  const getNoteHeight = (n: Note): number => {
    const el = document.getElementById(`note-card-${n.id}`);
    return el ? el.offsetHeight : n.height || 340;
  };

  // 3. Align Left (X min)
  const handleAlignLeft = () => {
    if (selectedNotes.length < 2) return;
    const minX = Math.min(...selectedNotes.map((n) => n.x));
    const updated = selectedNotes.map((n) => ({
      ...n,
      x: minX,
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 4. Align Center Horizontally (X center)
  const handleAlignCenterHorizontal = () => {
    if (selectedNotes.length < 2) return;
    const avgCenterX = Math.round(
      selectedNotes.reduce((acc, n) => acc + (n.x + getNoteWidth(n) / 2), 0) / selectedNotes.length
    );
    const updated = selectedNotes.map((n) => ({
      ...n,
      x: Math.round(avgCenterX - getNoteWidth(n) / 2),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 5. Align Right (X max)
  const handleAlignRight = () => {
    if (selectedNotes.length < 2) return;
    const maxRight = Math.max(...selectedNotes.map((n) => n.x + getNoteWidth(n)));
    const updated = selectedNotes.map((n) => ({
      ...n,
      x: Math.round(maxRight - getNoteWidth(n)),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 6. Align Top (Y min)
  const handleAlignTop = () => {
    if (selectedNotes.length < 2) return;
    const minY = Math.min(...selectedNotes.map((n) => n.y));
    const updated = selectedNotes.map((n) => ({
      ...n,
      y: minY,
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 7. Align Middle Vertically (Y center)
  const handleAlignCenterVertical = () => {
    if (selectedNotes.length < 2) return;
    const avgCenterY = Math.round(
      selectedNotes.reduce((acc, n) => acc + (n.y + getNoteHeight(n) / 2), 0) / selectedNotes.length
    );
    const updated = selectedNotes.map((n) => ({
      ...n,
      y: Math.round(avgCenterY - getNoteHeight(n) / 2),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 8. Align Bottom (Y max)
  const handleAlignBottom = () => {
    if (selectedNotes.length < 2) return;
    const maxBottom = Math.max(...selectedNotes.map((n) => n.y + getNoteHeight(n)));
    const updated = selectedNotes.map((n) => ({
      ...n,
      y: Math.round(maxBottom - getNoteHeight(n)),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 9. Distribute Horizontally (True Equal Gap Spacing)
  const handleDistributeHorizontal = () => {
    if (selectedNotes.length < 2) return;
    const sorted = [...selectedNotes].sort((a, b) => a.x - b.x);

    const widths = sorted.map(getNoteWidth);
    const firstX = sorted[0].x;
    const lastNote = sorted[sorted.length - 1];
    const lastWidth = widths[widths.length - 1];
    const lastRight = lastNote.x + lastWidth;

    const totalSpan = lastRight - firstX;
    const totalItemWidth = widths.reduce((sum, w) => sum + w, 0);

    let gap = (totalSpan - totalItemWidth) / (sorted.length - 1);
    if (gap < 24) gap = 24; // Ensure minimum 24px grid gap if items were overlapping

    let currentX = firstX;
    const updated = sorted.map((n, idx) => {
      const xPos = Math.round(currentX);
      currentX += widths[idx] + gap;
      return {
        ...n,
        x: xPos,
      };
    });

    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 10. Distribute Vertically (True Equal Gap Spacing)
  const handleDistributeVertical = () => {
    if (selectedNotes.length < 2) return;
    const sorted = [...selectedNotes].sort((a, b) => a.y - b.y);

    const heights = sorted.map(getNoteHeight);
    const firstY = sorted[0].y;
    const lastNote = sorted[sorted.length - 1];
    const lastHeight = heights[heights.length - 1];
    const lastBottom = lastNote.y + lastHeight;

    const totalSpan = lastBottom - firstY;
    const totalItemHeight = heights.reduce((sum, h) => sum + h, 0);

    let gap = (totalSpan - totalItemHeight) / (sorted.length - 1);
    if (gap < 24) gap = 24; // Ensure minimum 24px grid gap if items were overlapping

    let currentY = firstY;
    const updated = sorted.map((n, idx) => {
      const yPos = Math.round(currentY);
      currentY += heights[idx] + gap;
      return {
        ...n,
        y: yPos,
      };
    });

    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  const isAllGrouped = useMemo(
    () => selectedNotes.length >= 2 && selectedNotes.every((n) => n.groupId && n.groupId === selectedNotes[0].groupId),
    [selectedNotes]
  );

  // 7. Group / Ungroup Notes
  const handleGroupNotes = () => {
    if (isAllGrouped) {
      const updated = selectedNotes.map((n) => ({
        ...n,
        groupId: undefined,
        groupName: undefined,
        tags: n.tags?.filter((t) => !/^#?Group\s/i.test(t)),
      }));
      onUpdateBatchNotes(updated);
      onClearSelection();
    } else {
      const newGroupId = `group-${Date.now()}`;
      const groupName = `Group ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const updated = selectedNotes.map((n) => ({
        ...n,
        groupId: newGroupId,
        groupName,
        tags: n.tags?.filter((t) => !/^#?Group\s/i.test(t)),
      }));
      onUpdateBatchNotes(updated);
      onClearSelection();
    }
  };

  // 8. Bulk Delete
  const handleBulkDelete = () => {
    onDeleteNotes(selectedNoteIds);
  };

  const btnClass = isDark
    ? 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900';

  const popoverBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const dividerClass = isDark ? 'bg-slate-800' : 'bg-slate-200';

  return (
    <motion.div
      initial={{ borderRadius: '6px' }}
      animate={{ borderRadius: '6px 6px 2px 2px' }}
      exit={{ borderRadius: '6px' }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 border-b select-none text-xs font-medium transition-all ${
        isDark
          ? 'border-slate-800/80 text-slate-200 bg-slate-800/30'
          : 'border-slate-200/80 text-slate-800 bg-slate-100/50'
      }`}
    >
      <div className="flex items-center gap-1">
        {/* Count Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] ${
            isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>{selectedNoteIds.length} selected</span>
        </div>

        <div className={`h-4 w-px mx-0.5 ${dividerClass}`} />

        {/* 1. Batch Theme Picker */}
        <div className="relative" ref={themeRef}>
          <button
            type="button"
            onClick={() => {
              setShowThemePicker(!showThemePicker);
              setShowAlignMenu(false);
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${btnClass}`}
            title="Batch paper theme"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Theme</span>
          </button>

          {/* Theme Picker Popover */}
          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={`absolute bottom-full mb-2 left-0 z-50 w-60 rounded-md border shadow-sm p-2.5 flex flex-col gap-2 ${popoverBg}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Change Paper Theme
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {PAPER_THEME_OPTIONS.map((themeKey) => {
                    const cfg = PAPER_THEMES[themeKey];
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => handleBatchThemeChange(themeKey)}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition-colors text-[10px] ${cfg.bg} ${cfg.border} ${cfg.text} ${
                          isDark ? 'hover:bg-slate-800 hover:border-slate-700' : 'hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="truncate w-full text-center font-medium">
                          {PAPER_THEME_LABELS[themeKey]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Align & Distribute Menu */}
        <div className="relative" ref={alignRef}>
          <button
            type="button"
            onClick={() => {
              setShowAlignMenu(!showAlignMenu);
              setShowThemePicker(false);
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${btnClass}`}
            title="Align & Distribute"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Align</span>
          </button>

          {/* Align Popover */}
          <AnimatePresence>
            {showAlignMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={`absolute bottom-full mb-2 left-0 z-50 w-52 rounded-md border shadow-sm p-2 flex flex-col gap-1 ${popoverBg}`}
              >
                {/* Horizontal Alignment */}
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1 text-slate-400">
                  Horizontal Alignment
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={handleAlignLeft}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAlignCenterHorizontal}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                    title="Align Center Horizontally"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                    <span>Center</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAlignRight}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                    <span>Right</span>
                  </button>
                </div>

                {/* Vertical Alignment */}
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1 mt-1 text-slate-400">
                  Vertical Alignment
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={handleAlignTop}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                    title="Align Top"
                  >
                    <ArrowUpToLine className="w-3.5 h-3.5" />
                    <span>Top</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAlignCenterVertical}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                    title="Align Middle Vertically"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                    <span>Middle</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAlignBottom}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md border text-[10px] transition-colors ${btnClass} ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                    title="Align Bottom"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Bottom</span>
                  </button>
                </div>

                {/* Distribution & Spacing */}
                <div className={`my-1 border-t ${dividerClass}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1 text-slate-400">
                  Distribute Spacing
                </span>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={handleDistributeHorizontal}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${btnClass}`}
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    <span>Space Horizontally</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDistributeVertical}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${btnClass}`}
                  >
                    <Rows3 className="w-3.5 h-3.5" />
                    <span>Space Vertically</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Group / Ungroup Notes */}
        <button
          type="button"
          onClick={handleGroupNotes}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${btnClass} ${
            isAllGrouped ? 'text-blue-400' : ''
          }`}
          title={isAllGrouped ? 'Ungroup selected notes' : 'Group selected notes'}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isAllGrouped ? 'Ungroup' : 'Group'}</span>
        </button>

        {/* 4. Bulk Pin */}
        <button
          type="button"
          onClick={handleBatchTogglePin}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${btnClass}`}
          title={isAllPinned ? 'Unpin selected notes' : 'Pin selected notes'}
        >
          {isAllPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isAllPinned ? 'Unpin' : 'Pin'}</span>
        </button>

        {/* 5. Backup Selected Notes (.json) */}
        <button
          type="button"
          onClick={() => {
            if (selectedNotes.length > 0) {
              const fileName = `selected-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
              exportNotesBackup(selectedNotes, fileName);
            }
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${btnClass}`}
          title="Backup selected notes (.json)"
        >
          <Download className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Backup</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <div className={`h-4 w-px mx-0.5 ${dividerClass}`} />

        {/* 5. Bulk Delete */}
        <button
          type="button"
          onClick={handleBulkDelete}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
            isDark
              ? 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
              : 'hover:bg-rose-50 text-slate-600 hover:text-rose-600'
          }`}
          title="Delete selected notes"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>

        {/* 6. Clear Selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className={`p-1 rounded-md transition-colors ${btnClass}`}
          title="Clear selection (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export const BatchActionBar = React.memo(BatchActionBarComponent);
