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
        {/* Hardware-Accelerated SVG Pattern Airmail Border */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none -z-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="vintage-airmail-border-stripes"
              width="36"
              height="36"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect x="0" y="0" width="12" height="36" fill="#c83226" />
              <rect x="12" y="0" width="6" height="36" fill="#fdfbf7" />
              <rect x="18" y="0" width="12" height="36" fill="#1d4ed8" />
              <rect x="30" y="0" width="6" height="36" fill="#fdfbf7" />
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
