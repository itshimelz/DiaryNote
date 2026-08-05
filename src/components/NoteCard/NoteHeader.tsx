import React, { useState, useEffect } from 'react';
import { Share2, X, Pin, Check } from 'lucide-react';
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
  headerDragProps = {},
  themeConfig,
}) => {
  const [title, setTitle] = useState(note.title || 'Untitled Note');
  const [isEditingTitleLocal, setIsEditingTitleLocal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

  const actionBtnClass = isDarkCard
    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80';

  const isEditingTitleActive = isEditingTitle || isEditingTitleLocal;

  return (
    <div
      {...headerDragProps}
      className={`flex flex-col gap-0.5 px-4 pt-3.5 pb-2 border-b ${divider} select-none cursor-move group/header rounded-t-2xl ${headerBg}`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditingTitleActive ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSaveTitle(title)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  handleSaveTitle(title);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              autoFocus
              className={`w-full bg-slate-50/80 focus:bg-white ${textColor} font-bold text-base sm:text-lg px-2 py-0.5 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all`}
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
              className={`${textColor} font-bold text-base sm:text-lg tracking-tight truncate leading-tight cursor-text hover:text-blue-600 transition-colors`}
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
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1 rounded-full transition-colors ${
              note.isPinned
                ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                : actionBtnClass
            }`}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Share Icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className={`p-1 rounded-full transition-colors relative ${actionBtnClass}`}
            title={isCopied ? 'Copied to clipboard!' : 'Share note'}
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Close/Delete Icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote();
            }}
            className={`p-1 rounded-full hover:text-rose-600 ${
              isDarkCard ? 'hover:bg-rose-950/40 text-slate-400' : 'hover:bg-rose-50 text-slate-500'
            } transition-colors`}
            title="Delete note"
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
