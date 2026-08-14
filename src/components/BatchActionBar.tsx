import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Note, PaperTheme, CanvasTheme } from '../types';
import { PAPER_THEMES, PAPER_THEME_OPTIONS, PAPER_THEME_LABELS } from '../constants/paperThemes';
import { exportNotesBackup } from '../lib/storage';
import { authorizeNotes, isNoteAuthorized } from '../services/authPolicyService';
import { sendNativeAppNotification } from '../utils';
import {
  CheckmarkSquare02Icon,
  PaintBoardIcon,
  AlignLeftIcon,
  AlignHorizontalCenterIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignVerticalCenterIcon,
  AlignBottomIcon,
  AlignHorizontalDistributeCenterIcon,
  AlignVerticalDistributeCenterIcon,
  PinIcon,
  PinOffIcon,
  Delete02Icon,
  Cancel01Icon,
  Layers01Icon,
  Download04Icon,
  SparklesIcon,
  Loading03Icon,
  LayoutGridIcon,
} from '@hugeicons/core-free-icons';
import { Button, IconButton, Badge, Menu, MenuItem, MenuDivider, MenuGroupHeader } from './ui';

interface BatchActionBarProps {
  selectedNoteIds: string[];
  notes: Note[];
  themeMode?: CanvasTheme;
  enableAIServices?: boolean;
  isMergingAI?: boolean;
  isAlreadyMerged?: boolean;
  onMergeNotesAI?: () => void;
  onUpdateBatchNotes: (updatedNotes: Note[]) => void;
  onDeleteNotes: (ids: string[]) => void;
  onClearSelection: () => void;
}

