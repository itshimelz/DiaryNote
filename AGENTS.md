# AGENTS.md — Agent Working Rules & UI Component Registry

**Document Version:** 1.0.0  
**Target Application:** DiaryNote Desktop (Tauri + Rust + React + TypeScript)  
**Applicability:** Mandatory for all AI agents, subagents, and automated assistants operating on this codebase.

---

## 1. Mandatory Agent Rule: UI Component Modification Registry

> [!IMPORTANT]
> **RULE #1 (UI CHANGE MANIFEST):**
> Whenever an agent modifies, refactors, creates, or deletes **any UI component, modal, hook affecting rendering, or stylesheet** (`src/components/**`, `src/hooks/**`, `src/index.css`), the agent **MUST immediately update the UI Component Modification Registry below in this document (`AGENTS.md`)**.
>
> This enables instant identification of visual regressions, broken event handlers, or UI mismatches across phases.

### Required Registry Entry Schema
For every modified UI file, the agent must document:
1. **Phase & Task ID** (e.g., `Phase 1 - Task 1`)
2. **File Path** (e.g., `src/components/Modals/AppModals.tsx`)
3. **UI Elements Affected** (e.g., Modal overlay, Paste dialog, Confirm button)
4. **Nature of Change** (Props, State flow, DOM structure, Tailwind/CSS classes, Event handlers)
5. **Expected Visual & Functional Behavior** (What the user should see and how it responds)
6. **Regression Verification Checklist** (Exact UI interactions to test)

---

## 2. Mandatory Operational Commands & Tool Rules

> [!CAUTION]
> **RULE #2 (NO DEV SERVER EXECUTION):**
> **DO NOT EVER run `npm run dev`, `bun dev`, `vite`, or launch background development servers.**
> DiaryNote is tested and validated via static checks, unit tests, and production build verification (`npm run lint`, `npm test`, `npm run build`, and `cargo check`). Do not spawn long-running server processes.

> [!IMPORTANT]
> **RULE #3 (ALWAYS CHECK LINT WITH OXLINT):**
> **Always execute `npm run lint` before concluding any task.**
> `npm run lint` is configured with `oxlint` as the default ultra-fast linter combined with TypeScript strict typechecking (`oxlint && tsc --noEmit`).
> Tasks must never be marked complete if `npm run lint` reports any errors.

---

## 3. Active UI Component Modification Registry

*Agents must append and update entries here during task execution.*

