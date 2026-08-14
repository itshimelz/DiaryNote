import React, { useState, useEffect, useMemo } from 'react';
import { KeyboardIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { CanvasTheme } from '../../types';
import { SHORTCUT_CATEGORIES } from '../../constants/shortcuts';
import { formatShortcutKey, getPlatformMetaKey } from '../../utils';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Input, Kbd, Button, Icon } from '../ui';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  themeMode?: CanvasTheme;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  themeMode: _themeMode,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUT_CATEGORIES;

    const query = searchQuery.toLowerCase().trim();

    return SHORTCUT_CATEGORIES.map((cat) => ({
      ...cat,
      shortcuts: cat.shortcuts.filter(
        (item) =>
          item.description.toLowerCase().includes(query) ||
          item.keys.some((k) => k.toLowerCase().includes(query)) ||
          cat.title.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.shortcuts.length > 0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={KeyboardIcon} size="md" />
            <span>Keyboard Shortcuts</span>
          </span>
        }
        onClose={onClose}
      />

      <div className="pt-1">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter shortcuts..."
          prefixIcon={Search01Icon}
          clearable
          onClear={() => setSearchQuery('')}
          autoFocus
        />
      </div>

      <DialogBody className="max-h-[65vh] space-y-4 pt-1 pr-2">
        {filteredCategories.length === 0 ? (
          <div className="py-8 text-center select-none">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No shortcuts found for "{searchQuery}"
            </p>
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            {filteredCategories.map((category, catIdx) => (
              <tbody key={category.title}>
                <tr>
                  <td colSpan={2} className={catIdx === 0 ? 'pt-1 pb-2 px-0' : 'pt-4 pb-2 px-0'}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 text-slate-700 dark:text-slate-300">
                        {category.title}
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </td>
                </tr>
                {category.shortcuts.map((shortcut, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                  >
                    <td className="py-1.5 pr-4 text-xs font-normal text-slate-700 dark:text-slate-300">
                      {shortcut.description}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        {shortcut.keys.map((key, kIdx) => (
                          <React.Fragment key={kIdx}>
                            {kIdx > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">+</span>
                            )}
                            <Kbd>{formatShortcutKey(key)}</Kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}
      </DialogBody>

      <DialogFooter>
        <div className="w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            Press <Kbd>{getPlatformMetaKey()} + /</Kbd> anytime
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
};
