import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Lock, FolderPlus } from 'lucide-react';
import { NoteCardProps, NoteMode, FONT_CLASSES, PAPER_THEMES } from './types';
import { NoteHeader } from './NoteHeader';
import { NoteToolbar } from './NoteToolbar';
import { NoteChecklist } from './NoteChecklist';
import { NoteImageView } from './NoteImageView';
import { NoteMarkdownView } from './NoteMarkdownView';
import { NoteStylePicker } from './NoteStylePicker';
import { MentionAutocomplete } from '../MentionAutocomplete';
import { getUniqueTitleForDay } from '../../lib/markdownMention';
import { normalizeNoteText, resizeNoteEditor, applyMarkdownFormatting, handleSmartEnterList, FormattingType } from '../../lib/noteTextEngine';
import { Note } from '../../types';

import { useNoteDrag } from '../../hooks/useNoteDrag';
import { useNoteResize } from '../../hooks/useNoteResize';

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
  isCardDragging = false,
  onDragStateChange,
  onContextMenu,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [activeMode, setActiveMode] = useState<NoteMode>(note.activeMode || 'text');

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);
  const handledEditRequestRef = useRef<string | null>(null);

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
    onUpdateNote,
  });

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

  // Sync mode changes to note object
  const handleSelectMode = (mode: NoteMode) => {
    setActiveMode(mode);
    onUpdateNote({
      ...note,
      activeMode: mode,
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

  // Check if un-grouped note is spatially positioned over an existing Group Frame
  const overlappingGroup = useMemo(() => {
    if (note.groupId || !allNotes || allNotes.length === 0) return null;
    const groupsMap = new Map<string, { id: string; name: string; notes: Note[] }>();
    allNotes.forEach((n) => {
      if (n.groupId && n.id !== note.id) {
        const entry = groupsMap.get(n.groupId) || { id: n.groupId, name: n.groupName || '', notes: [] };
        entry.notes.push(n);
        groupsMap.set(n.groupId, entry);
      }
    });

    const cardW = note.width || 340;
    const cardH = note.height || 340;
    const nMinX = note.x;
    const nMinY = note.y;
    const nMaxX = note.x + cardW;
    const nMaxY = note.y + cardH;

    for (const [groupId, g] of groupsMap.entries()) {
      if (g.notes.length === 0) continue;
      let gMinX = Infinity;
      let gMinY = Infinity;
      let gMaxX = -Infinity;
      let gMaxY = -Infinity;

      g.notes.forEach((m) => {
        const realW = m.width || 340;
        const realH = m.height || 340;

        gMinX = Math.min(gMinX, m.x);
        gMinY = Math.min(gMinY, m.y);
        gMaxX = Math.max(gMaxX, m.x + realW);
        gMaxY = Math.max(gMaxY, m.y + realH);
      });

      if (gMinX === Infinity) continue;
      gMinX -= 24;
      gMinY -= 36;
      gMaxX += 24;
      gMaxY += 24;

      const isOverlapping = nMinX < gMaxX && nMaxX > gMinX && nMinY < gMaxY && nMaxY > gMinY;
      if (isOverlapping) {
        const gName = g.notes[0]?.groupName || `Group (${g.notes.length} notes)`;
        return { id: groupId, name: gName };
      }
    }
    return null;
  }, [allNotes, note.x, note.y, note.width, note.height, note.groupId, note.id]);

  return (
    <div
      id={`note-card-${note.id}`}
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, note.id);
      }}
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
      data-note-id={note.id}
      role="article"
      tabIndex={0}
      aria-label={`Note: ${note.title || 'Untitled Note'}`}
      style={{
        transform: `translate3d(${Math.round(note.x)}px, ${Math.round(note.y)}px, 0)`,
        width: `${note.width || 340}px`,
        minHeight: `${note.height || 340}px`,
        zIndex: isDragging || isCardDragging ? 10000 : note.zIndex || 10,
      }}
      className={`note-card absolute top-0 left-0 rounded-md flex flex-col justify-between shadow-sm ${
        isPanMode
          ? 'cursor-grab active:cursor-grabbing pointer-events-none'
          : isDragging || isCardDragging
          ? 'transition-none scale-100 cursor-grabbing z-[10000]'
          : `transition-[box-shadow,opacity] duration-150 ease-out scale-100 ${
              !isEditing ? 'cursor-grab' : ''
            }`
      } ${themeConfig.headerBg} ${themeConfig.text} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Smart Quick-Action Pill: Add to Overlapping Group */}
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
            className={`flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-sm border shadow-sm backdrop-blur-md transition-all active:scale-95 ${
              themeConfig.isDark
                ? 'bg-slate-900/95 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white/95 border-slate-200/90 text-slate-800 hover:bg-slate-100'
            }`}
            title={`Add note to ${overlappingGroup.name}`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Add to "{overlappingGroup.name}"</span>
          </button>
        </div>
      )}

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
          })
        }
        onDeleteNote={() => onDeleteNote(note.id)}
        onDeselectNote={() => onSelectNote(null)}
        onRemoveFromGroup={() => {
          onSelectNote(null);
          onUpdateNote({
            ...note,
            groupId: undefined,
            groupName: undefined,
            tags: note.tags?.filter((t) => !/^#?Group\s/i.test(t)),
          });
        }}
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
            <div className={`w-12 h-12 rounded-md flex items-center justify-center mb-3 ${
              themeConfig.isDark
                ? 'bg-slate-800/80 text-slate-200'
                : 'bg-slate-100 text-slate-700'
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
              className={`px-4 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] transition-all ${
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
            allNotes={allNotes}
            onNavigateToNote={onNavigateToNote}
            onChangeContent={(newContent) =>
              onUpdateNote({
                ...note,
                content: newContent,
                updatedAt: new Date().toISOString(),
              })
            }
            fontClass={fontClass}
            fontSizeClass={fontSizeClass}
            paperTheme={note.paperTheme}
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
            paperTheme={note.paperTheme}
          />
        ) : isEditing ? (
          <div
            className={`relative w-full flex-none flex flex-col ${
              isPanMode ? 'cursor-grab pointer-events-none' : 'cursor-text note-editor-container'
            }`}
            onMouseDown={(e) => {
              if (!isPanMode) {
                e.stopPropagation();
              }
            }}
            onClick={(e) => {
              if (!isPanMode && textareaRef.current && e.target !== textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
          >
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
                  const lineCount = textBeforeCursor.split('\n').length;
                  const lineH = isRuled ? 32 : 24;
                  const topPos = Math.min(lineCount * lineH + 6, 190);
                  setMentionPos({ top: topPos, left: 10 });
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

                // Handle smart enter for numbered lists, checklists, and bullet points
                if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null && textareaRef.current) {
                  const result = handleSmartEnterList(textareaRef.current);
                  if (result && result.handled) {
                    e.preventDefault();
                    onUpdateNote({
                      ...note,
                      content: result.newContent,
                      updatedAt: new Date().toISOString(),
                    });
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(result.newCursorPos, result.newCursorPos);
                        resizeNoteEditor(textareaRef.current);
                      }
                    }, 10);
                    return;
                  }
                }

                // Handle Tab / Shift+Tab list and code indentation
                if (e.key === 'Tab' && mentionQuery === null && textareaRef.current) {
                  e.preventDefault();
                  const start = textareaRef.current.selectionStart;
                  const end = textareaRef.current.selectionEnd;
                  const val = textareaRef.current.value;

                  if (e.shiftKey) {
                    const textBefore = val.slice(0, start);
                    const lastNewline = textBefore.lastIndexOf('\n');
                    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
                    const lineText = val.slice(lineStart);
                    if (lineText.startsWith('  ')) {
                      const newVal = val.slice(0, lineStart) + lineText.slice(2);
                      onUpdateNote({ ...note, content: newVal, updatedAt: new Date().toISOString() });
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(
                            Math.max(lineStart, start - 2),
                            Math.max(lineStart, end - 2)
                          );
                        }
                      }, 10);
                    }
                  } else {
                    const newVal = val.slice(0, start) + '  ' + val.slice(end);
                    onUpdateNote({ ...note, content: newVal, updatedAt: new Date().toISOString() });
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.setSelectionRange(start + 2, start + 2);
                      }
                    }, 10);
                  }
                  return;
                }

                if (e.key === 'Escape') {
                  e.preventDefault();
                  setMentionQuery(null);
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
                paperTheme={note.paperTheme}
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
        className={`absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center ${themeConfig.subtext} opacity-60 hover:opacity-100 transition-opacity z-20`}
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
  if (prevProps.allNotes !== nextProps.allNotes) return false;

  // Check whether THIS card's selection state changed (not array reference)
  const prevInSelection = prevProps.selectedNoteIds.includes(prevProps.note.id);
  const nextInSelection = nextProps.selectedNoteIds.includes(nextProps.note.id);
  if (prevInSelection !== nextInSelection) return false;

  return (
    prevProps.isCardDragging === nextProps.isCardDragging &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.shouldStartEditing === nextProps.shouldStartEditing &&
    prevProps.snapToGrid === nextProps.snapToGrid &&
    prevProps.isPanMode === nextProps.isPanMode &&
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
    prevProps.note.groupId === nextProps.note.groupId &&
    prevProps.note.groupName === nextProps.note.groupName &&
    prevProps.note.isLocked === nextProps.note.isLocked
  );
});