| Phase / Task | Component / File Path | UI Elements Affected | Specific Changes Made | Expected Visual / Behavioral Result | Verification & Regression Check |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1 (Task 1)** | `src/components/Modals/AppModals.tsx` | Paste confirmation dialog, Note creation triggers | Replaced direct `setNotes` calls with repository methods; wired dirty persistence settlement. | Paste modal closes cleanly; pasted card renders immediately with persistent save indicator. | Verify paste confirmation creates card and survives immediate reload (`Ctrl+R`). |
| **Phase 1 (Task 1)** | `src/components/StatusBar.tsx` | Save status indicator badge | Bound save status to actual IndexedDB promise settlement instead of optimistic timer. | Badge displays "Saving..." during I/O and "Saved" only after storage acknowledgement. | Verify save badge shows error banner if storage fails. |
| **Phase 1 (Task 2)** | `src/App.tsx` | Root canvas action dispatchers | Routed history undo/redo through persistence coordinator. | Visual undo/redo on canvas remains synchronized with local database. | Press `Ctrl+Z` to restore deleted note; verify note remains present after reload. |
| **Phase 2 (Task 5)** | `src/components/BatchActionBar.tsx` | Batch export, batch delete, align/theme popovers | Integrated `authorizeNotes()` checks before exporting or deleting selected cards. | Locked notes prompt for passcode or are safely excluded with clear UI badge notice. | Select 2 unlocked notes + 1 locked note; click Export; verify locked note is not leaked. |
| **Phase 2 (Task 5)** | `src/components/NoteCard/NoteHeader.tsx` | Copy button, lock status icon | Guarded clipboard copy button with authorization check. | Clicking copy on a locked card prompts "Unlock note to copy" instead of copying plaintext. | Click copy icon on locked card; verify clipboard remains protected. |
| **Phase 2 (Task 5/6)** | `src/lib/sqliteStorage.ts` & `src/lib/storage.ts` | IndexedDB persistence & JSON backup export | Integrated at-rest envelope encryption for locked notes; guarded full backups with user notification. | Locked note bodies stored as AES-256-GCM ciphertext on disk; full backups redact locked entries if unauthenticated. | Inspect IndexedDB and export backup without unlocking; verify plaintext is never exposed. |
| **Phase 2 (Task 5/9)** | `src/hooks/useNotesManager.ts` | Deletion handlers & ID generation | Awaited deletion promises with `isSaving`/`saveError` settlement; standardized IDs to `crypto.randomUUID()`. | Direct $O(1)$ deletion updates status bar; new notes and journal entries have collision-resistant UUIDs. | Create note and delete note; verify status bar indicates save settlement and ID matches UUID regex. |
| **Phase 2 (Task 6)** | `src/components/Modals/SecurityModal.tsx` | Master passcode setup, unlock dialog | Redesigned with unified tokens (rounded-sm, monochromatic primary/secondary buttons, portal mounting, Escape listener). | Passcode setup and unlock dialogs match the Dock and Canvas Preferences style cleanly. | Test passcode unlock and recovery; verify responsive layout and escape dismissal. |
| **Phase 2 (Task 8)** | `src/components/Modals/AISettingsModal.tsx` | AI Feature Settings dialog | Redesigned with unified design tokens (rounded-sm, tactile pill toggle, 28-day activity heatmap, portal mounting, Escape listener). | Visual layout, colors, and button hover styles match the Dock and Canvas Preferences perfectly. | Open AI Settings; toggle services; test API key; verify clean escape dismissal and test feedback. |
| **Phase 3 (Task 11)** | `src/components/Modals/ImportPreviewModal.tsx` *(New)* | Staged backup import preview modal | Staged import modal with portal mounting (`z-[60]`), Escape dismissal, and duplicate ID resolution options. | User sees visual breakdown of backup contents unobstructed before committing to database. | Import backup with duplicate IDs; select "Keep Both"; verify both cards appear on canvas. |
| **Phase 3 (Task 13)** | `src/components/Modals/JournalCalendarModal.tsx` | Calendar date grid, streak counter | Redesigned with unified tokens, query `isDailyEntry && entryDate`, and portal mounting. | Calendar highlights only genuine daily entries with sleek monochromatic indicators. | Create note titled "2026-08-14 Planning"; verify calendar does not mark it as a daily entry. |
| **Phase 3 (Task 14)** | `src/components/Modals/CanvasSettingsModal.tsx` *(New)* | Preferences window dialog | Two-column desktop settings window with tabs (Canvas, Appearance, Data, AI, About) and auto-dismiss on import. | Users configure workspace preferences smoothly; clicking import dismisses settings cleanly for staged preview. | Open settings, switch tabs, click Import Backup, verify file picker and staged preview appear unobstructed. |
| **Phase 3 (Task 14)** | `src/components/Modals/DeleteConfirmationModal.tsx` | Deletion confirm dialog | Redesigned with portal mounting, escape dismissal, and matching button tokens. | Sleek danger confirmation popup with note preview count. | Select note, press delete, verify modal renders and closes cleanly. |
| **Phase 3 (Task 14)** | `src/components/Modals/KeyboardShortcutsModal.tsx` | Shortcuts cheatsheet dialog | Redesigned with unified kbd badges, search filter bar, and portal mounting. | Clean shortcuts table matching desktop design language. | Open shortcuts (Ctrl+/); filter search; verify smooth navigation. |
| **Phase 3 (Task 14)** | `src/components/Modals/PasteConfirmModal.tsx` | Clipboard paste modal | Redesigned with portal mounting and monochromatic action buttons. | Paste modal matches Dock and Canvas Preferences style. | Paste clipboard text; verify modal styling and creation. |
| **Phase 3 (Task 14)** | `src/components/Modals/SearchModal.tsx` | Global search dialog | Redesigned with portal mounting, clean tags bar, and unified result highlighting. | Global note search renders with zero visual artifacts. | Press Ctrl+K; type search query; use arrow keys to navigate. |
| **Phase 3 (Task 14)** | `src/components/Modals/AboutModal.tsx` | About & Diagnostics dialog | Redesigned with unified feature cards and monochromatic buttons. | Clean release channel and diagnostic info popup. | Open About; click check update; verify clean indicator. |
| **Phase 3 (Task 14)** | `src/components/CanvasControls.tsx` | Settings trigger, control dock | Extracted settings window into `CanvasSettingsModal`; bound file selection to auto-dismiss settings modal. | Clean, compact docked control bar without DOM leakage or stacked modal collisions. | Open settings from dock; verify toggle states persist and import triggers correctly. |
| **Phase 4 (Task 15)** | `src/components/Common/AccessibleDialog.tsx` *(New)* | Modal overlay container primitive | Replaces unsemantic `div` overlays with semantic `<dialog>`, focus trap, and Escape listener. | Accessible dialogs capture keyboard focus; pressing `Escape` closes modal and restores focus. | Navigate entire modal using `Tab` and `Shift+Tab`; verify focus cannot escape to background. |
| **Phase 4 (Task 15)** | `src/components/NotesSidebar.tsx` | Note list drawer rows | Changed note items from `<div>` to semantic `<button>` tags; added list virtualization. | Sidebar keyboard navigable with arrow keys / Tab; smooth scrolling across thousands of notes. | Test navigating sidebar using only keyboard; verify DOM node count remains <30. |
| **Phase 4 (Task 16)** | `src/components/InfiniteCanvas.tsx` | Canvas viewport, rubber-band selector, minimap | Moved 2D HTML5 Minimap to top-right corner (`top-4 right-4`); normalized shadows to `shadow-sm`. | Minimap floats in top-right without colliding with bottom command dock or status bar. | Open canvas; verify minimap is in top-right and bottom dock is unobstructed. |
| **Phase 4 (Task 16)** | `src/hooks/useNoteResize.ts` | Card resize handles | Converted resizing to direct DOM style transforms (`style.width/height`) during drag. | Card resizes smoothly at 60 FPS without triggering canvas-wide re-renders. | Drag resize handle; monitor CPU in DevTools (should remain <5%). |
| **Phase 4 (Task 17)** | `src/components/NoteCard/index.tsx` | NoteCard root component | Decoupled `allNotes` prop; isolated `React.memo` comparator to note-specific fields. | Modifying or typing in Note A re-renders *only* Note A. | Type rapidly in one note; verify other visible cards do not re-render. |
| **Phase 4 (Task 18)** | `src/components/ErrorBoundary.tsx` *(New)* | Root error boundary fallback | Top-level crash recovery screen with "Emergency Backup Export" and "Reload" buttons. | Prevents blank white screens on runtime errors; lets users recover all notes safely. | Throw test error; verify emergency export downloads intact JSON backup. |
| **Hotfix (Double-Click Creation)** | `src/components/InfiniteCanvas.tsx` & `src/hooks/useCanvasTransform.ts` | Canvas double-click note creation positioning | Passed raw client coordinates from `handleDoubleClick` and bound default note dimensions to `DEFAULT_NOTE_WIDTH`/`DEFAULT_NOTE_HEIGHT`. | Double-clicking or right-clicking anywhere on the canvas creates and centers the new note precisely at the mouse pointer, even when panned or zoomed. | Double click canvas at various pan offsets and zoom levels (50%, 100%, 200%); verify note card is centered under cursor without shooting off-screen. |
| **Hotfix (Layout & Groups & Persistence)** | `src/utils/layoutUtils.ts`, `src/components/InfiniteCanvas.tsx`, `src/hooks/useNotesManager.ts`, `src/components/Modals/AppModals.tsx` | Align Top calculation, Group Frame event wiring, bringToFront zIndex persistence, multi-duplicate selection | Fixed `alignTop` to use `min(y)`; wired `onSelectMultipleNotes`, `onDragStateChange`, `snapToGrid` to `GroupFrame`; marked `zIndex` dirty in `bringToFront`; batched multi-note duplication. | Note alignment aligns smoothly; clicking/dragging group badges selects and moves all group notes; note layering survives restart; batch duplicating selects all new notes. | Select 3 notes -> click Align Top; click group badge to drag; change note layer and reload; duplicate multiple notes. |
| **Hotfix (Right-Click Multi-Select Menu)** | `src/hooks/useNoteDrag.ts`, `src/hooks/useNoteResize.ts`, `src/components/NoteContextMenu.tsx` | Right-click mousedown selection preservation & multi-note context menu | Added `e.button !== 0` check to `useNoteDrag` and `useNoteResize` to prevent right-clicks from firing drag mouseup deselect; enabled Duplicate Note(s) on multi-selection context menu. | Right-clicking on any selected note preserves the multi-note selection and displays the multi-note context menu ("X notes selected", group, theme, duplicate, delete). | Select 2+ notes -> right click any selected note -> verify all notes remain selected and multi-note context menu opens. |

