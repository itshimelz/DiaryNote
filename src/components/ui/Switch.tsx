import React from 'react';
import { FOCUS_RING, RADIUS, TRANSITIONS } from './tokens';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  id,
  className = '',
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  const buttonElement = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer ${RADIUS.full} border border-transparent ${TRANSITIONS.fast} ${FOCUS_RING} ${
        checked
          ? 'bg-slate-900 dark:bg-white'
          : 'bg-slate-300 dark:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform ${RADIUS.full} shadow-xs ${TRANSITIONS.fast} ${
          checked
            ? 'translate-x-4 bg-white dark:bg-slate-900'
            : 'translate-x-0.5 bg-white dark:bg-slate-300'
        } mt-0.5`}
      />
    </button>
  );

  if (!label && !description) {
    return buttonElement;
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-start justify-between gap-3 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex-1">
        {label && (
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {label}
          </div>
        )}
        {description && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      <div className="pt-0.5">{buttonElement}</div>
    </div>
  );
};
