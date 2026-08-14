import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Icon } from './Icon';
import { RADIUS, TRANSITIONS } from './tokens';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  maxWidthClass = 'max-w-md',
  children,
  initialFocusRef,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Manage native <dialog> showModal/close lifecycle and focus trap
  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

      if (!dialogNode.open) {
        try {
          dialogNode.showModal();
        } catch {
          dialogNode.setAttribute('open', '');
        }
      }

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      }
    } else {
      if (dialogNode.open) {
        dialogNode.close();
      }
      if (
        previouslyFocusedElementRef.current &&
        typeof previouslyFocusedElementRef.current.focus === 'function'
      ) {
        previouslyFocusedElementRef.current.focus();
      }
    }
  }, [isOpen, initialFocusRef]);

  // Handle native cancel (Escape key)
  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialogNode.addEventListener('cancel', handleCancel);
    return () => dialogNode.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  if (!isOpen) return null;

  const content = (
    <dialog
      ref={dialogRef}
      className={`fixed inset-0 m-auto p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs z-50 overflow-visible focus:outline-none ${maxWidthClass} w-full`}
      onClick={(e) => {
        // Close when clicking directly on the backdrop outside the dialog box
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${RADIUS.sm} shadow-sm border p-6 sm:p-7 flex flex-col gap-4.5 animate-in fade-in zoom-in-95 duration-150 select-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </dialog>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};

/* --- Dialog Compound Components --- */

export interface DialogHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  title,
  description,
  onClose,
  showCloseButton = true,
  className = '',
}) => {
  return (
    <div
      className={`flex items-start justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="flex-1 pr-3">
        <h2 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className={`p-1 ${RADIUS.sm} ${TRANSITIONS.fast} text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer`}
        >
          <Icon icon={Cancel01Icon} size="sm" />
        </button>
      )}
    </div>
  );
};

export interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogBody: React.FC<DialogBodyProps> = ({ children, className = '' }) => {
  return <div className={`flex-1 overflow-y-auto px-1 py-0.5 ${className}`}>{children}</div>;
};

export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 ${className}`}
    >
      {children}
    </div>
  );
};
