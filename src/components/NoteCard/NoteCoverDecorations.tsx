import React from 'react';
import { CoverStyle } from '../../types';

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
        {/* Inner Aerogramme Paper Background */}
        <div className="w-full h-full rounded-xs bg-[#f7f3e8] relative" />
        {/* Airmail Border: diagonal stripes baked into an axis-aligned tile (no patternTransform).
            Rotated pattern spaces force per-pixel inverse-transform mapping on every repaint;
            pre-rotated geometry tiles like a plain bitmap. Perpendicular stripe widths match
            the previous rotate(45) design (~12/6/12/6). */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none -z-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="vintage-airmail-border-stripes" width="51" height="51" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="51" height="51" fill="#fdfbf7" />
              {/* Red band: c = x + y in [0,17] and wrapped [51,68] */}
              <path d="M0 0 H17 L0 17 Z" fill="#c83226" />
              <path d="M51 0 V17 L17 51 H0 Z" fill="#c83226" />
              {/* Blue band: c = x + y in [25.5,42.5] and wrapped [76.5,93.5] */}
              <path d="M25.5 0 H42.5 L0 42.5 V25.5 Z" fill="#1d4ed8" />
              <path d="M25.5 51 H42.5 L51 42.5 V25.5 Z" fill="#1d4ed8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#vintage-airmail-border-stripes)" />
        </svg>
      </div>
    );
  }

  return null;
};

export const NoteCoverDecorations = React.memo(NoteCoverDecorationsComponent);
