# Implementation Plan: DiaryNote Desktop UI Standardization with Hugeicons

## Overview
Standardize DiaryNote's desktop UI architecture by creating a lightweight, accessible design system primitive layer (`src/components/ui/`), adopting **Hugeicons** (`@hugeicons/react` & `@hugeicons/core-free-icons`) for premium, desktop-grade icon aesthetics, and migrating all peripheral UI components (modals, dock controls, context menus, and status indicators) to consume it. The custom spatial engine (infinite canvas, note cards, paper themes, links, and dragging) remains completely custom and untouched.

---

## Architectural Principles & Design Tokens

### 1. Two-Tier UI Architecture
- **Tier 1 (Custom Domain UI - Untouched):** `InfiniteCanvas`, `NoteCard` (Markdown & Canvas handles), `GroupFrame`, `NoteConnections`, `Minimap`.
- **Tier 2 (Shared UI Primitives - Standardized):** `Button`, `IconButton`, `Icon`, `Input`, `Dialog`, `Tabs`, `Switch`, `Kbd`, `Badge`, `Menu`, `MenuItem`.

### 2. Iconography Standard: Hugeicons
- **Package:** `@hugeicons/react` + `@hugeicons/core-free-icons`
- **Aesthetic:** Stroke-based, 1.5px stroke width, rounded caps, crisp desktop rendering.
- **Encapsulated `<Icon icon={...} />` Primitive:** Standardized icon component with size tokens (`xs: 12px`, `sm: 14px`, `md: 16px`, `lg: 20px`), consistent stroke width, and Lucide deprecation/removal.

### 3. Strict Design Tokens (`src/index.css`)
- **Border Radius:**
  - `rounded-xs` (2px): Inline keyboard keys (`Kbd`), small tag pills.
  - `rounded-sm` (4px): The **universal default** for cards, buttons, dialogs, inputs, and menus.
  - `rounded-full` (9999px): Dedicated solely to circular dots and avatar indicators.
  - *Eliminate all arbitrary `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` in peripheral controls.*
- **Shadows:** Crisp, desktop-native `shadow-none` and `shadow-xs` / `shadow-sm`.
- **Color Surfaces:**
  - Dark: Canvas `bg-slate-950`, Panels/Modals `bg-slate-900`, Sub-surfaces `bg-slate-800/60`, Borders `border-slate-800`/`border-slate-700`.
  - Light: Canvas `bg-slate-100`, Panels/Modals `bg-white`, Sub-surfaces `bg-slate-50`, Borders `border-slate-200`.

---

## Phase Breakdown & Task List

### Phase 1: Design Tokens, Hugeicons Setup & Primitive Foundation

#### Task 1: Design Tokens, Hugeicons Integration & Styling Utilities
- **Description:** Install `@hugeicons/react` and `@hugeicons/core-free-icons`. Define unified CSS variables, tokens, and helper mappings in `src/index.css` and `src/components/ui/tokens.ts`. Create `<Icon />` wrapper primitive.
- **Acceptance criteria:**
  - `@hugeicons/react` installed and configured.
  - Standardized radius, surface, border, and focus-ring tokens defined in CSS.
  - `Icon` primitive supports size tokens (`xs`, `sm`, `md`, `lg`) and defaults to 1.5px stroke width.
- **Verification:** `npm run lint`, `npm run build`.
- **Dependencies:** None.
- **Files touched:**
  - `package.json`
  - `src/index.css`
  - `src/components/ui/tokens.ts` (New)
  - `src/components/ui/Icon.tsx` (New)
- **Estimated scope:** Medium (4 files).

#### Task 2: Action & Typography Primitives (`Button`, `IconButton`, `Kbd`, `Badge`)
- **Description:** Implement accessible, typed button and badge primitives with Hugeicons support, variants (`primary`, `secondary`, `danger`, `ghost`, `outline`), and sizes (`xs`, `sm`, `md`).
- **Acceptance criteria:**
  - `Button` supports loading spinner, disabled states, Hugeicons leading/trailing icon slots, and theme modes.
  - `IconButton` provides square accessible icon triggers with Hugeicons and tooltip integration.
  - `Kbd` & `Badge` render clean shortcut labels and count badges.
