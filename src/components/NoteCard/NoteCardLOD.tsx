import React, { useRef } from 'react';
import { SecurityLockIcon, PinIcon } from '@hugeicons/core-free-icons';
import { Icon } from '../ui';
import { NoteCardProps, FONT_CLASSES, PAPER_THEMES } from './types';
import { useNoteDrag } from '../../hooks/useNoteDrag';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, DRAG_Z_INDEX } from '../../constants/canvas';
import { getAssetDisplayUri } from '../../lib/rustAssets';

/**
 * Level-of-Detail (LOD) Note Card.
 * Rendered at low zoom levels (zoom < LOD_ZOOM_THRESHOLD) when a card is not active.
 *
 * Performance benefits:
 * - 0 ResizeObservers
 * - 0 Markdown AST parsers & remark plugins
 * - 0 Toolbar / button subtrees
 * - 0 Slash command / mention autocompletion listeners
 * - Retains full drag, selection, context-menu, and visual theme parity
 */
export const NoteCardLOD: React.FC<NoteCardProps> = React.memo((props) => {
  const {
    note,
    allNotes,
    zoom,
    isSelected,
    selectedNoteIds = [],
    onSelectNote,
    onNavigateToNote,
    onUpdateNote,
    onUpdateBatchNotes,
    onBringToFront,
    snapToGrid = false,
    isPanMode = false,
    isCardDragging = false,
    isCut = false,
    onDragStateChange,
    onContextMenu,
  } = props;

  const cardRef = useRef<HTMLDivElement>(null);

  const { handleMouseDown } = useNoteDrag({
    note,
    allNotes,
    zoom,
    selectedNoteIds,
    isPanMode,
    snapToGrid,
    onSelectNote,
    onNavigateToNote,
    onUpdateNote,
    onUpdateBatchNotes,
    onBringToFront,
    onDragStateChange,
  });

  const themeConfig = PAPER_THEMES[note.paperTheme || 'white'] || PAPER_THEMES.white;
  const fontClass = FONT_CLASSES[note.fontFamily || 'sans'] || FONT_CLASSES.sans;
  const isImage = Boolean(note.imageUrl);
  const isCovered = Boolean(note.isCovered);

  return (
    <div
      id={`note-card-${note.id}`}
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => onContextMenu?.(e, note.id)}
      onDoubleClick={() => onNavigateToNote(note.id)}
      className={`note-card absolute top-0 left-0 rounded-md border shadow-xs select-none ${
        isCovered ? 'overflow-hidden' : ''
      } ${themeConfig.bg} ${themeConfig.border} ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-30' : ''
      } ${isCardDragging ? 'shadow-2xl cursor-grabbing' : 'cursor-grab'} ${isCut ? 'opacity-40' : ''}`}
      style={{
        transform: `translate3d(${Math.round(note.x)}px, ${Math.round(note.y)}px, 0)`,
        width: `${note.width || DEFAULT_NOTE_WIDTH}px`,
        height: `${note.height || DEFAULT_NOTE_HEIGHT}px`,
        zIndex: isCardDragging ? DRAG_Z_INDEX : (note.zIndex || 1),
      }}
    >
      {/* Covered Preview */}
      {isCovered ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-amber-950/5 dark:bg-black/40 text-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-amber-700/40 dark:border-amber-500/40 flex items-center justify-center text-amber-800/80 dark:text-amber-300 font-serif font-bold text-[10px] tracking-widest uppercase shadow-xs">
            Sealed
          </div>
          <span className="mt-2 text-xs font-medium text-amber-950/80 dark:text-amber-200 truncate max-w-[85%]">
            {note.title || 'Enclosed Note'}
          </span>
        </div>
      ) : isImage ? (
        /* Image Card Preview */
        <div className="relative w-full h-full flex flex-col pointer-events-none overflow-hidden rounded-md">
          <div className="relative flex-1 w-full overflow-hidden bg-black/5 dark:bg-white/5">
            <img
              src={getAssetDisplayUri(note.imageUrl)}
              alt={note.title || 'Note image'}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
          {(note.title || note.content) && (
            <div className={`p-2 px-3 text-xs font-semibold truncate ${fontClass} ${themeConfig.text} ${themeConfig.headerBg}`}>
              {note.title || note.content}
            </div>
          )}
        </div>
      ) : (
        /* Text / Checklist Card Preview */
        <div className="p-4 w-full h-full flex flex-col pointer-events-none overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            {note.isPinned && (
              <span className="text-amber-500 dark:text-amber-400 shrink-0">
                <Icon icon={PinIcon} size="xs" />
              </span>
            )}
            {note.isLocked && (
              <span className="text-slate-400 shrink-0">
                <Icon icon={SecurityLockIcon} size="xs" />
              </span>
            )}
            <h3 className={`font-semibold text-sm truncate ${fontClass} ${themeConfig.text}`}>
              {note.title || 'Untitled Note'}
            </h3>
          </div>

          {/* Body Preview */}
          {note.content ? (
            <div
              className={`text-xs line-clamp-6 whitespace-pre-wrap opacity-65 leading-relaxed ${fontClass} ${themeConfig.text}`}
            >
              {note.content.slice(0, 300)}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs opacity-30 italic">
              Empty note
            </div>
          )}
        </div>
      )}
    </div>
  );
});

NoteCardLOD.displayName = 'NoteCardLOD';
