import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Lock, FolderPlus } from 'lucide-react';
import { NoteCardProps, NoteMode, FONT_CLASSES, PAPER_THEMES } from './types';
import { NoteHeader } from './NoteHeader';
import { NoteToolbar } from './NoteToolbar';
import { NoteChecklist } from './NoteChecklist';
import { NoteMarkdownView } from './NoteMarkdownView';
import { NoteStylePicker } from './NoteStylePicker';
import { MentionAutocomplete } from '../MentionAutocomplete';
import { SlashCommandMenu, SlashCommand, SLASH_COMMANDS } from './SlashCommandMenu';
import { getUniqueTitleForDay, normalizeNoteText, resizeNoteEditor, applyMarkdownFormatting, handleSmartEnterList, sendNativeAppNotification, FormattingType, getTextareaCursorCoordinates } from '../../utils';
import { loadSettings } from '../../lib/storage';
import { generateAutoTagsWithAI } from '../../services/ai/aiMergeService';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, DRAG_Z_INDEX } from '../../constants/canvas';
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

  // Slash command autocomplete state
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

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
    snapToGrid,
    onUpdateNote,
    cardRef,
  });

  const filteredMentionNotes =
    mentionQuery !== null
      ? (allNotes || []).filter(
          (n) => n && n.id !== note.id && (n.title || '').toLowerCase().includes((mentionQuery || '').toLowerCase())
        )
      : [];

  const filteredSlashCommands = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase().trim();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [slashQuery]);

  useEffect(() => {
    setMentionSelectedIndex(0);
  }, [mentionQuery]);

  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [slashQuery]);

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

  const handleSelectSlashCommand = async (command: SlashCommand) => {
    if (!textareaRef.current) return;
    const val = note.content || '';
    const cursorIndex = textareaRef.current.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorIndex);
    const textAfterCursor = val.slice(cursorIndex);

    const newBefore = textBeforeCursor.replace(/(?:^|\n|\s)\/([a-zA-Z0-9_-]*)$/, (m) => {
      const leadingPrefix = m.startsWith('\n') ? '\n' : m.startsWith(' ') ? ' ' : '';
      return leadingPrefix;
    });

    setSlashQuery(null);

    // ponytail: AI Auto Tag action (max 3 tags, zero content alteration, appended at end as markdown)
    if (command.id === 'autotag') {
      const cleanedBaseContent = (newBefore + textAfterCursor).trimEnd();
      const settings = loadSettings();

      if (!settings.enableAIServices || !settings.encryptedApiKey || !settings.apiKeyIv) {
        sendNativeAppNotification(
          'AI Key Required',
          'Please enable AI Services and configure your API key in AI Settings to use /auto-tag.'
        );
        return;
      }

      sendNativeAppNotification('Generating Tags', 'Analyzing note content with AI...');

      try {
        const generatedTags = await generateAutoTagsWithAI(
          note.title,
          cleanedBaseContent,
          {
            aiProvider: settings.aiProvider || 'gemini',
            encryptedApiKey: settings.encryptedApiKey,
            apiKeyIv: settings.apiKeyIv,
            customBaseUrl: settings.customBaseUrl,
            customModelName: settings.customModelName,
          }
        );

        const validTags = (generatedTags || [])
          .map((t) => (t.startsWith('#') ? t : `#${t}`))
          .slice(0, 3);

        if (validTags.length === 0) {
          sendNativeAppNotification('Auto Tag', 'No relevant tags generated.');
          return;
        }

        const tagsMarkdown = validTags.join(' ');
        const finalContent = `${cleanedBaseContent}\n\n**Tags:** ${tagsMarkdown}`;

        const cleanTagNames = validTags.map((t) => t.replace(/^#/, ''));
        const updatedTags = Array.from(new Set([...(note.tags || []), ...cleanTagNames]));

        onUpdateNote({
          ...note,
          content: finalContent,
          tags: updatedTags,
          updatedAt: new Date().toISOString(),
        });

        sendNativeAppNotification('Auto Tag Complete', `Appended tags: ${tagsMarkdown}`);
      } catch (err: any) {
        console.error('Failed to generate auto-tags:', err);
        sendNativeAppNotification(
          'Auto Tag Failed',
          err?.message || 'Failed to generate AI tags. Check API key settings.'
        );
      }
      return;
    }

    let insertedText = typeof command.action === 'function' ? command.action(val) : command.action;

    const newContent = newBefore + insertedText + textAfterCursor;
    onUpdateNote({
      ...note,
      content: newContent,
      updatedAt: new Date().toISOString(),
    });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = (newBefore + insertedText).length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        resizeNoteEditor(textareaRef.current);
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

    const cardW = note.width || DEFAULT_NOTE_WIDTH;
    const cardH = note.height || DEFAULT_NOTE_HEIGHT;
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
        const realW = m.width || DEFAULT_NOTE_WIDTH;
        const realH = m.height || DEFAULT_NOTE_HEIGHT;

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

  const ruledLineHeight = useMemo(() => {
    if (!isRuled) return undefined;
    if (fontSizeClass?.includes('text-xs')) return '22px';
    if (fontSizeClass?.includes('text-sm')) return '24px';
    if (fontSizeClass?.includes('text-lg')) return '32px';
    if (fontSizeClass?.includes('text-xl')) return '36px';
    return '28px';
  }, [isRuled, fontSizeClass]);

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
        width: `${note.width || DEFAULT_NOTE_WIDTH}px`,
        minHeight: `${note.height || DEFAULT_NOTE_HEIGHT}px`,
        zIndex: isDragging || isCardDragging || isResizing ? DRAG_Z_INDEX : note.zIndex || 10,
        ...(isRuled && ruledLineHeight ? ({ '--ruled-line-height': ruledLineHeight } as React.CSSProperties) : {}),
      }}
      className={`note-card absolute top-0 left-0 rounded-sm flex flex-col justify-between shadow-sm overflow-hidden ${
        isPanMode
          ? 'cursor-grab active:cursor-grabbing pointer-events-none'
          : isDragging || isCardDragging || isResizing
          ? 'transition-none scale-100 cursor-grabbing'
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
            className={`flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-sm border shadow-sm backdrop-blur-md transition-colors ${
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
        onUpdateMood={(mood) =>
          onUpdateNote({
            ...note,
            mood,
            updatedAt: new Date().toISOString(),
          })
        }
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
        className={`flex-1 p-3.5 flex flex-col ${themeConfig.bg}`}
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
              className={`px-4 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] transition-colors ${
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
                  const pos = getTextareaCursorCoordinates(e.target, cursorIndex);
                  setMentionPos(pos);
                  setSlashQuery(null);
                } else {
                  setMentionQuery(null);

                  // Detect / slash command
                  const slashMatch = textBeforeCursor.match(/(?:^|\n|\s)\/([a-zA-Z0-9]*)$/);
                  if (slashMatch) {
                    setSlashQuery(slashMatch[1]);
                    const pos = getTextareaCursorCoordinates(e.target, cursorIndex);
                    setSlashPos(pos);
                  } else {
                    setSlashQuery(null);
                  }
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
                  setSlashQuery(null);
                  setIsEditing(false);
                  onSelectNote(null);
                  (e.target as HTMLElement).blur();
                  return;
                }

                if (slashQuery !== null && filteredSlashCommands.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSlashSelectedIndex((prev) => (prev + 1) % filteredSlashCommands.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSlashSelectedIndex(
                      (prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length
                    );
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const target = filteredSlashCommands[slashSelectedIndex] || filteredSlashCommands[0];
                    if (target) {
                      handleSelectSlashCommand(target);
                    }
                    return;
                  }
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
              placeholder="Write your note here... Use @ for notes, / for formatting blocks."
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

            {/* Slash Command Autocomplete Popup */}
            {slashQuery !== null && (
              <SlashCommandMenu
                query={slashQuery}
                selectedIndex={slashSelectedIndex}
                onSelect={(command) => handleSelectSlashCommand(command)}
                onClose={() => setSlashQuery(null)}
                position={slashPos}
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
          const dupId = `note-${crypto.randomUUID()}`;
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
        className={`absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 ${themeConfig.subtext} opacity-50 hover:opacity-100 transition-opacity z-20 select-none group/resize`}
        title="Resize note"
      >
        <svg className="w-2.5 h-2.5 transition-transform group-hover/resize:scale-110" viewBox="0 0 10 10" fill="currentColor">
          <path d="M9 9H7V7H9V9ZM9 5H7V3H9V5ZM5 9H3V7H5V9Z" />
        </svg>
      </div>
    </div>
  );
};

export const NoteCard = React.memo(NoteCardComponent, (prevProps, nextProps) => {
  // Check whether THIS card's selection state changed (not array reference)
  const prevInSelection = prevProps.selectedNoteIds.includes(prevProps.note.id);
  const nextInSelection = nextProps.selectedNoteIds.includes(nextProps.note.id);
  if (prevInSelection !== nextInSelection) return false;

  // CRITICAL FIX: If this note IS selected and selectedNoteIds array updated (notes added/removed from selection),
  // this card MUST re-render so its selectedNoteIds prop inside useNoteDrag has the full fresh selection list!
  if (nextInSelection && prevProps.selectedNoteIds !== nextProps.selectedNoteIds) {
    if (
      prevProps.selectedNoteIds.length !== nextProps.selectedNoteIds.length ||
      !prevProps.selectedNoteIds.every((id, idx) => id === nextProps.selectedNoteIds[idx])
    ) {
      return false;
    }
  }

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
