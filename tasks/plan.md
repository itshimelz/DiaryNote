# Implementation Plan: DiaryNote Remediation & Hardening Roadmap

## Overview

This implementation plan translates the findings from [`docs/UNIFIED_AUDIT_REPORT_2026-08-13.md`](file:///home/itshimelz/Projects/DiaryNote/docs/UNIFIED_AUDIT_REPORT_2026-08-13.md) into an actionable, phased engineering roadmap. The objective is to elevate DiaryNote from an experimental spatial prototype into a secure, reliable, local-first personal journal with hardened desktop sandboxing, zero-knowledge encryption at rest, strict schema validation, accessible UI components, and automated quality gates.

---

## Development Strategy & Governance

### 1. Semantic Versioning Milestones

| Target Version | Milestone Focus | Release Gate Criteria |
| :--- | :--- | :--- |
| **`v0.2.0-alpha.1`** | **Phase 1: Zero-Loss Persistence & Sandbox** | All P0 persistence bugs resolved; native filesystem path traversal patched; automated restart tests passing. |
| **`v0.2.0-alpha.2`** | **Phase 2: Authorization & Cryptographic Vault** | Centralized `authorizeNotes()` engine; real Argon2id + AES-256-GCM encryption at rest; OS keyring credentials; AI leak paths closed. |
| **`v0.2.0-beta.1`** | **Phase 3: Schema Interchange & Journal Model** | Zod backup validation; atomic transactional migrations with legacy rollback; explicit journal data model (`isDailyEntry`). |
| **`v0.2.0` (GA)** | **Phase 4: a11y, Scalability & Quality Gates** | WCAG 2.1 AA dialogs/drawers; Pointer Events canvas; decoupled metadata/body loading; Vitest & Tauri CI workflows. |

---

### 2. Git Branching Model & Parallel Tracks

```text
main (Production Releases / Protected)
  │
  └── dev (Integration Branch)
        │
        ├── track/persistence-and-sandbox       (Phase 1: Tasks 1-4)
        │     ├── fix/p0-note-persistence
        │     └── fix/p0-tauri-path-traversal
        │
        ├── track/auth-and-crypto-vault         (Phase 2: Tasks 5-9)
        │     ├── feat/central-auth-policy
        │     ├── feat/argon2-aes-encryption
        │     └── feat/os-keyring-credentials
        │
        ├── track/schema-interchange-journal    (Phase 3: Tasks 10-14)
        │     ├── feat/zod-backup-schema
        │     ├── feat/transactional-migration
        │     └── feat/first-class-journal-model
        │
        └── track/a11y-perf-ci-gates            (Phase 4: Tasks 15-19)
              ├── feat/wcag-accessible-dialogs
              ├── feat/canvas-pointer-events
              ├── perf/decoupled-body-loader
              └── ci/vitest-playwright-pipeline
```

- **Branch Naming:** `<type>/<issue-or-task-slug>` (e.g., `fix/p0-note-persistence`, `feat/argon2-aes-encryption`).
- **Integration:** Track branches branch off `dev` and merge back via Pull Request with required CI status checks. `dev` is merged into `main` for release tags.

---

## Architectural Decisions & Invariants

1. **Transactional Persistence Coordinator:** All note additions, paste operations, updates, deletions, and history reconciliations must pass through a single repository service. State updates in React and persistence acknowledgement in IndexedDB must be strictly coordinated.
2. **Centralized Domain Authorization Policy:** Data consumers (Search, Export, AI Merge, Connection Graph, Sidebar, Clipboard) must never read or process raw note objects without querying `authorizeNotes(ids, intent)`.
3. **Zero-Knowledge Encryption at Rest:** Passcode protection must encrypt note titles and bodies using AES-256-GCM with a 256-bit key derived via Argon2id. Plaintext locked notes must never touch IndexedDB or unauthenticated memory caches.
4. **Untrusted Desktop Webview Boundary:** All native Tauri commands treat webview inputs as untrusted. Filesystem access must use native OS file dialogs or strictly canonicalized allowlists.
5. **Decoupled Data Architecture:** Large notebooks must separate note metadata (ID, coordinates, dimensions, tags, colors, timestamps) from heavy note markdown content.

---

## Phase-by-Phase Task Breakdown

---

### Phase 1: Zero-Loss Persistence & Desktop Sandboxing (Milestone: `v0.2.0-alpha.1`)

#### Task 1: Unified Note Repository & Autosave Settlement (P0)
- **Description:** Implement a centralized note repository layer that unifies all mutation channels (`addNote`, `updateNote`, `deleteNote`, `pasteNotes`). Ensure new note IDs are immediately registered in the dirty tracking set and that `lastSavedAt` is only updated after Dexie persistence resolves.
- **Acceptance criteria:**
  - [ ] `handleAddNote` immediately marks the generated note ID dirty before scheduling autosave.
  - [ ] Direct `setNotes` bypasses in `AppModals.tsx` and paste handlers are replaced with repository calls.
  - [ ] `lastSavedAt` reflects real storage settlement and surfaces persistent UI error banners on write failure.
- **Verification:**
  - [ ] Vitest unit tests for repository mutation and dirty queue settlement.
  - [ ] Manual test: Create note, paste content, immediately reload window, verify content persists.
  - [ ] `npm run lint` and `npm run build` pass.
- **Dependencies:** None.
- **Files likely touched:**
  - `src/hooks/useNotesManager.ts`
  - `src/components/Modals/AppModals.tsx`
  - `src/lib/sqliteStorage.ts`
- **Estimated scope:** Medium (3 files).

---

#### Task 2: History Undo/Redo Persistence Synchronization (P2)
- **Description:** Connect history state replay (`undo` and `redo`) directly to the persistence coordinator so that restored or removed notes are marked dirty and synchronized with IndexedDB.
- **Acceptance criteria:**
  - [ ] `undo()` and `redo()` actions register modified/reverted note IDs into `dirtyNoteIdsRef`.
  - [ ] Deletion undo (restoring a deleted note) re-inserts the note into IndexedDB upon autosave flush.
  - [ ] Unload handlers flush pending dirty notes before window shutdown.
- **Verification:**
  - [ ] Vitest integration test for undo/redo state persistence.
  - [ ] Manual test: Delete a note, press Ctrl+Z, reload app, verify restored note remains present.
- **Dependencies:** Task 1.
- **Files likely touched:**
  - `src/hooks/useHistoryState.ts`
  - `src/hooks/useNotesManager.ts`
  - `src/App.tsx`
- **Estimated scope:** Small (2-3 files).

---

#### Task 3: Tauri Native Path Traversal Remediation & CSP Hardening (P0)
- **Description:** Harden `save_export_file` in the Tauri Rust backend to prevent directory traversal and arbitrary file overwrite. Enforce canonical paths inside `~/DiaryNote`, validate bare filenames, and activate a restrictive Content Security Policy in `tauri.conf.json`.
- **Acceptance criteria:**
  - [ ] `save_export_file` in `src-tauri/src/lib.rs` strips directory separators, rejects `..`, and validates canonical paths.
  - [ ] Tauri export optionally triggers `tauri-plugin-dialog` native file picker.
  - [ ] `tauri.conf.json` replaces `"csp": null` with a secure CSP restricting script execution and network origins.
- **Verification:**
  - [ ] `cargo check --manifest-path src-tauri/Cargo.toml` passes.
  - [ ] Unit test in Rust asserting rejection of traversal paths like `../../.bashrc`.
  - [ ] Manual test: Trigger markdown and JSON export in Tauri build and verify file location.
- **Dependencies:** None.
- **Files likely touched:**
  - `src-tauri/src/lib.rs`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
- **Estimated scope:** Medium (3 files).

---

#### Task 4: Automated Persistence & Restart Test Suite Setup (P1)
- **Description:** Install and configure Vitest with `fake-indexeddb` to create an automated regression test suite covering note creation, paste, update, deletion, and simulated restart persistence.
- **Acceptance criteria:**
  - [ ] `npm test` script configured with Vitest and jsdom/fake-indexeddb environment.
  - [ ] Automated tests assert note survival across simulated teardown and re-initialization.
- **Verification:**
  - [ ] `npm test` executes cleanly in CI environment.
- **Dependencies:** Tasks 1, 2.
- **Files likely touched:**
  - `package.json`
  - `vite.config.ts`
  - `src/hooks/__tests__/useNotesManager.test.ts`
  - `src/lib/__tests__/storage.test.ts`
- **Estimated scope:** Medium (4 files).

---

### Checkpoint 1: Zero-Loss Persistence & Sandbox
- [ ] New and pasted notes survive immediate app reloads.
- [ ] History undo/redo synchronizes with IndexedDB.
- [ ] Path traversal vectors in Tauri backend are blocked and tested.
- [ ] Automated persistence test suite passes with `npm test`.

---

### Phase 2: Authorization Engine & Cryptographic Vault (Milestone: `v0.2.0-alpha.2`)

#### Task 5: Centralized Authorization Policy Service (P0)
- **Description:** Create an `authorizeNotes(noteIds: string[], intent: AccessIntent)` domain policy service that centrally guards all operations (`read`, `copy`, `export`, `delete`, `sendToAI`, `graphIndex`).
- **Acceptance criteria:**
  - [ ] Dedicated `authPolicyService.ts` module with explicit `AccessIntent` types.
  - [ ] Batch export, context-menu export, and single-note copy verify authorization before reading note bodies.
  - [ ] Locked notes are redacted from markdown mention extraction and graph link indexing unless unlocked.
- **Verification:**
  - [ ] Vitest unit tests verifying authorization enforcement across all intents.
  - [ ] Manual test: Attempt batch export of locked notes without unlocking; verify exclusion or unlock prompt.
- **Dependencies:** Task 1.
- **Files likely touched:**
  - `src/services/authPolicyService.ts`
  - `src/components/BatchActionBar.tsx`
  - `src/components/Modals/AppModals.tsx`
  - `src/components/NoteCard/NoteHeader.tsx`
  - `src/utils/markdownMention.ts`
- **Estimated scope:** Medium (5 files).

---

#### Task 6: True At-Rest Note Encryption (Argon2id + AES-256-GCM) (P1)
- **Description:** Replace UI-only masking with real client-side authenticated encryption. Derive a 256-bit key from the master passcode using Argon2id (via WebAssembly or WebCrypto PBKDF2 fallback) with unique per-vault salt, and encrypt locked note content with AES-256-GCM.
- **Acceptance criteria:**
  - [ ] Locked note records store ciphertext, IV, and auth tag in IndexedDB; plaintext never written to disk.
  - [ ] Password verification replaces single unsalted SHA-256 with Argon2id / PBKDF2 password verifier.
  - [ ] Exponential backoff throttling on consecutive failed unlock attempts.
- **Verification:**
  - [ ] Vitest crypto tests verifying ciphertext format and authenticated decryption.
  - [ ] Manual test: Inspect IndexedDB in DevTools and confirm note body is encrypted.
- **Dependencies:** Task 5.
- **Files likely touched:**
  - `src/utils/security.ts`
  - `src/lib/sqliteStorage.ts`
  - `src/components/Modals/SecurityModal.tsx`
  - `src/components/NoteCard/index.tsx`
- **Estimated scope:** Medium (4 files).

---

#### Task 7: Secure Credential Storage & OS Keyring Integration (P0)
- **Description:** Remove hardcoded encryption seeds from frontend source code. Store AI provider API keys in native OS credential storage via Tauri Keyring plugin or encrypted local vault.
- **Acceptance criteria:**
  - [ ] Hardcoded encryption seeds in `aiSecurity.ts` removed.
  - [ ] Desktop builds use Tauri secure storage plugin; web fallback uses user-passcode-derived encryption.
  - [ ] Backup exports exclude all credentials and security hashes by default.
- **Verification:**
  - [ ] Code search confirms zero hardcoded secret constants in client bundles.
  - [ ] Exported backup JSON inspected to confirm absence of API keys and master password digests.
- **Dependencies:** Task 3.
- **Files likely touched:**
  - `src/utils/aiSecurity.ts`
  - `src/lib/storage.ts`
  - `src-tauri/Cargo.toml`
  - `src-tauri/src/lib.rs`
- **Estimated scope:** Medium (4 files).

---

#### Task 8: AI Privacy Boundaries, Header Auth, Timeouts & Cancellation (P0 / P2)
- **Description:** Enforce strict privacy checks on AI operations. Require authorization before merging/tagging locked notes, pass Gemini API keys in request headers instead of query strings, add `AbortController` timeouts (15s), and add user cancellation buttons.
- **Acceptance criteria:**
  - [ ] AI Merge and Auto-Tag fail gracefully if requested on locked notes without explicit unlock.
  - [ ] API keys passed via `x-goog-api-key` header instead of URL parameters.
  - [ ] All `fetch` calls bind `AbortSignal` with timeout and user cancel button.
  - [ ] Pre-flight modal displays exact notes and destination host before dispatching external AI calls.
- **Verification:**
  - [ ] Vitest mocks verifying timeout abort handling and header generation.
  - [ ] Manual test: Trigger AI merge, verify cancellation aborts network request cleanly.
- **Dependencies:** Tasks 5, 7.
- **Files likely touched:**
  - `src/services/ai/aiMergeService.ts`
  - `src/App.tsx`
  - `src/components/NoteCard/index.tsx`
- **Estimated scope:** Medium (3 files).

---

#### Task 9: Standardize UUID Generation Across Entity Creation (P2)
- **Description:** Replace all `Date.now()` and pseudo-random ID generators with standard `crypto.randomUUID()` to prevent entity ID collisions in rapid note creation and imports.
- **Acceptance criteria:**
  - [ ] All note, group, and connection creation paths utilize `crypto.randomUUID()`.
  - [ ] Unit tests assert uniqueness across batch ID generation.
- **Verification:**
  - [ ] Grep codebase to verify zero remaining occurrences of `Date.now().toString()` as entity IDs.
- **Dependencies:** None.
- **Files likely touched:**
  - `src/App.tsx`
  - `src/components/NoteCard/index.tsx`
  - `src/components/Modals/AppModals.tsx`
  - `src/types/index.ts`
- **Estimated scope:** Small (4 files).

---

### Checkpoint 2: Authorization & Cryptographic Vault
- [ ] Locked notes cannot be copied, exported, or sent to AI without passcode verification.
- [ ] IndexedDB stores only ciphertext for locked notes.
- [ ] Hardcoded seeds removed; credentials isolated from standard backups.
- [ ] AI requests feature timeout, cancellation, and header-based authentication.

---

### Phase 3: Schema Validation, Migration Safety & Journal Data Model (Milestone: `v0.2.0-beta.1`)

#### Task 10: Strict Versioned JSON Backup Schema with Zod (P1)
- **Description:** Implement a versioned schema definition for backup imports using Zod. Validate all note fields (coordinates, dates, IDs, tags) and enforce a 50MB file size limit before parsing.
- **Acceptance criteria:**
  - [ ] Strict Zod schema for `BackupDataV1` and `BackupDataV2`.
  - [ ] Rejection of malformed JSON, invalid date strings, and out-of-bound coordinates.
  - [ ] System preferences and security hashes quarantined from raw note imports.
- **Verification:**
  - [ ] Vitest unit tests verifying schema rejection of invalid/malicious payloads.
  - [ ] Manual test: Attempt importing legacy and corrupted JSON backups.
- **Dependencies:** Task 1.
- **Files likely touched:**
  - `src/schemas/backupSchema.ts`
  - `src/lib/storage.ts`
  - `src/App.tsx`
- **Estimated scope:** Medium (3 files).

---

#### Task 11: Staged Import Preview & Conflict Resolution Modal (P1)
- **Description:** Build a pre-import staging dialog that displays parsed note counts, duplicate ID resolutions, and warnings prior to committing changes to the active database.
- **Acceptance criteria:**
  - [ ] Modal presents summary of incoming notes, tags, and detected conflicts.
  - [ ] User can choose conflict resolution strategy (Overwrite, Keep Both, Skip).
  - [ ] Validated imports commit atomically to IndexedDB.
- **Verification:**
  - [ ] Vitest tests for duplicate ID resolution strategies.
  - [ ] Manual test: Import backup with overlapping IDs and verify non-destructive merge.
- **Dependencies:** Task 10.
- **Files likely touched:**
  - `src/components/Modals/ImportPreviewModal.tsx`
  - `src/components/Modals/AppModals.tsx`
  - `src/lib/storage.ts`
- **Estimated scope:** Medium (3 files).

---

#### Task 12: Atomic Database Migration with Rollback Recovery Sentinel (P1)
- **Description:** Refactor database initialization and legacy migration into an atomic Dexie transaction. Preserve timestamped legacy backups in `localStorage` until verified across multiple restarts, and eliminate silent mock-sample seeding on initialization failure.
- **Acceptance criteria:**
  - [ ] Migrations execute inside `db.transaction('rw', ...)`.
  - [ ] Legacy data retained until second successful launch verified.
  - [ ] Initialization failure presents diagnostic recovery UI instead of overwriting with demo notes.
- **Verification:**
  - [ ] Vitest migration simulation tests with corrupted/partial datasets.
  - [ ] Manual test: Simulate migration interruption and verify rollback preservation.
- **Dependencies:** Task 1.
- **Files likely touched:**
  - `src/lib/sqliteStorage.ts`
  - `src/App.tsx`
- **Estimated scope:** Medium (2 files).

---

#### Task 13: First-Class Journal Data Model & Streak Migration (P1)
- **Description:** Decouple daily journaling from title/tag heuristics. Add explicit `isDailyEntry: boolean` and `entryDate: string` (ISO `YYYY-MM-DD`) fields to the `Note` schema. Migrate existing heuristic-tagged notes to the new model.
- **Acceptance criteria:**
  - [ ] `Note` type definition updated with explicit journal fields.
  - [ ] Streak calculation and calendar modal query strictly against `isDailyEntry && entryDate`.
  - [ ] Automatic migration script upgrades existing journal entries cleanly.
- **Verification:**
  - [ ] Vitest tests for streak calculation and calendar query accuracy.
  - [ ] Manual test: Create non-journal note with date title; verify it does not trigger daily entry collisions.
- **Dependencies:** Task 10.
- **Files likely touched:**
  - `src/types/index.ts`
  - `src/utils/journalUtils.ts`
  - `src/components/Modals/JournalCalendarModal.tsx`
  - `src/hooks/useNotesManager.ts`
- **Estimated scope:** Medium (4 files).

---

#### Task 14: Accurate Network Transparency & Update Checker Settings (P1)
- **Description:** Provide an explicit settings toggle for automatic GitHub update checks (defaulting to opt-in or transparent notice) and update documentation to accurately describe network boundaries.
- **Acceptance criteria:**
  - [ ] Settings modal includes toggle for "Check for updates on launch".
  - [ ] `updateChecker.ts` respects user toggle and skips network requests when disabled.
  - [ ] Documentation updated to reflect exact online vs. offline capabilities.
- **Verification:**
  - [ ] Manual test: Disable update checks, restart app, inspect network tab to confirm zero outgoing requests.
- **Dependencies:** None.
- **Files likely touched:**
  - `src/utils/updateChecker.ts`
  - `src/components/Modals/SettingsModal.tsx`
  - `README.md`
- **Estimated scope:** Small (3 files).

---

### Checkpoint 3: Schema Interchange & Journal Model
- [ ] Backup imports validated against strict Zod schema with conflict preview.
- [ ] Migrations are atomic and non-destructive with legacy backup retention.
- [ ] Daily journaling operates on dedicated metadata rather than title guessing.
- [ ] Network requests for updates are user-configurable.

---

### Phase 4: Accessibility, Viewport Scalability & CI Quality Gates (Milestone: `v0.2.0` GA)

#### Task 15: WCAG 2.1 AA Accessible Dialog and Drawer Primitives (P1)
- **Description:** Implement a standardized, reusable Accessible Modal / Drawer component utilizing HTML `<dialog>` or Headless UI primitives with semantic `role="dialog"`, focus trap, focus restoration on close, background `inert`, and `Escape` key listeners.
- **Acceptance criteria:**
  - [ ] SearchModal, SecurityModal, SettingsModal, and CalendarModal migrated to accessible primitive.
  - [ ] Sidebar note items use `<button>` elements with keyboard activation (`Enter`, `Space`).
  - [ ] All icon buttons across canvas and toolbars have explicit `aria-label` attributes.
- **Verification:**
  - [ ] Automated accessibility audit using axe-core / Playwright.
  - [ ] Manual test: Complete end-to-end keyboard navigation without mouse input.
- **Dependencies:** None.
- **Files likely touched:**
  - `src/components/Common/AccessibleDialog.tsx`
  - `src/components/Modals/SearchModal.tsx`
  - `src/components/Modals/SecurityModal.tsx`
  - `src/components/NotesSidebar.tsx`
  - `src/components/CanvasControls.tsx`
- **Estimated scope:** Large (5-6 files).

---

#### Task 16: Canvas Pointer Events Migration & Touch Gestures (P2)
- **Description:** Refactor canvas pan, zoom, selection box, and card dragging event listeners from mouse events to unified Pointer Events (`onPointerDown`, `setPointerCapture`, `onPointerUp`) to ensure flawless touch and tablet support.
- **Acceptance criteria:**
  - [ ] Mouse event listeners replaced with Pointer Events across canvas components.
  - [ ] Pinch-to-zoom and multi-touch panning supported on touch devices.
  - [ ] Responsive drawer state for narrow desktop windows and tablet viewports (<800px).
- **Verification:**
  - [ ] Manual test: Test canvas dragging and zooming in Chrome mobile/tablet emulation.
- **Dependencies:** None.
- **Files likely touched:**
  - `src/components/InfiniteCanvas.tsx`
  - `src/components/GroupFrame.tsx`
  - `src/components/NotesSidebar.tsx`
- **Estimated scope:** Medium (3 files).

---

#### Task 17: Decoupled Note Metadata & On-Demand Body Loading (P2)
- **Description:** Decouple lightweight note metadata from heavy markdown content in Dexie storage. Load only metadata into memory on startup; fetch note bodies asynchronously when cards enter the viewport or open in editors.
- **Acceptance criteria:**
  - [ ] `NoteMetadata` index created in Dexie (`id`, `title`, `x`, `y`, `width`, `height`, `tags`, `color`, `isLocked`, `isDailyEntry`).
  - [ ] Full note bodies loaded on-demand when cards are rendered or searched.
  - [ ] Search indexing offloaded to a Web Worker or Dexie IndexedDB multi-index.
- **Verification:**
  - [ ] Performance benchmark: Measure heap usage and startup time with 5,000 mock notes.
- **Dependencies:** Task 1.
- **Files likely touched:**
  - `src/lib/sqliteStorage.ts`
  - `src/hooks/useNotesManager.ts`
  - `src/components/InfiniteCanvas.tsx`
  - `src/components/Modals/SearchModal.tsx`
- **Estimated scope:** Large (4-5 files).

---

#### Task 18: Structured Error Boundary & Support Bundle Diagnostics (P2)
- **Description:** Introduce a top-level React ErrorBoundary with friendly recovery options and an opt-in local diagnostic logger that captures sanitized error traces for user export.
- **Acceptance criteria:**
  - [ ] React `ErrorBoundary` captures rendering crashes and provides "Export Emergency Backup" and "Reset Canvas" actions.
  - [ ] Local circular buffer logs storage and native errors in memory.
  - [ ] Support bundle export generates sanitized diagnostic JSON.
- **Verification:**
  - [ ] Manual test: Trigger artificial render exception and verify ErrorBoundary fallback actions.
- **Dependencies:** Task 1.
- **Files likely touched:**
  - `src/components/ErrorBoundary.tsx`
  - `src/utils/logger.ts`
  - `src/App.tsx`
- **Estimated scope:** Small (3 files).

---

#### Task 19: CI/CD Quality Gates & Documentation Hygiene (P1 / P3)
- **Description:** Unify project naming (`DiaryNote`), align dependencies (clean up duplicate Vite entry, update React 19 docs), rename `sqliteStorage.ts` to `indexedDbStorage.ts`, remove `docs/` from `.gitignore`, and configure GitHub Actions CI running lint, typecheck, Vitest, and Tauri builds on all PRs.
- **Acceptance criteria:**
  - [ ] `package.json` name updated to `diary-note`; redundant dependencies removed.
  - [ ] `sqliteStorage.ts` renamed to `indexedDbStorage.ts` with updated imports.
  - [ ] `.gitignore` updated to track `docs/` directory.
  - [ ] GitHub Actions workflow `.github/workflows/ci.yml` validates `npm run lint`, `npm test`, `npm run build`, and `cargo check`.
- **Verification:**
  - [ ] `git status` shows clean tracking of `docs/`.
  - [ ] CI workflow runs and passes on branch push.
- **Dependencies:** Tasks 1-18.
- **Files likely touched:**
  - `package.json`
  - `.gitignore`
  - `README.md`
  - `src/lib/indexedDbStorage.ts`
  - `.github/workflows/ci.yml`
- **Estimated scope:** Medium (5 files).

---

### Checkpoint 4: General Availability Release (`v0.2.0`)
- [ ] Full keyboard and screen-reader accessibility verified.
- [ ] Canvas supports touch/pointer interactions smoothly.
- [ ] Memory footprint remains low with large note datasets (>5k notes).
- [ ] Top-level ErrorBoundary provides emergency recovery.
- [ ] Complete automated CI suite enforces code quality and safety invariants on every PR.

---

## Risk Analysis & Mitigation Matrix

| Risk Event | Severity | Likelihood | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Data migration failure during schema upgrade** | High | Low | Implement atomic Dexie transactions with timestamped `localStorage` backup snapshots retained across restarts. |
| **Performance overhead from Argon2id in WebAssembly** | Medium | Medium | Cache derived master keys in memory for active authenticated session; execute KDF in Web Worker to prevent UI stutter. |
| **Breaking changes in backup JSON format** | Medium | Low | Version backup schemas (`v1`, `v2`) and implement backward-compatible schema transforms in Zod. |
| **Tauri CSP breaking external font or icon loads** | Low | Medium | Strict CSP allowlists tailored specifically to bundled assets and designated AI endpoints. |

---

## Open Decisions for Engineering Review

1. **Native Secure Storage vs. Master Password Vault:**
   - *Option A (Recommended):* Leverage `tauri-plugin-stronghold` / native OS keychain on desktop, with PBKDF2/Argon2id master password for web/standalone modes.
   - *Option B:* Pure master-password-derived client encryption across all platforms.
2. **Search Architecture for Large Datasets:**
   - *Option A (Recommended):* Dedicated Web Worker with MiniSearch / FlexSearch index built incrementally from metadata.
   - *Option B:* Dexie full-text compound indexes with pagination.
