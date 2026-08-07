import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Note, PaperTheme, CanvasTheme } from '../types';
import { PAPER_THEMES } from './NoteCard/types';
import {
  Maximize2,
  Edit3,
  Pin,
  PinOff,
  Lock,
  Unlock,
  Layers,
  Palette,
  Download,
  Copy,
  Trash2,
  CheckSquare,
  Clipboard,
  Plus,
} from 'lucide-react';

interface NoteContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  selectedNoteIds: string[];
  notes: Note[];
  themeMode?: CanvasTheme;
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
  onSelectAllNotes?: () => void;
}

const PAPER_THEME_ITEMS: { key: PaperTheme; label: string; colorClass: string }[] = [
  { key: 'white', label: 'White', colorClass: 'bg-white border-slate-300' },
  { key: 'cream', label: 'Cream', colorClass: 'bg-[#fefcbf] border-amber-300' },
  { key: 'ruled', label: 'Ruled', colorClass: 'bg-[#fef3c7] border-amber-400' },
  { key: 'dotted', label: 'Dotted', colorClass: 'bg-[#f8fafc] border-slate-300' },
  { key: 'kraft', label: 'Kraft', colorClass: 'bg-[#e9d5ff] border-purple-300' },
  { key: 'dark', label: 'Dark', colorClass: 'bg-slate-900 border-slate-700' },
  { key: 'graphite', label: 'Graphite', colorClass: 'bg-slate-800 border-slate-600' },
  { key: 'transparent', label: 'Glass', colorClass: 'bg-white/20 border-white/40' },
];

