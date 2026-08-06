import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Note } from '../../types';
import { SmartMarkdownText } from './SmartMarkdownText';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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

export const NoteChecklist: React.FC<NoteChecklistProps> = ({
  content,
  allNotes = [],
  onNavigateToNote,
  onChangeContent,
  fontClass = 'font-sans',
  fontSizeClass = 'text-sm',
  paperTheme = 'white',
}) => {
  const isRuled = paperTheme === 'ruled' || paperTheme === 'ruled-dark';
  // Parse markdown checklist lines: "- [x] Task" or "- [ ] Task" or plain lines
  const parseItemsFromContent = (rawText: string): ChecklistItem[] => {
    if (!rawText.trim()) {
      return [
        { id: '1', text: 'Daily UI Day 65', completed: true },
        { id: '2', text: 'Buying Groceries', completed: false },
        { id: '3', text: 'Daily Chores', completed: true },
        { id: '4', text: 'Collecting research material', completed: true },
        { id: '5', text: 'Completing Assignments', completed: false },
      ];
    }

    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line, idx) => {
      const isChecked = /- \[[xX]\]/.test(line);
      let text = line.replace(/^- \[[xX\s]?\]\s*/, '').replace(/^- \s*/, '').trim();
      if (!text) text = `Task ${idx + 1}`;
      return {
        id: `item-${idx}-${Date.now()}`,
        text,
        completed: isChecked,
      };
    });
  };

  const [items, setItems] = useState<ChecklistItem[]>(() => parseItemsFromContent(content));
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const syncBackToContent = (updatedItems: ChecklistItem[]) => {
    const markdown = updatedItems
      .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
      .join('\n');
    onChangeContent(markdown);
  };

  const handleToggleItem = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setItems(updated);
    syncBackToContent(updated);
  };

  const handleUpdateText = (id: string, text: string) => {
    const updated = items.map((item) => (item.id === id ? { ...item, text } : item));
    setItems(updated);
    syncBackToContent(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    syncBackToContent(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: `item-${Date.now()}`,
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
      <div className="flex-1 flex flex-col gap-2 pr-1">
        {items.map((item) => {
          const isEditing = editingItemId === item.id;
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-1 rounded-xl hover:bg-slate-50/80 group transition-colors ${isRuled ? 'ruled-text-alignment' : ''}`}
            >
              {/* Custom rounded square checkbox */}
              <button
                type="button"
                onClick={() => handleToggleItem(item.id)}
                style={isRuled ? { marginTop: '6px' } : { marginTop: '4px' }}
                className={`shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                  item.completed
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'border-slate-700 bg-white hover:border-slate-900'
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
                  onChange={(e) => handleUpdateText(item.id, e.target.value)}
                  onBlur={() => setEditingItemId(null)}
                  onInput={(e) => {
                    const target = e.currentTarget;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' || e.key === 'Enter') {
                      e.currentTarget.blur();
                      setEditingItemId(null);
                    }
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  className="flex-1 bg-transparent border-0 outline-none text-slate-800 font-medium text-sm tracking-tight resize-none overflow-hidden break-words whitespace-pre-wrap py-0"
                />
              ) : (
                <div
                  onClick={() => setEditingItemId(item.id)}
                  className={`flex-1 cursor-text min-h-[22px] font-medium tracking-tight ${
                    item.completed ? 'line-through opacity-60' : 'text-slate-800'
                  }`}
                >
                  <SmartMarkdownText
                    content={item.text}
                    allNotes={allNotes}
                    onNavigateToNote={onNavigateToNote}
                    fontClass={fontClass}
                    fontSizeClass={fontSizeClass}
                    inline
                  />
                </div>
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDeleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 mt-0.5 text-slate-300 hover:text-rose-500 transition-opacity shrink-0"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new task item input */}
      <form onSubmit={handleAddItem} className="mt-auto pt-2 border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          placeholder="Add task item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition-all"
        />
        <button
          type="submit"
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shrink-0 shadow-2xs"
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
