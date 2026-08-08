import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Plus, Trash2, ListTodo } from 'lucide-react';
import { Note, PaperTheme } from '../../types';
import { SmartMarkdownText } from './SmartMarkdownText';
import { PAPER_THEMES } from './types';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  isHeading?: boolean;
  headingLevel?: number;
}

interface NoteChecklistProps {
  content: string;
  allNotes?: Note[];
  onNavigateToNote?: (targetNoteId: string) => void;
  onChangeContent: (newContent: string) => void;
  fontClass?: string;
  fontSizeClass?: string;
  paperTheme?: string;
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  isEditing: boolean;
  themeConfig: any;
  isRuled: boolean;
  fontClass: string;
  fontSizeClass: string;
  paperTheme: string;
  allNotes: Note[];
  onToggleItem: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onDeleteItem: (id: string) => void;
  onInsertItemAfter: (id: string) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onNavigateToNote?: (targetNoteId: string) => void;
}

const ChecklistItemRowComponent: React.FC<ChecklistItemRowProps> = ({
  item,
  isEditing,
  themeConfig,
  isRuled,
  fontClass,
  fontSizeClass,
  paperTheme,
  allNotes,
  onToggleItem,
  onUpdateText,
  onDeleteItem,
  onInsertItemAfter,
  onStartEditing,
  onStopEditing,
  onNavigateToNote,
}) => {
  if (item.isHeading) {
    return (
      <div className="flex items-center justify-between group pt-3 pb-1 border-b border-slate-200/40 dark:border-slate-800/40">
        <div className={`flex-1 font-bold text-sm uppercase tracking-wider ${themeConfig.text}`}>
          {item.text}
        </div>
        <button
          type="button"
          onClick={() => onDeleteItem(item.id)}
          className={`opacity-0 group-hover:opacity-100 p-1 ${themeConfig.subtext} hover:text-rose-500 shrink-0`}
          title="Delete section header"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2.5 px-2 py-1.5 rounded-xl ${themeConfig.hoverBg} group ${
        isRuled ? 'ruled-text-alignment' : ''
      }`}
    >
      {/* Custom rounded square checkbox */}
      <button
        type="button"
        onClick={() => onToggleItem(item.id)}
        style={isRuled ? { marginTop: '6px' } : { marginTop: '2px' }}
        className={`shrink-0 w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center ${
          item.completed ? themeConfig.checkboxChecked : themeConfig.checkboxUnchecked
        }`}
      >
        {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      {/* Task text item: Markdown preview when inactive, Textarea when editing */}
      {isEditing ? (
        <textarea
          autoFocus
          rows={1}
          value={item.text}
          onChange={(e) => onUpdateText(item.id, e.target.value)}
          onBlur={() => {
            if (!item.text.trim()) {
              onDeleteItem(item.id);
            }
            onStopEditing();
          }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            e.stopPropagation();

            if (e.key === 'Enter') {
              e.preventDefault();
              if (!item.text.trim()) {
                onDeleteItem(item.id);
                onStopEditing();
              } else {
                onInsertItemAfter(item.id);
              }
            } else if (e.key === 'Backspace' && item.text === '') {
              e.preventDefault();
              onDeleteItem(item.id);
              onStopEditing();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onStopEditing();
            }
          }}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
          placeholder="Task item..."
          className={`flex-1 bg-transparent border-0 outline-none ${themeConfig.text} font-medium text-sm tracking-tight resize-none overflow-hidden break-words whitespace-pre-wrap py-0`}
        />
      ) : (
        <div
          onClick={() => onStartEditing(item.id)}
          className={`flex-1 cursor-text min-h-[22px] font-medium tracking-tight ${
            item.completed ? 'line-through opacity-50' : themeConfig.text
          }`}
        >
          <SmartMarkdownText
            content={item.text || 'Task item...'}
            allNotes={allNotes}
            onNavigateToNote={onNavigateToNote}
            fontClass={fontClass}
            fontSizeClass={fontSizeClass}
            paperTheme={paperTheme}
            inline
          />
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDeleteItem(item.id)}
        className={`opacity-0 group-hover:opacity-100 p-1 ${themeConfig.subtext} hover:text-rose-500 shrink-0`}
        title="Delete task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const ChecklistItemRow = React.memo(ChecklistItemRowComponent);

export const NoteChecklist: React.FC<NoteChecklistProps> = ({
  content,
  allNotes = [],
  onNavigateToNote,
  onChangeContent,
  fontClass = 'font-sans',
  fontSizeClass = 'text-sm',
  paperTheme = 'white',
}) => {
  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];
  const isRuled = paperTheme === 'ruled' || paperTheme === 'ruled-dark';
  const addInputRef = useRef<HTMLInputElement>(null);
  const isInternalChangeRef = useRef(false);

  // Parse markdown checklist lines: "- [x] Task", "- [ ] Task", or "# Heading"
  const parseItemsFromContent = (rawText: string): ChecklistItem[] => {
    if (!rawText.trim()) {
      return [];
    }

    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line, idx) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        return {
          id: `item-heading-${idx}`,
          text: headingMatch[2],
          completed: false,
          isHeading: true,
          headingLevel: headingMatch[1].length,
        };
      }

      const isChecked = /- \[[xX]\]/.test(line);
      const text = line.replace(/^- \[[xX\s]?\]\s*/, '').replace(/^- \s*/, '');
      return {
        id: `item-task-${idx}`,
        text,
        completed: isChecked,
        isHeading: false,
      };
    });
  };

  const [items, setItems] = useState<ChecklistItem[]>(() => parseItemsFromContent(content));
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Sync state if external content prop changes (skip internal keystroke updates)
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    setItems(parseItemsFromContent(content));
  }, [content]);

  const syncBackToContent = (updatedItems: ChecklistItem[]) => {
    isInternalChangeRef.current = true;
    const markdown = updatedItems
      .map((item) => {
        if (item.isHeading) {
          const hashes = '#'.repeat(item.headingLevel || 1);
          return `${hashes} ${item.text}`;
        }
        return `- [${item.completed ? 'x' : ' '}] ${item.text}`;
      })
      .join('\n');
    onChangeContent(markdown);
  };

  const handleToggleItem = useCallback(
    (id: string) => {
      setItems((prevItems) => {
        const updated = prevItems.map((item) =>
          item.id === id ? { ...item, completed: !item.completed } : item
        );
        syncBackToContent(updated);
        return updated;
      });
    },
    [syncBackToContent]
  );

  const handleUpdateText = useCallback(
    (id: string, text: string) => {
      setItems((prevItems) => {
        const updated = prevItems.map((item) => (item.id === id ? { ...item, text } : item));
        syncBackToContent(updated);
        return updated;
      });
    },
    [syncBackToContent]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      setItems((prevItems) => {
        const updated = prevItems.filter((item) => item.id !== id);
        syncBackToContent(updated);
        return updated;
      });
      setEditingItemId((prev) => (prev === id ? null : prev));
    },
    [syncBackToContent]
  );

  const handleInsertItemAfter = useCallback(
    (currentId: string) => {
      let newId = '';
      setItems((prevItems) => {
        const currentIndex = prevItems.findIndex((i) => i.id === currentId);
        newId = `item-task-${Date.now()}`;
        const newItem: ChecklistItem = {
          id: newId,
          text: '',
          completed: false,
        };
        const updated = [...prevItems];
        if (currentIndex >= 0) {
          updated.splice(currentIndex + 1, 0, newItem);
        } else {
          updated.push(newItem);
        }
        syncBackToContent(updated);
        return updated;
      });
      if (newId) setEditingItemId(newId);
    },
    [syncBackToContent]
  );

  const handleStartEditing = useCallback((id: string) => {
    setEditingItemId(id);
  }, []);

  const handleStopEditing = useCallback(() => {
    setEditingItemId(null);
  }, []);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      const newId = `item-task-${Date.now()}`;
      const newItem: ChecklistItem = {
        id: newId,
        text: newItemText.trim(),
        completed: false,
      };
      const updated = [...items, newItem];
      setItems(updated);
      setNewItemText('');
      syncBackToContent(updated);
    }
  };

  return (
    <div className={`w-full flex-1 flex flex-col gap-2 p-1 ${fontClass} ${fontSizeClass}`}>
      {/* Task List Items */}
      <div className="flex-1 flex flex-col gap-1.5 pr-1 overflow-y-auto min-h-[120px]">
        {items.length === 0 ? (
          <div
            onClick={() => addInputRef.current?.focus()}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none opacity-60 hover:opacity-100 transition-opacity"
          >
            <ListTodo className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-semibold">No tasks yet</p>
            <p className="text-[11px] opacity-75 mt-0.5">Type below and press Enter to add a task.</p>
          </div>
        ) : (
          items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              isEditing={editingItemId === item.id}
              themeConfig={themeConfig}
              isRuled={isRuled}
              fontClass={fontClass}
              fontSizeClass={fontSizeClass}
              paperTheme={paperTheme}
              allNotes={allNotes}
              onToggleItem={handleToggleItem}
              onUpdateText={handleUpdateText}
              onDeleteItem={handleDeleteItem}
              onInsertItemAfter={handleInsertItemAfter}
              onStartEditing={handleStartEditing}
              onStopEditing={handleStopEditing}
              onNavigateToNote={onNavigateToNote}
            />
          ))
        )}
      </div>

      {/* Add new task item input */}
      <form
        onSubmit={handleAddItem}
        className={`mt-auto pt-2 border-t ${themeConfig.divider} flex items-center gap-2`}
      >
        <input
          ref={addInputRef}
          type="text"
          placeholder="Add task item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          className={`flex-1 ${themeConfig.inputBg} border ${themeConfig.inputBorder} rounded-xl px-3 py-1.5 text-xs outline-none transition-all`}
        />
        <button
          type="submit"
          className={`p-1.5 ${
            themeConfig.isDark
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          } rounded-xl transition-colors shrink-0 shadow-2xs`}
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
