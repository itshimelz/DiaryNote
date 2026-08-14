import React from 'react';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, disabled = false, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full p-2.5 text-xs ${RADIUS.sm} ${TRANSITIONS.fast} ${FOCUS_RING} border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
          hasError
            ? 'border-rose-500 focus-visible:ring-rose-500'
            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
