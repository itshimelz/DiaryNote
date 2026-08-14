import React, { useState } from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { ViewIcon, ViewOffSlashIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Icon } from './Icon';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export type InputSize = 'sm' | 'md';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  prefixIcon?: IconSvgElement;
  suffixIcon?: IconSvgElement;
  rightElement?: React.ReactNode;
  hasError?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  isPasswordToggle?: boolean;
}

const SIZE_STYLES: Record<InputSize, { input: string; iconSize: 'xs' | 'sm' | 'md' }> = {
  sm: { input: 'py-1.5 text-xs h-8', iconSize: 'sm' },
  md: { input: 'py-2 text-xs h-9', iconSize: 'md' },
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'sm',
      prefixIcon,
      suffixIcon,
      rightElement,
      hasError = false,
      clearable = false,
      onClear,
      isPasswordToggle = false,
      type = 'text',
      disabled = false,
      className = '',
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const effectiveType = isPasswordToggle ? (showPassword ? 'text' : 'password') : type;
    const { input: sizeClass, iconSize } = SIZE_STYLES[size];

    return (
      <div className={`relative flex items-center w-full ${disabled ? 'opacity-50' : ''}`}>
        {prefixIcon && (
          <div className="absolute left-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon icon={prefixIcon} size={iconSize} />
          </div>
        )}

        <input
          ref={ref}
          type={effectiveType}
          disabled={disabled}
          value={value}
          className={`w-full ${sizeClass} ${RADIUS.sm} ${TRANSITIONS.fast} ${FOCUS_RING} border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
            prefixIcon ? 'pl-8' : 'pl-3'
          } ${
            suffixIcon || clearable || isPasswordToggle || rightElement ? 'pr-9' : 'pr-3'
          } ${
            hasError
              ? 'border-rose-500 focus-visible:ring-rose-500'
              : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
          } ${className}`}
          {...props}
        />

        {/* Action icons (Password toggle, clear button, rightElement, or suffix icon) */}
        <div className="absolute right-2 flex items-center gap-1">
          {rightElement}

          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              tabIndex={-1}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-sm transition-colors cursor-pointer"
            >
              <Icon icon={Cancel01Icon} size="xs" />
            </button>
          )}

          {isPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-sm transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size="sm" />
            </button>
          )}

          {suffixIcon && !isPasswordToggle && (
            <div className="pointer-events-none text-slate-400 dark:text-slate-500">
              <Icon icon={suffixIcon} size={iconSize} />
            </div>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