const BatchActionBarComponent: React.FC<BatchActionBarProps> = ({
  selectedNoteIds,
  notes,
  themeMode = 'dark',
  enableAIServices = false,
  isMergingAI = false,
  isAlreadyMerged = false,
  onMergeNotesAI,
  onUpdateBatchNotes,
  onDeleteNotes,
  onClearSelection,
}) => {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  const themeRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<HTMLDivElement>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);
  const alignBtnRef = useRef<HTMLButtonElement>(null);

  const [themePopoverPos, setThemePopoverPos] = useState<{ bottom: number; left: number }>({
    bottom: 0,
    left: 0,
  });
  const [alignPopoverPos, setAlignPopoverPos] = useState<{ bottom: number; left: number }>({
    bottom: 0,
    left: 0,
  });

  const handleToggleTheme = () => {
    if (!showThemePicker && themeBtnRef.current) {
      const rect = themeBtnRef.current.getBoundingClientRect();
      const popoverW = 240;
      const calcLeft = Math.max(12, Math.min(rect.left, window.innerWidth - popoverW - 12));
      setThemePopoverPos({
        bottom: window.innerHeight - rect.top + 8,
        left: calcLeft,
      });
    }
    setShowThemePicker((prev) => !prev);
    setShowAlignMenu(false);
  };

  const handleToggleAlign = () => {
    if (!showAlignMenu && alignBtnRef.current) {
      const rect = alignBtnRef.current.getBoundingClientRect();
      const popoverW = 208;
      const calcLeft = Math.max(12, Math.min(rect.left, window.innerWidth - popoverW - 12));
      setAlignPopoverPos({
        bottom: window.innerHeight - rect.top + 8,
        left: calcLeft,
      });
    }
    setShowAlignMenu((prev) => !prev);
    setShowThemePicker(false);
  };

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
    const updated = selectedNotes.map((n) => ({ ...n, x: minX }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 4. Align Center Horizontal
  const handleAlignCenterHorizontal = () => {
    if (selectedNotes.length < 2) return;
    const centers = selectedNotes.map((n) => n.x + getNoteWidth(n) / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    const updated = selectedNotes.map((n) => ({
      ...n,
      x: Math.round(avgCenter - getNoteWidth(n) / 2),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 5. Align Right (X max)
  const handleAlignRight = () => {
    if (selectedNotes.length < 2) return;
    const rightEdges = selectedNotes.map((n) => n.x + getNoteWidth(n));
    const maxRight = Math.max(...rightEdges);
    const updated = selectedNotes.map((n) => ({
      ...n,
      x: maxRight - getNoteWidth(n),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 6. Align Top (Y min)
  const handleAlignTop = () => {
    if (selectedNotes.length < 2) return;
    const minY = Math.min(...selectedNotes.map((n) => n.y));
    const updated = selectedNotes.map((n) => ({ ...n, y: minY }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 7. Align Middle Vertical
  const handleAlignCenterVertical = () => {
    if (selectedNotes.length < 2) return;
    const middles = selectedNotes.map((n) => n.y + getNoteHeight(n) / 2);
    const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length;
    const updated = selectedNotes.map((n) => ({
      ...n,
      y: Math.round(avgMiddle - getNoteHeight(n) / 2),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 8. Align Bottom (Y max)
  const handleAlignBottom = () => {
    if (selectedNotes.length < 2) return;
    const bottomEdges = selectedNotes.map((n) => n.y + getNoteHeight(n));
    const maxBottom = Math.max(...bottomEdges);
    const updated = selectedNotes.map((n) => ({
      ...n,
      y: maxBottom - getNoteHeight(n),
    }));
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 9. Distribute Horizontally
  const handleDistributeHorizontal = () => {
    if (selectedNotes.length < 3) return;
    const sorted = [...selectedNotes].sort((a, b) => a.x - b.x);
    const minX = sorted[0].x;
    const lastNote = sorted[sorted.length - 1];
    const maxX = lastNote.x + getNoteWidth(lastNote);

    const totalWidths = sorted.reduce((sum, n) => sum + getNoteWidth(n), 0);
    const availableGap = maxX - minX - totalWidths;
    const gap = Math.max(16, Math.round(availableGap / (sorted.length - 1)));

    let currentX = minX;
    const updated = sorted.map((n) => {
      const itemX = currentX;
      currentX += getNoteWidth(n) + gap;
      return { ...n, x: itemX };
    });
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 10. Distribute Vertically
  const handleDistributeVertical = () => {
    if (selectedNotes.length < 3) return;
    const sorted = [...selectedNotes].sort((a, b) => a.y - b.y);
    const minY = sorted[0].y;
    const lastNote = sorted[sorted.length - 1];
    const maxY = lastNote.y + getNoteHeight(lastNote);

    const totalHeights = sorted.reduce((sum, n) => sum + getNoteHeight(n), 0);
    const availableGap = maxY - minY - totalHeights;
    const gap = Math.max(16, Math.round(availableGap / (sorted.length - 1)));

    let currentY = minY;
    const updated = sorted.map((n) => {
      const itemY = currentY;
      currentY += getNoteHeight(n) + gap;
      return { ...n, y: itemY };
    });
    onUpdateBatchNotes(updated);
    setShowAlignMenu(false);
  };

  // 11. Group / Ungroup
  const isAllGrouped =
    selectedNotes.length >= 2 &&
    selectedNotes.every((n) => n.groupId && n.groupId === selectedNotes[0].groupId);

  const handleGroupNotes = () => {
    if (selectedNotes.length < 2) return;
    if (isAllGrouped) {
      const updated = selectedNotes.map((n) => {
        const copy = { ...n };
        delete copy.groupId;
        delete copy.groupName;
        return copy;
      });
      onUpdateBatchNotes(updated);
    } else {
      const newGroupId = `group-${crypto.randomUUID()}`;
      const groupName = `Group ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const updated = selectedNotes.map((n) => ({
        ...n,
        groupId: newGroupId,
        groupName,
      }));
      onUpdateBatchNotes(updated);
    }
  };

  // 12. Batch Delete
  const handleBulkDelete = () => {
    if (selectedNotes.length > 0) {
      const authResult = authorizeNotes(selectedNotes, 'delete');
      if (!authResult.allowed) {
        sendNativeAppNotification(
          'Delete Guarded',
          `${authResult.lockedNoteIds.length} locked note(s) protected from batch delete.`
        );
      }
      if (authResult.authorizedNotes.length > 0) {
        onDeleteNotes(authResult.authorizedNotes.map((n) => n.id));
      }
    }
  };

  if (selectedNoteIds.length === 0) return null;

  return (
    <div
      className={`w-full px-2.5 py-1.5 flex items-center justify-between border-b transition-colors select-none font-sans text-xs ${
        isDark
          ? 'bg-slate-950/40 border-slate-800 text-slate-200'
          : 'bg-slate-50/70 border-slate-200 text-slate-800'
      }`}
    >
      {/* Selection Counter Badge */}
      <Badge variant="accent" size="xs" icon={CheckmarkSquare02Icon} className="mr-1">
        {selectedNoteIds.length}
      </Badge>

      <div className="flex items-center gap-0.5">
        {/* 1. Change Paper Theme */}
        <Button
          ref={themeBtnRef}
          size="xs"
          variant="ghost"
          icon={PaintBoardIcon}
          onClick={handleToggleTheme}
        >
          <span className="hidden sm:inline">Theme</span>
        </Button>

        {/* 2. Align & Distribute Menu */}
        <Button
          ref={alignBtnRef}
          size="xs"
          variant="ghost"
          icon={LayoutGridIcon}
          onClick={handleToggleAlign}
        >
          <span className="hidden sm:inline">Align</span>
        </Button>

        {/* Theme Picker Portal Popover */}
        {showThemePicker &&
          createPortal(
            <div
              ref={themeRef}
              style={{
                position: 'fixed',
                bottom: `${themePopoverPos.bottom}px`,
                left: `${themePopoverPos.left}px`,
                zIndex: 9999,
              }}
            >
              <Menu minWidth="w-60">
                <MenuGroupHeader>Change Paper Theme</MenuGroupHeader>
                <div className="grid grid-cols-3 gap-1 p-1">
                  {PAPER_THEME_OPTIONS.map((themeKey) => {
                    const cfg = PAPER_THEMES[themeKey];
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => handleBatchThemeChange(themeKey)}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-sm border transition-colors text-[10px] cursor-pointer ${cfg.bg} ${cfg.border} ${cfg.text} hover:border-blue-500`}
                      >
                        <span className="truncate w-full text-center font-medium">
                          {PAPER_THEME_LABELS[themeKey]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Menu>
            </div>,
            document.body
          )}

        {/* Align Portal Popover */}
        {showAlignMenu &&
          createPortal(
            <div
              ref={alignRef}
              style={{
                position: 'fixed',
                bottom: `${alignPopoverPos.bottom}px`,
                left: `${alignPopoverPos.left}px`,
                zIndex: 9999,
              }}
            >
              <Menu minWidth="w-56">
                <MenuGroupHeader>Horizontal Alignment</MenuGroupHeader>
                <div className="grid grid-cols-3 gap-1 p-1">
                  <Button size="xs" variant="secondary" icon={AlignLeftIcon} onClick={handleAlignLeft}>
                    Left
                  </Button>
                  <Button size="xs" variant="secondary" icon={AlignHorizontalCenterIcon} onClick={handleAlignCenterHorizontal}>
                    Center
                  </Button>
                  <Button size="xs" variant="secondary" icon={AlignRightIcon} onClick={handleAlignRight}>
                    Right
                  </Button>
                </div>

                <MenuDivider />

                <MenuGroupHeader>Vertical Alignment</MenuGroupHeader>
                <div className="grid grid-cols-3 gap-1 p-1">
                  <Button size="xs" variant="secondary" icon={AlignTopIcon} onClick={handleAlignTop}>
                    Top
                  </Button>
                  <Button size="xs" variant="secondary" icon={AlignVerticalCenterIcon} onClick={handleAlignCenterVertical}>
                    Mid
                  </Button>
                  <Button size="xs" variant="secondary" icon={AlignBottomIcon} onClick={handleAlignBottom}>
                    Bot
                  </Button>
                </div>

                <MenuDivider />

                <MenuGroupHeader>Distribute Spacing</MenuGroupHeader>
                <MenuItem
                  icon={AlignHorizontalDistributeCenterIcon}
                  label="Space Horizontally"
                  onClick={handleDistributeHorizontal}
                />
                <MenuItem
                  icon={AlignVerticalDistributeCenterIcon}
                  label="Space Vertically"
                  onClick={handleDistributeVertical}
                />
              </Menu>
            </div>,
            document.body
          )}

        {/* 3. Group / Ungroup Notes */}
        <Button
          size="xs"
          variant="ghost"
          icon={Layers01Icon}
          onClick={handleGroupNotes}
          className={isAllGrouped ? 'text-blue-500 font-bold' : ''}
        >
          <span className="hidden sm:inline">{isAllGrouped ? 'Ungroup' : 'Group'}</span>
        </Button>

        {/* 4. Bulk Pin */}
        <Button
          size="xs"
          variant="ghost"
          icon={isAllPinned ? PinOffIcon : PinIcon}
          onClick={handleBatchTogglePin}
        >
          <span className="hidden sm:inline">{isAllPinned ? 'Unpin' : 'Pin'}</span>
        </Button>

        {/* 5. Backup Selected Notes (.json) */}
        <Button
          size="xs"
          variant="ghost"
          icon={Download04Icon}
          onClick={() => {
            if (selectedNotes.length > 0) {
              const authResult = authorizeNotes(selectedNotes, 'export');
              if (!authResult.allowed) {
                sendNativeAppNotification(
                  'Export Restricted',
                  `${authResult.lockedNoteIds.length} locked note(s) excluded from export.`
                );
              }
              const exportable = authResult.authorizedNotes;
              if (exportable.length > 0) {
                const fileName = `selected-notes-backup-${new Date()
                  .toISOString()
                  .slice(0, 10)}.json`;
                exportNotesBackup(exportable, fileName);
              }
            }
          }}
        >
          <span className="hidden sm:inline">Backup</span>
        </Button>

        {/* AI Merge Button */}
        {enableAIServices && (
          <Button
            size="xs"
            variant="ghost"
            icon={isMergingAI ? Loading03Icon : SparklesIcon}
            loading={isMergingAI}
            onClick={onMergeNotesAI}
            disabled={
              isMergingAI ||
              isAlreadyMerged ||
              selectedNotes.length < 2 ||
              selectedNotes.length > 5 ||
              selectedNotes.some((n) => n.isLocked && !isNoteAuthorized(n))
            }
          >
            <span className="hidden sm:inline">Merge</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-200 dark:border-slate-800">
        {/* Bulk Delete */}
        <Button
          size="xs"
          variant="danger"
          icon={Delete02Icon}
          onClick={handleBulkDelete}
        >
          <span className="hidden sm:inline">Delete</span>
        </Button>

        {/* Clear Selection */}
        <IconButton
          size="xs"
          variant="ghost"
          icon={Cancel01Icon}
          aria-label="Clear selection"
          onClick={onClearSelection}
        />
      </div>
    </div>
  );
};

export const BatchActionBar = React.memo(BatchActionBarComponent);