- **Verification:** Unit tests in `src/components/ui/__tests__/Button.test.tsx` and `Badge.test.tsx`.
- **Dependencies:** Task 1.
- **Files touched:**
  - `src/components/ui/Button.tsx` (New)
  - `src/components/ui/IconButton.tsx` (New)
  - `src/components/ui/Kbd.tsx` (New)
  - `src/components/ui/Badge.tsx` (New)
  - `src/components/ui/__tests__/Button.test.tsx` (New)
- **Estimated scope:** Medium (5 files).

#### Task 3: Form & Toggle Primitives (`Input`, `Textarea`, `Switch`)
- **Description:** Implement accessible text input with Hugeicons adornments, auto-clear, error states, and tactile keyboard-navigable toggle switches.
- **Acceptance criteria:**
  - `Input` supports Hugeicons leading/trailing icons, error highlights, and password visibility toggle with Hugeicons (`ViewIcon` / `ViewOffSlashIcon`).
  - `Switch` complies with WAI-ARIA `role="switch"` and toggles on `Space`/`Enter`.
- **Verification:** Unit tests in `src/components/ui/__tests__/Input.test.tsx` and `Switch.test.tsx`.
- **Dependencies:** Task 1.
- **Files touched:**
  - `src/components/ui/Input.tsx` (New)
  - `src/components/ui/Switch.tsx` (New)
  - `src/components/ui/Textarea.tsx` (New)
  - `src/components/ui/__tests__/Input.test.tsx` (New)
  - `src/components/ui/__tests__/Switch.test.tsx` (New)
- **Estimated scope:** Medium (5 files).

#### Task 4: Overlay & Layout Primitives (`Dialog`, `Tabs`, `Menu` / `MenuItem`)
- **Description:** Build compound `Dialog` (Header, Title, Description, Body, Footer, CloseButton with Hugeicons `Cancel01Icon`), accessible `Tabs`, and floating `Menu`/`MenuItem` components.
- **Acceptance criteria:**
  - `Dialog` wraps native HTML5 `<dialog>` with focus trap, ESC listener, and backdrop portal.
  - `Tabs` manages active tab state with keyboard Arrow navigation and optional Hugeicons.
  - `Menu` supports keyboard navigation, active highlight tokens, Hugeicons slots, shortcuts, and danger actions.
- **Verification:** Unit tests in `src/components/ui/__tests__/Dialog.test.tsx` and `Tabs.test.tsx`.
- **Dependencies:** Tasks 1–3.
- **Files touched:**
  - `src/components/ui/Dialog.tsx` (New)
  - `src/components/ui/Tabs.tsx` (New)
  - `src/components/ui/Menu.tsx` (New)
  - `src/components/ui/index.ts` (New)
  - `src/components/ui/__tests__/Dialog.test.tsx` (New)
- **Estimated scope:** Medium (5 files).

### Checkpoint 1: Primitive Foundation & Hugeicons Integration Complete
- All UI primitives in `src/components/ui/` built, typed with Hugeicons, and covered with Vitest tests.
- `npm run lint` & `npm test` pass with 0 errors.

---

### Phase 2: Refactor Confirmation & Information Modals with Hugeicons

#### Task 5: Refactor `DeleteConfirmationModal` & `PasteConfirmModal`
- **Description:** Migrate deletion dialog and paste confirmation modal to use `Dialog`, `Button (danger/primary/secondary)`, and Hugeicons (`Alert02Icon`, `Delete02Icon`, `ClipboardIcon`, `Cancel01Icon`).
- **Acceptance criteria:**
  - Eliminates duplicated backdrop and ESC listener code.
  - Matches `rounded-sm` and monochromatic color tokens with Hugeicons.
  - Deletion count and note preview list render cleanly.
- **Verification:** Test modal trigger, confirmation, cancel, and ESC key dismissal.
- **Dependencies:** Checkpoint 1.
- **Files touched:**
  - `src/components/Modals/DeleteConfirmationModal.tsx`
  - `src/components/Modals/PasteConfirmModal.tsx`
