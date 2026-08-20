import React, { useState, useEffect, useRef } from 'react';
import {
  Share01Icon,
  Cancel01Icon,
  PinIcon,
  Tick02Icon,
  FolderMinusIcon,
  SmileIcon,
  Sun01Icon,
  FlashIcon,
  Coffee01Icon,
  CloudRainIcon,
  HappyIcon,
  MoreVerticalIcon,
  Book01Icon,
} from '@hugeicons/core-free-icons';
import { Icon, Menu, MenuItem, MenuDivider } from '../ui';
import { Note, JournalMood } from '../../types';
import { getUniqueTitleForDay, sendNativeAppNotification } from '../../utils';
import { isNoteAuthorized } from '../../services/authPolicyService';
import { DEFAULT_NOTE_WIDTH } from '../../constants/canvas';
import { PaperThemeConfig } from './types';

interface NoteHeaderProps {
  note: Note;
  allNotes?: Note[];
  isEditingTitle: boolean;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateMood?: (mood?: JournalMood) => void;
  onTogglePin: () => void;
  onDeleteNote: () => void;
  onShareNote?: () => void;
  onDeselectNote?: () => void;
  onRemoveFromGroup?: () => void;
  onReCoverNote?: () => void;
  headerDragProps?: Record<string, any>;
  themeConfig?: PaperThemeConfig;
}

