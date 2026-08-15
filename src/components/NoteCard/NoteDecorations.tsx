import React from 'react';
import { PinStyle } from '../../types';

interface NoteDecorationsProps {
  pinStyle?: PinStyle;
}

export const NoteDecorations: React.FC<NoteDecorationsProps> = ({ pinStyle = 'none' }) => {
  if (!pinStyle || pinStyle === 'none') {
    return null;
  }

  // 3D Realistic Pushpins
  if (pinStyle.startsWith('pushpin-')) {
    const colorMap: Record<string, { main: string; light: string; dark: string }> = {
      'pushpin-red': {
        main: '#dc2626',
        light: '#fca5a5',
        dark: '#991b1b',
      },
      'pushpin-blue': {
        main: '#2563eb',
        light: '#93c5fd',
        dark: '#1e40af',
      },
      'pushpin-yellow': {
        main: '#eab308',
        light: '#fef08a',
        dark: '#a16207',
      },
      'pushpin-green': {
        main: '#059669',
        light: '#6ee7b7',
        dark: '#065f46',
      },
    };

    const config = colorMap[pinStyle] || colorMap['pushpin-red'];

    return (
      <div
        className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none transition-transform hover:scale-105"
        title="Pinned"
      >
        <svg
          width="28"
          height="32"
          viewBox="0 0 28 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          {/* Cast shadow under pin */}
          <ellipse cx="14" cy="28" rx="7" ry="2.5" fill="rgba(0,0,0,0.3)" />

          {/* Metal needle tip */}
          <path d="M13.2 16L14 28L14.8 16Z" fill="#94a3b8" />
          <path d="M14 16L14 28" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />

          {/* Pin base collar */}
          <ellipse cx="14" cy="16" rx="4.5" ry="1.8" fill={config.dark} />

          {/* Pin body cylinder */}
          <path
            d="M10 9C10 7.5 12 6.5 14 6.5C16 6.5 18 7.5 18 9L17.5 15C17.5 15.8 16 16.5 14 16.5C12 16.5 10.5 15.8 10.5 15L10 9Z"
            fill={config.main}
          />

          {/* Spherical top head */}
          <circle cx="14" cy="7.5" r="5.5" fill={config.main} />
          {/* Specular highlight */}
          <ellipse cx="12" cy="5.5" rx="2" ry="1.2" fill={config.light} opacity="0.85" />
          <circle cx="15.5" cy="8.5" r="0.75" fill={config.light} opacity="0.5" />
        </svg>
      </div>
    );
  }

  // Washi Tape Strips
  if (pinStyle.startsWith('tape-')) {
    const tapeColorMap: Record<string, { bg: string; border: string; highlight: string }> = {
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

    const tapeConfig = tapeColorMap[pinStyle] || tapeColorMap['tape-beige'];

    return (
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
        title="Taped"
      >
        <div
          className={`relative h-6 w-28 -rotate-1 shadow-sm backdrop-blur-[1px] border-b ${tapeConfig.bg} ${tapeConfig.border} ${tapeConfig.highlight}`}
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

  return null;
};
