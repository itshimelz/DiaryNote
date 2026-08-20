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
      <div className={`pointer-events-none ${className}`}>
        {/* Repeating Airmail Barber-Pole Border */}
        <div
          className="absolute inset-0 rounded-sm z-0 overflow-hidden pointer-events-none"
          style={{
            padding: '7px',
            background:
              'repeating-linear-gradient(135deg, #c83226 0px, #c83226 12px, #fdfbf7 12px, #fdfbf7 18px, #1d4ed8 18px, #1d4ed8 30px, #fdfbf7 30px, #fdfbf7 36px)',
            transform: 'translateZ(0)',
          }}
        >
          <div className="w-full h-full rounded-xs bg-[#f7f3e8]" />
        </div>

      </div>
    );
  }

  return null;
};

export const NoteCoverDecorations = React.memo(NoteCoverDecorationsComponent);
