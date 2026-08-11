# DiaryNote v0.1.3

Release notes for DiaryNote v0.1.3 featuring inline Slash commands, a contextual Smart Status Bar, and smart relative timestamps.

### Slash (`/`) Commands

- Added an interactive inline Markdown slash command menu triggered by `/` at line start or after whitespace.
- Instant insert shortcuts for headers (`#`, `##`, `###`), task checkboxes (`- [ ]`), bullet lists (`-`), numbered lists (`1.`), blockquotes (`>`), code blocks (```), timestamps, and horizontal dividers (`---`).
- Supports search filtering and keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Tab`, `Escape`).

### Contextual Smart Status Bar

- Added a bottom status bar with live word count insights, SQLite storage status, grid snap indicators, and smart relative save timestamps.

### Smart Relative Duration Formatter

- Replaced static duration formatting with an intelligent unit scaler (`Just now`, `Xm ago`, `Xh ago`, `Xd ago`, `Xw ago`, `Xmo ago`, `Xy ago`).
