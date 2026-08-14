import React from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Icon } from './Icon';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: IconSvgElement;
  options?: SelectOption[];
  fullWidth?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  icon,
  options,
  children,
  fullWidth = true,
  disabled = false,
  className = '',
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  return (
    <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-2.5 pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon icon={icon} size="xs" />
          </div>
        )}

        <select
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none bg-slate-50 dark:bg-slate-850 border ${
            error
              ? 'border-rose-500 text-rose-600 focus:ring-rose-500'
              : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
          } ${RADIUS.sm} ${icon ? 'pl-8' : 'pl-3'} pr-8 py-2 text-xs sm:text-sm font-medium ${TRANSITIONS.fast} ${FOCUS_RING} cursor-pointer outline-none ${
            disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-2.5 pointer-events-none text-slate-400 dark:text-slate-500">
          <Icon icon={ArrowDown01Icon} size="xs" />
        </div>
      </div>

      {error && <span className="text-[11px] font-medium text-rose-500">{error}</span>}
      {!error && helperText && (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</span>
      )}
    </div>
  );
};
