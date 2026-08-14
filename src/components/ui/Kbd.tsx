import React from 'react';
import { RADIUS } from './tokens';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = '', ...props }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center font-mono ${RADIUS.xs} px-1.5 py-0.5 text-[10px] font-medium leading-none select-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/80 shadow-2xs ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
};
