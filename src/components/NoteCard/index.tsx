import React, { useState, useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { NoteCardProps, NoteMode, FONT_CLASSES, PAPER_THEMES } from './types';
import { NoteHeader } from './NoteHeader';
import { NoteToolbar } from './NoteToolbar';
import { NoteChecklist } from './NoteChecklist';
import { NoteImageView } from './NoteImageView';
import { NoteMarkdownView } from './NoteMarkdownView';
import { NoteStylePicker } from './NoteStylePicker';
import { MentionAutocomplete } from '../MentionAutocomplete';
import { getUniqueTitleForDay } from '../../lib/markdownMention';
import { normalizeNoteText, resizeNoteEditor, applyMarkdownFormatting, FormattingType } from '../../lib/noteTextEngine';
import { Note } from '../../types';

const NoteCardComponent: React.FC<NoteCardProps> = ({
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
  isPanMode = false,
  shouldStartEditing = false,
  onRequestLockNote,
  onRequestUnlockNote,
  onExportNote,
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
  const handledEditRequestRef = useRef<string | null>(null);

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

  // Exit edit mode if the card is deselected
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // Auto-focus textarea when entering edit mode with reliable layout paint fallback
  useEffect(() => {
    if (isEditing) {
      const focusTextarea = () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      };
      focusTextarea();
      const timer = setTimeout(focusTextarea, 40);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  // Keep edit mode as tall as the rendered note, rather than creating a nested scrollbar.
  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const resizeToContent = () => {
      resizeNoteEditor(textarea);
    };
    resizeToContent();
    const frame = requestAnimationFrame(resizeToContent);
    return () => cancelAnimationFrame(frame);
  }, [isEditing, note.content, note.fontSize, note.fontFamily]);

  useEffect(() => {
    if (!shouldStartEditing) {
      handledEditRequestRef.current = null;
      return;
    }
    if (handledEditRequestRef.current !== note.id && activeMode === 'text') {
      handledEditRequestRef.current = note.id;
      setIsEditing(true);
    }
  }, [shouldStartEditing, activeMode, note.id]);

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

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanMode || (e.target as HTMLElement).closest('button, input, textarea, a, select, .no-drag')) {
      return;
    }
    onBringToFront(note.id);

    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
    if (!isSelected) {
      onSelectNote(note.id, isMulti);
    }

    const currentPosRef = { current: { x: note.x, y: note.y } };
    const currentBatchRef = { current: [] as Note[] };

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

    let frame: number | null = null;
    let pendingSingle: Note | null = null;
    let pendingBatch: Note[] | null = null;
    const flushMove = () => {
      if (pendingBatch && onUpdateBatchNotes) onUpdateBatchNotes(pendingBatch);
      else if (pendingSingle) onUpdateNote(pendingSingle);
      pendingSingle = null;
      pendingBatch = null;
      frame = null;
    };
    const scheduleMove = () => {
      if (frame === null) frame = requestAnimationFrame(flushMove);
    };
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
        currentBatchRef.current = updatedBatch;
        pendingBatch = updatedBatch;
        scheduleMove();
      } else {
        let newX = dragStartRef.current.noteX + dx;
        let newY = dragStartRef.current.noteY + dy;
        if (snapToGrid) {
          newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
          newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        }
        currentPosRef.current = { x: newX, y: newY };
        pendingSingle = {
          ...note,
          x: newX,
          y: newY,
          updatedAt: new Date().toISOString(),
        };
        scheduleMove();
      }
    };

    const handleMouseUp = () => {
      const GRID_SIZE = 20;
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      if (hasMoved) {
        if (groupDragStartRef.current.length > 1 && onUpdateBatchNotes && currentBatchRef.current.length > 0) {
          const snappedBatch = currentBatchRef.current.map((n) => ({
            ...n,
            x: Math.round(n.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(n.y / GRID_SIZE) * GRID_SIZE,
            updatedAt: new Date().toISOString(),
          }));
          onUpdateBatchNotes(snappedBatch);
        } else {
          const snappedX = Math.round(currentPosRef.current.x / GRID_SIZE) * GRID_SIZE;
          const snappedY = Math.round(currentPosRef.current.y / GRID_SIZE) * GRID_SIZE;
          onUpdateNote({
            ...note,
            x: snappedX,
            y: snappedY,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      pendingSingle = null;
      pendingBatch = null;
      currentBatchRef.current = [];
      frame = null;
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
    if (isPanMode) return;
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: note.width || 340,
      h: note.height || 360,
    };

    let frame: number | null = null;
    let pendingSize: Pick<Note, 'width' | 'height'> | null = null;
    const flushResize = () => {
      if (pendingSize) {
        onUpdateNote({ ...note, ...pendingSize, updatedAt: new Date().toISOString() });
        pendingSize = null;
      }
      frame = null;
    };
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - resizeStartRef.current.x) / zoom;
      const dy = (moveEvent.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(260, resizeStartRef.current.w + dx);
      const newH = Math.max(220, resizeStartRef.current.h + dy);

      pendingSize = { width: newW, height: newH };
      if (frame === null) frame = requestAnimationFrame(flushResize);
    };

    const handleMouseUp = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        flushResize();
      }
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
        if (isPanMode || (e.target as HTMLElement).closest('.group\\/header, button, input')) return;
        setActiveMode('text');
        setIsEditing(true);
      }}
      onKeyDown={(e) => {
        // Keyboard shortcuts on the card must never override normal text entry.
        if ((e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return;
        if (e.key === 'Enter' && isSelected && activeMode === 'text') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      role="article"
      tabIndex={0}
      aria-label={`Note: ${note.title || 'Untitled Note'}`}
      style={{
        transform: `translate3d(${Math.round(note.x)}px, ${Math.round(note.y)}px, 0)`,
        width: `${note.width || 340}px`,
        minHeight: `${note.height || 340}px`,
        zIndex: isDragging ? 10000 : note.zIndex || 10,
      }}
      className={`note-card absolute top-0 left-0 rounded-2xl border flex flex-col justify-between ${
        isDragging
          ? 'transition-none scale-[1.02] cursor-grabbing ring-2 ring-blue-500/70 shadow-md'
          : 'transition-all duration-200 ease-out scale-100 shadow-sm'
      } ${themeConfig.headerBg} ${themeConfig.border} ${themeConfig.text} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
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
        onDeselectNote={() => onSelectNote(null)}
      />

      {/* 2. Main Body Content Area - Ruled lines background applied ONLY here */}
      <div
        onDoubleClick={(e) => {
          if (isPanMode || (e.target as HTMLElement).closest('button, input, textarea, a, .no-drag')) return;
          setActiveMode('text');
          setIsEditing(true);
        }}
        className={`flex-1 p-4 flex flex-col overflow-hidden min-h-[180px] ${themeConfig.bg}`}
      >
        {note.isLocked ? (
          /* Locked Note Protection Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${
              themeConfig.isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              <Lock className="w-6 h-6" />
            </div>
            <h3 className={`font-bold text-sm tracking-tight mb-1 ${themeConfig.text}`}>
              Protected Note
            </h3>
            <p className={`text-xs mb-4 max-w-[200px] ${themeConfig.subtext}`}>
              This note is locked with passcode protection.
            </p>
            <button
              onClick={() => onRequestUnlockNote?.(note.id)}
              className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm ${
                themeConfig.isDark
                  ? 'bg-white text-slate-900 hover:bg-slate-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              Unlock Note
            </button>
          </div>
        ) : activeMode === 'checklist' ? (
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
          <div className="relative w-full flex-none flex flex-col">
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={(e) => {
                const val = normalizeNoteText(e.target.value);
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
              onInput={(e) => resizeNoteEditor(e.currentTarget)}
              onKeyDown={(e) => {
                // Keep typing keys inside the editor; card-level shortcuts must not receive them.
                e.stopPropagation();

                const key = e.key.toLowerCase();
                const isMod = e.ctrlKey || e.metaKey;

                // Rich text formatting shortcuts inside note editor
                let formatType: FormattingType | null = null;
                if (isMod && key === 'b') {
                  formatType = 'bold';
                } else if (isMod && key === 'i') {
                  formatType = 'italic';
                } else if (isMod && (key === 'x' && e.shiftKey)) {
                  formatType = 'strikethrough';
                } else if (isMod && (key === 'e' || key === '`')) {
                  formatType = 'code';
                } else if (isMod && key === 'k' && !mentionQuery) {
                  formatType = 'link';
                }

                if (formatType && textareaRef.current) {
                  e.preventDefault();
                  const { newContent, newSelectionStart, newSelectionEnd } = applyMarkdownFormatting(
                    textareaRef.current,
                    formatType
                  );
                  onUpdateNote({
                    ...note,
                    content: newContent,
                    updatedAt: new Date().toISOString(),
                  });
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                      textareaRef.current.setSelectionRange(newSelectionStart, newSelectionEnd);
                    }
                  }, 10);
                  return;
                }

                if (e.key === 'Escape') {
                  e.preventDefault();
                  setMentionQuery(null);
                  onUpdateNote({
                    ...note,
                    content: note.content,
                    updatedAt: new Date().toISOString(),
                  });
                  setIsEditing(false);
                  onSelectNote(null);
                  (e.target as HTMLElement).blur();
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
              aria-label={`Edit ${note.title || 'Untitled Note'}`}
              wrap="soft"
              className={`w-full min-h-[180px] whitespace-pre-wrap bg-transparent resize-none overflow-y-hidden outline-none border-0 shadow-none ${
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
                themeMode={themeConfig.isDark ? 'dark' : 'light'}
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
        onToggleLockNote={() => {
          if (note.isLocked) {
            onRequestUnlockNote?.(note.id);
          } else {
            onRequestLockNote?.(note.id);
          }
        }}
        onExportNote={(format) => onExportNote?.(note, format)}
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

export const NoteCard = React.memo(NoteCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.shouldStartEditing === nextProps.shouldStartEditing &&
    prevProps.snapToGrid === nextProps.snapToGrid &&
    prevProps.isPanMode === nextProps.isPanMode &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.x === nextProps.note.x &&
    prevProps.note.y === nextProps.note.y &&
    prevProps.note.width === nextProps.note.width &&
    prevProps.note.height === nextProps.note.height &&
    prevProps.note.zIndex === nextProps.note.zIndex &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.note.paperTheme === nextProps.note.paperTheme &&
    prevProps.note.fontFamily === nextProps.note.fontFamily &&
    prevProps.note.fontSize === nextProps.note.fontSize &&
    prevProps.note.activeMode === nextProps.note.activeMode &&
    prevProps.note.isPinned === nextProps.note.isPinned &&
    prevProps.selectedNoteIds?.length === nextProps.selectedNoteIds?.length
  );
});
