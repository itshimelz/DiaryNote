import React, { forwardRef } from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { Icon, IconSize } from './Icon';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export type IconButtonVariant =
  | 'ghost'
  | 'subtle'
  | 'primary'
  | 'danger'
  | 'active'
  | 'success'
  | 'warning';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconSvgElement;
  children?: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  'aria-label': string;
}

const SIZE_STYLES: Record<IconButtonSize, { container: string; iconSize: IconSize }> = {
  xs: { container: 'w-5 h-5 p-0.5', iconSize: 'xs' },
  sm: { container: 'w-7 h-7 p-1', iconSize: 'sm' },
  md: { container: 'w-8 h-8 p-1.5', iconSize: 'md' },
  lg: { container: 'w-9 h-9 p-2', iconSize: 'lg' },
  xl: { container: 'w-10 h-10 p-2.5', iconSize: 'xl' },
};

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  ghost:
    'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800',
  subtle:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700/50',
  primary:
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs',
  danger:
    'text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400',
  active:
    'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs',
  success:
    'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
  warning:
    'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      children,
      variant = 'ghost',
      size = 'sm',
      active = false,
      disabled = false,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const { container, iconSize } = SIZE_STYLES[size];
    const effectiveVariant = active ? 'active' : variant;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`inline-flex items-center justify-center ${RADIUS.sm} ${TRANSITIONS.fast} ${FOCUS_RING} cursor-pointer shrink-0 ${
          VARIANT_STYLES[effectiveVariant]
        } ${container} ${
          disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
        {...props}
      >
        {icon ? <Icon icon={icon} size={iconSize} /> : children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
