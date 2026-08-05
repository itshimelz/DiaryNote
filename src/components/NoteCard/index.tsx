import React, { useState, useRef, useEffect } from 'react';
import { NoteCardProps, NoteMode, FONT_CLASSES, PAPER_THEMES } from './types';
import { NoteHeader } from './NoteHeader';
import { NoteToolbar } from './NoteToolbar';
import { NoteChecklist } from './NoteChecklist';
import { NoteScribbleCanvas } from './NoteScribbleCanvas';
import { NoteImageView } from './NoteImageView';
import { NoteMarkdownView } from './NoteMarkdownView';
import { NoteStylePicker } from './NoteStylePicker';
import { MentionAutocomplete } from '../MentionAutocomplete';
import { getUniqueTitleForDay } from '../../lib/markdownMention';
import { Note } from '../../types';

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  allNotes,
  zoom,
  isSelected,
  selectedNoteIds = [],
  isFocused,
  onSelectNote,
  onNavigateToNote,
  onUpdateNote,
  onUpdateBatchNotes,
  onDeleteNote,
  onBringToFront,
  snapToGrid = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeMode, setActiveMode] = useState<NoteMode>(note.activeMode || 'text');

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);

  const dragStartRef = useRef<{ x: number; y: number; noteX: number; noteY: number }>({ x: 0, y: 0, noteX: 0, noteY: 0 });
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const groupDragStartRef = useRef<{ id: string; startX: number; startY: number }[]>([]);

  const filteredMentionNotes =
    mentionQuery !== null
      ? (allNotes || []).filter(
          (n) => n && n.id !== note.id && (n.title || '').toLowerCase().includes((mentionQuery || '').toLowerCase())
        )
      : [];

  useEffect(() => {
    setMentionSelectedIndex(0);
  }, [mentionQuery]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleSelectMention = (targetNote: Note) => {
    if (!textareaRef.current) return;
    const val = note.content || '';
    const cursorIndex = textareaRef.current.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorIndex);
    const textAfterCursor = val.slice(cursorIndex);
    const newBefore = textBeforeCursor.replace(/(?:^|\s)@([a-zA-Z0-9\s\_-]*)$/, (m) => {
      const leadingSpace = m.startsWith(' ') || m.startsWith('\n') ? m[0] : '';
      return `${leadingSpace}@[${targetNote.title || 'Untitled Note'}](${targetNote.id}) `;
    });
    onUpdateNote({
      ...note,
      content: newBefore + textAfterCursor,
      updatedAt: new Date().toISOString(),
    });
    setMentionQuery(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = newBefore.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  // Native wheel event listener to prevent canvas zoom/pan when scrolling note content
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const handleNativeWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };
    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleNativeWheel);
  }, []);

  // Sync mode changes to note object
  const handleSelectMode = (mode: NoteMode) => {
    setActiveMode(mode);
    onUpdateNote({
      ...note,
      activeMode: mode,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add emoji to note content
  const handleAddEmoji = (emoji: string) => {
    onUpdateNote({
      ...note,
      content: `${note.content || ''}${emoji}`,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add image URL to note
  const handleAddImage = (url: string) => {
    onUpdateNote({
      ...note,
      imageUrl: url,
      activeMode: 'image',
      updatedAt: new Date().toISOString(),
    });
    setActiveMode('image');
  };

  // Update drawing canvas strokes
  const handleUpdateDrawing = (drawingDataUrl: string) => {
    onUpdateNote({
      ...note,
      drawingData: drawingDataUrl,
      updatedAt: new Date().toISOString(),
    });
  };

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a, .no-drag')) {
      return;
    }
    onBringToFront(note.id);

    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
    if (!isSelected) {
      onSelectNote(note.id, isMulti);
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      noteX: note.x,
      noteY: note.y,
    };

    if (selectedNoteIds.length > 1 && selectedNoteIds.includes(note.id)) {
      groupDragStartRef.current = selectedNoteIds.map((id) => {
        const targetNote = allNotes.find((n) => n.id === id);
        return {
          id,
          startX: targetNote ? targetNote.x : 0,
          startY: targetNote ? targetNote.y : 0,
        };
      });
    }

    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const distanceX = Math.abs(moveEvent.clientX - dragStartRef.current.x);
      const distanceY = Math.abs(moveEvent.clientY - dragStartRef.current.y);

      if (!hasMoved && distanceX < 4 && distanceY < 4) {
        return;
      }

      if (!hasMoved) {
        hasMoved = true;
        setIsDragging(true);
      }

      const dx = (moveEvent.clientX - dragStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - dragStartRef.current.y) / zoom;

      const GRID_SIZE = 20;
      if (groupDragStartRef.current.length > 1 && onUpdateBatchNotes) {
        const updatedBatch = allNotes
          .filter((n) => selectedNoteIds.includes(n.id))
          .map((n) => {
            const startPos = groupDragStartRef.current.find((item) => item.id === n.id);
            if (!startPos) return n;
            let rawX = startPos.startX + dx;
            let rawY = startPos.startY + dy;
            if (snapToGrid) {
              rawX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
              rawY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
            }
            return { ...n, x: rawX, y: rawY, updatedAt: new Date().toISOString() };
          });
        onUpdateBatchNotes(updatedBatch);
      } else {
        let newX = dragStartRef.current.noteX + dx;
        let newY = dragStartRef.current.noteY + dy;
        if (snapToGrid) {
          newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
          newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        }
        onUpdateNote({
          ...note,
          x: newX,
          y: newY,
          updatedAt: new Date().toISOString(),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      groupDragStartRef.current = [];
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resize logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: note.width || 340,
      h: note.height || 360,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - resizeStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(260, resizeStartRef.current.w + dx);
      const newH = Math.max(220, resizeStartRef.current.h + dy);

      onUpdateNote({
        ...note,
        width: newW,
        height: newH,
        updatedAt: new Date().toISOString(),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const themeConfig = PAPER_THEMES[note.paperTheme || 'white'];
  const fontClass = FONT_CLASSES[note.fontFamily || 'sans'];
  const isRuled = note.paperTheme === 'ruled' || note.paperTheme === 'ruled-dark';

  const fontSizeClass =
    note.fontSize === 'sm'
      ? 'text-base sm:text-lg'
      : note.fontSize === 'lg'
      ? 'text-xl sm:text-2xl'
      : note.fontSize === 'xl'
      ? 'text-2xl sm:text-3xl'
      : 'text-lg sm:text-xl';

  return (
    <div
      id={`note-card-${note.id}`}
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.group\\/header, button, input')) return;
        setActiveMode('text');
        setIsEditing(true);
      }}
      style={{
        transform: `translate3d(${note.x}px, ${note.y}px, 0)`,
        width: `${note.width || 340}px`,
        minHeight: `${note.height || 340}px`,
        zIndex: note.zIndex || 10,
      }}
      className={`absolute top-0 left-0 rounded-2xl border flex flex-col justify-between transition-shadow duration-150 ${
        themeConfig.headerBg
      } ${themeConfig.border} ${themeConfig.text} ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-2xl'
          : 'hover:shadow-xl shadow-md'
      } ${isDragging ? 'opacity-90 cursor-grabbing' : ''}`}
    >
      {/* 1. Header */}
      <NoteHeader
        note={note}
        allNotes={allNotes}
        themeConfig={themeConfig}
        isEditingTitle={false}
        onUpdateTitle={(newTitle) => {
          const uniqueTitle = getUniqueTitleForDay(newTitle, note.id, allNotes);
          onUpdateNote({
            ...note,
            title: uniqueTitle,
            updatedAt: new Date().toISOString(),
          });
        }}
        onTogglePin={() =>
          onUpdateNote({
            ...note,
            isPinned: !note.isPinned,
            updatedAt: new Date().toISOString(),
          })
        }
        onDeleteNote={() => onDeleteNote(note.id)}
      />

      {/* 2. Main Body Content Area - Ruled lines background applied ONLY here */}
      <div className={`flex-1 p-4 flex flex-col overflow-hidden min-h-[180px] ${themeConfig.bg}`}>
        {activeMode === 'checklist' ? (
          <NoteChecklist
            content={note.content}
            onChangeContent={(newContent) =>
              onUpdateNote({
                ...note,
                content: newContent,
                updatedAt: new Date().toISOString(),
              })
            }
            fontClass={fontClass}
            fontSizeClass={fontSizeClass}
          />
        ) : activeMode === 'draw' ? (
          <NoteScribbleCanvas
            drawingData={note.drawingData}
            onUpdateDrawing={handleUpdateDrawing}
          />
        ) : activeMode === 'image' ? (
          <NoteImageView
            imageUrl={note.imageUrl}
            textSnippet={note.content}
            onRemoveImage={() =>
              onUpdateNote({
                ...note,
                imageUrl: undefined,
                activeMode: 'text',
                updatedAt: new Date().toISOString(),
              })
            }
            fontClass={fontClass}
          />
        ) : isEditing ? (
          /* Text Editing Mode */
          <div className="relative w-full flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateNote({
                  ...note,
                  content: val,
                  updatedAt: new Date().toISOString(),
                });

                // Detect @ mention
                const cursorIndex = e.target.selectionStart;
                const textBeforeCursor = val.slice(0, cursorIndex);
                const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9\s\_-]*)$/);
                if (match) {
                  setMentionQuery(match[1]);
                  setMentionPos({ top: 30, left: 10 });
                } else {
                  setMentionQuery(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  if (mentionQuery !== null) {
                    setMentionQuery(null);
                  } else {
                    setIsEditing(false);
                  }
                  return;
                }

                if (mentionQuery !== null && filteredMentionNotes.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionSelectedIndex((prev) => (prev + 1) % filteredMentionNotes.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionSelectedIndex(
                      (prev) => (prev - 1 + filteredMentionNotes.length) % filteredMentionNotes.length
                    );
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const target = filteredMentionNotes[mentionSelectedIndex] || filteredMentionNotes[0];
                    if (target) {
                      handleSelectMention(target);
                    }
                    return;
                  }
                }
              }}
              onBlur={() => {
                setTimeout(() => setIsEditing(false), 200);
              }}
              placeholder="Write your note here... Use @ to reference another note."
              className={`w-full flex-1 bg-transparent resize-none outline-none border-0 shadow-none ${
                isRuled ? 'ruled-text-alignment' : 'leading-relaxed'
              } ${fontClass} ${fontSizeClass} ${
                themeConfig.text
              }`}
            />

            {/* Mention Autocomplete Popup */}
            {mentionQuery !== null && (
              <MentionAutocomplete
                query={mentionQuery}
                notes={allNotes}
                currentNoteId={note.id}
                selectedIndex={mentionSelectedIndex}
                onSelect={(targetNote) => handleSelectMention(targetNote)}
                onClose={() => setMentionQuery(null)}
                position={mentionPos}
              />
            )}
          </div>
        ) : (
          /* Text / Markdown Preview Mode */
          <NoteMarkdownView
            note={note}
            allNotes={allNotes}
            fontClass={fontClass}
            fontSizeClass={fontSizeClass}
            onNavigateToNote={onNavigateToNote}
            onDoubleClick={() => {
              setActiveMode('text');
              setIsEditing(true);
            }}
            markdownRef={markdownRef}
          />
        )}
      </div>

      {/* 3. Style Picker Popover */}
      {showStylePicker && (
        <NoteStylePicker
          note={note}
          onUpdateNote={onUpdateNote}
          onClose={() => setShowStylePicker(false)}
        />
      )}

      {/* 4. Docked Bottom Toolbar */}
      <NoteToolbar
        note={note}
        activeMode={activeMode}
        themeConfig={themeConfig}
        onSelectMode={handleSelectMode}
        onToggleStylePicker={() => setShowStylePicker(!showStylePicker)}
        onDuplicateNote={() => {
          const dupId = `note-${Date.now()}`;
          const rawTitle = note.title ? `${note.title}` : 'Untitled Note';
          const uniqueTitle = getUniqueTitleForDay(rawTitle, dupId, allNotes);
          const dupNote: Note = {
            ...note,
            id: dupId,
            x: note.x + 30,
            y: note.y + 30,
            title: uniqueTitle,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onUpdateNote(dupNote);
        }}
        onDeleteNote={() => onDeleteNote(note.id)}
      />

      {/* Resize Handle at Bottom Right */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors z-20"
        title="Resize card"
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M11 11H9V9H11V11ZM11 8H9V6H11V8ZM8 11H6V9H8V11Z" />
        </svg>
      </div>
    </div>
  );
};
