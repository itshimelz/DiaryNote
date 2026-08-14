import React from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export interface MenuProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}

export const Menu: React.FC<MenuProps> = ({ children, className = '', minWidth = 'min-w-[180px]' }) => {
  return (
    <div
      role="menu"
      className={`p-1 ${RADIUS.sm} shadow-sm border select-none ${minWidth} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 animate-in fade-in duration-100 ${className}`}
    >
      {children}
    </div>
  );
};

export interface MenuItemProps {
  icon?: IconSvgElement;
  label: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  shortcut,
  danger = false,
  active = false,
  disabled = false,
  badge,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs ${RADIUS.sm} ${TRANSITIONS.fast} ${FOCUS_RING} cursor-pointer ${
        disabled
          ? 'opacity-40 cursor-not-allowed pointer-events-none'
          : danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          : active
          ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 font-medium'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
      } ${className}`}
    >
      <div className="flex items-center gap-2 truncate">
        {icon && (
          <Icon
            icon={icon}
            size="xs"
            className={danger ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}
          />
        )}
        <span className="truncate font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {badge}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </div>
    </button>
  );
};

export const MenuDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`my-1 h-px bg-slate-200 dark:bg-slate-800 ${className}`} />;
};

export const MenuGroupHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${className}`}
    >
      {children}
    </div>
  );
};
