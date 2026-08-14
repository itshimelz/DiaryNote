import React, { useEffect } from 'react';
import { Alert02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { CanvasTheme } from '../../types';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Icon } from '../ui';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  noteTitles?: string[];
  themeMode?: CanvasTheme;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  noteTitles = [],
  themeMode: _themeMode,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm]);

  if (!isOpen || count === 0) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <span className="text-rose-500 flex items-center">
              <Icon icon={Alert02Icon} size="md" />
            </span>
            <span>Confirm Deletion</span>
          </span>
        }
        onClose={onClose}
      />

      <DialogBody className="space-y-3.5 text-xs pr-1">
        <div>
          <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-200">
            {count === 1 ? 'Delete Note?' : `Delete ${count} Selected Notes?`}
          </h3>
          <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            {count === 1 ? (
              <>This note will be permanently removed from your canvas.</>
            ) : (
              <>
                Are you sure you want to delete all{' '}
                <strong className="font-semibold text-rose-500">{count}</strong> selected notes?
                This cannot be undone.
              </>
            )}
          </p>
        </div>

        {/* Note Titles List Preview */}
        {noteTitles.length > 0 && (
          <div className="max-h-36 overflow-y-auto rounded-sm p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
            {noteTitles.slice(0, 5).map((title, idx) => (
              <div key={idx} className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {title || 'Untitled Note'}
                </span>
              </div>
            ))}
            {noteTitles.length > 5 && (
              <div className="text-[10px] pt-0.5 pl-3.5 font-medium text-slate-500 dark:text-slate-400">
                + {noteTitles.length - 5} more notes selected
              </div>
            )}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" icon={Delete02Icon} onClick={onConfirm}>
          Delete {count > 1 ? `(${count})` : ''}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
