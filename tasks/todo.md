# DiaryNote Remediation Task Checklist (`tasks/todo.md`)

## Phase 1: Zero-Loss Persistence & Desktop Sandboxing (`v0.2.0-alpha.1`)
- [x] **Task 1:** Unified Note Repository, Autosave Settlement & $O(1)$ Deletions (P0)
  - [x] Mark generated note ID dirty immediately on creation in `useNotesManager.ts`
  - [x] Refactor paste confirmation and modal actions to use repository methods instead of direct `setNotes`
  - [x] Replace `saveBatchNotesToDB` on deletion with direct `db.notes.delete` / `bulkDelete` ($O(1)$ disk I/O)
  - [x] Await storage settlement before updating `lastSavedAt` and surface write failure banners
- [x] **Task 2:** History Undo/Redo Persistence & Delta-Based Snapshots (P2)
  - [x] Connect `undo()` / `redo()` to `dirtyNoteIdsRef` in `useHistoryState.ts`
  - [x] Re-insert restored deleted notes into IndexedDB on save flush
  - [x] Implement lightweight diff patch history to eliminate 500k-object heap bloat
  - [x] Add beforeunload dirty queue flush
- [x] **Task 3:** Tauri Native Path Traversal Remediation & CSP Hardening (P0)
  - [x] Strip directory separators, reject `..`, and validate canonical paths in `src-tauri/src/lib.rs`
  - [x] Integrate `tauri-plugin-dialog` / path validation for native export file selection
  - [x] Replace `"csp": null` with strict Content Security Policy in `tauri.conf.json`
- [x] **Task 4:** Automated Persistence & Restart Test Suite Setup (P1)
  - [x] Configure Vitest with `fake-indexeddb` and jsdom in `package.json`
  - [x] Write integration test suite verifying note survival across app restarts and deletion performance
- [x] **Checkpoint 1:** Zero-Loss Persistence, $O(1)$ Deletions & Desktop Sandboxing verified

---

## Phase 2: Authorization Engine & Cryptographic Vault (`v0.2.0-alpha.2`)
- [x] **Task 5:** Centralized Authorization Policy Service & Deletion Settlement Hardening (P0)
  - [x] Create `src/services/authPolicyService.ts` with explicit `AccessIntent`
  - [x] Enforce authorization check on batch export, multi-export, and card header clipboard copy
  - [x] Redact locked notes from markdown mention extraction and graph links
  - [x] Await storage settlement on single & bulk deletions; surface persistent error banners on failure
- [x] **Task 6:** Worker-Based Note Encryption (Argon2id + AES-256-GCM) with Session Caching (P1)
  - [x] Offload PBKDF2/Argon2id KDF to Web Crypto background / hardware acceleration to maintain 60 FPS (0ms UI freeze)
  - [x] Encrypt locked note bodies with hardware-accelerated AES-256-GCM before writing to IndexedDB
  - [x] Cache derived session `CryptoKey` in memory with configurable auto-lock timeout
  - [x] Implement exponential backoff rate limiting for passcode verification
- [x] **Task 7:** Secure Credential Storage & OS Keyring Integration (P0)
  - [x] Remove hardcoded encryption seeds from `src/utils/aiSecurity.ts`
  - [x] Integrate high-entropy device-unique salt and key derivation with legacy fallback
  - [x] Exclude credentials and security digests from standard backup exports
- [x] **Task 8:** AI Privacy Boundaries, Header Auth, Timeouts & Cancellation (P0 / P2)
  - [x] Block AI Merge / Auto-Tag on locked notes without explicit unlock
  - [x] Switch API key transport to HTTP request headers (`x-goog-api-key`)
  - [x] Add 15-second `AbortSignal` timeout and UI cancellation button for AI requests
- [x] **Task 9:** Standardize UUID Generation Across Entity Creation (P2)
  - [x] Replace `Date.now()` / random string ID generators with `crypto.randomUUID()`
  - [x] Verify entity ID uniqueness across notes, groups, and connections
- [x] **Checkpoint 2:** Authorization, Background Cryptography & Deletion Settlement verified

---

## Phase 3: Schema Interchange, Migration Safety & Journal Data Model (`v0.2.0-beta.1`)
- [x] **Task 10:** Strict Versioned JSON Backup Schema with Zod & Pre-Indexed Timestamps (P1)
  - [x] Implement versioned Zod schemas (`BackupDataV1`, `BackupDataV2`)
  - [x] Populate numeric integer timestamps (`createdTimestamp`, `updatedTimestamp`) to eliminate `new Date()` sort thrash
  - [x] Enforce 50MB file size cap and field type validation on import
  - [x] Isolate settings and security hashes from raw note imports
  - [x] Ensure backup import commits atomically to IndexedDB directly (eliminating in-memory bypasses)
