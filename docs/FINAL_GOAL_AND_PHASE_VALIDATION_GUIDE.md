# DiaryNote: Final Goal & Phase-by-Phase Acceptance Testing Guide

**Document Version:** 1.0.0  
**Target Milestone:** `v0.2.0` General Availability (GA)  
**Document Purpose:** Defines the north star user experience, final system state, and concrete, step-by-step test scenarios for validating each phase of the remediation roadmap. Use this guide to verify behavior and test the application manually and automatically.

---

## Table of Contents
1. [The North Star: Final Product Goal & Invariants](#1-the-north-star-final-product-goal--invariants)
2. [Phase 1: Zero-Loss Persistence & Desktop Sandboxing (`v0.2.0-alpha.1`)](#2-phase-1-zero-loss-persistence--desktop-sandboxing)
3. [Phase 2: Authorization Engine & Cryptographic Vault (`v0.2.0-alpha.2`)](#3-phase-2-authorization-engine--cryptographic-vault)
4. [Phase 3: Schema Interchange, Migration Rollback & Journal Model (`v0.2.0-beta.1`)](#4-phase-3-schema-interchange-migration-rollback--journal-model)
5. [Phase 4: Accessibility, Scalability & Quality Gates (`v0.2.0` GA)](#5-phase-4-accessibility-scalability--quality-gates)
6. [Comprehensive End-to-End Final Test Flight Matrix](#6-comprehensive-end-to-end-final-test-flight-matrix)

---

## 1. The North Star: Final Product Goal & Invariants

When all four phases are complete, DiaryNote will be a **hardened, privacy-respecting, local-first spatial notebook and encrypted personal journal**. 

### The Core User Promise
> *"Every note I write or paste is instantly and durably saved to my device. My locked diary entries are encrypted at rest with zero-knowledge cryptography and can never be read, copied, exported, or sent to an AI provider without my explicit passcode. The desktop app is securely sandboxed, fully keyboard accessible, lightning-fast with thousands of notes, and operates 100% offline unless I choose otherwise."*

### System Target Scorecard

| Dimension | Current State (`v0.1.4`) | Final Target State (`v0.2.0`) |
| :--- | :---: | :---: |
| **Data Integrity & Persistence** | 1 / 4 (Notes lost on reload) | **4 / 4** (Zero-loss transactional repository; save error banners; reload proof) |
| **Security & Privacy** | 1 / 4 (UI-only masking; plain IndexedDB) | **4 / 4** (Argon2id + AES-256-GCM zero-knowledge vault; OS keychain secrets) |
| **Accessibility (WCAG 2.1 AA)** | 1 / 4 (Unsemantic `div` overlays) | **4 / 4** (Semantic `<dialog>`, focus traps, full keyboard navigation) |
| **Performance & Scalability** | 2 / 4 (All bodies kept in RAM) | **4 / 4** (Decoupled metadata; on-demand body loading; worker search) |
| **Desktop Sandboxing** | 2 / 4 (Path traversal vulnerability) | **4 / 4** (Native OS dialogs; strict path canonicalization; locked-down CSP) |
| **Engineering Quality Gates** | 1 / 4 (0 tests; fake CI benchmark) | **4 / 4** (Automated Vitest & Playwright suites enforcing PR invariants) |
| **Composite Quality Score** | **8 / 24 (Poor)** | **24 / 24 (Excellent / Enterprise Grade)** |

---

## 2. Phase 1: Zero-Loss Persistence & Desktop Sandboxing

**Target Version:** `v0.2.0-alpha.1`  
**Focus:** Fix P0 data persistence bugs, guarantee write settlement, synchronize undo/redo, and secure native desktop file export.

### Expected App Behaviors
1. **Immediate Durability:** When you create a new note, double-click the canvas, or paste multi-line markdown text, the content is saved immediately. Refreshing or force-quitting the app never loses a single word.
2. **Accurate Save Status:** The status bar only displays "Saved" *after* the database has written the bytes to disk. If storage fails (e.g. disk full), an amber/red warning badge appears with an emergency export option.
3. **Undo/Redo Persistence:** Pressing `Ctrl+Z` to restore a deleted note or undo text changes survives app reloads.
4. **Sandboxed Exports:** File exports use the native OS Save As picker or write strictly inside `~/DiaryNote`, preventing accidental or malicious file overwrites elsewhere on the operating system.

### Step-by-Step Testing & Verification

#### Test 1.1: Rapid Note Creation & Immediate Reload
- **Action:** Click "New Note" (or press `N`). Type `"Test Persistence Note 1"`. Without clicking elsewhere, press `F5` / `Ctrl+R` immediately (within 500ms).
- **Expected Outcome:** After reload, the note is still on the canvas with its exact title and default position intact.

#### Test 1.2: Clipboard Paste Durability
- **Action:** Copy a paragraph of text to your system clipboard. Press `Ctrl+V` on the canvas. Confirm the paste dialog. Once the new note appears, immediately reload the window.
- **Expected Outcome:** The pasted note and its full text body remain on the canvas after reload.

#### Test 1.3: Undo/Redo Deletion Recovery
- **Action:** Select an existing note and press `Delete` (or click delete in context menu). Note disappears. Press `Ctrl+Z` to undo. The note reappears. Reload the window (`Ctrl+R`).
- **Expected Outcome:** The restored note is still present after reload.

#### Test 1.4: Native Export Sandbox & Path Traversal Block
- **Action:** In desktop Tauri build, trigger a note export. In DevTools console or automated test, attempt calling `save_export_file` with `filename: "../../test.txt"`.
- **Expected Outcome:** Rust backend rejects the traversal attempt with an error. Valid exports prompt the native OS file picker or write strictly inside `~/DiaryNote/Exports`.

---

## 3. Phase 2: Authorization Engine & Cryptographic Vault

**Target Version:** `v0.2.0-alpha.2`  
**Focus:** Centralized authorization policy, authentic Argon2id + AES-256-GCM encryption at rest, secure OS keyring, and closed AI leak paths.

### Expected App Behaviors
1. **True At-Rest Encryption:** Locked notes are encrypted in IndexedDB. Opening browser DevTools → Application → IndexedDB reveals only scrambled ciphertext (`iv`, `ciphertext`, `tag`). Note titles and bodies are never stored in plaintext.
2. **Zero-Leakage Export:** Full backup, batch export, and single-card copy operations automatically exclude locked notes unless you enter your master passcode.
3. **AI Privacy Quarantine:** AI Merge, Auto-Tag, and Summarize cannot access or process locked notes without explicit unlock. Merging protected notes produces an encrypted output note.
4. **No Plaintext AI Keys in Code:** AI provider keys are stored in the OS Keychain (desktop) or encrypted locally. Request keys are transmitted via HTTP headers (`x-goog-api-key`), never query strings.
5. **AI Timeout & Cancellation:** If an AI request hangs or takes too long, an active spinner shows a "Cancel" button, and the request automatically aborts after 15 seconds.

### Step-by-Step Testing & Verification

#### Test 2.1: IndexedDB Plaintext Audit
- **Action:** Create a note with sensitive text: `"My Secret Diary Entry"`. Lock the note with passcode `123456`. Open Chrome DevTools (`F12`) → **Application** → **Storage** → **IndexedDB** → `DiaryNoteDB` → `notes`.
- **Expected Outcome:** Inspect the record. The `content` and `title` fields contain encrypted ciphertext base64 strings. Searching for `"Secret"` in DevTools storage returns 0 matches.

#### Test 2.2: Backup Export Exfiltration Block
- **Action:** With one locked note and two unlocked notes on canvas, click **Export** → **Full Backup (JSON)** without unlocking the private note. Open the exported `.json` file in a text editor.
- **Expected Outcome:** The locked note's plaintext content is absent from the file (either excluded or preserved as encrypted ciphertext).

#### Test 2.3: Clipboard Header Copy Block
- **Action:** Hover over a locked note card (showing masked lock icon). Click the card header copy icon.
- **Expected Outcome:** The app displays an "Unlock note to copy" prompt instead of copying plaintext to clipboard.

#### Test 2.4: AI Request Security & Cancellation
- **Action:** Open AI Merge with 2 selected notes. Click "Merge". While the spinner is active, click "Cancel".
- **Expected Outcome:** The request is immediately aborted; UI returns to normal state without hanging. Inspect network headers to verify the API key is passed in `x-goog-api-key` header and not in the URL.

---

## 4. Phase 3: Schema Interchange, Migration Rollback & Journal Model

**Target Version:** `v0.2.0-beta.1`  
**Focus:** Versioned Zod backup validation, atomic migration with legacy rollback preservation, dedicated journal data model (`isDailyEntry`), and update privacy settings.

### Expected App Behaviors
1. **Safe Import Staging:** Importing a backup displays a pre-import modal showing how many notes, tags, and connections will be added. Duplicate IDs are detected and offer "Keep Both", "Overwrite", or "Skip".
2. **Rejection of Poisoned Backups:** Uploading a corrupt or maliciously crafted JSON file displays a helpful error message and refuses to touch your current notes.
3. **Independent Journal Entries:** Creating regular notes titled `"2026-08-13"` or tagged `#journal` no longer conflicts with your daily diary entries. Daily streak calculations are 100% accurate based on explicit entry dates.
4. **Offline Update Control:** In Settings, you can toggle "Check for updates automatically" on or off. When turned off, the app initiates zero outgoing network requests on startup.

### Step-by-Step Testing & Verification

#### Test 3.1: Backup Import Staging & Duplicate Resolution
- **Action:** Export a backup with 3 notes. Edit note 1 on your canvas. Click **Import** and select the backup file.
- **Expected Outcome:** A preview modal appears: *"3 notes found, 1 duplicate ID detected"*. Selecting *"Keep Both"* assigns a fresh UUID to the imported note without overwriting your modified note.

#### Test 3.2: Malformed Backup Protection
- **Action:** Create a text file `invalid.json` containing `{ "notes": "not an array", "settings": 123 }`. Try importing it.
- **Expected Outcome:** The app rejects the file with a clear validation error (*"Invalid backup schema format"*). Zero notes are corrupted or deleted.

#### Test 3.3: Journal Heuristic Decoupling
- **Action:** Create a standard spatial note titled `"2026-08-14 Planning"`. Then open the Daily Journal modal and click "Today's Entry".
- **Expected Outcome:** A dedicated daily journal note is created. The planning note is not confused with the daily journal entry in calendar streaks or daily lookups.

#### Test 3.4: 100% Offline Mode Verification
- **Action:** Open Settings, disable "Check for updates on launch". Reload the application. Inspect DevTools **Network** tab.
- **Expected Outcome:** Exactly 0 network requests are made. No background pings to GitHub API.

---

## 5. Phase 4: Accessibility, Scalability & Quality Gates

**Target Version:** `v0.2.0` General Availability (GA)  
**Focus:** Full WCAG 2.1 AA accessibility, touch/pointer canvas controls, on-demand body loading, React Error Boundary, and comprehensive CI test pipeline.

### Expected App Behaviors
1. **Flawless Keyboard Navigation:** You can press `Tab` to navigate through all modals, sidebar lists, and canvas controls. Modals trap focus and close cleanly on `Escape`. Focus restores to the button that opened the modal.
2. **Touchscreen & Tablet Ready:** Panning, zooming, and dragging cards works smoothly with touch gestures (including pinch-to-zoom and multi-touch) on laptops, iPads, and convertible devices.
3. **High-Performance Canvas (5,000+ Notes):** Opening a notebook with 5,000 notes loads instantly. Memory usage remains below 120MB because note bodies are loaded on-demand when entering the viewport.
4. **Crash-Proof Error Boundary:** If an unexpected React rendering error occurs, the app does not show a blank white screen. It renders a friendly recovery screen with an **"Export Emergency Backup"** button.

### Step-by-Step Testing & Verification

#### Test 4.1: Keyboard-Only Accessibility Run
- **Action:** Put your mouse aside. Use `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Esc` to:
  1. Open the Search modal (`Ctrl+K`), search for a note, press down arrow, and press `Enter` to navigate.
  2. Open the Notes Drawer, select a note with `Enter`, and close with `Esc`.
  3. Open Settings and toggle a switch using `Space`.
- **Expected Outcome:** Focus rings are clearly visible on every interactive element; focus never escapes behind modal backdrops; no mouse required.

#### Test 4.2: Touch and Pointer Gesture Test
- **Action:** In Chrome DevTools device mode (or on a touchscreen device), test:
  1. One-finger pan across the canvas.
  2. Two-finger pinch-to-zoom.
  3. Dragging a card with a touch point.
- **Expected Outcome:** Smooth movement with pointer capture; no accidental browser text selection or gesture conflicts.

#### Test 4.3: 5,000 Note Scale & Memory Benchmark
- **Action:** Run the synthetic dataset generator to seed 5,000 notes into Dexie. Open the app and monitor memory in Chrome Task Manager.
- **Expected Outcome:** Startup time is under 1.5 seconds. Heap memory remains low (<120MB). Panning across the canvas is steady at 60 FPS.

#### Test 4.4: Error Boundary Emergency Recovery
- **Action:** In DevTools console, simulate a render crash.
- **Expected Outcome:** The screen displays an error recovery card with options to *"Reload Canvas"* and *"Download Emergency Backup JSON"*. Clicking download safely dumps all current notes to disk.

---

## 6. Comprehensive End-to-End Final Test Flight Matrix

Before tagging the official `v0.2.0` release, execute this master validation checklist:

| # | Test Journey | Steps | Expected Success Criteria | Result |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Cold Boot & Persistence** | Launch app → Create 3 notes → Paste 1 long note → Force quit app (`kill`) → Relaunch. | All 4 notes reappear at exact canvas coordinates with complete content. | 🔲 Pass |
| **2** | **Vault Lockdown & At-Rest Cryptography** | Create note → Set master password → Lock note → Inspect IndexedDB raw storage. | Note content is AES-256-GCM ciphertext; 0 plaintext leaks in storage. | 🔲 Pass |
| **3** | **Export Exfiltration Protection** | With locked notes on canvas → Run JSON backup & markdown batch export without unlocking. | Exported files omit or encrypt locked content; no authorization bypass. | 🔲 Pass |
| **4** | **AI Privacy & Header Auth** | Select unlocked note → Trigger AI Merge → Verify request headers & cancel button. | Header auth (`x-goog-api-key`); cancel aborts request; locked notes rejected. | 🔲 Pass |
| **5** | **Native Desktop File Sandboxing** | Desktop Tauri build → Trigger note export → Verify file dialog location. | File saved cleanly inside user-designated path; directory traversal blocked. | 🔲 Pass |
| **6** | **Atomic Backup Import** | Import valid backup with duplicate IDs → Select "Keep Both". | Notes imported cleanly with fresh UUIDs; zero overwrites or state corruption. | 🔲 Pass |
| **7** | **Daily Journaling & Streaks** | Create daily entry → Write log → Open Calendar Modal. | Streak counter increments; date-titled normal notes do not interfere. | 🔲 Pass |
| **8** | **WCAG Accessibility Audit** | Perform full navigation using only keyboard (`Tab`, `Arrows`, `Enter`, `Esc`). | Focus traps work; screen-reader accessible; no trapped keyboard focus. | 🔲 Pass |
| **9** | **Touch / Pointer Gestures** | Test canvas panning, zooming, and note dragging on touch device / emulation. | Fluid interaction via Pointer Events without mouse-only reliance. | 🔲 Pass |
| **10** | **Automated CI Quality Suite** | Run `npm run lint`, `npm test`, `npm run build`, and `cargo check`. | 100% passing tests, 0 lint warnings, clean build artifacts. | 🔲 Pass |
