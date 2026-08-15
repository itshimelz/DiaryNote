import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomInAreaIcon,
  Download01Icon,
  Upload04Icon,
  PaintBoardIcon,
  Delete02Icon,
  PinIcon,
  PinOffIcon,
  FolderAddIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { IconButton, Icon } from '../ui';
import { Note, FrameStyle } from '../../types';
import { NoteDecorations } from './NoteDecorations';
import { NoteStylePicker } from './NoteStylePicker';
import { ImageLightboxModal } from '../Modals/ImageLightboxModal';
import { useNoteDrag } from '../../hooks/useNoteDrag';
import { useNoteResize } from '../../hooks/useNoteResize';
import { DEFAULT_NOTE_WIDTH, DRAG_Z_INDEX } from '../../constants/canvas';
import { FONT_CLASSES, PAPER_THEMES } from './types';

export interface ImageNoteCardProps {
  note: Note;
  allNotes?: Note[];
  zoom?: number;
  isSelected?: boolean;
  selectedNoteIds?: string[];
  isFocused?: boolean;
  onSelectNote: (id: string | null) => void;
  onNavigateToNote?: (id: string) => void;
  onUpdateNote: (note: Note) => void;
  onUpdateBatchNotes?: (notes: Note[]) => void;
  onDeleteNote: (id: string) => void;
  onBringToFront?: (id: string) => void;
  snapToGrid?: boolean;
  isPanMode?: boolean;
  shouldStartEditing?: boolean;
  onRequestLockNote?: (id: string) => void;
  onRequestUnlockNote?: (id: string) => void;
  onExportNote?: (note: Note, format: 'md' | 'txt' | 'json') => void;
  isCardDragging?: boolean;
  onDragStateChange?: (draggingIds: string[]) => void;
  onContextMenu?: (e: React.MouseEvent, noteId: string) => void;
}

