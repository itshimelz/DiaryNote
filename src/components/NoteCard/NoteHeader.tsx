import React, { useState, useEffect, useRef } from 'react';
import { Share2, X, Pin, Check, FolderMinus, Layers } from 'lucide-react';
import { Note } from '../../types';
import { getUniqueTitleForDay } from '../../lib/markdownMention';
import { PaperThemeConfig } from './types';

interface NoteHeaderProps {
  note: Note;
  allNotes?: Note[];
  isEditingTitle: boolean;
  onUpdateTitle: (newTitle: string) => void;
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
      className={`flex flex-col gap-0.5 px-4 pt-3.5 pb-2 border-b ${divider} select-none cursor-move group/header rounded-t-md ${headerBg}`}
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
              className={`w-full ${inputBg} font-bold text-base sm:text-lg px-2 py-0.5 rounded-lg border ${inputBorder} focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
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
              className={`${textColor} font-bold text-base sm:text-lg tracking-tight truncate leading-tight cursor-text opacity-90 hover:opacity-100 transition-opacity`}
              title={note.title || 'Untitled Note'}
            >
              {note.title || 'Untitled Note'}
            </h3>
          )}
        </div>

        {/* Top Right Action Icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pin Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1 rounded-full transition-colors ${
              note.isPinned
                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                : actionBtnClass
            }`}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-amber-500' : ''}`} />
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
              className={`p-1 rounded-full transition-colors text-blue-500 hover:bg-rose-500/10 hover:text-rose-500`}
              title="Remove note from group"
              aria-label="Remove note from group"
            >
              <FolderMinus className="w-4 h-4" />
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
            className={`p-1 rounded-full transition-colors relative ${actionBtnClass}`}
            title={isCopied ? 'Copied to clipboard!' : 'Share note'}
            aria-label={isCopied ? 'Copied to clipboard' : 'Copy note to clipboard'}
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Close/Delete Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote();
            }}
            className={`p-1 rounded-full hover:text-rose-600 ${
              isDarkCard ? 'hover:bg-rose-950/40 text-slate-400' : 'hover:bg-rose-50 text-slate-500'
            } transition-colors`}
            title="Delete note"
            aria-label="Delete note"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtitle: Last Updated Date in Grayish Tone */}
      <div className={`text-[11px] font-medium ${subtextColor} tracking-tight flex items-center gap-1`}>
        <span>Last Updated: {formatLastUpdated(note.updatedAt || note.createdAt)}</span>
      </div>
    </div>
  );
};