- [x] **Task 11:** Staged Import Preview & Conflict Resolution Modal (P1)
  - [x] Create `ImportPreviewModal.tsx` showing parsed note counts and conflict summaries
  - [x] Implement conflict resolution strategies (Overwrite, Keep Both, Skip)
  - [x] Commit validated imports atomically to IndexedDB via transactional batch write
- [x] **Task 12:** Atomic Database Migration with Rollback Recovery Sentinel (P1)
  - [x] Execute database migrations in atomic `db.transaction('rw', ...)`
  - [x] Retain legacy `localStorage` backup snapshots across restarts
  - [x] Replace silent sample-note seeding with diagnostic recovery UI
- [x] **Task 13:** First-Class Journal Data Model & Pre-Aggregated Streak Set (P1)
  - [x] Add explicit `isDailyEntry: boolean` and `entryDate: string` fields to `Note`
  - [x] Maintain pre-aggregated set of entry dates to eliminate per-keystroke regex scans across all notes
  - [x] Synchronously flush pending typing snapshot debounce timers prior to executing `handleUndo` / `handleRedo`
  - [x] Implement automated one-time migration for legacy heuristic entries
- [x] **Task 14:** Accurate Network Transparency & Update Checker Settings (P1)
  - [x] Add user toggle for update checking in Settings modal
  - [x] Enforce update check disablement in `updateChecker.ts`
  - [x] Update README and product copy to reflect accurate network boundaries
- [x] **Checkpoint 3:** Schema Interchange, Fast Numerical Sorting, Atomic Imports & Journal Model verified

---

## Phase 4: Accessibility, Viewport Scalability & CI Quality Gates (`v0.2.0` GA)
- [x] **Task 15:** WCAG 2.1 AA Accessible Dialogs & List Virtualization (P1)
  - [x] Build `AccessibleDialog.tsx` with semantic roles, focus trapping, and Escape handling
  - [x] Integrate list virtualization into `SearchModal` and `NotesSidebar` (cap at ~25 DOM elements)
  - [x] Convert SearchModal, SecurityModal, SettingsModal, and CalendarModal to accessible dialogs
  - [x] Make sidebar note rows semantic `<button>` elements and add `aria-label`s to icon buttons
- [x] **Task 16:** Canvas Pointer Events Migration, 2D Minimap & Zero-Reflow Drag/Resize (P2)
  - [x] Migrate canvas pan, zoom, and dragging event listeners to Pointer Events
  - [x] Refactor `useNoteResize.ts` to DOM-direct transform (eliminate 60 FPS React re-renders)
  - [x] Replace rubber-band `getBoundingClientRect` loops with pure world-coordinate math (0 reflows)
  - [x] Replace 1,000 minimap DOM `<div>`s with a single HTML5 2D `<canvas>` (<0.1ms render)
- [x] **Task 17:** Decoupled Note Metadata & Web Worker Search Engine (P2)
  - [x] Create `NoteMetadata` schema in Dexie separating heavy markdown text
  - [x] Remove `allNotes` prop from `NoteCard` to eliminate canvas-wide re-render cascade
  - [x] Offload search indexing, regex snippet extraction, and queries to Web Worker (`search.worker.ts`)
  - [x] Cull SVG connection lines in `NoteConnections.tsx` to visible viewport bounds
- [x] **Task 18:** Structured Error Boundary, Native Window Close Handshake & Diagnostics (P2)
  - [x] Implement top-level React `ErrorBoundary.tsx` with emergency backup export
  - [x] Intercept native window close (`onCloseRequested` in Tauri) to await and flush pending IndexedDB writes before process exit
  - [x] Create local circular logging buffer in `logger.ts`
  - [x] Provide sanitized diagnostic support bundle export
- [x] **Task 19:** CI/CD Quality Gates & Documentation Hygiene (P1 / P3)
  - [x] Rename `package.json` to `diary-note` and remove duplicate Vite dependency
  - [x] Rename `sqliteStorage.ts` to `indexedDbStorage.ts`
  - [x] Unignore `docs/` in `.gitignore`
  - [x] Create GitHub Actions CI workflow for lint, test, build, and cargo check
- [x] **Checkpoint 4:** General Availability (`v0.2.0`) & High-Scale Performance (<5% CPU) verified
