# Release Notes - DiaryNote v0.1.3 🚀

We are excited to announce **DiaryNote v0.1.3**, focusing on canvas interaction smoothness, drag selection precision, canvas position & zoom persistence, dedicated export directory structure, and high-density search modal UI enhancements!

---

## 🌟 What's New & Fixed in v0.1.3

### 1. 🖱️ Canvas Mouse Wheel & Scroll Interaction Fixes
- **Symmetrical Scroll Up & Down**: Fixed an issue where canvas scrolling down was blocked due to outer container scrollHeight evaluation. Scoped scroll checks strictly to note card inner scroll elements, restoring symmetrical canvas panning in all directions.
- **Note Wheel Event Propagation**: Refactored wheel handlers to allow smooth exponential canvas zooming and scrolling even when hovering directly over note cards.

### 2. ⚡ Connection Line Performance & GPU Composition
- **Static World Space Coordinates**: Refactored `<NoteConnections>` to compute SVG line vectors in static world coordinates inside the GPU-transformed canvas layer.
- **Zero Pan Latency**: Moving or panning the canvas offloads 100% of connection rendering to CSS `translate3d` GPU composition, eliminating line path re-calculations during panning.

### 3. 🎯 Bounding Box Drag Selection & Precision
- **Exact DOM Bounding Rect Intersection**: Fixed drag selection matching for long and expanded notes by querying exact rendered DOM bounding rectangles (`getBoundingClientRect()`). Selection boxes now select long text notes instantly as soon as any part of the note card is touched.
- **Zero Delay Selection Border**: Removed 150ms CSS transition delay on note borders during drag selection to eliminate border race conditions and outline lag.
- **Selection Box Flashing**: Deferred selection box creation until the mouse moves > 3px to avoid accidental selection flashes on single clicks. Supports `Shift + Drag` multi-selection.

### 4. 📁 Structured Home Directory Export & Native Notifications
- **Dedicated Root Folder (`~/DiaryNote/`)**: Native Tauri rust exporter creates `~/DiaryNote/` in the home directory with `Backups` and `Notes` subfolders.
- **Structured File Naming**: Saved exports follow clean naming patterns (`DiaryNote-Backup-YYYY-MM-DD.json`, `<Title>_YYYY-MM-DD.<ext>`).
- **OS Native Notifications**: Reports export/import operation status and target file paths directly via desktop system notifications.

### 5. 💾 Canvas Position & Zoom Level Persistence
- **State Hydration Across Reloads**: Canvas pan position `(x, y)` and zoom level `(zoom)` automatically save to localStorage and IndexedDB/SQLite on every viewport change.
- **Survives Refresh**: Page refreshes, browser reloads, and app restarts seamlessly restore the last viewed canvas coordinates and zoom distance.

### 6. 🖼️ Lockstep Group Dragging & Glassmorphic Frames
- **60 FPS Lockstep Drag Motion**: Excluded `transform` from `NoteCard` CSS transition property list, ensuring group member notes and group background frames move in 100% lockstep without trailing behind or exceeding group boundaries.
- **Glassmorphic Group Container**: Styled group frames with dashed accent borders, subtle backdrop fill (`bg-blue-500/[0.04] backdrop-blur-[0.5px]`), and live note count badges.

### 7. 🔍 High-Density Search Modal UI
- **Compact List Item Rows**: Replaced large markdown card previews with sleek ~48px compact list items, allowing 8–10 notes to be viewed at a glance.
- **Clean 1-Line Plain Text Snippet**: Automatically strips raw markdown syntax into clean single-line text previews.
- **Categorized Icons & Tags**: Clear icons (`FileText`, `CheckSquare`, `Lock`), group tags, creation dates, and `Jump ↵` selection shortcut hints.

---

## 🛠️ Package & Distribution Updates
- Version synchronized to `0.1.3` across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- Passed TypeScript compilation check (`npx tsc --noEmit`).