const ImageNoteCardComponent: React.FC<ImageNoteCardProps> = ({
  note,
  allNotes = [],
  zoom = 1,
  isSelected = false,
  selectedNoteIds = [],
  isFocused: _isFocused,
  onSelectNote,
  onNavigateToNote,
  onUpdateNote,
  onUpdateBatchNotes,
  onDeleteNote,
  onBringToFront,
  snapToGrid = false,
  isPanMode = false,
  shouldStartEditing = false,
  onExportNote: _onExportNote,
  isCardDragging = false,
  onDragStateChange,
  onContextMenu,
}) => {
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  const { isDragging, handleMouseDown } = useNoteDrag({
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

  const { isResizing, handleResizeMouseDown } = useNoteResize({
    note,
    zoom,
    isPanMode,
    snapToGrid,
    onUpdateNote,
    cardRef,
  });

  useEffect(() => {
    if (shouldStartEditing) {
      setIsEditingCaption(true);
      setTimeout(() => captionInputRef.current?.focus(), 50);
    }
  }, [shouldStartEditing]);

  const frameStyle: FrameStyle = note.frameStyle || 'polaroid';
  const fontClass = FONT_CLASSES[note.fontFamily || 'sans'] || FONT_CLASSES.sans;
  const paperTheme = note.paperTheme || 'white';
  const themeConfig = PAPER_THEMES[paperTheme] || PAPER_THEMES.white;

  const handleDownloadImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note.imageUrl) return;
    const a = document.createElement('a');
    a.href = note.imageUrl;
    a.download = `${(note.title || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReplaceImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
        onUpdateNote({
          ...note,
          imageUrl: dataUrl,
          imageType: file.type,
          imageAspectRatio: aspectRatio,
          updatedAt: new Date().toISOString(),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Group Overlap Detection
  const overlappingGroup = React.useMemo(() => {
    if (note.groupId || isDragging || isCardDragging) return null;
    const padding = 16;
    const target = allNotes.find(
      (other) =>
        other.id !== note.id &&
        other.groupId &&
        other.x - padding <= note.x &&
        other.x + (other.width || DEFAULT_NOTE_WIDTH) + padding >= note.x &&
        other.y - padding <= note.y &&
        other.y + (other.height || 300) + padding >= note.y
    );
    return target && target.groupId ? { id: target.groupId, name: target.groupName || 'Group' } : null;
  }, [note.groupId, note.id, note.x, note.y, note.width, note.height, isDragging, isCardDragging, allNotes]);

  return (
    <>
      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => {
          if (onContextMenu) {
            onContextMenu(e, note.id);
          }
        }}
        role="article"
        tabIndex={0}
        aria-label={`Photo Card: ${note.title || note.content || 'Photo'}`}
        style={{
          transform: `translate3d(${Math.round(note.x)}px, ${Math.round(note.y)}px, 0) rotate(${note.rotation || 0}deg)`,
          width: `${note.width || 320}px`,
          minHeight: `${note.height || 360}px`,
          zIndex: isDragging || isCardDragging || isResizing ? DRAG_Z_INDEX : note.zIndex || 10,
        }}
        className={`note-card image-note-card group/image absolute top-0 left-0 rounded-sm flex flex-col justify-between shadow-sm overflow-visible select-none ${
          frameStyle === 'polaroid'
            ? 'polaroid-frame'
            : frameStyle === 'photo'
            ? 'photo-frame'
            : frameStyle === 'frameless'
            ? 'bg-transparent shadow-none'
            : `${themeConfig.bg} ${themeConfig.text}`
        } ${
          isPanMode
            ? 'cursor-grab active:cursor-grabbing pointer-events-none'
            : isDragging || isCardDragging || isResizing
            ? 'transition-none scale-100 cursor-grabbing'
            : 'transition-[box-shadow,opacity] duration-150 ease-out scale-100 cursor-grab'
        } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      >
        {/* Bulletin Board 3D Pushpins and Washi Tape */}
        <NoteDecorations pinStyle={note.pinStyle} />

        {/* Smart Quick-Action: Add to Overlapping Group */}
        {isSelected && overlappingGroup && (
          <div className="absolute -top-7 left-2 z-50 pointer-events-auto select-none">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNote(null);
                onUpdateNote({
                  ...note,
                  groupId: overlappingGroup.id,
                  groupName: overlappingGroup.name,
                });
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-sm border shadow-sm backdrop-blur-md transition-colors cursor-pointer bg-white/95 dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={`Add note to ${overlappingGroup.name}`}
            >
              <Icon icon={FolderAddIcon} size="xs" className="text-blue-500 shrink-0" />
              <span>Add to "{overlappingGroup.name}"</span>
            </button>
          </div>
        )}

        {/* Floating Top Quick Controls on Hover or Selection */}
        <div
          className={`absolute top-2 right-2 z-30 flex items-center gap-1 transition-opacity duration-150 p-1 rounded-sm border shadow-sm backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 ${
            isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/image:opacity-100 pointer-events-auto'
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <IconButton
            icon={ZoomInAreaIcon}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            aria-label="Zoom photo"
            title="Expand Photo Preview"
          />
          <IconButton
            icon={PaintBoardIcon}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setShowStylePicker((prev) => !prev);
            }}
            aria-label="Framing & Style"
            title="Framing & Pin Style"
          />
          <IconButton
            icon={Upload04Icon}
            size="xs"
            variant="ghost"
            onClick={handleReplaceImage}
            aria-label="Replace photo"
            title="Replace Photo"
          />
          <IconButton
            icon={Download01Icon}
            size="xs"
            variant="ghost"
            onClick={handleDownloadImage}
            aria-label="Download photo"
            title="Download Original"
          />
          <IconButton
            icon={note.isPinned ? PinOffIcon : PinIcon}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateNote({ ...note, isPinned: !note.isPinned });
            }}
            aria-label={note.isPinned ? 'Unpin' : 'Pin'}
            title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
          />
          <IconButton
            icon={Delete02Icon}
            size="xs"
            variant="ghost"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
            aria-label="Delete photo card"
            title="Delete Card"
          />
        </div>

        {/* Hidden File Input for Image Replacement */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Image Card Body based on Frame Style */}
        {frameStyle === 'polaroid' ? (
          <div className="relative w-full flex-1 flex flex-col p-3.5 pb-2">
            {/* Image Surface */}
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="relative w-full flex-1 min-h-[220px] bg-slate-950/80 overflow-hidden rounded-xs border border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer"
            >
              <img
                src={note.imageUrl}
                alt={note.title || 'Polaroid photo'}
                className="w-full h-full object-cover select-none pointer-events-none"
                loading="lazy"
              />
            </div>

            {/* Polaroid Handwritten Caption Margin */}
            <div
              className="mt-2.5 px-1 min-h-[34px] flex items-center justify-center text-center cursor-text"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingCaption(true);
              }}
            >
              {isEditingCaption ? (
                <div className="w-full flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    ref={captionInputRef}
                    type="text"
                    value={note.content || ''}
                    onChange={(e) =>
                      onUpdateNote({
                        ...note,
                        content: e.target.value,
                        title: e.target.value.slice(0, 40) || 'Photo Note',
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setIsEditingCaption(false);
                      }
                    }}
                    onBlur={() => setIsEditingCaption(false)}
                    placeholder="Write a caption..."
                    className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-blue-500 text-center outline-none py-1 text-sm ${fontClass} text-slate-800 dark:text-slate-100`}
                  />
                  <IconButton
                    icon={Cancel01Icon}
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsEditingCaption(false)}
                    aria-label="Done captioning"
                    title="Done"
                  />
                </div>
              ) : (
                <p
                  className={`text-sm text-slate-700 dark:text-slate-200 tracking-wide select-text ${fontClass} line-clamp-2`}
                >
                  {note.content || note.title || 'Untitled Photo'}
                </p>
              )}
            </div>
          </div>
        ) : frameStyle === 'photo' ? (
          <div className="relative w-full flex-1 flex flex-col p-2">
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="relative w-full flex-1 min-h-[240px] bg-slate-950 overflow-hidden rounded-xs border border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer"
            >
              <img
                src={note.imageUrl}
                alt={note.title || 'Photo'}
                className="w-full h-full object-cover select-none pointer-events-none"
                loading="lazy"
              />
            </div>
            {note.content && (
              <div className="mt-1 px-1 py-0.5 text-center text-xs text-slate-600 dark:text-slate-400 truncate">
                {note.content}
              </div>
            )}
          </div>
        ) : (
          /* Frameless / Standard View */
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="relative w-full flex-1 h-full min-h-[240px] overflow-hidden rounded-sm flex items-center justify-center cursor-pointer"
          >
            <img
              src={note.imageUrl}
              alt={note.title || 'Frameless photo'}
              className="w-full h-full object-cover rounded-sm select-none pointer-events-none"
              loading="lazy"
            />
          </div>
        )}

        {/* Style & Pin Popover */}
        {showStylePicker && (
          <NoteStylePicker
            note={note}
            onUpdateNote={onUpdateNote}
            onClose={() => setShowStylePicker(false)}
          />
        )}

        {/* Bottom Right Resize Handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute -bottom-1.5 -right-1.5 w-5 h-5 z-40 cursor-se-resize flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity"
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-400 dark:border-slate-500 rounded-br-xs" />
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <ImageLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageUrl={note.imageUrl!}
          title={note.title || 'Photo Preview'}
          caption={note.content}
        />
      )}
    </>
  );
};

export const ImageNoteCard = React.memo(ImageNoteCardComponent);
