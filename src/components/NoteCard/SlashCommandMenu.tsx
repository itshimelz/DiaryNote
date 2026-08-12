import React, { useEffect, useRef, useMemo } from 'react';
import { PaperTheme } from '../../types';
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Quote,
  Code,
  Calendar,
  Minus,
  List,
  ListOrdered,
  Slash,
} from 'lucide-react';
import { PAPER_THEMES } from './types';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  action: string | ((currentContent: string) => string);
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'heading1', 'title', 'large'],
    icon: Heading1,
    action: '# ',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'heading2', 'subtitle', 'medium'],
    icon: Heading2,
    action: '## ',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3', 'heading3', 'small'],
    icon: Heading3,
    action: '### ',
  },
  {
    id: 'todo',
    label: 'Checklist Item',
    description: 'Track tasks with a check box',
    keywords: ['todo', 'task', 'check', 'checklist', 'checkbox'],
    icon: CheckSquare,
    action: '- [ ] ',
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Create a simple bulleted list',
    keywords: ['bullet', 'list', 'unordered'],
    icon: List,
    action: '- ',
  },
  {
    id: 'number',
    label: 'Numbered List',
    description: 'Create a ordered list',
    keywords: ['number', 'numbered', 'ordered', 'list'],
    icon: ListOrdered,
    action: '1. ',
  },
  {
    id: 'callout',
    label: 'Callout Quote',
    description: 'Highlight a blockquote or note',
    keywords: ['quote', 'callout', 'blockquote', 'note'],
    icon: Quote,
    action: '> ',
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Format a block of code',
    keywords: ['code', 'block', 'snippet', 'python', 'javascript'],
    icon: Code,
    action: '```\n\n```',
  },
  {
    id: 'date',
    label: 'Current Date & Time',
    description: 'Insert today timestamp',
    keywords: ['date', 'time', 'now', 'today', 'timestamp'],
    icon: Calendar,
    action: () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `**${dateStr} ${timeStr}**\n`;
    },
  },
  {
    id: 'divider',
    label: 'Horizontal Line',
    description: 'Visually divide sections',
    keywords: ['divider', 'hr', 'line', 'separator'],
    icon: Minus,
    action: '---\n',
  },
];

interface SlashCommandMenuProps {
  query: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  position: { top: number; left: number };
  paperTheme?: string;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  query,
  selectedIndex,
  onSelect,
  onClose,
  position,
  paperTheme = 'white',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];

  const filteredCommands = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return SLASH_COMMANDS;

    return SLASH_COMMANDS.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(q)) return true;
      if (cmd.description.toLowerCase().includes(q)) return true;
      return cmd.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className={`absolute z-50 w-64 max-w-[calc(100%-2rem)] border rounded-md shadow-sm overflow-hidden py-1 text-xs backdrop-blur-md transition-colors select-none ${themeConfig.headerBg} ${themeConfig.border} ${themeConfig.text}`}
    >
      <div
        className={`px-2.5 py-1.5 border-b text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between ${themeConfig.divider} ${themeConfig.subtext}`}
      >
        <div className="flex items-center gap-1 font-mono">
          <Slash className="w-3 h-3 opacity-80" /> Format & Blocks
        </div>
        <span className="text-[9px] font-mono opacity-70">↑↓ navigate, ↵ select</span>
      </div>

      <div className="max-h-52 overflow-y-auto">
        {filteredCommands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              onClick={() => onSelect(cmd)}
              className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2.5 transition-colors ${
                isSelected ? `${themeConfig.hoverBg} font-medium` : `hover:${themeConfig.hoverBg}`
              }`}
            >
              <div className={`p-1 rounded-sm border shrink-0 ${themeConfig.border} ${themeConfig.headerBg}`}>
                <Icon className={`w-3.5 h-3.5 ${themeConfig.subtext}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate leading-tight font-sans text-xs">{cmd.label}</div>
                <div className={`text-[10px] truncate ${themeConfig.subtext}`}>{cmd.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