export const NoteHeader: React.FC<NoteHeaderProps> = ({
  note,
  allNotes = [],
  isEditingTitle = false,
  onUpdateTitle,
  onUpdateMood,
  onTogglePin,
  onDeleteNote,
  onShareNote,
  onRemoveFromGroup,
  onReCoverNote,
  headerDragProps = {},
  themeConfig,
}) => {
  const [title, setTitle] = useState(note.title || 'Untitled Note');
  const [isEditingTitleLocal, setIsEditingTitleLocal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const isCompact = (note.width || DEFAULT_NOTE_WIDTH) < 285;
  const moodRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const skipBlurSaveRef = useRef(false);

  useEffect(() => {
    setTitle(note.title || 'Untitled Note');
  }, [note.title]);

  // Click outside and Escape handlers for popovers
  useEffect(() => {
    if (!isMoodPickerOpen && !isOverflowMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMoodPickerOpen &&
        moodRef.current &&
        !moodRef.current.contains(e.target as Node)
      ) {
        setIsMoodPickerOpen(false);
      }
      if (
        isOverflowMenuOpen &&
        overflowRef.current &&
        !overflowRef.current.contains(e.target as Node)
      ) {
        setIsOverflowMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoodPickerOpen(false);
        setIsOverflowMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoodPickerOpen, isOverflowMenuOpen]);

  const handleSaveTitle = (rawTitle: string) => {
    const uniqueTitle = getUniqueTitleForDay(rawTitle, note.id, allNotes);
    setTitle(uniqueTitle);
    onUpdateTitle(uniqueTitle);
    setIsEditingTitleLocal(false);
  };

  const formatLastUpdated = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const day = d.getDate().toString().padStart(2, '0');
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      const formattedHours = hours.toString().padStart(2, '0');
      return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
    } catch {
      return isoString;
    }
  };

  const handleShare = () => {
    if (note.isLocked && !isNoteAuthorized(note)) {
      sendNativeAppNotification('Note Protected', 'Unlock this note before copying content.');
      return;
    }
    if (onShareNote) {
      onShareNote();
      return;
    }
    const shareText = `${note.title || 'Untitled Note'}\n\n${note.content || ''}`;
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isDarkCard = themeConfig?.isDark ?? false;
  const headerBg = themeConfig?.headerBg || 'bg-white/80';
  const divider = themeConfig?.divider || 'border-slate-100';
  const textColor = themeConfig?.text || 'text-slate-900';
  const subtextColor = themeConfig?.subtext || 'text-slate-400';
  const actionBtnClass =
    themeConfig?.toolbarBtn || 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/80';

  return (
    <div
      {...headerDragProps}
      className={`relative px-3.5 py-2.5 border-b ${divider} ${headerBg} backdrop-blur-xs select-none rounded-t-sm`}
    >
      <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
        {/* Title Input or Static View */}
        <div className="flex-1 min-w-0 pr-1">
          {isEditingTitle || isEditingTitleLocal ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (skipBlurSaveRef.current) {
                  skipBlurSaveRef.current = false;
                  return;
                }
                handleSaveTitle(title);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  handleSaveTitle(title);
                } else if (e.key === 'Escape') {
                  skipBlurSaveRef.current = true;
                  setTitle(note.title || 'Untitled Note');
                  setIsEditingTitleLocal(false);
                }
              }}
              autoFocus
              className={`w-full bg-transparent font-bold text-lg sm:text-xl tracking-tight outline-none border-b border-blue-500/80 px-0 pt-1 pb-0.5 leading-normal ${textColor}`}
              placeholder="Untitled Note"
            />
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitleLocal(true);
              }}
              className={`font-bold text-lg sm:text-xl tracking-tight truncate cursor-text hover:opacity-80 transition-opacity pt-1 pb-0.5 leading-normal ${textColor}`}
              title={note.title || 'Untitled Note'}
            >
              {note.title || 'Untitled Note'}
            </h3>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {isCompact ? (
            <div className="relative" ref={overflowRef}>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOverflowMenuOpen((prev) => !prev);
                }}
                className={`p-1.5 rounded-sm transition-colors cursor-pointer ${actionBtnClass}`}
                title="More actions"
                aria-label="More actions"
              >
                <Icon icon={MoreVerticalIcon} size="lg" />
              </button>

              {isOverflowMenuOpen && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-9 right-0 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <Menu minWidth="w-44">
                    <MenuItem
                      icon={PinIcon}
                      label={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                      onClick={() => {
                        onTogglePin();
                        setIsOverflowMenuOpen(false);
                      }}
                    />
                    <MenuItem
                      icon={Share01Icon}
                      label={isCopied ? 'Copied!' : 'Share Note'}
                      onClick={() => {
                        handleShare();
                        setIsOverflowMenuOpen(false);
                      }}
                    />
                    {note.isCovered && onReCoverNote && (
                      <MenuItem
                        icon={Book01Icon}
                        label="Close Cover"
                        onClick={() => {
                          onReCoverNote();
                          setIsOverflowMenuOpen(false);
                        }}
                      />
                    )}
                    {note.groupId && onRemoveFromGroup && (
                      <MenuItem
                        icon={FolderMinusIcon}
                        label="Remove Group"
                        onClick={() => {
                          onRemoveFromGroup();
                          setIsOverflowMenuOpen(false);
                        }}
                      />
                    )}
                    <MenuDivider />
                    <MenuItem
                      icon={Cancel01Icon}
                      label="Delete Note"
                      danger
                      onClick={() => {
                        onDeleteNote();
                        setIsOverflowMenuOpen(false);
                      }}
                    />
                  </Menu>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mood Icon Picker */}
              {onUpdateMood && (
                <div className="relative" ref={moodRef}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMoodPickerOpen((prev) => !prev);
                    }}
                    className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                      note.mood === 'happy'
                        ? isDarkCard
                          ? 'text-amber-400 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'text-amber-600 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25'
                        : note.mood === 'calm'
                        ? isDarkCard
                          ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'text-emerald-600 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : note.mood === 'focused'
                        ? isDarkCard
                          ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30'
                          : 'text-indigo-600 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25'
                        : note.mood === 'reflective'
                        ? isDarkCard
                          ? 'text-purple-400 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30'
                          : 'text-purple-600 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25'
                        : note.mood === 'low'
                        ? isDarkCard
                          ? 'text-sky-400 bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30'
                          : 'text-sky-600 bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25'
                        : actionBtnClass
                    }`}
                    title={note.mood ? `Mood: ${note.mood}` : 'Set entry mood'}
                    aria-label="Set mood"
                  >
                    {note.mood === 'happy' && <Icon icon={SmileIcon} size="lg" />}
                    {note.mood === 'calm' && <Icon icon={Sun01Icon} size="lg" />}
                    {note.mood === 'focused' && <Icon icon={FlashIcon} size="lg" />}
                    {note.mood === 'reflective' && <Icon icon={Coffee01Icon} size="lg" />}
                    {note.mood === 'low' && <Icon icon={CloudRainIcon} size="lg" />}
                    {!note.mood && <Icon icon={HappyIcon} size="lg" />}
                  </button>

                  {/* Mood Popover */}
                  {isMoodPickerOpen && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-9 right-0 z-50 flex items-center gap-1 p-1.5 rounded-sm border shadow-sm animate-in fade-in zoom-in-95 duration-100 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateMood('happy');
                          setIsMoodPickerOpen(false);
                        }}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          note.mood === 'happy'
                            ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-amber-500'
                            : ''
                        }`}
                        title="Happy"
                      >
                        <Icon icon={SmileIcon} size="md" className="text-amber-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateMood('calm');
                          setIsMoodPickerOpen(false);
                        }}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          note.mood === 'calm'
                            ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-emerald-500'
                            : ''
                        }`}
                        title="Calm"
                      >
                        <Icon icon={Sun01Icon} size="md" className="text-emerald-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateMood('focused');
                          setIsMoodPickerOpen(false);
                        }}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          note.mood === 'focused'
                            ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-indigo-500'
                            : ''
                        }`}
                        title="Focused"
                      >
                        <Icon icon={FlashIcon} size="md" className="text-indigo-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateMood('reflective');
                          setIsMoodPickerOpen(false);
                        }}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          note.mood === 'reflective'
                            ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-purple-500'
                            : ''
                        }`}
                        title="Reflective"
                      >
                        <Icon icon={Coffee01Icon} size="md" className="text-purple-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateMood('low');
                          setIsMoodPickerOpen(false);
                        }}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          note.mood === 'low'
                            ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-sky-500'
                            : ''
                        }`}
                        title="Low Energy"
                      >
                        <Icon icon={CloudRainIcon} size="md" className="text-sky-500" />
                      </button>
                      {note.mood && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateMood(undefined);
                            setIsMoodPickerOpen(false);
                          }}
                          className="p-1.5 rounded-sm hover:bg-rose-500/20 text-rose-500 text-xs transition-colors ml-0.5 cursor-pointer"
                          title="Clear Mood"
                        >
                          <Icon icon={Cancel01Icon} size="sm" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Close Cover Button (when note has cover enabled) */}
              {note.isCovered && onReCoverNote && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReCoverNote();
                  }}
                  className={`p-1.5 rounded-sm transition-colors cursor-pointer ${actionBtnClass}`}
                  title="Close cover"
                  aria-label="Close cover"
                >
                  <Icon icon={Book01Icon} size="lg" />
                </button>
              )}

              {/* Pin Note Button */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin();
                }}
                className={`p-1.5 rounded-sm transition-colors cursor-pointer ${actionBtnClass}`}
                title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                aria-label={note.isPinned ? 'Unpin note' : 'Pin note to top'}
              >
                <Icon
                  icon={PinIcon}
                  size="lg"
                  className={note.isPinned ? 'text-amber-500 fill-amber-500/20' : ''}
                />
              </button>

              {/* Remove Group Button (if grouped) */}
              {note.groupId && onRemoveFromGroup && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromGroup();
                  }}
                  className="p-1.5 rounded-sm transition-colors text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                  title={`Remove from group "${note.groupName || ''}"`}
                  aria-label="Remove note from group"
                >
                  <Icon icon={FolderMinusIcon} size="lg" />
                </button>
              )}

              {/* Share Note Button */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className={`p-1.5 rounded-sm transition-colors cursor-pointer ${actionBtnClass}`}
                title={isCopied ? 'Copied to clipboard!' : 'Copy note content'}
                aria-label="Share note"
              >
                <Icon
                  icon={isCopied ? Tick02Icon : Share01Icon}
                  size="lg"
                  className={isCopied ? 'text-emerald-500' : ''}
                />
              </button>

              {/* Delete Note Button */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote();
                }}
                className="p-1.5 rounded-sm hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Delete note"
                aria-label="Delete note"
              >
                <Icon icon={Cancel01Icon} size="lg" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Date & Note Info Subheader */}
      <div className="flex items-center gap-1.5 text-sm font-sans mt-0.5">
        <span className={subtextColor}>
          Last Updated: {formatLastUpdated(note.updatedAt || note.createdAt || '')}
        </span>
        {note.groupName && (
          <span className="font-semibold text-blue-500/90 truncate max-w-[140px]">
            · {note.groupName}
          </span>
        )}
      </div>
    </div>
  );
};