- **Estimated scope:** Small (2 files).

#### Task 6: Refactor `AboutModal` & `KeyboardShortcutsModal`
- **Description:** Migrate About & Diagnostics modal and Keyboard Shortcuts cheatsheet to use `Dialog`, `Input`, `Kbd`, `Badge`, `Button`, and Hugeicons (`InformationCircleIcon`, `Search01Icon`, `SparklesIcon`, `CheckmarkCircle02Icon`).
- **Acceptance criteria:**
  - Search filter in Shortcuts modal uses standardized `Input` with Hugeicons `Search01Icon`.
  - Badges and keyboard key hints use standardized `Kbd` & `Badge`.
  - Diagnostics copy actions use standardized `Button`.
- **Verification:** Test searching shortcuts and checking version update info.
- **Dependencies:** Checkpoint 1.
- **Files touched:**
  - `src/components/Modals/AboutModal.tsx`
  - `src/components/Modals/KeyboardShortcutsModal.tsx`
- **Estimated scope:** Small (2 files).

### Checkpoint 2: Simple Modals Unified
- All simple and alert modals consume standard primitives and Hugeicons.
- `npm run lint` & `npm test` pass with zero regressions.

---

### Phase 3: Refactor High-Complexity Settings & Data Modals with Hugeicons

#### Task 7: Refactor `SecurityModal`
- **Description:** Migrate master passcode setup, unlock, and recovery modals to consume `Dialog`, `Input`, `Button`, `Badge`, and Hugeicons (`SecurityLockIcon`, `Key01Icon`, `ShieldCheckIcon`, `ShieldWarningIcon`).
- **Acceptance criteria:**
  - Passcode input uses standardized `Input` with masking, auto-focus, and Hugeicons eye toggle.
  - Unlock, setup, change password, and recovery flows remain 100% cryptographically secure.
- **Verification:** Test passcode setup, session unlock, recovery code copy, and invalid attempts.
- **Dependencies:** Checkpoint 2.
- **Files touched:**
  - `src/components/Modals/SecurityModal.tsx`
- **Estimated scope:** Small (1 file).

#### Task 8: Refactor `ImportPreviewModal` & `JournalCalendarModal`
- **Description:** Migrate staged JSON backup import modal and Journal Calendar view to use `Dialog`, `Button`, `IconButton`, `Badge`, and Hugeicons (`Upload04Icon`, `Download04Icon`, `Calendar03Icon`, `ArrowLeft01Icon`, `ArrowRight01Icon`, `FireIcon`).
- **Acceptance criteria:**
  - Staged conflict resolution options use standardized buttons with Hugeicons.
  - Calendar date navigation and streak counts use standardized icon buttons and badges.
- **Verification:** Vitest test suite for import resolution and calendar date selection.
- **Dependencies:** Checkpoint 2.
- **Files touched:**
  - `src/components/Modals/ImportPreviewModal.tsx`
  - `src/components/Modals/JournalCalendarModal.tsx`
- **Estimated scope:** Small (2 files).

#### Task 9: Refactor `CanvasSettingsModal` & `AISettingsModal`
- **Description:** Migrate the 5-tab desktop settings modal and AI configuration modal to use `Dialog`, `Tabs`, `Switch`, `Input`, `Button`, `Badge`, and Hugeicons (`Settings02Icon`, `SlidersHorizontalIcon`, `CpuIcon`, `SparklesIcon`, `Sun01Icon`, `Moon01Icon`).
- **Acceptance criteria:**
  - Tab switching in settings uses standardized `Tabs` with Hugeicons.
  - Settings toggles use standardized `Switch`.
  - AI API Key encryption, provider selection, and 28-day usage tracker use standardized form elements.
- **Verification:** Toggle preferences, test AI connection, verify local storage persistence.
- **Dependencies:** Checkpoint 2.
- **Files touched:**
  - `src/components/Modals/CanvasSettingsModal.tsx`
  - `src/components/Modals/AISettingsModal.tsx`
- **Estimated scope:** Small (2 files).

