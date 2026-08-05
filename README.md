# 📓 DiaryNote

> **An Infinite Spatial Canvas Note-Taking & Diary Desktop Application** built with React, Vite, TypeScript, TailwindCSS, Dexie/SQLite, and Tauri v2.

---

## ✨ Features

- 🎨 **Infinite Spatial Canvas**: Smooth panning, zooming, and customizable grid patterns (`dots`, `grid`, `ruled`, `blank`).
- ⚡ **Native Linux Desktop App**: Ultra-fast desktop experience powered by **Tauri v2 + Rust** (~2.9 MB package size!).
- 💾 **Local-First SQLite Persistence**: Offline-first storage with automatic Dexie/SQLite database persistence and instant state restoration.
- 🧠 **AI RAG Vector Engine Ready**: Embedded vector similarity search helper for semantic AI querying and RAG pipeline integration.
- 📝 **Rich Note Modes**:
  - **Text / Markdown Mode**: Live preview with GFM markdown support, soft-break line handling, and ruled paper line alignment.
  - **Checklist Mode**: Dynamic task list tracking with instant completion toggles.
  - **Image Mode**: Embed image visual assets into canvas cards.
- 🔗 **Bi-Directional Note Links & Visual Graph**:
  - Mention any note with `@NoteTitle` or `@[NoteTitle]` with instant autocomplete suggestions.
  - Interactive SVG connection lines linking reference cards visually across the canvas.
- ⌨️ **Command Palette & Keyboard Shortcuts**:
  - `Ctrl + K`: Fast fuzzy search modal across titles, content, tags, and dates.
  - `Ctrl + Z` / `Ctrl + Y`: Multi-level undo and redo snapshot stack.
  - `Delete` / `Backspace`: Quick deletion of selected cards.
  - `Escape`: Deselect all active cards.
- 🎨 **Curated Paper Themes & Typography**:
  - Paper themes: `White`, `Cream`, `Ruled`, `Dotted`, `Dark Ruled`, `Dark Graphite`, `Kraft`.
  - Custom typography support including Google Sans, Caveat, Kalam, Patrick Hand, Architects Daughter, JetBrains Mono, and Bengali fonts (`Hind Siliguri`, `Anek Bangla`, `Noto Serif Bengali`).

---

## 📁 Project Architecture

The codebase follows a modular React + TypeScript architecture:

```
src/
├── components/                  # Modular Component Layer & Barrel Exports
│   ├── index.ts                 # Barrel exports
│   ├── CanvasControls.tsx       # Bottom docked control bar & settings
│   ├── DeleteConfirmationModal.tsx # Safe delete confirmation dialog
│   ├── InfiniteCanvas.tsx       # Spatial canvas layer & background grid
│   ├── MentionAutocomplete.tsx  # @Note suggestion popup
│   ├── NoteConnections.tsx     # SVG bi-directional connection lines
│   ├── NotesSidebar.tsx         # Drawer overview list of notes
│   ├── SearchModal.tsx          # Command palette search dialog
│   └── NoteCard/                # Note Card component & theme renderers
│       ├── NoteChecklist.tsx
│       ├── NoteHeader.tsx
│       ├── NoteImageView.tsx
│       ├── NoteMarkdownView.tsx
│       ├── NoteStylePicker.tsx
│       ├── NoteToolbar.tsx
│       ├── index.tsx
│       └── types.ts
│
├── hooks/                       # Custom React Hooks (Business Logic Isolation)
│   ├── useCanvasTransform.ts    # Viewport transform, pan, zoom, fit-to-screen
│   ├── useHistoryState.ts      # Undo / Redo history snapshot stack
│   ├── useNotesManager.ts       # Database autosave, CRUD, and batch updates
│   └── useNoteSelection.ts     # Single & multi-select logic and global hotkeys
│
├── lib/                         # Engine & Database Storage Services
│   ├── sqliteStorage.ts         # Dexie / SQLite storage layer & RAG vector search
│   ├── storage.ts               # Local backups, export/import, settings storage
│   ├── markdownMention.ts       # @Note link parser & connection extractor
│   └── noteTextEngine.ts        # Canonical note text & textarea auto-resizer
│
├── types/                       # TypeScript Domain Definitions
│   └── index.ts                 # Note, CanvasTransform, GridType, PaperTheme types
│
├── App.tsx                      # Clean root orchestrator component (~150 lines)
├── index.css                    # Design system tokens & font antialiasing rules
└── main.tsx                     # React application entry point
```

---

## 🛠️ Development & Building

### Prerequisites
- **Node.js**: `v18+`
- **npm** or **yarn**
- **Rust Toolchain** *(for Tauri desktop builds)*: `rustc`, `cargo`

### Installation
```bash
git clone git@github.com:itshimelz/DiaryNote.git
cd DiaryNote
npm install
```

### Run Web Development Server
```bash
npm run dev
```

### Run Desktop Application (Tauri Dev Mode)
```bash
npm run tauri:dev
```

### Build Production Desktop App (`.deb` & Standalone Executable)
```bash
npm run tauri:build
```

Built package binaries will be generated at:
- **Debian Package (`.deb`)**: `src-tauri/target/release/bundle/deb/DiaryNote_0.1.0_amd64.deb`
- **Standalone Linux Binary**: `src-tauri/target/release/app`

---

## 🐧 Linux / Hyprland Setup

If you are using **Hyprland** or Wayland-based compositors on Arch Linux / Debian:

1. **Desktop Entry Launcher**: A launcher entry is configured at `~/.local/share/applications/diarynote.desktop`. You can open **DiaryNote** directly from `wofi`, `rofi`, `fuzzel`, or `tofi`.
2. **Hyprland Window Rule** *(Optional)*:
   Add to `~/.config/hypr/hyprland.conf`:
   ```ini
   windowrulev2 = float, class:(DiaryNote)
   windowrulev2 = size 1280 820, class:(DiaryNote)
   windowrulev2 = center, class:(DiaryNote)
   ```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
