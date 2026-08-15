import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Note, PaperTheme, CanvasTheme } from '../types';
import { PAPER_THEME_ITEMS } from '../constants/paperThemes';
import { getPlatformMetaKey, getPlatformAltKey } from '../utils';
import {
  Maximize01Icon,
  Edit02Icon,
  PinIcon,
  PinOffIcon,
  SecurityLockIcon,
  CircleUnlock01Icon,
  Layers01Icon,
  PaintBoardIcon,
  Download04Icon,
  Copy01Icon,
  Delete02Icon,
  CheckmarkSquare02Icon,
  ClipboardIcon,
  Add01Icon,
  Image01Icon,
} from '@hugeicons/core-free-icons';
import { Menu, MenuItem, MenuDivider, MenuGroupHeader, Badge } from './ui';

interface NoteContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  selectedNoteIds: string[];
  notes: Note[];
  themeMode?: CanvasTheme;
  zoom?: number;
  onClose: () => void;
  onNavigateToNote?: (id: string) => void;
  onEditNote?: (id: string) => void;
  onTogglePin?: (ids: string[]) => void;
  onLockNotes?: (ids: string[]) => void;
  onGroupNotes?: () => void;
  onUngroupNotes?: () => void;
  onDuplicateNotes?: (ids: string[]) => void;
  onExportNotes?: (ids: string[], format: 'json' | 'md') => void;
  onDeleteNotes?: (ids: string[]) => void;
  onChangePaperTheme?: (ids: string[], theme: PaperTheme) => void;
  onPasteFromClipboard?: () => void;
  onCreateNoteHere?: () => void;
  onAddImageHere?: () => void;
  onSelectAllNotes?: () => void;
}

