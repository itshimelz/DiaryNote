import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
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

  // Parse markdown checklist lines: "- [x] Task", "- [ ] Task", or "# Heading"
  const parseItemsFromContent = (rawText: string): ChecklistItem[] => {
    if (!rawText.trim()) {
      return [
        { id: 'h1', text: 'Features', completed: false, isHeading: true, headingLevel: 2 },
        { id: '1', text: 'Infinite canvas', completed: true },
        { id: '2', text: 'Markdown notes', completed: true },
        { id: '3', text: 'Backlinks', completed: true },
        { id: 'h2', text: 'Next', completed: false, isHeading: true, headingLevel: 2 },
        { id: '4', text: 'Mobile app', completed: false },
        { id: '5', text: 'Sync', completed: false },
      ];
    }

    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line, idx) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        return {
          id: `heading-${idx}-${Date.now()}`,
          text: headingMatch[2].trim(),
          completed: false,
          isHeading: true,
          headingLevel: headingMatch[1].length,
        };
      }

      const isChecked = /- \[[xX]\]/.test(line);
      let text = line.replace(/^- \[[xX\s]?\]\s*/, '').replace(/^- \s*/, '').trim();
      if (!text) text = `Task ${idx + 1}`;
      return {
        id: `item-${idx}-${Date.now()}`,
        text,
        completed: isChecked,
        isHeading: false,
      };
    });
  };

  const [items, setItems] = useState<ChecklistItem[]>(() => parseItemsFromContent(content));
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const syncBackToContent = (updatedItems: ChecklistItem[]) => {
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

          if (item.isHeading) {
            return (
              <div key={item.id} className="flex items-center justify-between group pt-3 pb-1">
                <div className={`flex-1 font-bold text-base tracking-tight ${themeConfig.text}`}>
                  {item.text}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className={`opacity-0 group-hover:opacity-100 p-1 ${themeConfig.subtext} hover:text-rose-500 transition-opacity shrink-0`}
                  title="Delete section header"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-1 rounded-xl ${themeConfig.hoverBg} group transition-colors ${
                isRuled ? 'ruled-text-alignment' : ''
              }`}
            >
              {/* Custom rounded square checkbox */}
              <button
                type="button"
                onClick={() => handleToggleItem(item.id)}
                style={isRuled ? { marginTop: '6px' } : { marginTop: '4px' }}
                className={`shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                  item.completed
                    ? themeConfig.checkboxChecked
                    : themeConfig.checkboxUnchecked
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
                  className={`flex-1 bg-transparent border-0 outline-none ${themeConfig.text} font-medium text-sm tracking-tight resize-none overflow-hidden break-words whitespace-pre-wrap py-0`}
                />
              ) : (
                <div
                  onClick={() => setEditingItemId(item.id)}
                  className={`flex-1 cursor-text min-h-[22px] font-medium tracking-tight ${
                    item.completed ? 'line-through opacity-50' : themeConfig.text
                  }`}
                >
                  <SmartMarkdownText
                    content={item.text}
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
                onClick={() => handleDeleteItem(item.id)}
                className={`opacity-0 group-hover:opacity-100 p-1 mt-0.5 ${themeConfig.subtext} hover:text-rose-500 transition-opacity shrink-0`}
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new task item input */}
      <form
        onSubmit={handleAddItem}
        className={`mt-auto pt-2 border-t ${themeConfig.divider} flex items-center gap-2`}
      >
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
