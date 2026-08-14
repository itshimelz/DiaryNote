import React, { useEffect, useRef, useMemo } from 'react';
import { PaperTheme } from '../../types';
import {
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  CheckmarkSquare02Icon,
  QuoteUpIcon,
  CodeIcon,
  Calendar03Icon,
  MinusSignIcon,
  ListViewIcon,
  LeftToRightListNumberIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from '../ui';
import { PAPER_THEMES } from './types';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: any;
  action: string | ((currentContent: string) => string);
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'heading1', 'title', 'large'],
    icon: Heading01Icon,
    action: '# ',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'heading2', 'subtitle', 'medium'],
    icon: Heading02Icon,
    action: '## ',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3', 'heading3', 'small'],
    icon: Heading03Icon,
    action: '### ',
  },
  {
    id: 'todo',
    label: 'Checklist Item',
    description: 'Track tasks with a check box',
    keywords: ['todo', 'task', 'check', 'checklist', 'checkbox'],
    icon: CheckmarkSquare02Icon,
    action: '- [ ] ',
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Create a simple bulleted list',
    keywords: ['bullet', 'list', 'unordered'],
    icon: ListViewIcon,
    action: '- ',
  },
  {
    id: 'number',
    label: 'Numbered List',
    description: 'Create a ordered list',
    keywords: ['number', 'numbered', 'ordered', 'list'],
    icon: LeftToRightListNumberIcon,
    action: '1. ',
  },
  {
    id: 'callout',
    label: 'Callout Quote',
    description: 'Highlight a blockquote or note',
    keywords: ['quote', 'callout', 'blockquote', 'note'],
    icon: QuoteUpIcon,
    action: '> ',
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Format a block of code',
    keywords: ['code', 'block', 'snippet', 'python', 'javascript'],
    icon: CodeIcon,
    action: '```\n\n```',
  },
  {
    id: 'date',
    label: 'Current Date & Time',
    description: 'Insert today timestamp',
    keywords: ['date', 'time', 'now', 'today', 'timestamp'],
    icon: Calendar03Icon,
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
    icon: MinusSignIcon,
    action: '---\n',
  },
  {
    id: 'autotag',
    label: 'Auto Tag (AI)',
    description: 'Generate max 3 AI tags appended at end of note',
    keywords: ['auto-tag', 'autotag', 'tag', 'ai', 'tags'],
    icon: SparklesIcon,
    action: 'autotag',
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
  const [adjustedPos, setAdjustedPos] = React.useState<{ top: number; left: number }>({
    top: position.top,
    left: position.left,
  });

  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const parent = el.parentElement;
    const menuHeight = el.offsetHeight || 240;
    const menuWidth = el.offsetWidth || 270;

    let newTop = position.top;
    let newLeft = position.left;

    if (parent) {
      const parentHeight = parent.clientHeight || 300;
      const parentWidth = parent.clientWidth || 360;

      // If menu would overflow bottom of parent editor, flip to render above the cursor line
      if (position.top + menuHeight > parentHeight - 10) {
        newTop = Math.max(8, position.top - menuHeight - 24);
      }

      // Clamp horizontally inside parent container
      newLeft = Math.min(Math.max(8, position.left), Math.max(8, parentWidth - menuWidth - 8));
    }

    setAdjustedPos({ top: newTop, left: newLeft });
  }, [position.top, position.left]);

  const filteredCommands = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return SLASH_COMMANDS;

    return SLASH_COMMANDS.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(q)) return true;
      if (cmd.description.toLowerCase().includes(q)) return true;
      if (cmd.keywords.some((k) => k.toLowerCase().includes(q))) return true;
      return false;
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

  const isDark = themeConfig.isDark;

  return (
    <div
      ref={containerRef}
      style={{ top: `${adjustedPos.top}px`, left: `${adjustedPos.left}px` }}
      className={`absolute z-50 w-68 max-w-[calc(100%-1rem)] border rounded-sm shadow-sm overflow-hidden py-1 text-xs select-none font-sans transition-colors ${themeConfig.headerBg} ${themeConfig.border} ${themeConfig.text}`}
    >
      <div
        className={`px-2.5 py-1 border-b text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between ${themeConfig.divider} ${themeConfig.subtext}`}
      >
        <span className="font-mono">/ Format & Blocks</span>
        <span className="text-[9px] font-mono opacity-70">↑↓ navigate ↵ select</span>
      </div>

      <div className="max-h-52 overflow-y-auto px-1 py-1 space-y-0.5 scrollbar-thin">
        {filteredCommands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          const cmdIcon = cmd.icon;

          const rowClass = isSelected
            ? isDark
              ? 'bg-slate-800 text-white font-medium'
              : 'bg-slate-100 text-slate-900 font-medium'
            : isDark
            ? 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900';

          const iconClass = isSelected
            ? isDark
              ? 'bg-slate-950 border-slate-700 text-slate-200'
              : 'bg-white border-slate-300 text-slate-900'
            : isDark
            ? 'bg-slate-950/80 border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-600';

          return (
            <button
              type="button"
              key={cmd.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              onClick={() => onSelect(cmd)}
              className={`w-full text-left px-2 py-1.5 rounded-sm flex items-center gap-2 transition-colors cursor-pointer ${rowClass}`}
            >
              <div className={`p-1 rounded-sm border shrink-0 transition-colors ${iconClass}`}>
                <Icon icon={cmdIcon} size="xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate leading-tight font-sans text-xs">
                  {cmd.label}
                </div>
                <div className={`text-[10px] truncate ${themeConfig.subtext}`}>
                  {cmd.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
