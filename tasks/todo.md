# DiaryNote Remediation Task Checklist (`tasks/todo.md`)

## Phase 1: Zero-Loss Persistence & Desktop Sandboxing (`v0.2.0-alpha.1`)
- [ ] **Task 1:** Unified Note Repository & Autosave Settlement (P0)
  - [ ] Mark generated note ID dirty immediately on creation in `useNotesManager.ts`
  - [ ] Refactor paste confirmation and modal actions to use repository methods instead of direct `setNotes`
  - [ ] Await storage settlement before updating `lastSavedAt` and surface write failure banners
- [ ] **Task 2:** History Undo/Redo Persistence Synchronization (P2)
  - [ ] Connect `undo()` / `redo()` to `dirtyNoteIdsRef` in `useHistoryState.ts`
  - [ ] Re-insert restored deleted notes into IndexedDB on save flush
  - [ ] Add beforeunload dirty queue flush
- [ ] **Task 3:** Tauri Native Path Traversal Remediation & CSP Hardening (P0)
  - [ ] Strip directory separators, reject `..`, and validate canonical paths in `src-tauri/src/lib.rs`
  - [ ] Integrate `tauri-plugin-dialog` for native export file selection
  - [ ] Replace `"csp": null` with strict Content Security Policy in `tauri.conf.json`
- [ ] **Task 4:** Automated Persistence & Restart Test Suite Setup (P1)
  - [ ] Configure Vitest with `fake-indexeddb` and jsdom in `package.json`
  - [ ] Write integration test suite verifying note survival across app restarts
- [ ] **Checkpoint 1:** Zero-Loss Persistence & Desktop Sandboxing verified

---

## Phase 2: Authorization Engine & Cryptographic Vault (`v0.2.0-alpha.2`)
- [ ] **Task 5:** Centralized Authorization Policy Service (P0)
  - [ ] Create `src/services/authPolicyService.ts` with explicit `AccessIntent`
  - [ ] Enforce authorization check on batch export, multi-export, and card header clipboard copy
  - [ ] Redact locked notes from markdown mention extraction and graph links
- [ ] **Task 6:** True At-Rest Note Encryption (Argon2id + AES-256-GCM) (P1)
  - [ ] Derive 256-bit vault key via Argon2id / PBKDF2 with unique salt
  - [ ] Encrypt locked note bodies with AES-256-GCM before writing to IndexedDB
  - [ ] Implement exponential backoff rate limiting for passcode verification
- [ ] **Task 7:** Secure Credential Storage & OS Keyring Integration (P0)
  - [ ] Remove hardcoded encryption seeds from `src/utils/aiSecurity.ts`
  - [ ] Integrate Tauri native secure storage / OS keychain for desktop AI API keys
  - [ ] Exclude credentials and security digests from standard backup exports
- [ ] **Task 8:** AI Privacy Boundaries, Header Auth, Timeouts & Cancellation (P0 / P2)
  - [ ] Block AI Merge / Auto-Tag on locked notes without explicit unlock
  - [ ] Switch API key transport to HTTP request headers (`x-goog-api-key`)
  - [ ] Add 15-second `AbortSignal` timeout and UI cancellation button for AI requests
- [ ] **Task 9:** Standardize UUID Generation Across Entity Creation (P2)
  - [ ] Replace `Date.now()` / random string ID generators with `crypto.randomUUID()`
  - [ ] Verify entity ID uniqueness across notes, groups, and connections
- [ ] **Checkpoint 2:** Authorization & Cryptographic Vault verified

---

## Phase 3: Schema Validation, Migration Safety & Journal Data Model (`v0.2.0-beta.1`)
- [ ] **Task 10:** Strict Versioned JSON Backup Schema with Zod (P1)
  - [ ] Implement versioned Zod schemas (`BackupDataV1`, `BackupDataV2`)
  - [ ] Enforce 50MB file size cap and field type validation on import
  - [ ] Isolate settings and security hashes from raw note imports
- [ ] **Task 11:** Staged Import Preview & Conflict Resolution Modal (P1)
  - [ ] Create `ImportPreviewModal.tsx` showing parsed note counts and conflict summaries
  - [ ] Implement conflict resolution strategies (Overwrite, Keep Both, Skip)
  - [ ] Commit validated imports atomically to IndexedDB
- [ ] **Task 12:** Atomic Database Migration with Rollback Recovery Sentinel (P1)
  - [ ] Execute database migrations in atomic `db.transaction('rw', ...)`
  - [ ] Retain legacy `localStorage` backup snapshots across restarts
  - [ ] Replace silent sample-note seeding with diagnostic recovery UI
- [ ] **Task 13:** First-Class Journal Data Model & Streak Migration (P1)
  - [ ] Add explicit `isDailyEntry: boolean` and `entryDate: string` fields to `Note`
  - [ ] Refactor streak logic and calendar matching to use explicit fields exclusively
  - [ ] Implement automated one-time migration for legacy heuristic entries
- [ ] **Task 14:** Accurate Network Transparency & Update Checker Settings (P1)
  - [ ] Add user toggle for update checking in Settings modal
  - [ ] Enforce update check disablement in `updateChecker.ts`
  - [ ] Update README and product copy to reflect accurate network boundaries
- [ ] **Checkpoint 3:** Schema Interchange & Journal Model verified

---

## Phase 4: Accessibility, Viewport Scalability & CI Quality Gates (`v0.2.0` GA)
- [ ] **Task 15:** WCAG 2.1 AA Accessible Dialog and Drawer Primitives (P1)
  - [ ] Build `AccessibleDialog.tsx` with semantic roles, focus trapping, and Escape handling
  - [ ] Convert SearchModal, SecurityModal, SettingsModal, and CalendarModal to accessible dialogs
  - [ ] Make sidebar note rows semantic `<button>` elements and add `aria-label`s to icon buttons
- [ ] **Task 16:** Canvas Pointer Events Migration & Touch Gestures (P2)
  - [ ] Migrate canvas pan, zoom, and dragging event listeners to Pointer Events
  - [ ] Add touch pinch-to-zoom and multi-touch panning
  - [ ] Implement responsive drawer layout for compact viewports (<800px)
- [ ] **Task 17:** Decoupled Note Metadata & On-Demand Body Loading (P2)
  - [ ] Create `NoteMetadata` schema in Dexie separating heavy markdown text
  - [ ] Load note bodies asynchronously on viewport entry or editor focus
  - [ ] Offload search queries to a Web Worker
- [ ] **Task 18:** Structured Error Boundary & Support Bundle Diagnostics (P2)
  - [ ] Implement top-level React `ErrorBoundary.tsx` with emergency backup export
  - [ ] Create local circular logging buffer in `logger.ts`
  - [ ] Provide sanitized diagnostic support bundle export
- [ ] **Task 19:** CI/CD Quality Gates & Documentation Hygiene (P1 / P3)
  - [ ] Rename `package.json` to `diary-note` and remove duplicate Vite dependency
  - [ ] Rename `sqliteStorage.ts` to `indexedDbStorage.ts`
  - [ ] Unignore `docs/` in `.gitignore`
  - [ ] Create GitHub Actions CI workflow for lint, test, build, and cargo check
- [ ] **Checkpoint 4:** General Availability (`v0.2.0`) verified
