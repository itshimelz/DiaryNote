import React, { forwardRef } from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';
import { Icon } from './Icon';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconSvgElement;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold shadow-xs',
  secondary:
    'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 font-medium',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 font-semibold shadow-xs',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 font-medium',
  outline:
    'border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 font-medium',
};

const SIZE_STYLES: Record<ButtonSize, { container: string; iconSize: 'xs' | 'sm' | 'md' }> = {
  xs: { container: 'px-2 py-1 text-[11px] gap-1', iconSize: 'xs' },
  sm: { container: 'px-3 py-1.5 text-xs gap-1.5', iconSize: 'sm' },
  md: { container: 'px-3.5 py-2 text-xs gap-2', iconSize: 'md' },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'sm',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const { container, iconSize } = SIZE_STYLES[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center ${RADIUS.sm} ${TRANSITIONS.fast} ${FOCUS_RING} select-none cursor-pointer ${
          VARIANT_STYLES[variant]
        } ${container} ${fullWidth ? 'w-full' : ''} ${
          isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
        {...props}
      >
        {loading ? (
          <Icon icon={Loading03Icon} size={iconSize} className="animate-spin" />
        ) : icon && iconPosition === 'left' ? (
          <Icon icon={icon} size={iconSize} />
        ) : null}

        {children && <span>{children}</span>}

        {!loading && icon && iconPosition === 'right' && (
          <Icon icon={icon} size={iconSize} />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
