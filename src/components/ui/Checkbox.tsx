import React from 'react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Icon } from './Icon';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  size?: 'sm' | 'md';
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  size = 'sm',
  disabled = false,
  error,
  className = '',
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const boxSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const iconSize = size === 'sm' ? 'xs' : 'sm';

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-2 select-none cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`}
      >
        <div className="relative inline-flex items-center justify-center">
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            className={`${boxSize} ${RADIUS.xs} border ${TRANSITIONS.fast} ${FOCUS_RING} flex items-center justify-center ${
              checked
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
          >
            {checked && <Icon icon={Tick02Icon} size={iconSize} />}
          </div>
        </div>

        {label && (
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{label}</span>
        )}
      </label>

      {error && <span className="text-[11px] font-medium text-rose-500">{error}</span>}
    </div>
  );
};
