import React from 'react';
import { PinStyle } from '../../types';
import {
  getWashiTapeById,
  getPushpinById,
  isWashiTape,
  isPushpin,
  WASHI_TAPES,
} from '../../constants/washiTapes';

interface NoteDecorationsProps {
  pinStyle?: PinStyle;
  allowedTypes?: 'all' | 'tape-only';
}

const CLASSIC_COLOR_MAP: Record<string, { bg: string; border: string; highlight: string }> = {
  'tape-teal': {
    bg: 'bg-teal-400/65 dark:bg-teal-500/60',
    border: 'border-teal-500/40',
    highlight: 'border-t-teal-200/50',
  },
  'tape-pink': {
    bg: 'bg-pink-400/65 dark:bg-pink-500/60',
    border: 'border-pink-500/40',
    highlight: 'border-t-pink-200/50',
  },
  'tape-beige': {
    bg: 'bg-[#d6c4a8]/80 dark:bg-[#b09e82]/75',
    border: 'border-[#b8a486]/50',
    highlight: 'border-t-[#f3ebe0]/60',
  },
  'tape-yellow': {
    bg: 'bg-amber-300/70 dark:bg-amber-400/65',
    border: 'border-amber-400/40',
    highlight: 'border-t-amber-100/60',
  },
};

export const NoteDecorations: React.FC<NoteDecorationsProps> = ({
  pinStyle = 'none',
  allowedTypes = 'all',
}) => {
  if (!pinStyle || pinStyle === 'none') {
    return null;
  }

  // If text note only allows tape, ignore pushpins
  if (allowedTypes === 'tape-only' && !isWashiTape(pinStyle)) {
    return null;
  }

  // 3D Realistic Pushpins
  if (isPushpin(pinStyle)) {
    const pin = getPushpinById(pinStyle) || getPushpinById('pushpin-red')!;

    return (
      <div
        className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
        title="Pinned"
      >
        <svg
          width="28"
          height="32"
          viewBox="0 0 28 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xs"
        >
          {/* Cast shadow under pin */}
          <ellipse cx="14" cy="28" rx="7" ry="2.5" fill="rgba(0,0,0,0.3)" />

          {/* Metal needle tip */}
          <path d="M13.2 16L14 28L14.8 16Z" fill="#94a3b8" />
          <path d="M14 16L14 28" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />

          {/* Pin base collar */}
          <ellipse cx="14" cy="16" rx="4.5" ry="1.8" fill={pin.dark} />

          {/* Pin body cylinder */}
          <path
            d="M10 9C10 7.5 12 6.5 14 6.5C16 6.5 18 7.5 18 9L17.5 15C17.5 15.8 16 16.5 14 16.5C12 16.5 10.5 15.8 10.5 15L10 9Z"
            fill={pin.main}
          />

          {/* Spherical top head */}
          <circle cx="14" cy="7.5" r="5.5" fill={pin.main} />
          {/* Specular highlight */}
          <ellipse cx="12" cy="5.5" rx="2" ry="1.2" fill={pin.light} opacity="0.85" />
          <circle cx="15.5" cy="8.5" r="0.75" fill={pin.light} opacity="0.5" />
        </svg>
      </div>
    );
  }

  // Washi Tape Strips
  if (isWashiTape(pinStyle)) {
    const tape = getWashiTapeById(pinStyle) || WASHI_TAPES[0];

    // Classic translucent tape rendering
    if (tape.isClassic || (!tape.src && CLASSIC_COLOR_MAP[tape.id])) {
      const classicConfig = CLASSIC_COLOR_MAP[tape.id] || CLASSIC_COLOR_MAP['tape-beige'];
      return (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
          title="Taped"
        >
          <div
            className={`relative h-6 w-28 -rotate-1 shadow-sm backdrop-blur-[1px] border-b ${classicConfig.bg} ${classicConfig.border} ${classicConfig.highlight}`}
            style={{
              clipPath:
                'polygon(0% 12%, 3% 0%, 97% 2%, 100% 14%, 98% 88%, 95% 100%, 3% 97%, 0% 86%)',
            }}
          >
            {/* Subtle texture lines inside tape */}
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.15)_3px,rgba(0,0,0,0.15)_4px)]" />
          </div>
        </div>
      );
    }

    // Vector SVG tape rendering
    if (tape.src) {
      return (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none flex items-center justify-center"
          title="Taped"
        >
          <img
            src={tape.src}
            alt={tape.label}
            draggable={false}
            className="w-28 h-auto -rotate-1 drop-shadow-xs select-none pointer-events-none"
          />
        </div>
      );
    }
  }

  return null;
};
