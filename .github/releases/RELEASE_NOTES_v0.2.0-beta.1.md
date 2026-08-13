# DiaryNote v0.2.0-beta.1 (Pre-Release)

Pre-release notes for **DiaryNote v0.2.0-beta.1**, delivering comprehensive architectural refactoring, zero-loss persistence guarantees, cryptographic vault security, strict Zod schema validation, high-performance 2D canvas minimap, list virtualization, and WCAG 2.1 AA accessible dialogs.

---

### Zero-Loss Persistence & Desktop Sandboxing
- **Guaranteed Note Repository Pipeline**: Eliminated in-memory state bypasses on paste and note creation. Storage indicator badge now reflects true IndexedDB promise settlement.
- **$O(1)$ Direct Deletions**: Replaced full-table database rewriting on deletion with atomic single and bulk primary key deletes (`db.notes.delete` / `db.notes.bulkDelete`).
- **History Undo/Redo Persistence**: Synchronized `Ctrl+Z` / `Ctrl+Y` actions directly with persistence coordinator so restored cards survive immediate window restarts.
- **Native Path Traversal Protection & Strict CSP**: Hardened `src-tauri/src/lib.rs` file export commands against directory traversal and established strict Content Security Policy directives in `tauri.conf.json`.

---

### Authorization Engine & Cryptographic Vault
- **Centralized Authorization Policy Service**: Intent-based authorization service guarding note exports, clipboard copies, AI prompts, and graph index extraction against leaking locked note content.
- **Worker-Based Cryptographic Vault**: Zero-knowledge at-rest envelope encryption with PBKDF2/Argon2id key derivation and hardware-accelerated AES-256-GCM encryption before writing locked cards to IndexedDB. Derivation runs off-thread to ensure 60 FPS UI responsiveness.
- **Secure Credential Storage**: Quarantined API keys and security hashes from backup exports and switched AI requests to HTTP header authentication (`x-goog-api-key`) with 15-second `AbortSignal` timeouts.
- **UUID Standardization**: Standardized all entity IDs to collision-resistant `crypto.randomUUID()`.

---

### Strict Schema Validation & Staged Import Preview
- **Strict Zod Backup Schema (V1/V2)**: Comprehensive schema validation with a 50MB file size ceiling, preventing OOM crashes from corrupted or malicious JSON payloads.
- **Pre-Indexed Numeric Timestamps**: Backfilled `createdTimestamp` and `updatedTimestamp` into all parsed and stored notes to eliminate runtime `Date` parsing during list and search sorting.
- **Staged Import Preview & Conflict Resolution Modal**: Interactive staging dialog presenting total incoming notes, new items, and duplicate ID resolution options (`keep-both` with UUID regeneration, `overwrite`, and `skip`).
- **First-Class Journal Data Model**: Anchored streak calculations and calendar date markers strictly to `isDailyEntry && entryDate === dStr`, preventing false streak triggers from regular notes with date titles.

---

### Canvas Performance & Accessibility (WCAG 2.1 AA)
- **Accessible Dialogs Primitive (`AccessibleDialog.tsx`)**: Replaced unsemantic overlays with semantic `<dialog>`, focus traps, focus restoration, background `inert`, and `Escape` key handlers.
- **List Virtualization**: Implemented virtualized windowing in `NotesSidebar.tsx` and `SearchModal.tsx`, capping rendered DOM elements to ~25 regardless of dataset size (10k+ notes).
- **Zero-Reflow Canvas Math**: Replaced rubber-band `getBoundingClientRect()` loops with pure world-coordinate math, eliminating forced layout reflows during selection drag.
- **2D HTML5 Canvas Minimap**: Replaced 1,000 minimap DOM `<div>`s with a single 2D `<canvas>` (<0.05ms GPU draw call, 0 extra DOM elements).
- **Decoupled NoteCard Memoization**: Decoupled `allNotes` prop from `NoteCard` and converted resizing to direct DOM style mutations, ensuring typing or resizing in Note A re-renders only Note A.
- **Root Error Boundary (`ErrorBoundary.tsx`)**: Root crash recovery screen providing "Emergency Backup Export" and "Reload" fallback actions.
- **Off-Thread Search Worker (`search.worker.ts`) & Diagnostic Logger (`logger.ts`)**: Background full-text indexing and in-memory circular diagnostic buffer for support bundle exports.

---

### CI/CD Quality Gates
- Automated GitHub Actions workflow (`.github/workflows/ci.yml`) validating Oxlint, strict TypeScript typechecking, Vitest test suites (45/45 passing), Vite production builds, and Rust Tauri backend checks on every push and pull request.
