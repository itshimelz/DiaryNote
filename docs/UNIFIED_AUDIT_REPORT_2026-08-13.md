# DiaryNote Unified Application Audit & Industry Standards Review

**Date:** 2026-08-13  
**Audience:** Core Engineering, Product, and Security Teams  
**Scope:** Comprehensive static source review across React/TypeScript frontend, Tauri/Rust backend, build & CI configurations, documentation, data flow boundaries, and security controls.  
**Verification Baseline:** `npm run lint`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml` all pass cleanly. Passing builds confirm syntax and compilation validity, but do not guarantee runtime data integrity, privacy boundaries, or threat resistance.

---

## 1. Executive Summary & Product Evaluation

DiaryNote aims to unify three product paradigms into a cohesive desktop experience:
1. **A local-first spatial notebook** (infinite canvas, visual clustering, bi-directional links).
2. **A private, encrypted daily journal** (streak tracking, password protection, daily entries).
3. **An AI-assisted thought partner** (AI merge, semantic tagging, synthesis).

While the frontend showcases thoughtful UI architecture and rich spatial features, **the application is currently not release-ready for private, sensitive, or production note-taking use**. 

The core vulnerability stems from treating these three domains as isolated UI features rather than as an integrated, secure personal-data system. Critical issues include silent data loss on creation/paste, an unencrypted "lock" feature bypassed by exports and AI workflows, a native filesystem command vulnerable to directory traversal, and unvalidated backup/import boundaries.

### Severity Summary

| Severity | Count | Release Impact | Definition |
| :--- | :---: | :--- | :--- |
| **P0** | **5** | **Immediate Release Blocker** | Active data loss, authentication bypass, security sandbox breach, or arbitrary file overwrite. |
| **P1** | **6** | **Critical Product / Quality Risk** | Data corruption risks, missing quality gates, unencrypted secrets, accessibility blockers, or misleading privacy claims. |
| **P2** | **6** | **Reliability & Scalability Issue** | Performance degradation at scale, state synchronization bugs, touch/pointer gaps, or collision risks. |
| **P3** | **1** | **Documentation & Polish** | Inaccurate architecture documentation and misleading naming. |

### Overall Health Score

| Dimension | Score | Primary Finding |
| :--- | :---: | :--- |
| **Data Integrity & Persistence** | **1 / 4** | Newly created, pasted, and undo/redo notes can report "saved" while completely failing to persist to disk. |
| **Security & Privacy** | **1 / 4** | Passcode protection is UI-only obfuscation; note contents remain plaintext in IndexedDB and are exfiltrated via backups, graph indexing, clipboard, and AI prompts. |
| **Accessibility (a11y)** | **1 / 4** | Modals, drawers, and note rows lack semantic roles, focus trapping, keyboard handlers, and screen-reader semantics. |
| **Performance & Scalability** | **2 / 4** | Canvas culls card DOM nodes, but startup, search, sidebar, minimap, and connection graphing force-load and scan entire note bodies in memory. |
| **Desktop & Native Robustness** | **2 / 4** | Native Tauri file export trusts webview paths with disabled CSP; error handling is predominantly swallowed or console-only. |
| **Engineering Gates & Governance** | **1 / 4** | Zero test coverage; CI checks version sync only; package manager and dependency version mismatches across configs. |
| **Composite Score** | **8 / 24** | **Poor — Comprehensive Remediation Required Before Public Release** |

---

## 2. Intended Use-Case vs. Industry Standards Baseline

| Product Promise / Use Case | Industry Standard Baseline | DiaryNote Current State | Compliance Verdict |
| :--- | :--- | :--- | :---: |
| **Local-First Notes** | Every mutation is guaranteed durable or visibly flagged unsaved with error recovery; transactional writes. | New notes, pastes, and undos bypass dirty-tracking; DB failures are swallowed while UI updates `lastSavedAt`. | ❌ **Non-Compliant** |
| **Private Journal** | Locked notes are encrypted at rest using a memory-hard KDF (Argon2id/scrypt) and authenticated encryption (AES-GCM/ChaCha20-Poly1305); strict access control across all app features. | `isLocked` is a UI rendering flag; notes stored in plaintext in IndexedDB; passwords hashed with single unsalted SHA-256; recovery questions easily guessed. | ❌ **Non-Compliant** |
| **Backup & Restore** | Versioned schema, strict type/size validation, sanitization, dry-run conflict preview, atomic commit, credentials excluded by default. | Raw JSON parsed with basic array check; entire settings (including AI keys and lock hashes) exported/imported; no schema versioning. | ❌ **Non-Compliant** |
| **Optional AI Integration** | Per-request explicit consent, clear data destination disclosure, timeout/cancellation controls, and zero access to locked notes without authorization. | Selected note bodies sent directly to external endpoints; Gemini API keys sent via URL query params; locked notes can be merged and synthesized into plaintext notes. | ❌ **Non-Compliant** |
| **Desktop Shell Security** | Sandboxed native commands, explicit user-picked file dialogs, path canonicalization, strict Content Security Policy (CSP). | `save_export_file` accepts arbitrary relative/absolute paths; writes anywhere user has write access; `"csp": null` configured in Tauri. | ❌ **Non-Compliant** |
| **Accessible Productivity** | Semantic dialogs (`role="dialog"`), focus trap/restoration, keyboard-navigable lists, accessible labels on all icon buttons. | Plain `div` overlays without focus trap or Escape listener; sidebar note items are unclickable `div`s; icon buttons lack accessible names. | ❌ **Non-Compliant** |

---

## 3. Architecture & Feature-Interaction Flow

The primary failure modes originate at cross-feature boundaries rather than isolated UI components. The diagram below illustrates how data traverses the application without a centralized persistence coordinator or authorization gate:

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           Mutation Ingress                             │
  │     [Note Create]      [Clipboard Paste]      [Undo / Redo]            │
  │     [JSON Import]      [AI Merge Note]        [Batch Edit]             │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    React State (setNotes)     │
                      └───────────────┬───────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
  ┌─────────────────────────┐                   ┌─────────────────────────┐
  │  Dirty Queue Tracking   │                   │ Direct State Bypasses   │
  │ (dirtyNoteIdsRef set)   │                   │ (Create, Paste, Undo)   │
  └────────────┬────────────┘                   └────────────┬────────────┘
               │ (Autosave Effect)                           │ (Never Queued)
               ▼                                             ▼
  ┌─────────────────────────┐                   ┌─────────────────────────┐
  │  IndexedDB (via Dexie)  │                   │   Silent Data Loss on   │
  │  * Plaintext Storage *  │                   │      App Restart        │
  └────────────┬────────────┘                   └─────────────────────────┘
               │
               ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                          Global Data Read                              │
  │  Search Modal │ Sidebar List │ Graph Connections │ Minimap │ Calendar │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ isLocked Boolean Check   │
                         │ (Enforced only in Cards) │
                         └────────────┬─────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             ▼                        ▼                        ▼
  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
  │    Data Export      │  │     External AI     │  │  Tauri Native FS    │
  │ Full & Batch Backups│  │ Merge & Auto-Tag    │  │ save_export_file    │
  │ export raw locked   │  │ transmits locked    │  │ writes traversal    │
  │ note contents       │  │ note bodies         │  │ paths to disk       │
  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Root Architectural Defect:** There is no unified repository layer or domain policy engine answering:
1. *"Is this mutation acknowledged as durably saved before the UI reflects success?"*
2. *"Is the current caller authorized to read, copy, export, index, or transmit this note?"*

---

## 4. Comprehensive Audit Findings

### Priority 0 — Critical Release Blockers

---

#### Finding 4.1 (P0): New and Pasted Notes Disappear After App Restart
- **Locations:** [`src/hooks/useNotesManager.ts:57-105`](file:///home/itshimelz/Projects/DiaryNote/src/hooks/useNotesManager.ts#L57-L105), [`src/hooks/useNotesManager.ts:35-48`](file:///home/itshimelz/Projects/DiaryNote/src/hooks/useNotesManager.ts#L35-L48), [`src/components/Modals/AppModals.tsx:314-320`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/AppModals.tsx#L314-L320).
- **Mechanism:** `handleAddNote` appends a new note object to React state but fails to add the generated note ID to `dirtyNoteIdsRef`. The autosave timer inspects `dirtyNoteIdsRef`, finds it empty, and skips persistence. Similarly, clipboard paste confirmation calls `handleAddNote` and subsequently mutates state with `setNotes` directly without marking the note dirty.
- **Impact:** A user can create a note, paste substantial journal content into it, observe the canvas update with `lastSavedAt` refreshing, close the application, and suffer complete, unrecoverable data loss.
- **Remediation:** 
  1. Route all note mutations (add, paste, update, delete) through a single transactional repository coordinator.
  2. Immediately append new note IDs to `dirtyNoteIdsRef` or execute immediate synchronous persistence.
  3. Only update `lastSavedAt` after storage acknowledgement resolves successfully.
  4. Implement integration tests asserting persistence across simulated restarts for note creation, pasting, and deletion.

---

#### Finding 4.2 (P0): Locked Notes Exfiltrated via Backups, Batch Export, and AI Workflows
- **Locations:** [`src/components/CanvasControls.tsx:722-732`](file:///home/itshimelz/Projects/DiaryNote/src/components/CanvasControls.tsx#L722-L732), [`src/components/BatchActionBar.tsx:566-580`](file:///home/itshimelz/Projects/DiaryNote/src/components/BatchActionBar.tsx#L566-L580), [`src/components/Modals/AppModals.tsx:285-292`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/AppModals.tsx#L285-L292), [`src/App.tsx:260-323`](file:///home/itshimelz/Projects/DiaryNote/src/App.tsx#L260-L323), [`src/components/NoteCard/NoteHeader.tsx:88-96,421-434`](file:///home/itshimelz/Projects/DiaryNote/src/components/NoteCard/NoteHeader.tsx#L88-L96).
- **Mechanism:** Locking is only checked in single-card UI display handlers. Full backup exports, selected-note batch exports, context-menu multi-exports, and note-card header copy buttons directly read and serialize raw `Note` instances (including `content` and `title`) without verifying passcode authentication. Furthermore, AI Merge and AI Auto-Tag send full note text to third-party endpoints and generate a new, unencrypted note containing the merged contents.
- **Impact:** Any user with transient access to an open session can bypass note passcodes by downloading a backup, executing a batch export, clicking copy in the header, or initiating an AI merge.
- **Remediation:**
  1. Establish a centralized `authorizeNotes(ids: string[], intent: AccessIntent)` policy engine.
  2. Forbid serialization, clipboard copying, or AI transmission of locked records without recent explicit session authentication.
  3. Exclude locked notes from default exports or export them exclusively in encrypted ciphertext format.

---

#### Finding 4.3 (P0): Native Export Command Allows Path Traversal and Arbitrary File Overwrites
- **Locations:** [`src-tauri/src/lib.rs:1-19`](file:///home/itshimelz/Projects/DiaryNote/src-tauri/src/lib.rs#L1-L19), [`src-tauri/tauri.conf.json:24-26`](file:///home/itshimelz/Projects/DiaryNote/src-tauri/tauri.conf.json#L24-L26).
- **Mechanism:** The Tauri command `save_export_file` accepts untrusted `filename` and `subfolder` string arguments from the webview and joins them directly via `Path::join` without canonicalization or validation. Arguments containing `..` or absolute paths escape `~/DiaryNote`. Simultaneously, `"csp": null` is set in `tauri.conf.json`, disabling Content Security Policy protections.
- **Impact:** If the webview executes malicious or compromised script, it can invoke `save_export_file` to overwrite critical system configuration files (`~/.bashrc`, `~/.ssh/authorized_keys`, etc.) with arbitrary content.
- **Remediation:**
  1. Migrate desktop exports to native OS save dialogs (`tauri-plugin-dialog`).
  2. If preserving automated exports, strictly sanitize filenames (`Path::file_name`), reject path separators and `..`, canonicalize paths, and assert that destination paths reside within `~/DiaryNote`.
  3. Configure a strict Content Security Policy forbidding unauthorized script evaluation and network egress.

---

#### Finding 4.4 (P0): Sensitive API Keys and Credentials Obfuscated in Client Storage
- **Locations:** [`src/utils/aiSecurity.ts:6-8,33-42`](file:///home/itshimelz/Projects/DiaryNote/src/utils/aiSecurity.ts#L6-L8), [`src/lib/storage.ts:295-306`](file:///home/itshimelz/Projects/DiaryNote/src/lib/storage.ts#L295-L306).
- **Mechanism:** The AI encryption seed key is hardcoded directly into renderer source code, the salt is kept in plaintext `localStorage`, and the encrypted ciphertext/IV is stored in application settings. Backups serialize the entire settings object.
- **Impact:** Anyone with local machine access, exported backup files, or repository source access can derive the master key and decrypt stored AI provider API keys.
- **Remediation:**
  1. Use OS-level secure credential storage (such as Tauri Keyring / Stronghold integration).
  2. Never store hardcoded encryption keys in client-side bundles.
  3. Exclude all secrets and credentials from standard backup exports by default.

---

#### Finding 4.5 (P0): Note Persistence Pipeline Can Report Success on Failed Writes
- **Locations:** [`src/hooks/useNotesManager.ts:35-48`](file:///home/itshimelz/Projects/DiaryNote/src/hooks/useNotesManager.ts#L35-L48), [`src/lib/sqliteStorage.ts:139-215`](file:///home/itshimelz/Projects/DiaryNote/src/lib/sqliteStorage.ts#L139-L215).
- **Mechanism:** Storage helper functions catch IndexedDB write exceptions, log them to the console, and return `void`. The autosave effect clears `dirtyNoteIdsRef` immediately upon dispatching the asynchronous operation without awaiting promise settlement. `lastSavedAt` is updated unconditionally.
- **Impact:** Under quota exhaustion, browser private mode constraints, or storage corruption, notes silently fail to write while the user interface falsely indicates that content is securely saved.
- **Remediation:**
  1. Make storage APIs return `Promise<Result<void, StorageError>>`.
  2. Await persistence confirmation before pruning IDs from the dirty queue.
  3. Render prominent UI error indicators upon persistence failures and prompt the user to export emergency backups.

---

### Priority 1 — Significant Security, Data Integrity, and UX Risks

---

#### Finding 4.6 (P1): Lock Feature is Client-Side Obscurity with Unsalted Hashing
- **Locations:** [`src/components/NoteCard/index.tsx:491-517`](file:///home/itshimelz/Projects/DiaryNote/src/components/NoteCard/index.tsx#L491-L517), [`src/lib/sqliteStorage.ts:5-20`](file:///home/itshimelz/Projects/DiaryNote/src/lib/sqliteStorage.ts#L5-L20), [`src/utils/security.ts:1-15`](file:///home/itshimelz/Projects/DiaryNote/src/utils/security.ts#L1-L15), [`src/components/Modals/SecurityModal.tsx:51-104`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/SecurityModal.tsx#L51-L104).
- **Mechanism:** Locked notes are stored in plaintext within IndexedDB; only card rendering is masked. Passcode and recovery verification rely on a single unsalted SHA-256 hash, permit weak 4-character passcodes, enforce no rate limiting or brute-force throttling, and use easily guessable personal questions.
- **Impact:** Any local process or browser inspection tool can extract all "locked" private diary entries immediately without cracking passwords.
- **Remediation:**
  1. Rebrand the existing feature as "Visual Masking" or implement authentic zero-knowledge encryption at rest.
  2. For true encryption: derive per-note encryption keys using Argon2id with cryptographically secure random salts and AES-256-GCM.
  3. Enforce rate limiting and exponential backoff on unlock attempts.

---

#### Finding 4.7 (P1): First-Run Migration Deletes Fallback Source and Replaces Data with Demo Samples
- **Locations:** [`src/lib/sqliteStorage.ts:31-52,85-91,248-256`](file:///home/itshimelz/Projects/DiaryNote/src/lib/sqliteStorage.ts#L31-L52).
- **Mechanism:** On startup, the migration runner writes notes from `localStorage` to IndexedDB, marks migration complete, and calls `compactDatabase()` to wipe all legacy `localStorage` keys. If an error occurs during or after initialization, the error handler falls back to seeding mock sample notes.
- **Impact:** An initialization glitch or interrupted migration can destroy original notes in `localStorage` and permanently overwrite the user's workspace with sample notes.
- **Remediation:**
  1. Perform migration within an atomic database transaction.
  2. Retain timestamped legacy backups until verified across multiple successful application restarts.
  3. Never silently inject sample notes when an existing database configuration is present; enter a safe diagnostic recovery mode instead.

---

#### Finding 4.8 (P1): Unvalidated, Unbounded JSON Backup Imports
- **Locations:** [`src/lib/storage.ts:325-349`](file:///home/itshimelz/Projects/DiaryNote/src/lib/storage.ts#L325-L349), [`src/App.tsx:395-450`](file:///home/itshimelz/Projects/DiaryNote/src/App.tsx#L395-L450).
- **Mechanism:** Backup import verifies only that `parsed.notes` is an array. It enforces no JSON size limits, validates no note schema fields (coordinates, dates, IDs), and merges arbitrary imported settings directly into the active application profile.
- **Impact:** Malformed backup files can corrupt canvas coordinate spaces, inject malicious custom AI endpoints, overwrite master security hashes, or crash the app with invalid date structures.
- **Remediation:**
  1. Define a strict, versioned JSON schema (using Zod or Valibot) for imports.
  2. Implement a pre-import validation staging step showing note counts, conflicts, and warnings.
  3. Import notes atomically and require explicit confirmation before overwriting system preferences.

---

#### Finding 4.9 (P1): Modals, Drawers, and Sidebar Violate Accessibility (WCAG 2.1 AA)
- **Locations:** [`src/components/Modals/SearchModal.tsx:184-198`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/SearchModal.tsx#L184-L198), [`src/components/Modals/SecurityModal.tsx:106-137`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/SecurityModal.tsx#L106-L137), [`src/components/NotesSidebar.tsx:79-108,197-207`](file:///home/itshimelz/Projects/DiaryNote/src/components/NotesSidebar.tsx#L79-L108).
- **Mechanism:** Modals are rendered as standard `<div>` elements without `role="dialog"`, `aria-modal="true"`, focus trapping, focus restoration, or `Escape` key listeners. Sidebar note list items are interactive `<div>` tags lacking keyboard activation (`Enter`/`Space`) and `role="button"`. Numerous icon controls lack accessible names.
- **Impact:** Screen-reader and keyboard-only users cannot reliably open, navigate, or dismiss dialogs, and may be unable to select notes from the sidebar.
- **Remediation:**
  1. Introduce a standardized Dialog/Drawer primitive using HTML `<dialog>` or Headless UI / Radix UI primitives.
  2. Ensure complete focus trapping, background `inert` attribute application, and focus restoration.
  3. Ensure all interactive icons have explicit `aria-label` attributes and keyboard event handlers.

---

#### Finding 4.10 (P1): Daily Journal Logic Relies on Title and Tag Heuristics
- **Locations:** [`src/hooks/useNotesManager.ts:121-132`](file:///home/itshimelz/Projects/DiaryNote/src/hooks/useNotesManager.ts#L121-L132), [`src/utils/journalUtils.ts:41-53`](file:///home/itshimelz/Projects/DiaryNote/src/utils/journalUtils.ts#L41-L53), [`src/components/Modals/JournalCalendarModal.tsx:86-99`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/JournalCalendarModal.tsx#L86-L99).
- **Mechanism:** Daily entry lookups and streak computations scan note titles for date strings or search for `#journal` tags rather than querying dedicated, normalized journal metadata fields (`isDailyEntry`, `entryDate`).
- **Impact:** Regular notes containing date titles or accidental tags falsely collide with daily journal lookups, skew streak calculations, and cause calendar duplicate errors.
- **Remediation:**
  1. Make `isDailyEntry: boolean` and `entryDate: string` (ISO format `YYYY-MM-DD`) the single source of truth for journal entries.
  2. Run a one-time migration to normalize existing heuristic-based journal records.

