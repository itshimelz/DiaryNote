import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface NoteChecklistProps {
  content: string;
  onChangeContent: (newContent: string) => void;
  fontClass?: string;
  fontSizeClass?: string;
}

export const NoteChecklist: React.FC<NoteChecklistProps> = ({
  content,
  onChangeContent,
  fontClass = 'font-sans',
  fontSizeClass = 'text-sm',
}) => {
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
      <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50/80 group transition-colors"
          >
            {/* Custom rounded square checkbox */}
            <button
              type="button"
              onClick={() => handleToggleItem(item.id)}
              className={`shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                item.completed
                  ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                  : 'border-slate-700 bg-white hover:border-slate-900'
              }`}
            >
              {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            {/* Editable task title */}
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleUpdateText(item.id, e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-slate-800 font-medium text-sm tracking-tight"
            />

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleDeleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-opacity"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new task item input */}
      <form onSubmit={handleAddItem} className="mt-auto pt-2 border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          placeholder="Add task item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
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
