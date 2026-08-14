import React from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { Icon } from './Icon';
import { RADIUS } from './tokens';

export type BadgeVariant =
  | 'default'
  | 'subtle'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'outline';
export type BadgeSize = 'xs' | 'sm';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: IconSvgElement;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default:
    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80',
  subtle:
    'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60',
  accent:
    'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold',
  danger:
    'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60',
  success:
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
  warning:
    'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
  info:
    'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60',
  outline:
    'bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1 leading-tight',
  sm: 'px-2 py-0.5 text-xs gap-1.5 leading-normal',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'xs',
  icon,
  children,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center font-medium ${RADIUS.xs} select-none shrink-0 ${
        VARIANT_STYLES[variant]
      } ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      {icon && <Icon icon={icon} size="xs" className="shrink-0" />}
      <span className="inline-flex items-center gap-1 leading-none">{children}</span>
    </span>
  );
};
