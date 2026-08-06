<div align="center">

<img src="assets/logo.png" alt="DiaryNote Logo" width="128" style="border-radius: 12px; margin-bottom: 12px;" />

# DiaryNote

An Infinite Spatial Canvas Note-Taking & Journaling Application built with React 18, TypeScript, Vite, TailwindCSS, SQLite/Dexie, and Tauri v2.

[![Release](https://img.shields.io/github/v/release/itshimelz/DiaryNote?color=blue&logo=github)](https://github.com/itshimelz/DiaryNote/releases/latest)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-orange.svg?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Dexie-003B57.svg?logo=sqlite)](https://dexie.org)
[![Platforms](https://img.shields.io/badge/Platforms-Linux%20%7C%20macOS%20%7C%20Windows-brightgreen)](#system-requirements)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

</div>

---

## 📌 Overview

**DiaryNote** is a modern, privacy-focused infinite spatial canvas note-taking and journaling app. It combines the visual freedom of an infinite 2D canvas with local-first database persistence, master passcode security, bi-directional `@Note` linking, markdown editing, and batch card management.

---

## ✨ Features & Highlights

### 🎨 Infinite Spatial Canvas
- **Infinite Zoom & Pan**: Zoom smoothly from `0.15x` to `3.0x` with wheel pinch or hotkeys, and pan across an endless workspace.
- **Snap to Grid**: 24px grid alignment toggleable for clean note alignment.
- **Custom Patterns**: Switch between `dots`, `grid`, `ruled`, and `blank` canvas background patterns.
- **Interactive Minimap**: Real-time canvas navigation overview fixed at the top right.

### 📝 Rich Note Cards & Editing
- **Markdown & Checklist Modes**: Full GitHub Flavored Markdown (GFM) text editing and interactive checklist task management.
- **Curated Paper Themes & Typography**: 9 paper themes (`white`, `cream`, `ruled`, `dark`, `kraft`, `dotted`, etc.) and customized fonts (Google Sans, Inter, Caveat, Kalam, JetBrains Mono, and Bengali fonts).
- **Group Cards & Frames**: Group multiple notes together with group headers, custom names, and auto-expanding bounding frames.

### 🔐 Security & Local-First Persistence
- **SHA-256 Master Passcode**: Protect private notes with an app-wide master passcode and security recovery question.
- **Protected Actions**: Locking, unlocking, deleting, or exporting protected notes requires passcode authentication.
- **Privacy Search Masking**: Locked notes remain content-masked in search modals and sidebar listings.
- **Local SQLite / Dexie DB**: 100% offline, local database storage with automatic background debounced autosave.

### 🔗 Bi-Directional Linking & Visual Graph
- **`@Note` Autocomplete**: Type `@NoteTitle` in any note to instantly search and link internal reference notes.
- **SVG Connection Graph**: Dynamic curved SVG connection lines connect referenced notes visually on the canvas.

---

## ⌨️ Keyboard Shortcuts Reference

Press `Ctrl + /` (or `Cmd + /`) anytime inside the app to open the built-in hotkeys cheatsheet.

| Shortcut | Category | Function |
| :--- | :--- | :--- |
| `Ctrl + /` | General | Open Keyboard Shortcuts cheatsheet modal |
| `Ctrl + K` / `Ctrl + F` / `/` | General | Open Command Palette / Note Search |
| `Ctrl + Z` | General | Undo last canvas action |
| `Ctrl + Y` / `Ctrl + Shift + Z` | General | Redo canvas action |
| `Z` | View | Toggle Zen Mode (hide UI bars) |
| `Esc` | General | Clear selection / close active modal |
| `Space + Drag` | Canvas | Temporary Pan canvas view |
| `P` | Canvas | Toggle Pan Mode vs Select Mode |
| `F` | View | Fit all notes on canvas view |
| `H` / `Home` | View | Reset zoom to 100% centered view |
| `Shift + Z` | View | Focus & zoom to selected note |
| `N` / `Ctrl + N` | Notes | Create a new note at canvas center |
| `Double Click` | Canvas | Create new note at mouse cursor position |
| `Enter` | Notes | Edit selected note |
| `Delete` / `Backspace` | Notes | Delete selected note card(s) |
| `Ctrl + L` | Security | Lock / unlock selected note(s) |
| `Ctrl + G` | Batch | Group selected notes |
| `Ctrl + Shift + G` | Batch | Ungroup selected notes |
| `Shift + Click` | Selection | Multi-select notes (or toggle selection) |
| `Ctrl + Click` | Selection | Multi-select / deselect individual note |
| `T` | View | Toggle Dark / Light canvas theme |
| `S` | Canvas | Toggle Snap to Grid |
| `C` | Canvas | Toggle Connection Lines |

---

## 💻 System Requirements

- **Linux**: Ubuntu 20.04+, Arch Linux, Fedora, Debian (WebKitGTK)
- **macOS**: 10.15 Catalina or newer
- **Windows**: Windows 10 / 11 (64-bit)

---

## 📦 Installation Guide

### 1. Download Prebuilt Package (Linux / Windows / macOS)

Download the latest prebuilt packages from the [GitHub Releases](https://github.com/itshimelz/DiaryNote/releases/latest) page.

#### Debian / Ubuntu / Mint / Pop!_OS (`.deb`)
```bash
sudo dpkg -i DiaryNote_0.1.0_amd64.deb
```

#### Arch Linux / Hyprland / Standalone Linux (`.tar.gz` / AppImage / Binary)
```bash
tar -xvf DiaryNote-linux-x86_64.tar.gz
cd DiaryNote
./DiaryNote
```

---

### 2. Building from Source

#### Prerequisites
- **Node.js**: `v18+` or `v20+`
- **npm** or **bun** / **yarn**
- **Rust Toolchain**: `rustc` & `cargo` (for Tauri desktop app builds)

#### Step-by-Step Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/itshimelz/DiaryNote.git
   cd DiaryNote
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Web Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Run Tauri Desktop Dev Mode**:
   ```bash
   npm run tauri:dev
   ```

5. **Build Desktop App Binary**:
   ```bash
   npm run tauri:build
   ```
   The compiled production bundles (`.deb`, `.app`, `.exe`) will be generated inside `src-tauri/target/release/bundle/`.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
