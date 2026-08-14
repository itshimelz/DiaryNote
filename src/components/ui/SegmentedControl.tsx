import React from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { Icon } from './Icon';
import { RADIUS, TRANSITIONS } from './tokens';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: IconSvgElement;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'xs' | 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

const SIZE_STYLES = {
  xs: 'py-0.5 px-2 text-[10px] gap-1',
  sm: 'py-1 px-2.5 text-xs gap-1.5',
  md: 'py-1.5 px-3 text-xs sm:text-sm gap-2',
};

export const SegmentedControl = <T extends string = string>({
  options,
  value,
  onChange,
  size = 'sm',
  fullWidth = true,
  className = '',
}: SegmentedControlProps<T>) => {
  return (
    <div
      role="radiogroup"
      className={`inline-flex items-center p-0.5 ${RADIUS.sm} bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 select-none ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center font-semibold ${
              fullWidth ? 'flex-1' : ''
            } ${RADIUS.sm} ${SIZE_STYLES[size]} ${TRANSITIONS.fast} cursor-pointer ${
              opt.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
            } ${
              isSelected
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {opt.icon && (
              <Icon
                icon={opt.icon}
                size="xs"
                className={isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}
              />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