---

## 4. Core Architectural Invariants for Agents

All agents working on DiaryNote must adhere to these standing principles:

1. **Desktop Native & Offline First:**
   - DiaryNote is a desktop application (Tauri + Rust + React). Do not introduce assumptions of remote web servers, cloud sync, or hosted SaaS infrastructure.
   - All network interactions (updates, AI endpoints) must be strictly user-configurable and default to privacy-preserving boundaries.

2. **Zero-Loss Persistence Protocol:**
   - Never bypass the note repository layer with direct React state overrides.
   - A note is only considered saved after IndexedDB storage confirmation resolves.

3. **Zero-Knowledge Security & Privacy:**
   - Locked notes must be encrypted at rest using Argon2id + AES-256-GCM. Plaintext locked content must never touch persistent storage or unauthenticated memory caches.
   - Exclude locked notes from exports, clipboard copies, AI prompts, and graph indexes unless explicitly authenticated.

4. **CPU & Rendering Performance:**
   - Never call `getBoundingClientRect()`, `offsetWidth`, or `offsetHeight` inside mousemove or touchmove loops.
   - Decouple note metadata from markdown bodies. Heavy search and cryptography operations must run in Web Workers or native Rust commands.

5. **Quality Verification Before Completion:**
   - Every task must pass:
     ```bash
     npm run lint
     npm run build
     cargo check --manifest-path src-tauri/Cargo.toml
     ```
   - Automated tests (`npm test`) must pass with zero errors before any task is marked done.

---

## 5. UI Regression Troubleshooting Guide

If a UI component stops functioning, misaligns, or clips after a task:
1. **Check the Registry Table Above:** Find the file in the registry and review what props, state, or DOM structure were altered in that phase.
2. **Inspect Event Delegation:** Ensure Pointer Events (`onPointerDown`, `setPointerCapture`) are not being blocked by overlapping containers or missing `touch-action: none`.
3. **Check Portal Mounting:** Ensure popovers and floating menus (e.g., Theme/Align menus) use `createPortal(..., document.body)` to prevent container overflow clipping.
4. **Verify CSS Classes:** Verify Tailwind CSS utility classes conform to Tailwind v4 syntax without deprecated arbitrary values.
