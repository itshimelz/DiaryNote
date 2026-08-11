# DiaryNote v0.1.3

Release notes for DiaryNote v0.1.3 featuring Daily Journaling, inline Slash commands, a contextual Smart Status Bar, unified modal styling, and single-press clipboard paste.

### Daily Journaling & Calendar

- **Today's Journal Shortcut (`Ctrl + Shift + D`)**: Create or jump to today's daily journal note.
- **Journal Calendar Modal**: Monthly calendar with streak tracking and entry metrics.
- **Header Mood Picker**: Adaptive entry mood popover with Lucide icons (`Smile`, `Sun`, `Zap`, `Coffee`, `CloudRain`).

### Slash (`/`) Commands

- Interactive inline Markdown slash command menu (`/` trigger).
- Instant insert shortcuts for headers, task checkboxes, lists, blockquotes, code blocks, timestamps, and dividers.

### Smart Status Bar & Component Organization

- **Status Bar Alignment**: Fixed icon and text vertical alignment with optical translate-y offsets and standard line-height metrics across all status bar indicators.
- **Modular Component Architecture**: Reorganized modal dialog components into a dedicated `Modals/` directory while preserving lazy-loading code splitting.
- **Streamlined Note Modes**: Focused note modes on rich markdown text and checklists.