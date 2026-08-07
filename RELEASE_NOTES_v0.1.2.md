# Release Notes - DiaryNote v0.1.2 🚀

We are excited to announce **DiaryNote v0.1.2**, featuring major performance optimizations, unified codebase architecture, permission-free clipboard integration, canvas coordinate precision fixes, and enhanced user safety controls!

---

## 🌟 What's New in v0.1.2

### 1. ⚡ High-Performance Storage Architecture (Zero-Lag Canvas Panning)
- **Asynchronous IndexedDB Persistence**: Removed synchronous blocking `localStorage` writes during active canvas panning and zooming. All note mutations, canvas transforms, and settings are saved asynchronously via Dexie (IndexedDB).
- **Smooth 60fps Canvas Interactions**: Eliminates layout thrashing and main-thread stuttering during drag, pan, and multi-note group movements.

### 2. 🎯 Canvas Viewport & Coordinate Precision Fixes
- **Dynamic Initial View Centering**: Fixed initial page load/refresh issue where the viewport was shifted off to the right side of the canvas. `getInitialTransform` now computes the exact bounding box of all canvas notes and centers the view automatically at a comfortable reading zoom (100% scale).
- **State Hydration Fix**: Fixed initial state race condition where notes jumped/flew across the screen 50ms after refresh.
- **Mouse Pointer Note Creation**: Double-clicking anywhere on the canvas or right-clicking *"New Note Here"* spawns new notes centered directly under the mouse pointer.
- **Standard Note Zoom Distance**: Standardized note navigation (`Shift+Z`, `Shift+F`, `Alt+Click`, search modal, backlinks) to focus notes at a clean 85%–110% range (~100% default) without over-zooming.

### 3. 📋 Permission-Free Native Clipboard Paste (`Ctrl+V`)
- **Native Clipboard Listener**: Added an off-screen listener element that captures native `ClipboardEvent` `paste` events on `Ctrl+V` / `Cmd+V` without requiring browser/distro site permission prompts.
- **Clipboard Confirmation Modal**: Opening modal with pre-filled content and title extraction from copied text.

### 4. 🛠️ Codebase Unification & Bundle Optimization
- **Unified Markdown Engine (`BaseMarkdownRenderer.tsx`)**: Consolidated duplicate `<ReactMarkdown>` renderer configurations from `NoteMarkdownView` and `SmartMarkdownText` into a single reusable core component, eliminating 350+ lines of duplicate JSX.
- **Bundle Size Optimization**: Configured Rollup chunking, minification, and console dropping in `vite.config.ts`. Passed clean TypeScript compilation (`npx tsc --noEmit`).

### 5. 🎨 UI & UX Improvements
- **Right-Click Context Menu (`NoteContextMenu.tsx`)**: Quick actions for zoom, edit, pin, lock, group/ungroup, paper themes, backup, duplicate, delete, and canvas actions.
- **Monochromatic Styling**: Slate monochromatic design system matching bottom dock controls.
- **Snappy Group Release**: Deferring drag state clearing triggers synchronized spring drop animations across all selected card groups.
- **Theme-Adaptive Code Typography**: Monospace text formatting without fixed dark background boxes.
- **Checklist Section Headers**: Headings (`# Heading`) render as section headers without checkboxes.
- **Data Protection Cleanup**: Removed the *"Restore Default Sample Notes"* button from the Settings popup to eliminate accidental data loss risk.

---

## 🛠️ Package & Distribution Updates
- Version bumped to `0.1.2` across `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `install.ps1`, and `.github/workflows/release.yml`.
- Cleaned unused dependencies and removed legacy `.aistudio` assets folder.
