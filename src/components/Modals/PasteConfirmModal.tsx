import React, { useState, useEffect } from 'react';
import { ClipboardIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { CanvasTheme } from '../../types';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input, Textarea, Icon } from '../ui';

interface PasteConfirmModalProps {
  isOpen: boolean;
  pastedText: string;
  themeMode?: CanvasTheme;
  onClose: () => void;
  onConfirm: (title: string, content: string) => void;
}

export const PasteConfirmModal: React.FC<PasteConfirmModalProps> = ({
  isOpen,
  pastedText,
  themeMode: _themeMode,
  onClose,
  onConfirm,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(pastedText);
      // Auto-extract title from first non-empty line
      const firstLine = pastedText
        .split('\n')
        .map((l) => l.trim().replace(/^#+\s*/, ''))
        .find((l) => l.length > 0);
      setTitle(firstLine ? firstLine.slice(0, 40) : 'Pasted Note');
    }
  }, [isOpen, pastedText]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onConfirm(title.trim() || 'Pasted Note', content);
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={ClipboardIcon} size="md" />
            <span>Create Note from Clipboard</span>
          </span>
        }
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
        <DialogBody className="space-y-4 text-xs pr-1">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
              Note Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-200">
              Content Preview
            </label>
            <Textarea
              autoFocus
              rows={6}
              value={content}
              onChange={(e) => {
                const newText = e.target.value;
                setContent(newText);
                const firstLine = newText
                  .split('\n')
                  .map((l) => l.trim().replace(/^#+\s*/, ''))
                  .find((l) => l.length > 0);
                if (firstLine && (!title || title === 'Pasted Note' || title === 'Untitled Note')) {
                  setTitle(firstLine.slice(0, 40));
                }
              }}
              placeholder="Paste text here (Ctrl+V) or type content..."
              className="font-mono"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!content.trim()}
            icon={CheckmarkCircle02Icon}
          >
            Create Note
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
