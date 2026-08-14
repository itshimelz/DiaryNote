import React, { useState, useRef, useEffect } from 'react';
import {
  CheckListIcon,
  PaintBoardIcon,
  MoreVerticalIcon,
  Delete02Icon,
  Copy01Icon,
  SecurityLockIcon,
  CircleUnlock01Icon,
  Download04Icon,
} from '@hugeicons/core-free-icons';
import { Icon, Menu, MenuItem, MenuDivider } from '../ui';
import { NoteMode, PaperThemeConfig } from './types';
import { Note } from '../../types';

interface NoteToolbarProps {
  note: Note;
  activeMode: NoteMode;
  onSelectMode: (mode: NoteMode) => void;
  onToggleStylePicker: () => void;
  onDuplicateNote?: () => void;
  onDeleteNote: () => void;
  onToggleLockNote?: () => void;
  onExportNote?: (format: 'md' | 'txt' | 'json') => void;
  themeConfig?: PaperThemeConfig;
}

const TypeIcon = () => (
  <span className="font-sans font-bold text-base sm:text-lg leading-none select-none">T</span>
);

export const NoteToolbar: React.FC<NoteToolbarProps> = ({
  note,
  activeMode,
  onSelectMode,
  onToggleStylePicker,
  onDuplicateNote,
  onDeleteNote,
  onToggleLockNote,
  onExportNote,
  themeConfig,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside or Escape
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMoreMenu]);

  const toolbarBg = themeConfig?.toolbarBg || 'bg-white';
  const divider = themeConfig?.divider || 'border-slate-100';
  const normalBtnClass =
    themeConfig?.toolbarBtn || 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80';
  const isDarkCard = themeConfig?.isDark ?? false;

  // Text mode active: blue icon, no border
  const textActiveBtnClass = 'text-[#2563eb] font-bold';
  // Checklist mode active: violet icon, no border
  const checklistActiveBtnClass = isDarkCard
    ? 'text-violet-400 font-bold'
    : 'text-violet-500 font-bold';

  const getTextBtnClass = (isActive: boolean) =>
    `flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-sm transition-colors cursor-pointer ${
      isActive ? textActiveBtnClass : normalBtnClass
    }`;

  const getChecklistBtnClass = (isActive: boolean) =>
    `flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-sm transition-colors cursor-pointer ${
      isActive ? checklistActiveBtnClass : normalBtnClass
    }`;

  return (
    <div
      className={`relative border-t ${divider} ${toolbarBg} backdrop-blur-xs px-3.5 py-2.5 flex items-center justify-between gap-1.5 select-none rounded-b-sm`}
    >
      {/* 1. Text Mode Button */}
      <button
        type="button"
        onClick={() => onSelectMode('text')}
        className={getTextBtnClass(activeMode === 'text')}
        title="Text mode"
        aria-label="Text mode"
      >
        <TypeIcon />
      </button>

      {/* 2. Checklist Mode Button */}
      <button
        type="button"
        onClick={() => onSelectMode('checklist')}
        className={getChecklistBtnClass(activeMode === 'checklist')}
        title="Checklist mode"
        aria-label="Checklist mode"
      >
        <Icon icon={CheckListIcon} size="lg" />
      </button>

      {/* 3. Palette / Style Theme Button */}
      <button
        type="button"
        onClick={onToggleStylePicker}
        className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-sm transition-colors cursor-pointer ${normalBtnClass}`}
        title="Theme & Font settings"
        aria-label="Theme and font settings"
      >
        <Icon icon={PaintBoardIcon} size="lg" />
      </button>

      {/* 4. More Options Button */}
      <div className="relative" ref={moreRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMoreMenu((prev) => !prev);
          }}
          className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-sm transition-colors cursor-pointer ${normalBtnClass}`}
          title="More options"
          aria-label="More note options"
        >
          <Icon icon={MoreVerticalIcon} size="lg" />
        </button>

        {/* More Options Popover */}
        {showMoreMenu && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-12 right-0 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            <Menu minWidth="w-56 sm:w-60">
              {onToggleLockNote && (
                <MenuItem
                  icon={note.isLocked ? CircleUnlock01Icon : SecurityLockIcon}
                  label={note.isLocked ? 'Unlock Note' : 'Lock Access'}
                  onClick={() => {
                    onToggleLockNote();
                    setShowMoreMenu(false);
                  }}
                />
              )}

              {onExportNote && (
                <>
                  <MenuItem
                    icon={Download04Icon}
                    label="Backup Note (.json)"
                    onClick={() => {
                      onExportNote('json');
                      setShowMoreMenu(false);
                    }}
                  />
                  <MenuItem
                    icon={Download04Icon}
                    label="Export (.md)"
                    onClick={() => {
                      onExportNote('md');
                      setShowMoreMenu(false);
                    }}
                  />
                </>
              )}

              {onDuplicateNote && (
                <MenuItem
                  icon={Copy01Icon}
                  label="Duplicate Note"
                  onClick={() => {
                    onDuplicateNote();
                    setShowMoreMenu(false);
                  }}
                />
              )}

              <MenuDivider />

              <MenuItem
                icon={Delete02Icon}
                label="Delete Note"
                danger
                onClick={() => {
                  onDeleteNote();
                  setShowMoreMenu(false);
                }}
              />
            </Menu>
          </div>
        )}
      </div>
    </div>
  );
};
