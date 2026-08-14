import React, { useState } from 'react';
import { Kbd } from './Kbd';
import { RADIUS } from './tokens';

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  className?: string;
}

const POSITION_STYLES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  position = 'top',
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-[9999] pointer-events-none whitespace-nowrap px-2 py-1 text-[11px] font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ${
            RADIUS.xs
          } shadow-sm animate-in fade-in duration-100 flex items-center gap-1.5 ${
            POSITION_STYLES[position]
          } ${className}`}
        >
          <span>{content}</span>
          {shortcut && <Kbd className="text-[9px] py-0 px-1">{shortcut}</Kbd>}
        </div>
      )}
    </div>
  );
};
