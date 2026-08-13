import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CanvasTheme } from '../../types';

export interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  themeMode?: CanvasTheme;
  maxWidthClass?: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  showCloseButton?: boolean;
}

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  themeMode = 'dark',
  maxWidthClass = 'max-w-lg',
  children,
  initialFocusRef,
  showCloseButton = true,
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
          // Fallback if already open or not supported
          dialogNode.setAttribute('open', '');
        }
      }

      // Initial focus management
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      }
    } else {
      if (dialogNode.open) {
        dialogNode.close();
      }
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
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

  const isDark = themeMode !== 'light';

  const content = (
    <dialog
      ref={dialogRef}
      aria-labelledby="accessible-dialog-title"
      aria-describedby={description ? 'accessible-dialog-description' : undefined}
      className={`fixed inset-0 m-auto p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs z-50 overflow-visible focus:outline-none ${maxWidthClass} w-full`}
      onClick={(e) => {
        // Close when clicking directly on the backdrop area outside the content box
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full rounded-sm shadow-sm border p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 select-none ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between pb-3 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div>
            <h2 id="accessible-dialog-title" className="font-bold text-base tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="accessible-dialog-description" className="text-xs text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
