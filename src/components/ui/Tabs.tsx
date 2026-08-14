import React, { createContext, useContext } from 'react';
import { IconSvgElement } from '@hugeicons/react';
import { Icon } from './Icon';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

interface TabsContextType {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onChange, children, className = '' }) => {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={`flex flex-col ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1 p-1 ${RADIUS.sm} bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 ${className}`}
    >
      {children}
    </div>
  );
};

export interface TabTriggerProps {
  value: string;
  icon?: IconSvgElement;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const TabTrigger: React.FC<TabTriggerProps> = ({
  value,
  icon,
  children,
  disabled = false,
  className = '',
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabTrigger must be used inside Tabs');

  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => ctx.onChange(value)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${RADIUS.sm} ${TRANSITIONS.fast} ${FOCUS_RING} cursor-pointer ${
        isActive
          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
      } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''} ${className}`}
    >
      {icon && <Icon icon={icon} size="xs" />}
      <span>{children}</span>
    </button>
  );
};

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ value, children, className = '' }) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabContent must be used inside Tabs');

  if (ctx.value !== value) return null;

  return (
    <div role="tabpanel" className={`pt-3 animate-in fade-in duration-100 ${className}`}>
      {children}
    </div>
  );
};