### Checkpoint 3: All Modals Standardized
- Every modal in `src/components/Modals/` uses unified primitives and Hugeicons.
- `npm run lint` and `npm test` pass.

---

### Phase 4: Refactor Bars, Menus, & Floating Controls with Hugeicons

#### Task 10: Refactor `CanvasControls` (Bottom Dock) & `StatusBar`
- **Description:** Standardize bottom floating command dock and status bar with `Button`, `IconButton`, `Badge`, and Hugeicons (`Add01Icon`, `Undo02Icon`, `Redo02Icon`, `Cursor01Icon`, `Hand01Icon`, `ZoomIn01Icon`, `ZoomOut01Icon`, `Calendar03Icon`, `Settings02Icon`).
- **Acceptance criteria:**
  - New Note CTA uses standardized `Button` with Hugeicons `Add01Icon`.
  - Undo, Redo, Pan/Select, Zoom, Today Journal, and Settings triggers use `IconButton` with Hugeicons.
  - Status bar persistence badge and note counts use `Badge`.
- **Verification:** Test all dock buttons and status bar indicators.
- **Dependencies:** Checkpoint 3.
- **Files touched:**
  - `src/components/CanvasControls.tsx`
  - `src/components/StatusBar.tsx`
- **Estimated scope:** Small (2 files).

#### Task 11: Refactor `BatchActionBar` & Context Popovers
- **Description:** Refactor batch selection actions and Align/Theme popovers with `Button`, `IconButton`, `Menu`, and Hugeicons (`Layers01Icon`, `PaintBoardIcon`, `AlignLeftIcon`, `AlignCenterIcon`, `AlignRightIcon`, `Delete02Icon`, `PinIcon`, `PinOffIcon`).
- **Acceptance criteria:**
  - Batch action bar uses standardized icon buttons and selection badge.
  - Theme and alignment popovers use standardized `Menu` / `MenuItem` tokens with Hugeicons.
- **Verification:** Select multiple notes, test alignment, batch theme change, and batch deletion.
- **Dependencies:** Checkpoint 3.
- **Files touched:**
  - `src/components/BatchActionBar.tsx`
- **Estimated scope:** Small (1 file).

#### Task 12: Refactor Context Menus & Autocomplete Overlays
- **Description:** Standardize right-click context menu, `@` note mention autocomplete, and `/` slash command menu with `Menu`, `MenuItem`, and Hugeicons. Remove unused `lucide-react` from `package.json`.
- **Acceptance criteria:**
  - Keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`) is silky smooth.
  - Active selection highlighting uses monochromatic tokens with Hugeicons.
  - `lucide-react` cleanly uninstalled without orphan imports.
- **Verification:** Right-click notes, type `@` and `/` in markdown editor. Full production build verification.
- **Dependencies:** Checkpoint 3.
- **Files touched:**
  - `src/components/NoteContextMenu.tsx`
  - `src/components/NoteCard/SlashCommandMenu.tsx`
  - `src/components/MentionAutocomplete.tsx`
  - `src/components/NotesSidebar.tsx`
  - `package.json`
- **Estimated scope:** Medium (5 files).

### Checkpoint 4: Complete System Polish & Quality Gate
- All peripheral controls, floating bars, and modals share unified design tokens and Hugeicons.
- `AGENTS.md` UI Component Modification Registry updated with full audit trail.
- Static & runtime checks:
  ```bash
  npm run lint
  npm test
  npm run build
  cargo check --manifest-path src-tauri/Cargo.toml
  ```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Icon Name Mismatches:** Differences in naming between Lucide and Hugeicons (e.g. `X` vs `Cancel01Icon`). | Medium | Encapsulate common icons through `src/components/ui/Icon.tsx` and explicit TypeScript imports from `@hugeicons/core-free-icons`. |
| **Bundle Size / Tree-Shaking:** Large core-free-icons package if not tree-shaken. | Low | `@hugeicons/core-free-icons` is ESM with granular tree-shaking; Vite bundles only imported icon paths. |
| **Canvas Interactivity Regression:** Dragging or zoom events interfered with by primitive wrappers. | High | Canvas and note cards remain untouched; primitives are strictly used in peripheral layers. |
