import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Note, PaperTheme, CanvasTheme } from '../types';
import { exportNotesBackup } from '../lib/storage';
import {
  CheckSquare,
  Palette,
  LayoutGrid,
  Pin,
  PinOff,
  Trash2,
  X,
  Layers,
  Download,
} from 'lucide-react';

import { BatchThemePicker } from './BatchThemePicker';
import { BatchAlignmentMenu } from './BatchAlignmentMenu';
import {
  alignLeft,
  alignCenterHorizontal,
  alignRight,
  alignTop,
  alignCenterVertical,
  alignBottom,
  distributeHorizontally,
  distributeVertically,
  arrangeInGrid,
} from '../utils/layoutUtils';

interface BatchActionBarProps {
  selectedNoteIds: string[];
  notes: Note[];
  themeMode?: CanvasTheme;
  onUpdateBatchNotes: (updatedNotes: Note[]) => void;
  onDeleteNotes: (ids: string[]) => void;
  onClearSelection: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
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

  const isDark = themeMode === 'dark';

  const selectedNotes = useMemo(
    () => notes.filter((n) => selectedNoteIds.includes(n.id)),
    [notes, selectedNoteIds]
  );

  const isAllPinned = selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned);

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

  // Alignment Handlers
  const handleAlign = (alignmentFn: (notes: Note[]) => Note[]) => {
    if (selectedNotes.length < 2) return;
    onUpdateBatchNotes(alignmentFn(selectedNotes));
    setShowAlignMenu(false);
  };

  const isAllGrouped = useMemo(
    () => selectedNotes.length >= 2 && selectedNotes.every((n) => n.groupId && n.groupId === selectedNotes[0].groupId),
    [selectedNotes]
  );

  // Group / Ungroup Notes
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

  const handleBulkDelete = () => {
    onDeleteNotes(selectedNoteIds);
  };

  const btnClass = isDark
    ? 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900';

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

          <BatchThemePicker
            isOpen={showThemePicker}
            isDark={isDark}
            onSelectTheme={handleBatchThemeChange}
          />
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

          <BatchAlignmentMenu
            isOpen={showAlignMenu}
            isDark={isDark}
            onAlignLeft={() => handleAlign(alignLeft)}
            onAlignCenterHorizontal={() => handleAlign(alignCenterHorizontal)}
            onAlignRight={() => handleAlign(alignRight)}
            onAlignTop={() => handleAlign(alignTop)}
            onAlignCenterVertical={() => handleAlign(alignCenterVertical)}
            onAlignBottom={() => handleAlign(alignBottom)}
            onDistributeHorizontal={() => handleAlign(distributeHorizontally)}
            onDistributeVertical={() => handleAlign(distributeVertically)}
            onArrangeInGrid={() => handleAlign(arrangeInGrid)}
          />
        </div>

        {/* 3. Batch Pin / Unpin */}
        <button
          type="button"
          onClick={handleBatchTogglePin}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${btnClass}`}
          title={isAllPinned ? 'Unpin selected notes' : 'Pin selected notes'}
        >
          {isAllPinned ? <PinOff className="w-3.5 h-3.5 text-amber-500" /> : <Pin className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isAllPinned ? 'Unpin' : 'Pin'}</span>
        </button>

        {/* 4. Group / Ungroup Notes */}
        <button
          type="button"
          onClick={handleGroupNotes}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
            isAllGrouped
              ? isDark
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : btnClass
          }`}
          title={isAllGrouped ? 'Ungroup selected notes' : 'Group selected notes'}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isAllGrouped ? 'Ungroup' : 'Group'}</span>
        </button>

        {/* 5. Export Selected Notes */}
        <button
          type="button"
          onClick={() => exportNotesBackup(selectedNotes)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${btnClass}`}
          title="Export selected notes as JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {/* Bulk Delete */}
        <button
          type="button"
          onClick={handleBulkDelete}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-red-500 hover:text-red-600 hover:bg-red-500/10 font-semibold"
          title="Delete selected notes"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>

        {/* Deselect / Close Bar */}
        <button
          type="button"
          onClick={onClearSelection}
          className={`p-1 rounded-md transition-colors ${btnClass}`}
          title="Clear selection (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
