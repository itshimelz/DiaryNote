# UI Standardization Task Checklist with Hugeicons

## Phase 1: Design Tokens, Hugeicons Setup & Primitive Foundation
- [x] **Task 1:** Design Tokens, Hugeicons Integration & Styling Utilities (`@hugeicons/react`, `src/index.css`, `src/components/ui/tokens.ts`, `src/components/ui/Icon.tsx`)
- [x] **Task 2:** Action & Typography Primitives (`Button`, `IconButton`, `Kbd`, `Badge` in `src/components/ui/`)
- [x] **Task 3:** Form & Toggle Primitives (`Input`, `Textarea`, `Switch` in `src/components/ui/`)
- [x] **Task 4:** Overlay & Layout Primitives (`Dialog`, `Tabs`, `Menu` in `src/components/ui/`)
- [x] **Checkpoint 1:** Primitives Foundation complete, Hugeicons working, unit tests pass, `npm run lint` & `npm test` clean.

## Phase 2: Refactor Confirmation & Information Modals with Hugeicons
- [x] **Task 5:** Refactor `DeleteConfirmationModal` & `PasteConfirmModal`
- [x] **Task 6:** Refactor `AboutModal` & `KeyboardShortcutsModal`
- [x] **Checkpoint 2:** Alert and informational modals migrated to `src/components/ui/*` and Hugeicons.

## Phase 3: Refactor High-Complexity Settings & Data Modals with Hugeicons
- [x] **Task 7:** Refactor `SecurityModal` (Passcode setup, unlock, recovery)
- [x] **Task 8:** Refactor `ImportPreviewModal` & `JournalCalendarModal`
- [x] **Task 9:** Refactor `CanvasSettingsModal`, `AISettingsModal`, & `SearchModal`
- [x] **Checkpoint 3:** All modals migrated; zero modal styling duplication.

## Phase 4: Refactor Bars, Menus, & Floating Controls with Hugeicons
- [x] **Task 10:** Refactor `CanvasControls` (Bottom Dock) & `StatusBar`
- [x] **Task 11:** Refactor `BatchActionBar` & Context Popovers
- [x] **Task 12:** Refactor Context Menus, Autocomplete Overlays & Finalize Lucide Removal (`NoteContextMenu`, `SlashCommandMenu`, `MentionAutocomplete`, `NotesSidebar`, `UpdateAlertBanner`, `NoteCard`, `GroupFrame`, `ErrorBoundary`, `AccessibleDialog`, `vite.config.ts`)
- [x] **Checkpoint 4:** Complete System Polish, `AGENTS.md` Registry updated, full test suite, oxlint, and build verification pass (`npm test`, `npm run lint`, `npm run build`, `cargo check`).
