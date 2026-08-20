import React, { useRef } from 'react';
import { PinIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '../ui';
import { Note } from '../../types';
import { getCoverStyleById, getSealStyleById } from '../../constants/noteCovers';
import { FONT_CLASSES } from './types';

import { NoteCoverDecorations } from './NoteCoverDecorations';

interface NoteCoverProps {
  note: Note;
  onReveal: () => void;
  className?: string;
  isDragging?: boolean;
}

const NoteCoverComponent: React.FC<NoteCoverProps> = ({
  note,
  onReveal,
  className = '',
  isDragging = false,
}) => {
  const coverConfig = getCoverStyleById(note.coverStyle);
  const sealConfig = getSealStyleById(note.sealStyle);
  const fontClass = FONT_CLASSES[note.fontFamily] || FONT_CLASSES.sans;
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const cardWidth = note.width || 320;
  const cardHeight = note.height || 360;

  // Monotonic geometric mean: sqrt(w * h) guarantees bigger card = bigger seal, smaller card = smaller seal
  const baseDim = Math.sqrt(cardWidth * cardHeight);

  // Dynamic seal size: smoothly scales from 56px on compact cards up to 220px on huge cards
  const sealSize = Math.max(56, Math.min(220, Math.round(baseDim * 0.24)));

  // Dynamic title font size based on base dimensions
  const titleSizeClass =
    baseDim >= 600
      ? 'text-3xl sm:text-4xl'
      : baseDim >= 440
      ? 'text-2xl sm:text-3xl'
      : baseDim >= 340
      ? 'text-xl sm:text-2xl'
      : 'text-lg sm:text-xl';

  // Dynamic center spacing and padding based on base dimensions
  const centerGapClass = baseDim >= 480 ? 'gap-6' : 'gap-4';
  const coverPaddingClass = baseDim >= 480 ? 'p-6' : 'p-5';

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
      style={{
        contain: 'strict',
        transform: 'translateZ(0)',
      }}
      className={`absolute inset-0 z-25 flex flex-col justify-between ${coverPaddingClass} rounded-sm select-none cursor-pointer overflow-hidden ${coverConfig.cardClass} ${coverConfig.borderClass} ${className}`}
      title="Click to open note"
    >
      {/* Cover-Specific Artistic Overlays & Stamp Decorations */}
      <NoteCoverDecorations coverStyle={coverConfig.id} accentColor={coverConfig.accentColor} />

      {/* Top Header Row on Cover: Optional Date or Entry Date */}
      <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-mono tracking-wider font-semibold opacity-85">
        <span className="uppercase">
          {note.entryDate || (note.createdAt ? note.createdAt.split('T')[0] : 'NOTE')}
        </span>
        {note.isPinned && (
          <Icon icon={PinIcon} size="sm" className="opacity-90" />
        )}
      </div>

      {/* Center Section: Dynamic Seal SVG + Title */}
      <div className={`relative z-10 my-auto flex flex-col items-center justify-center text-center px-3 py-2 ${centerGapClass}`}>
        {/* Seal SVG Artwork - Proportional dimension scaling */}
        <div className="transform transition-transform duration-200 hover:scale-105 flex items-center justify-center">
          {sealConfig.renderIcon({
            size: sealSize,
            color: coverConfig.accentColor || 'currentColor',
          })}
        </div>

        {/* Note Title - Proportional dimension scaling */}
        <div className="w-full max-w-[94%]">
          <h2
            className={`${titleSizeClass} font-bold tracking-tight line-clamp-3 leading-snug break-words ${fontClass} ${coverConfig.titleClass}`}
          >
            {note.title?.trim() || 'Untitled Note'}
          </h2>
        </div>
      </div>

      {/* Bottom Footer Row on Cover: Interactive Tap/Click Prompt */}
      <div className="relative z-10 flex items-center justify-center pt-2 text-xs sm:text-sm font-semibold tracking-wide">
        <span className={`flex items-center gap-2 ${coverConfig.promptClass}`}>
          <span>{note.coverPrompt || 'Click to open'}</span>
          <Icon icon={ArrowRight01Icon} size="sm" />
        </span>
      </div>
    </div>
  );
};

function areNoteCoverPropsEqual(prev: NoteCoverProps, next: NoteCoverProps) {
  if (prev.isDragging !== next.isDragging) return false;
  if (prev.className !== next.className) return false;

  const p = prev.note;
  const n = next.note;
  return (
    p.id === n.id &&
    p.title === n.title &&
    p.width === n.width &&
    p.height === n.height &&
    p.isCovered === n.isCovered &&
    p.coverStyle === n.coverStyle &&
    p.sealStyle === n.sealStyle &&
    p.coverPrompt === n.coverPrompt &&
    p.fontFamily === n.fontFamily &&
    p.isPinned === n.isPinned &&
    p.entryDate === n.entryDate &&
    p.createdAt === n.createdAt
  );
}

export const NoteCover = React.memo(NoteCoverComponent, areNoteCoverPropsEqual);
