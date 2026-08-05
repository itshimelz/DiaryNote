<div align="center">

# DiaryNote

An Infinite Spatial Canvas Note-Taking & Diary Application built with React, Vite, TypeScript, TailwindCSS, Dexie/SQLite, and Tauri v2.

[![Release](https://img.shields.io/github/v/release/itshimelz/DiaryNote?color=blue&logo=github)](https://github.com/itshimelz/DiaryNote/releases/latest)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-orange.svg?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Dexie-003B57.svg?logo=sqlite)](https://dexie.org)
[![Platforms](https://img.shields.io/badge/Platforms-Linux%20%7C%20macOS%20%7C%20Windows-brightgreen)](#requirements)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

---

</div>

## Overview

**DiaryNote** combines the freedom of an infinite spatial canvas with local-first database persistence, native security features, and desktop performance. Organize thoughts, journals, and daily notes visually, draw bi-directional links between cards, and query notes with embedded AI vector search.

---

## Features

### Infinite Spatial Canvas
- **Pan & Zoom Navigation**: Smooth infinite canvas zooming (0.1x – 3.0x) and panning with mouse wheel or spacebar drag.
- **Grid Snapping**: Toggleable snap-to-grid movement with release spring physics.
- **Custom Patterns**: Switch background patterns dynamically (`dots`, `grid`, `ruled`, `blank`).
- **Canvas Minimap**: Interactive mini-map viewport overview placed at top right.

### Rich Card Rendering
- **Live Markdown View**: Full GitHub Flavored Markdown (GFM) with soft line breaks and ruled paper line alignment.
- **Checklist Mode**: Create interactive task lists with completion status.
- **Image Mode**: Embed visual assets and images into spatial cards.
- **Curated Themes & Fonts**: 9 paper themes (`white`, `cream`, `ruled`, `dark`, `kraft`, `graphite`) and custom typography (Google Sans, Caveat, Kalam, Architects Daughter, JetBrains Mono, and Bengali fonts).

### Security & Local Persistence
- **App-Wide Master Passcode**: Protect private notes using a secure SHA-256 hashed master passcode and recovery question.
- **Protected Actions**: Deleting, exporting, or viewing locked notes requires passcode verification.
- **Privacy Search & Previews**: Locked note contents and tags are masked in search modals and sidebar lists.
- **Local-First Storage**: Offline Dexie/SQLite database storage with automatic background synchronization.
- **Native Notifications**: Desktop system notifications trigger on key security actions (locking, deleting notes).
- **RAG Embedding Ready**: Built-in vector embedding field (`embedding?: number[]`) and cosine similarity search helper (`searchNotesByVector`).

### Bi-Directional Links & Visual Graph
- **@Note Autocomplete**: Type `@NoteTitle` or `@[NoteTitle]` to open instant autocomplete search and insert internal links.
- **SVG Connection Graph**: Interactive connection lines link reference notes across the canvas visually.

---

## Keyboard Shortcuts

| Shortcut | Category | Description |
| :--- | :--- | :--- |
| `Ctrl + L` / `Cmd + L` | Security | Lock selected note(s) immediately |
| `N` / `Ctrl + N` | Notes | Create a new note card |
| `Enter` | Notes | Start editing the selected note |
| `Delete` / `Backspace` | Notes | Delete selected note card(s) (requires passcode if locked) |
| `Escape` | Actions | Deselect active card / exit edit mode / close modals |
| `Ctrl + K` / `Ctrl + F` / `/` | Navigation | Open Command Palette / Fuzzy Search Modal |
| `F` | Navigation | Fit all notes into the viewport view |
| `H` / `Home` | Navigation | Reset zoom to default centered view |
| `Space` *(Hold)* | Canvas | Temporary Pan mode while dragging mouse |
| `P` | Canvas | Toggle Pan mode on/off |
| `Z` | View | Toggle Zen mode (hide UI control bars) |
| `T` | View | Toggle Canvas Theme (Dark / Light / Gradient) |
| `S` | Canvas | Toggle Snap to Grid |
| `C` | Canvas | Toggle Note Connection Lines |
| `Ctrl + Z` / `Cmd + Z` | Editing | Undo last canvas operation |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Editing | Redo canvas operation |
| `@` | Note Editor | Trigger internal note autocomplete |

---

## Requirements

- **Linux**: Arch Linux / Hyprland / Ubuntu / Debian / Fedora (WebKitGTK)
- **macOS**: 10.15+ (Catalina or newer)
- **Windows**: 10 / 11 (64-bit)

---

## Installation

### Linux Prebuilt Package (`.deb` / Standalone Binary)

Download the latest prebuilt packages from the [GitHub Releases](https://github.com/itshimelz/DiaryNote/releases/latest) page.

#### Debian / Ubuntu / Mint / Pop!_OS
```bash
sudo dpkg -i DiaryNote_0.1.0_amd64.deb
```

#### Arch Linux / Hyprland / Generic Linux Executable
```bash
chmod +x DiaryNote_0.1.0_x86_64
./DiaryNote_0.1.0_x86_64
```

<details>
<summary><b>Build from Source</b></summary>

#### 1. Prerequisites
- **Node.js**: `v18+`
- **Rust Toolchain**: `rustc`, `cargo` (for Tauri desktop bundling)

#### 2. Clone & Install
```bash
git clone https://github.com/itshimelz/DiaryNote.git
cd DiaryNote
npm install
```

#### 3. Run Web Dev Server
```bash
npm run dev
```

#### 4. Run Tauri Desktop Dev Mode
```bash
npm run tauri:dev
```

#### 5. Build Desktop Binary (`.deb`)
```bash
npm run tauri:build
```

Output location: `src-tauri/target/release/bundle/deb/DiaryNote_0.1.0_amd64.deb`

</details>

---

## Architecture

```
src/
├── components/                  # UI Components & Barrel Exports
│   ├── index.ts                 # Clean barrel export
│   ├── CanvasControls.tsx       # Bottom docked control bar & settings
│   ├── DeleteConfirmationModal.tsx # Safe delete confirmation modal
│   ├── InfiniteCanvas.tsx       # Spatial canvas & grid layer
│   ├── MentionAutocomplete.tsx  # @Note suggestion popup
│   ├── NoteConnections.tsx     # SVG bi-directional connection lines
│   ├── NotesSidebar.tsx         # Drawer overview panel
│   ├── SearchModal.tsx          # Command palette search dialog
│   ├── SecurityModal.tsx        # Passcode & recovery modal
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
├── hooks/                       # Custom React Hooks
│   ├── useCanvasTransform.ts    # Viewport transform, pan, zoom, fit-to-screen
│   ├── useHistoryState.ts      # Undo / Redo history snapshot stack
│   ├── useNotesManager.ts       # Database autosave, CRUD, & batch updates
│   └── useNoteSelection.ts     # Single & multi-select logic & hotkeys
│
├── lib/                         # Core Services & DB Layer
│   ├── notifications.ts         # Native desktop & Web notifications engine
│   ├── security.ts              # SHA-256 Web Crypto hashing engine
│   ├── sqliteStorage.ts         # Dexie / SQLite storage layer & RAG vector search
│   ├── storage.ts               # Local backups, export/import, settings storage
│   ├── markdownMention.ts       # @Note link parser & connection extractor
│   └── noteTextEngine.ts        # Canonical note text & textarea auto-resizer
│
├── types/                       # TypeScript Domain Definitions
│   └── index.ts                 # Note, CanvasTransform, GridType, PaperTheme
│
├── App.tsx                      # Clean root orchestrator component
├── index.css                    # Design system tokens & font antialiasing rules
└── main.tsx                     # React entry point
```

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the Repository
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