export const NoteContextMenu: React.FC<NoteContextMenuProps> = ({
  x,
  y,
  isOpen,
  selectedNoteIds,
  notes,
  themeMode = 'dark',
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
  onSelectAllNotes,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const isDark = themeMode === 'dark';

  const selectedNotes = useMemo(
    () => notes.filter((n) => selectedNoteIds.includes(n.id)),
    [notes, selectedNoteIds]
  );

  const isSingle = selectedNoteIds.length === 1;
  const singleNote = isSingle ? selectedNotes[0] : null;
  const isAllPinned = selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned);
  const isAllLocked = selectedNotes.length > 0 && selectedNotes.every((n) => n.isLocked);
  const isAllGrouped =
    selectedNotes.length >= 2 && selectedNotes.every((n) => n.groupId && n.groupId === selectedNotes[0].groupId);

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

  // Adjust menu position to remain strictly inside viewport boundaries
  const adjustedPos = useMemo(() => {
    const menuWidth = 225;
    const menuHeight = 360;

    let clampedX = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));
    let clampedY = Math.max(12, Math.min(y, window.innerHeight - menuHeight - 12));

    return { clampedX, clampedY };
  }, [x, y]);

  if (!isOpen) return null;

  const btnClass = isDark
    ? 'hover:bg-slate-800/90 text-slate-200 hover:text-white'
    : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900';

  const dividerClass = isDark ? 'bg-slate-800' : 'bg-slate-200';

  return createPortal(
    <div
      ref={menuRef}
      style={{
        left: `${adjustedPos.clampedX}px`,
        top: `${adjustedPos.clampedY}px`,
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`fixed z-50 w-56 rounded-md border shadow-lg py-1.5 px-1 select-none font-sans text-xs transition-all animate-in fade-in zoom-in-95 duration-100 ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/60 backdrop-blur-md'
          : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50 backdrop-blur-md'
      }`}
    >
      {selectedNoteIds.length === 0 ? (
        <>
          <div className="px-2 py-1 mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/50">
            <span>Canvas Actions</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onPasteFromClipboard?.();
              onClose();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
          >
            <Clipboard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="flex-1 truncate">Paste Note from Clipboard</span>
            <span className="text-[10px] font-mono text-slate-400">Ctrl+V</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCreateNoteHere?.();
              onClose();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="flex-1 truncate">New Note Here</span>
            <span className="text-[10px] font-mono text-slate-400">Dbl-Click</span>
          </button>

          <div className={`my-1 h-px ${dividerClass}`} />

          <button
            type="button"
            onClick={() => {
              onSelectAllNotes?.();
              onClose();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="flex-1 truncate">Select All Notes</span>
            <span className="text-[10px] font-mono text-slate-400">Ctrl+A</span>
          </button>
        </>
      ) : (
        <>
          {/* Header Info Badge */}
          <div className="px-2 py-1 mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/50">
            <span className="truncate">
              {isSingle ? (singleNote?.title || 'Untitled Note') : `${selectedNoteIds.length} notes selected`}
            </span>
            <CheckSquare className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>

      {/* 1. Zoom & Focus Note */}
      <button
        type="button"
        onClick={() => {
          if (singleNote) onNavigateToNote?.(singleNote.id);
          else if (selectedNoteIds.length > 0) onNavigateToNote?.(selectedNoteIds[0]);
          onClose();
        }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
      >
        <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="flex-1 truncate">Zoom to {isSingle ? 'Note' : 'Selection'}</span>
        <span className="text-[10px] font-mono text-slate-400">Alt+Click</span>
      </button>

      {/* 2. Edit Note (Single Selection) */}
      {isSingle && (
        <button
          type="button"
          onClick={() => {
            if (singleNote) onEditNote?.(singleNote.id);
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
        >
          <Edit3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="flex-1 truncate">Edit Note</span>
          <span className="text-[10px] font-mono text-slate-400">Enter</span>
        </button>
      )}

      <div className={`my-1 h-px ${dividerClass}`} />

      {/* 3. Pin / Unpin */}
      <button
        type="button"
        onClick={() => {
          onTogglePin?.(selectedNoteIds);
          onClose();
        }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
      >
        {isAllPinned ? (
          <>
            <PinOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Unpin Note{selectedNoteIds.length > 1 ? 's' : ''}</span>
          </>
        ) : (
          <>
            <Pin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Pin Note{selectedNoteIds.length > 1 ? 's' : ''}</span>
          </>
        )}
      </button>

      {/* 4. Lock / Unlock */}
      <button
        type="button"
        onClick={() => {
          onLockNotes?.(selectedNoteIds);
          onClose();
        }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
      >
        {isAllLocked ? (
          <>
            <Unlock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Unlock Note{selectedNoteIds.length > 1 ? 's' : ''}</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Lock Access</span>
          </>
        )}
      </button>

      {/* 5. Group / Ungroup (Multi Selection) */}
      {selectedNoteIds.length >= 2 && (
        <button
          type="button"
          onClick={() => {
            if (isAllGrouped) onUngroupNotes?.();
            else onGroupNotes?.();
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
        >
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{isAllGrouped ? 'Ungroup Notes' : 'Group Notes'}</span>
          <span className="text-[10px] font-mono text-slate-400">Ctrl+G</span>
        </button>
      )}

      {/* 6. Paper Theme Selector Submenu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowThemePicker(!showThemePicker)}
          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Paper Theme</span>
          </div>
          <span className="text-[10px] text-slate-400">›</span>
        </button>

        {showThemePicker && (
          <div
            className={`p-2 my-1 rounded border grid grid-cols-4 gap-1 ${
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
                className={`w-full h-6 rounded border transition-transform hover:scale-105 ${item.colorClass}`}
                title={item.label}
              />
            ))}
          </div>
        )}
      </div>

      <div className={`my-1 h-px ${dividerClass}`} />

      {/* 7. Backup (.json) */}
      <button
        type="button"
        onClick={() => {
          onExportNotes?.(selectedNoteIds, 'json');
          onClose();
        }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
      >
        <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Backup ({isSingle ? 'Single' : 'Selected'}) (.json)</span>
      </button>

      {/* 8. Export Markdown (.md) */}
      {isSingle && (
        <button
          type="button"
          onClick={() => {
            onExportNotes?.(selectedNoteIds, 'md');
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
        >
          <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Export Markdown (.md)</span>
        </button>
      )}

      {/* 9. Duplicate Note(s) */}
      {isSingle && (
        <button
          type="button"
          onClick={() => {
            onDuplicateNotes?.(selectedNoteIds);
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${btnClass}`}
        >
          <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Duplicate Note</span>
        </button>
      )}

      <div className={`my-1 h-px ${dividerClass}`} />

      {/* 10. Delete Note(s) */}
      <button
        type="button"
        onClick={() => {
          onDeleteNotes?.(selectedNoteIds);
          onClose();
        }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-colors text-left ${
          isDark
            ? 'hover:bg-rose-950/50 text-rose-400 hover:text-rose-300'
            : 'hover:bg-rose-50 text-rose-600 hover:text-rose-700'
        }`}
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span>Delete Note{selectedNoteIds.length > 1 ? 's' : ''}</span>
        <span className="text-[10px] font-mono opacity-70 ml-auto">Del</span>
      </button>
    </>
  )}
</div>,
    document.body
  );
};