---

#### Finding 4.11 (P1): "100% Offline" Claims Contradicted by Automatic Background Network Requests
- **Locations:** [`README.md:34-37,72-78`](file:///home/itshimelz/Projects/DiaryNote/README.md#L34-L37), [`src/App.tsx:120-127`](file:///home/itshimelz/Projects/DiaryNote/src/App.tsx#L120-L127), [`src/utils/updateChecker.ts:42-117`](file:///home/itshimelz/Projects/DiaryNote/src/utils/updateChecker.ts#L42-L117).
- **Mechanism:** The documentation advertises the application as "100% Offline & Private", yet startup unconditionally initiates network requests to GitHub API endpoints to check for updates, transmitting IP and runtime information.
- **Impact:** Misrepresents privacy guarantees to users operating in strict offline or air-gapped environments.
- **Remediation:**
  1. Add an explicit setting toggle for automatic update checks, default to opt-in or transparent disclosure.
  2. Update documentation and marketing copy to reflect accurate network behavior.

---

### Priority 2 — Important Reliability, Scalability, and Desktop Quality Issues

---

#### Finding 4.12 (P2): Undo/Redo State Transitions Are Not Persisted
- **Locations:** [`src/hooks/useHistoryState.ts:25-40`](file:///home/itshimelz/Projects/DiaryNote/src/hooks/useHistoryState.ts#L25-L40), [`src/App.tsx:129-130`](file:///home/itshimelz/Projects/DiaryNote/src/App.tsx#L129-L130).
- **Mechanism:** History undo and redo handlers update React state directly (`setNotes(historyState.present)`) without registering modified or restored note IDs with the autosave dirty tracking mechanism.
- **Impact:** Undo actions visible on the canvas are lost upon restarting the application, resulting in state divergence.
- **Remediation:** Integrate history state transitions into the unified persistence coordinator and mark all altered note IDs dirty.

---

#### Finding 4.13 (P2): Infinite Canvas Lacks Data Virtualization and Full-Text Scalability
- **Locations:** [`src/lib/sqliteStorage.ts:54,123-133`](file:///home/itshimelz/Projects/DiaryNote/src/lib/sqliteStorage.ts#L54), [`src/components/InfiniteCanvas.tsx:402-414`](file:///home/itshimelz/Projects/DiaryNote/src/components/InfiniteCanvas.tsx#L402-L414), [`src/components/NotesSidebar.tsx:57-73`](file:///home/itshimelz/Projects/DiaryNote/src/components/NotesSidebar.tsx#L57-L73), [`src/components/Modals/SearchModal.tsx:52-149`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/SearchModal.tsx#L52-L149).
- **Mechanism:** Startup loads all notes into memory via `db.notes.toArray()`. While off-screen card rendering is culled, sidebar lists, tag extractors, search queries, and minimaps continuously iterate over all complete note bodies in the main thread.
- **Impact:** Startup latency, memory consumption, and frame rendering times degrade substantially in notebooks with >1,000 notes.
- **Remediation:**
  1. Decouple lightweight note metadata (id, title, coordinates, tags, dates) from full text content.
  2. Load note bodies asynchronously on-demand (when entering viewport or opening editor).
  3. Offload full-text search indexing to a dedicated Web Worker or Dexie IndexedDB index.

---

#### Finding 4.14 (P2): AI and Network Requests Lack Timeouts and Cancellation Controls
- **Locations:** [`src/services/ai/aiMergeService.ts:71-314`](file:///home/itshimelz/Projects/DiaryNote/src/services/ai/aiMergeService.ts#L71-L314), [`src/utils/updateChecker.ts:42-117`](file:///home/itshimelz/Projects/DiaryNote/src/utils/updateChecker.ts#L42-L117), [`src/App.tsx:281-343`](file:///home/itshimelz/Projects/DiaryNote/src/App.tsx#L281-L343).
- **Mechanism:** API `fetch` requests lack `AbortController` timeouts. Gemini API keys are appended as URL query parameters (`?key=...`) rather than passed via HTTP request headers.
- **Impact:** Unresponsive AI endpoints lock the merge UI indefinitely. API keys can be leaked in web server access logs and proxy caches.
- **Remediation:** Pass `AbortSignal.timeout(15000)` to all fetch requests, support user cancellation, and transmit authentication keys in request headers where supported.

---

#### Finding 4.15 (P2): Fragile ID Generation and Collision Vulnerability
- **Locations:** [`src/App.tsx:304-305`](file:///home/itshimelz/Projects/DiaryNote/src/App.tsx#L304-L305), [`src/components/NoteCard/index.tsx:811-820`](file:///home/itshimelz/Projects/DiaryNote/src/components/NoteCard/index.tsx#L811-L820), [`src/components/Modals/AppModals.tsx:266-281`](file:///home/itshimelz/Projects/DiaryNote/src/components/Modals/AppModals.tsx#L266-L281).
- **Mechanism:** Multiple creation paths generate entity IDs using `Date.now().toString()` or `Date.now() + Math.random()`. Rapid programmatic creation or imports within the same millisecond can create identical IDs.
- **Impact:** ID collisions silently overwrite existing notes in IndexedDB and break graph connection references.
- **Remediation:** Standardize on standard `crypto.randomUUID()` for all newly generated note, group, and connection IDs.

---

#### Finding 4.16 (P2): Desktop Touch/Pointer Interaction and Mobile Adaptivity Gaps
- **Locations:** [`src-tauri/tauri.conf.json:13-22`](file:///home/itshimelz/Projects/DiaryNote/src-tauri/tauri.conf.json#L13-L22), [`src/components/InfiniteCanvas.tsx:88-108,321-369`](file:///home/itshimelz/Projects/DiaryNote/src/components/InfiniteCanvas.tsx#L88-L108), [`src/components/NotesSidebar.tsx:80-85`](file:///home/itshimelz/Projects/DiaryNote/src/components/NotesSidebar.tsx#L80-L85).
- **Mechanism:** Canvas pan and zoom event handlers bind mouse events rather than standardized Pointer Events (`onPointerDown`, `setPointerCapture`). Window minimum bounds are fixed at 800×600, and the sidebar layout lacks a responsive compact drawer mode.
- **Impact:** Broken touch navigation on touchscreen laptops and tablets; layout clipping on narrow screen splits.
- **Remediation:** Refactor canvas event handling to Unified Pointer Events and implement responsive drawer styles.

---

#### Finding 4.17 (P2): Build Configurations Strip Console Logging While Lacking Structured Error Reporting
- **Locations:** [`vite.config.ts:60-62`](file:///home/itshimelz/Projects/DiaryNote/vite.config.ts#L60-L62), [`src/lib/sqliteStorage.ts:139-215`](file:///home/itshimelz/Projects/DiaryNote/src/lib/sqliteStorage.ts#L139-L215).
- **Mechanism:** Production Vite builds drop console statements via `drop: ['console', 'debugger']`. However, the app relies heavily on `console.error` for diagnostic reporting without providing a user-visible fallback or local log collector.
- **Impact:** When production builds encounter storage or native bridge errors, no diagnostic trace is available to the user or developer.
- **Remediation:** Introduce an explicit ErrorBoundary and diagnostic logging service that records errors to a local circular buffer or support export file.

---

### Priority 3 — Documentation and Code Hygiene

---

#### Finding 4.18 (P3): Misleading Storage Terminology ("SQLite" vs. IndexedDB/Dexie) and Project Metadata Inconsistencies
- **Locations:** [`README.md:7,13,34-37`](file:///home/itshimelz/Projects/DiaryNote/README.md#L7), [`src/lib/sqliteStorage.ts:1-20`](file:///home/itshimelz/Projects/DiaryNote/src/lib/sqliteStorage.ts#L1-L20), [`package.json:1-15`](file:///home/itshimelz/Projects/DiaryNote/package.json#L1-L15).
- **Mechanism:** The codebase names its primary persistence file `sqliteStorage.ts` and documents "SQLite database" in `README.md`, whereas it strictly uses Dexie.js over browser IndexedDB. Additionally, `package.json` retains the default name `react-example`, lists `vite` under both `dependencies` and `devDependencies`, and `.gitignore` ignores `docs/`.
- **Impact:** Misleads users and contributors regarding backup formats, data portability, and underlying storage mechanics.
- **Remediation:** Rename `sqliteStorage.ts` to `indexedDbStorage.ts`, correct documentation claims, clean up `package.json`, and remove `docs/` from `.gitignore`.

---

## 5. Existing Strengths to Retain

Despite the findings above, DiaryNote demonstrates several well-engineered foundations that should be preserved during remediation:

1. **Clean TypeScript and Rust Compilation:** Clean builds with zero linter errors and passing `cargo check` across all packages.
2. **Modular Frontend Structure:** Clear separation of concerns between canvas controllers, UI modals, state hooks, and utility layers.
3. **Canvas Rendering Optimization:** Viewport bounding-box culling, debounced transforms, and `requestAnimationFrame` render throttling demonstrate solid visual performance awareness.
4. **Security Best Practices in Webview Links:** External markdown links enforce `rel="noopener noreferrer"`, mitigating reverse-tabnabbing risks.
5. **Modals Code Splitting:** Lazy-loading of heavy modal components (`SearchModal`, `SecurityModal`, `JournalCalendarModal`) keeps the initial bundle lightweight.

---

## 6. Comprehensive Remediation Roadmap

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                     Phase 1: Zero-Loss Persistence & Sandbox              │
│  - Unified Note Repository & Autosave Queue Settlement                    │
│  - Native Path Traversal Fix & Strict CSP Implementation                  │
│  - Automated Restart Tests for Note CRUD, Paste, and Undo                 │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Phase 2: Authorization & Privacy Boundary             │
│  - Centralized authorizeNotes() Policy Engine                             │
│  - Block Locked Notes from Backup, Batch Export, AI Merge, & Clipboard    │
│  - True At-Rest Zero-Knowledge Encryption (Argon2id + AES-GCM)            │
│  - Secure OS Keyring Integration for AI Credentials                       │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Phase 3: Data Safety, Schema & Validation             │
│  - Versioned JSON Schema & Pre-Import Conflict Preview Staging            │
│  - Atomic Transactional Migration with Rollback Recovery Sentinel         │
│  - Formalize isDailyEntry & entryDate Journal Data Model                  │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Phase 4: a11y, Scalability & Engineering Gates        │
│  - Accessible Dialog/Drawer Primitives & Pointer Event Gestures           │
│  - Metadata vs. Body Decoupling & Virtualized Search Worker               │
│  - Vitest + Playwright CI Quality Gates & Accurate Documentation          │
└───────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Core Data Persistence & Desktop Sandboxing (Immediate)
1. **Unify Mutation Pipeline:** Replace fragmented `setNotes` calls with a unified note repository that synchronously tracks dirty IDs and settles promises before updating `lastSavedAt`.
2. **Harden Native Export:** Restrict `save_export_file` in `src-tauri/src/lib.rs` to validate bare filenames, enforce canonical export paths, and activate a restrictive CSP in `tauri.conf.json`.
3. **Persist Undo/Redo & Paste:** Connect paste and history transitions directly to the dirty autosave queue.
4. **Automate Restart Tests:** Create integration tests verifying that added, pasted, edited, and deleted notes survive simulated app restarts.

### Phase 2: Security, Access Policy & Cryptographic Vault
1. **Centralize Authorization:** Enforce `authorizeNotes(ids, intent)` on every data consumer (Search, Export, AI Merge, Connection Graph, Sidebar, Clipboard).
2. **Implement Real Encryption at Rest:** Protect sensitive notes with Argon2id key derivation and authenticated AES-256-GCM encryption; do not store plaintext in IndexedDB.
3. **Secure API Key Management:** Store user API credentials in the OS keyring or secure vault; remove hardcoded encryption seeds from frontend code.
4. **AI Safeguards:** Implement request timeouts (`AbortController`), cancellation buttons, header-based API key transport, and explicit destination disclosures.

### Phase 3: Schema Validation, Migration Safety & Journal Data Model
1. **Strict Backup Schema:** Define versioned Zod schemas for imports; validate and sanitize all fields before commit.
2. **Safe Idempotent Migrations:** Execute data migrations within atomic transactions; retain legacy backups until subsequent launch verification.
3. **First-Class Journal Model:** Transition journal tracking to explicit `isDailyEntry` and `entryDate` properties, eliminating title/tag guessing.
4. **UUID Standardization:** Migrate all ID generation routines to `crypto.randomUUID()`.

### Phase 4: Accessibility, Performance Scalability & Quality Gates
1. **Accessible UI Architecture:** Replace custom modal `div`s with semantic `<dialog>` containers featuring focus traps, ARIA attributes, and keyboard listeners.
2. **Scale Canvas Data Layer:** Separate note metadata from body text; implement on-demand body loading and worker-backed search indexing.
3. **Pointer Events Migration:** Upgrade canvas gesture handling from mouse events to standard Pointer Events for touch/tablet compatibility.
4. **Establish CI Testing Gates:** Integrate Vitest unit/integration suites and Tauri smoke tests into PR validation workflows.
5. **Correct Documentation:** Rebrand Dexie references accurately, synchronize package configurations, and track documentation in version control.

---

## 7. Official Release Decision

> **Verdict: DO NOT RELEASE AS SECURE / PRIVATE JOURNAL IN CURRENT STATE.**
>
> The current build may be utilized solely as an **experimental spatial canvas for non-sensitive notes**, accompanied by explicit advisories regarding manual backups and offline limitations. Public beta positioning as a secure, private, or encrypted personal diary must be deferred until **Phase 1 and Phase 2 remediation milestones are complete and verified by automated testing suites**.