const NoteContextMenuComponent: React.FC<NoteContextMenuProps> = ({
  x,
  y,
  isOpen,
  selectedNoteIds,
  notes,
  themeMode = 'dark',
  zoom = 1,
  onClose,
  onNavigateToNote,
  onEditNote,
  onTogglePin,
  onLockNotes,
  onGroupNotes,
  onUngroupNotes,
  onDuplicateNotes,
  onExportNotes,
  onDeleteNotes,
  onChangePaperTheme,
  onPasteFromClipboard,
  onCreateNoteHere,
  onAddImageHere,
  onSelectAllNotes,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const isDark = themeMode !== 'light';

  const selectedNotes = useMemo(
    () => notes.filter((n) => selectedNoteIds.includes(n.id)),
    [notes, selectedNoteIds]
  );

  const isSingle = selectedNoteIds.length === 1;
  const singleNote = isSingle ? selectedNotes[0] : null;
  const isAllPinned = selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned);
  const isAllLocked = selectedNotes.length > 0 && selectedNotes.every((n) => n.isLocked);
  const isAllImageNotes =
    selectedNotes.length > 0 && selectedNotes.every((n) => Boolean(n.imageUrl));
  const isAllGrouped =
    selectedNotes.length >= 2 &&
    selectedNotes.every((n) => n.groupId && n.groupId === selectedNotes[0].groupId);

  // Visual scaling factor based on canvas zoom
  const visualScale = useMemo(() => {
    if (!zoom || isNaN(zoom)) return 1;
    return Math.max(0.92, Math.min(1.25, Math.sqrt(zoom)));
  }, [zoom]);

  // Auto-close menu on outside click or ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDownOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('mousedown', handleMouseDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Clamp menu inside viewport
  const adjustedPos = useMemo(() => {
    const baseWidth = 272;
    const baseHeight = 420;
    const scaledWidth = baseWidth * visualScale;
    const scaledHeight = baseHeight * visualScale;

    const clampedX = Math.max(12, Math.min(x, window.innerWidth - scaledWidth - 12));
    const clampedY = Math.max(12, Math.min(y, window.innerHeight - scaledHeight - 12));

    return { clampedX, clampedY };
  }, [x, y, visualScale]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${adjustedPos.clampedX}px`,
        top: `${adjustedPos.clampedY}px`,
        transform: `scale(${visualScale})`,
        transformOrigin: 'top left',
        zIndex: 9999,
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="animate-in fade-in zoom-in-95 duration-100"
    >
      <Menu minWidth="w-64 sm:w-68" className={isDark ? 'bg-slate-900/98 border-slate-800' : 'bg-white/98 border-slate-200'}>
        {selectedNoteIds.length === 0 ? (
          <>
            <MenuGroupHeader>Canvas Actions</MenuGroupHeader>
            <MenuItem
              icon={ClipboardIcon}
              label="Paste Note from Clipboard"
              shortcut={`${getPlatformMetaKey()}+V`}
              onClick={() => {
                onPasteFromClipboard?.();
                onClose();
              }}
            />
            <MenuItem
              icon={Add01Icon}
              label="New Note Here"
              shortcut="Dbl-Click"
              onClick={() => {
                onCreateNoteHere?.();
                onClose();
              }}
            />
            <MenuItem
              icon={Image01Icon}
              label="Add Image / Photo Here"
              onClick={() => {
                onAddImageHere?.();
                onClose();
              }}
            />
            <MenuDivider />
            <MenuItem
              icon={CheckmarkSquare02Icon}
              label="Select All Notes"
              shortcut={`${getPlatformMetaKey()}+A`}
              onClick={() => {
                onSelectAllNotes?.();
                onClose();
              }}
            />
          </>
        ) : (
          <>
            {/* Header info badge */}
            <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {isSingle
                  ? singleNote?.title || (singleNote?.imageUrl ? 'Photo Note' : 'Untitled Note')
                  : `${selectedNoteIds.length} notes selected`}
              </span>
              <Badge variant="subtle" size="xs">
                {selectedNoteIds.length}
              </Badge>
            </div>

            {/* Actions */}
            <MenuItem
              icon={Maximize01Icon}
              label={`Zoom to ${isSingle ? (singleNote?.imageUrl ? 'Photo' : 'Note') : 'Selection'}`}
              shortcut={`${getPlatformAltKey()}+Click`}
              onClick={() => {
                if (singleNote) onNavigateToNote?.(singleNote.id);
                else if (selectedNoteIds.length > 0) onNavigateToNote?.(selectedNoteIds[0]);
                onClose();
              }}
            />

            {isSingle && (
              <MenuItem
                icon={Edit02Icon}
                label={singleNote?.imageUrl ? 'Edit Caption' : 'Edit Note'}
                shortcut="Enter"
                onClick={() => {
                  if (singleNote) onEditNote?.(singleNote.id);
                  onClose();
                }}
              />
            )}

            <MenuDivider />

            <MenuItem
              icon={isAllPinned ? PinOffIcon : PinIcon}
              label={isAllPinned ? `Unpin ${isAllImageNotes ? 'Photo' : 'Note'}${selectedNoteIds.length > 1 ? 's' : ''}` : `Pin ${isAllImageNotes ? 'Photo' : 'Note'}${selectedNoteIds.length > 1 ? 's' : ''}`}
              onClick={() => {
                onTogglePin?.(selectedNoteIds);
                onClose();
              }}
            />

            <MenuItem
              icon={isAllLocked ? CircleUnlock01Icon : SecurityLockIcon}
              label={isAllLocked ? `Unlock ${isAllImageNotes ? 'Photo' : 'Note'}${selectedNoteIds.length > 1 ? 's' : ''}` : `Lock Access`}
              onClick={() => {
                onLockNotes?.(selectedNoteIds);
                onClose();
              }}
            />

            {selectedNoteIds.length >= 2 && (
              <MenuItem
                icon={Layers01Icon}
                label={isAllGrouped ? 'Ungroup Notes' : 'Group Notes'}
                shortcut={`${getPlatformMetaKey()}+G`}
                onClick={() => {
                  if (isAllGrouped) onUngroupNotes?.();
                  else onGroupNotes?.();
                  onClose();
                }}
              />
            )}

            {/* Paper Theme Submenu (Text Notes Only) */}
            {!isAllImageNotes && (
              <div className="relative">
                <MenuItem
                  icon={PaintBoardIcon}
                  label="Paper Theme"
                  onClick={() => setShowThemePicker((prev) => !prev)}
                />

                {showThemePicker && (
                  <div
                    className={`p-2 my-1 rounded-sm border grid grid-cols-4 gap-1.5 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {PAPER_THEME_ITEMS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          onChangePaperTheme?.(selectedNoteIds, item.key);
                          onClose();
                        }}
                        className={`w-full h-7 rounded-sm border transition-colors hover:border-blue-500 cursor-pointer ${item.colorClass}`}
                        title={item.label}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <MenuDivider />

            <MenuItem
              icon={Download04Icon}
              label={`Backup (${isSingle ? 'Single' : 'Selected'}) (.json)`}
              onClick={() => {
                onExportNotes?.(selectedNoteIds, 'json');
                onClose();
              }}
            />

            {isSingle && (
              <MenuItem
                icon={Download04Icon}
                label="Export Markdown (.md)"
                onClick={() => {
                  onExportNotes?.(selectedNoteIds, 'md');
                  onClose();
                }}
              />
            )}

            <MenuItem
              icon={Copy01Icon}
              label={`Duplicate Note${selectedNoteIds.length > 1 ? 's' : ''}`}
              onClick={() => {
                onDuplicateNotes?.(selectedNoteIds);
                onClose();
              }}
            />

            <MenuDivider />

            <MenuItem
              icon={Delete02Icon}
              label={`Delete Note${selectedNoteIds.length > 1 ? 's' : ''}`}
              danger
              shortcut="Del"
              onClick={() => {
                onDeleteNotes?.(selectedNoteIds);
                onClose();
              }}
            />
          </>
        )}
      </Menu>
    </div>,
    document.body
  );
};

export const NoteContextMenu = React.memo(NoteContextMenuComponent);
