import React from 'react';
import { CoverStyle } from '../../types';
import airmailBorderTile from '../../assets/note-covers/covers/airmail-border-tile@2x.png';

interface NoteCoverDecorationsProps {
  coverStyle?: CoverStyle;
  accentColor?: string;
  className?: string;
}

const NoteCoverDecorationsComponent: React.FC<NoteCoverDecorationsProps> = ({
  coverStyle,
  className = '',
}) => {
  if (coverStyle === 'vintage-airmail') {
    return (
      <div className={`pointer-events-none absolute inset-0 rounded-sm overflow-hidden z-0 p-[7px] ${className}`}>
        {/* Airmail Border: pre-rendered seamless 2x bitmap tile (682B). Live SVG patterns
            re-rasterize through cairo on every covered-card mount; a decoded bitmap blits. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${airmailBorderTile})`,
            backgroundSize: '51px 51px',
          }}
        />
        {/* Inner Aerogramme Paper Background */}
        <div className="relative w-full h-full rounded-xs bg-[#f7f3e8]" />
      </div>
    );
  }

  return null;
};

export const NoteCoverDecorations = React.memo(NoteCoverDecorationsComponent);
