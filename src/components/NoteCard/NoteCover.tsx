import React, { useRef } from 'react';
import { PinIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '../ui';
import { Note } from '../../types';
import { getCoverStyleById, getSealStyleById } from '../../constants/noteCovers';
import { FONT_CLASSES } from './types';

interface NoteCoverProps {
  note: Note;
  onReveal: () => void;
  className?: string;
  isDragging?: boolean;
}

export const NoteCover: React.FC<NoteCoverProps> = ({
  note,
  onReveal,
  className = '',
  isDragging = false,
}) => {
  const coverConfig = getCoverStyleById(note.coverStyle);
  const sealConfig = getSealStyleById(note.sealStyle);
  const fontClass = FONT_CLASSES[note.fontFamily] || FONT_CLASSES.sans;
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button === 0) {
          pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onClick={(e) => {
        // Suppress reveal if Alt key is pressed or if note was dragged
        if (e.altKey || isDragging) {
          return;
        }
        if (pointerDownPosRef.current) {
          const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
          const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
          pointerDownPosRef.current = null;
          if (dx > 5 || dy > 5) {
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        onReveal();
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onReveal();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onReveal();
        }
      }}
      className={`absolute inset-0 z-25 flex flex-col justify-between p-5 rounded-sm select-none cursor-pointer transition-all duration-200 ${coverConfig.cardClass} ${coverConfig.borderClass} ${className}`}
      title="Click to open note"
    >
      {/* Top Header Row on Cover: Optional Date, Mood, or Minimalist Emblem */}
      <div className="flex items-center justify-between text-[10px] opacity-70">
        <span className="font-mono tracking-wider uppercase">
          {note.entryDate || (note.createdAt ? note.createdAt.split('T')[0] : 'NOTE')}
        </span>
        {note.isPinned && (
          <Icon icon={PinIcon} size="xs" className="opacity-80" />
        )}
      </div>

      {/* Center Section: Seal SVG + Title */}
      <div className="my-auto flex flex-col items-center justify-center text-center px-3 py-2 gap-3.5">
        {/* Seal SVG Artwork - Hover effect only on the wax */}
        <div className="transform transition-transform duration-200 hover:scale-105">
          {sealConfig.renderIcon({
            size: 52,
            color: coverConfig.accentColor || 'currentColor',
          })}
        </div>

        {/* Note Title - Static typography without hover mutation */}
        <div className="space-y-1 w-full max-w-[90%]">
          <h2
            className={`text-lg font-bold tracking-tight line-clamp-3 leading-snug break-words ${fontClass} ${coverConfig.titleClass}`}
          >
            {note.title?.trim() || 'Untitled Note'}
          </h2>
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1 pt-1 opacity-70">
              {note.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-1.5 py-0.2 rounded-xs bg-black/10 dark:bg-white/10"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Row on Cover: Interactive Tap/Click Prompt */}
      <div className="flex items-center justify-center pt-2 text-[11px] font-medium">
        <span className={`flex items-center gap-1.5 ${coverConfig.promptClass}`}>
          <span>{note.coverPrompt || 'Click to open'}</span>
          <Icon icon={ArrowRight01Icon} size="xs" />
        </span>
      </div>
    </div>
  );
};
