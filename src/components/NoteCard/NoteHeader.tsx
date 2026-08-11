import React, { useState, useEffect, useRef } from 'react';
import { Share2, X, Pin, Check, FolderMinus, Layers, Smile, Sun, Zap, Coffee, CloudRain, SmilePlus } from 'lucide-react';
import { Note, JournalMood } from '../../types';
import { getUniqueTitleForDay } from '../../utils';
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
  onDeselectNote,
  onRemoveFromGroup,
  headerDragProps = {},
  themeConfig,
}) => {
  const [title, setTitle] = useState(note.title || 'Untitled Note');
  const [isEditingTitleLocal, setIsEditingTitleLocal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const skipBlurSaveRef = useRef(false);

  useEffect(() => {
    setTitle(note.title || 'Untitled Note');
  }, [note.title]);

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
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
  const textColor = themeConfig?.text || 'text-slate-900';
  const subtextColor = themeConfig?.subtext || 'text-slate-400';
  const headerBg = themeConfig?.headerBg || 'bg-white';
  const divider = themeConfig?.divider || 'border-slate-100';

  const inputBg = themeConfig?.inputBg || 'bg-slate-50 focus:bg-white text-slate-900';
  const inputBorder = themeConfig?.inputBorder || 'border-slate-200 focus:border-blue-400';
  const actionBtnClass = themeConfig?.toolbarBtn || (isDarkCard
    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80');

  const isEditingTitleActive = isEditingTitle || isEditingTitleLocal;

  return (
    <div
      {...headerDragProps}
      className={`flex flex-col gap-0.5 px-4 pt-3.5 pb-2 border-b ${divider} select-none cursor-grab active:cursor-grabbing group/header rounded-t-md ${headerBg}`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditingTitleActive ? (
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
                if (e.key === 'Enter') {
                  handleSaveTitle(title);
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  skipBlurSaveRef.current = true;
                  setTitle(note.title || 'Untitled Note');
                  setIsEditingTitleLocal(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              autoFocus
              className={`w-full ${inputBg} font-bold text-lg sm:text-xl px-2.5 py-1 rounded-lg border ${inputBorder} focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
            />
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitleLocal(true);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitleLocal(true);
              }}
              className={`${textColor} font-bold text-lg sm:text-xl tracking-tight truncate leading-snug cursor-text opacity-90 hover:opacity-100 transition-opacity`}
              title={note.title || 'Untitled Note'}
            >
              {note.title || 'Untitled Note'}
            </h3>
          )}
        </div>

        {/* Top Right Action Icons */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Mood Icon Picker */}
          {onUpdateMood && (
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMoodPickerOpen((prev) => !prev);
                }}
                className={`p-1.5 rounded-full transition-all ${
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
                {note.mood === 'happy' && <Smile className="w-5 h-5" />}
                {note.mood === 'calm' && <Sun className="w-5 h-5" />}
                {note.mood === 'focused' && <Zap className="w-5 h-5" />}
                {note.mood === 'reflective' && <Coffee className="w-5 h-5" />}
                {note.mood === 'low' && <CloudRain className="w-5 h-5" />}
                {!note.mood && <SmilePlus className="w-5 h-5" />}
              </button>

              {/* Mood Popover */}
              {isMoodPickerOpen && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute top-9 right-0 z-50 flex items-center gap-1 p-1.5 rounded-md border shadow-sm ${
                    isDarkCard
                      ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
                      : 'bg-white/95 border-slate-200/90 text-slate-800'
                  }`}
                >
                  <button
                    onClick={() => {
                      onUpdateMood('happy');
                      setIsMoodPickerOpen(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDarkCard ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    } ${note.mood === 'happy' ? (isDarkCard ? 'bg-slate-800 ring-1 ring-amber-500' : 'bg-slate-100 ring-1 ring-amber-500') : ''}`}
                    title="Happy"
                  >
                    <Smile className="w-5 h-5 text-amber-500" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdateMood('calm');
                      setIsMoodPickerOpen(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDarkCard ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    } ${note.mood === 'calm' ? (isDarkCard ? 'bg-slate-800 ring-1 ring-emerald-500' : 'bg-slate-100 ring-1 ring-emerald-500') : ''}`}
                    title="Calm"
                  >
                    <Sun className="w-5 h-5 text-emerald-500" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdateMood('focused');
                      setIsMoodPickerOpen(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDarkCard ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    } ${note.mood === 'focused' ? (isDarkCard ? 'bg-slate-800 ring-1 ring-indigo-500' : 'bg-slate-100 ring-1 ring-indigo-500') : ''}`}
                    title="Focused"
                  >
                    <Zap className="w-5 h-5 text-indigo-500" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdateMood('reflective');
                      setIsMoodPickerOpen(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDarkCard ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    } ${note.mood === 'reflective' ? (isDarkCard ? 'bg-slate-800 ring-1 ring-purple-500' : 'bg-slate-100 ring-1 ring-purple-500') : ''}`}
                    title="Reflective"
                  >
                    <Coffee className="w-5 h-5 text-purple-500" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdateMood('low');
                      setIsMoodPickerOpen(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDarkCard ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    } ${note.mood === 'low' ? (isDarkCard ? 'bg-slate-800 ring-1 ring-sky-500' : 'bg-slate-100 ring-1 ring-sky-500') : ''}`}
                    title="Low Energy"
                  >
                    <CloudRain className="w-5 h-5 text-sky-500" />
                  </button>
                  {note.mood && (
                    <button
                      onClick={() => {
                        onUpdateMood(undefined);
                        setIsMoodPickerOpen(false);
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500 text-xs transition-colors ml-0.5"
                      title="Clear Mood"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pin Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1.5 rounded-full transition-colors ${
              note.isPinned
                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                : actionBtnClass
            }`}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className={`w-5 h-5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Remove from Group Icon */}
          {note.groupId && onRemoveFromGroup && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromGroup();
              }}
              className={`p-1.5 rounded-full transition-colors text-blue-500 hover:bg-rose-500/10 hover:text-rose-500`}
              title="Remove note from group"
              aria-label="Remove note from group"
            >
              <FolderMinus className="w-5 h-5" />
            </button>
          )}

          {/* Share Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className={`p-1.5 rounded-full transition-colors relative ${actionBtnClass}`}
            title={isCopied ? 'Copied to clipboard!' : 'Share note'}
            aria-label={isCopied ? 'Copied to clipboard' : 'Copy note to clipboard'}
          >
            {isCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-5 h-5" />}
          </button>

          {/* Close/Delete Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote();
            }}
            className={`p-1.5 rounded-full hover:text-rose-600 ${
              isDarkCard ? 'hover:bg-rose-950/40 text-slate-400' : 'hover:bg-rose-50 text-slate-500'
            } transition-colors`}
            title="Delete note"
            aria-label="Delete note"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Subtitle: Last Updated Date in Grayish Tone */}
      <div className={`text-xs sm:text-sm font-medium ${subtextColor} tracking-tight flex items-center gap-1 mt-0.5`}>
        <span>Last Updated: {formatLastUpdated(note.updatedAt || note.createdAt)}</span>
      </div>

    </div>
  );
};
