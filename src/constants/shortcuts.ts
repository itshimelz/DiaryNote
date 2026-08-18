export interface ShortcutItem {
  keys: string[];
  description: string;
}

export interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutItem[];
}

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Global & General',
    shortcuts: [
      { keys: ['Ctrl', '/'], description: 'Open Keyboard Shortcuts cheatsheet' },
      { keys: ['Ctrl', 'K'], description: 'Search notes & command palette' },
      { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
      { keys: ['Ctrl', 'Y'], description: 'Redo last action (or Ctrl+Shift+Z)' },
      { keys: ['Z'], description: 'Toggle Zen Mode (hide UI)' },
      { keys: ['Esc'], description: 'Clear selection / close modal' },
    ],
  },
  {
    title: 'Canvas & Navigation',
    shortcuts: [
      { keys: ['Space', 'Drag'], description: 'Pan across infinite canvas' },
      { keys: ['P'], description: 'Toggle Pan vs Select Mode' },
      { keys: ['F'], description: 'Fit all notes on canvas view' },
      { keys: ['H'], description: 'Reset zoom (100% at center)' },
      { keys: ['Ctrl', 'Scroll'], description: 'Smooth zoom in / out' },
      { keys: ['Shift', 'Z'], description: 'Focus & zoom to selected note (or Shift+F)' },
      { keys: ['Alt', 'Click'], description: 'Focus & zoom to clicked note' },
      { keys: ['←', '→', '↑', '↓'], description: 'Navigate focus to nearest spatial note' },
    ],
  },
  {
    title: 'Note Creation & Journaling',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'D'], description: "Open or create Today's Daily Journal entry" },
      { keys: ['N'], description: 'Create new note at canvas center' },
      { keys: ['Ctrl', 'N'], description: 'Create new note' },
      { keys: ['Double Click'], description: 'Create new note at click position' },
      { keys: ['Enter'], description: 'Edit selected note' },
      { keys: ['Delete'], description: 'Delete selected note(s)' },
      { keys: ['Ctrl', 'L'], description: 'Lock / unlock selected note(s)' },
      { keys: ['@'], description: 'Mention & link another note in content' },
      { keys: ['#'], description: 'Add tag to note' },
    ],
  },
  {
    title: 'Batch & Selection',
    shortcuts: [
      { keys: ['Shift', 'Click'], description: 'Multi-select multiple notes' },
      { keys: ['Drag Canvas'], description: 'Box marquee select multiple notes' },
      { keys: ['Ctrl', 'X'], description: 'Cut selected note(s) for long-distance relocation' },
      { keys: ['Ctrl', 'Shift', 'V'], description: 'Paste / relocate cut note(s) at cursor position' },
      { keys: ['Shift', 'M'], description: 'Synthesize & merge selected notes (2-5 notes)' },
      { keys: ['Ctrl', 'G'], description: 'Group selected notes' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Ungroup selected notes' },
      { keys: ['Esc'], description: 'Cancel cut / clear selection' },
    ],
  },
  {
    title: 'View & Settings Toggles',
    shortcuts: [
      { keys: ['T'], description: 'Toggle Dark / Light Canvas Theme' },
      { keys: ['S'], description: 'Toggle Snap to Grid (24px grid)' },
      { keys: ['C'], description: 'Toggle Reference Connection Lines' },
    ],
  },
];
