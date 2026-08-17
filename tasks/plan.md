# Implementation Plan: Rust Native Desktop Migration (Production Milestone Edition v4)

## Overview
This plan executes the migration of DiaryNote to a **Hybrid MVVM (Frontend) + Hexagonal (Rust Core)** architecture across 8 checkpoint milestones (Phase 0 to Phase 7). The architecture enforces a **Hybrid Canvas Model** (HTML5 DOM for editable cards + Canvas for grid/connections), **Client-Side In-Memory R-Tree Spatial Virtualization** (mounting ~50–200 DOM cards with zero IPC on pan/zoom), **Platform-Aware AppData SQLite WAL persistence**, **Hardware Argon2id/AES-256-GCM Cryptography**, and **Dual-Tier FTS5 Full-Text Search**.

## Architecture & Subsystem Decisions
- **Hybrid Canvas Model:** DOM for NoteCard text editing, Bangla/IME input, and selection UI; HTML5 Canvas for background grid and connection lines.
- **Client In-Memory Spatial Virtualization:** In-memory R-Tree on the frontend queries visible notes within the camera viewport + 500px overscan buffer.
- **Clean SQLite Indexing:** Primary key on `id`, B-tree index on `updated_timestamp`, composite index on `[is_daily_entry, entry_date]`, and FTS5 for text search.
- **OS-Aware AppData Layout:** Dynamic resolution via `app.path().app_data_dir()` for Linux, macOS, and Windows.
- **Single-Instance Mutex:** Focuses existing window on duplicate launches to eliminate lock contention.
- **Zero-Loss Durability:** 500ms normal debounce backed by immediate flushes on window close, blur, and manual save.
- **Hexagonal Domain Contracts:** `NoteRepository` trait in `domain/` decouples business logic from SQLite infrastructure.
- **Dual-Tier Search Architecture:** On-disk FTS5 for public notes + transient in-memory FTS5 for unlocked vault notes with `zeroize` memory cleanup on lock.
- **WAL-Safe Backups:** Native SQLite Online Backup API (`rusqlite::backup`) preventing detached WAL corruption.

---

## Phased Task Breakdown

### Phase 0: OS Foundation, Repository Contracts & Lifecycle

#### Task 0.1: Tauri Platform-Aware Path Resolver & Single-Instance Mutex
**Description:** Configure `tauri-plugin-single-instance` in `Cargo.toml`. Create `infrastructure/os/paths.rs` to dynamically resolve canonical AppData paths across Linux, macOS, and Windows. Configure single-instance focus handling in `lib.rs`.

**Acceptance criteria:**
- [ ] Resolves AppData directory via `app.path().app_data_dir()`, ensuring `assets/`, `backups/`, and `temp/` directories exist.
- [ ] Single-instance plugin focuses existing window and passes args on second launch.
- [ ] Zero hardcoded Linux `$HOME/.local/share` paths in the codebase.

**Verification:**
- [ ] `cargo test --lib infrastructure::os` passes.

**Dependencies:** None  
**Files likely touched:**
- `src-tauri/Cargo.toml`
- `src-tauri/src/infrastructure/os/paths.rs`
- `src-tauri/src/lib.rs`

**Estimated scope:** S (3 files)

---

#### Task 0.2: Hexagonal Domain Contracts & Storage Error Types
**Description:** Define abstract `NoteRepository` trait and typed `StorageError` enum in `domain/note/repository.rs`. Implement in-memory mock repository for fast unit testing.

**Acceptance criteria:**
- [ ] `NoteRepository` trait defines `load_all`, `save_batch`, `delete_batch`, `get_app_state`, `save_app_state`, `check_integrity`.
- [ ] `StorageError` encapsulates `DiskFull`, `PermissionDenied`, `Database`, `Io`, and `Corruption`.
- [ ] Domain logic interacts exclusively with `Arc<dyn NoteRepository>`.

**Verification:**
- [ ] `cargo test --lib domain::note` passes in-memory contract tests.

**Dependencies:** Task 0.1  
**Files likely touched:**
- `src-tauri/src/domain/note/repository.rs`
- `src-tauri/src/domain/note/error.rs`
- `src-tauri/src/models/note.rs`
- `src-tauri/src/models/app_state.rs`

**Estimated scope:** S (4 files)

---

### Checkpoint 0: Foundation Verification Gate
- [ ] Single-instance and platform path resolution verified.
- [ ] Abstract repository trait compile-checks clean.

---

### Phase 1: Native SQLite Storage Engine & Client Spatial Virtualizer

#### Task 1.1: rusqlite WAL Connection Pool & Versioned Migrations
**Description:** Add `rusqlite` with `bundled` and `bundled-fts5` features. Implement `infrastructure/sqlite/connection.rs` with WAL journal mode, `PRAGMA synchronous = NORMAL;`, and migration runner executing `001_initial_schema.sql` and `002_asset_tables.sql` tracked via `PRAGMA user_version`.

**Acceptance criteria:**
- [ ] SQLite initializes with WAL mode and creates all tables and B-Tree indexes idempotently.
- [ ] `PRAGMA user_version` upgrades schema safely across versions.
- [ ] Startup runs `PRAGMA quick_check;` to verify database integrity.

**Verification:**
- [ ] `cargo test --lib infrastructure::sqlite` passes.

**Dependencies:** Checkpoint 0  
**Files likely touched:**
- `src-tauri/src/infrastructure/sqlite/connection.rs`
- `src-tauri/src/infrastructure/sqlite/schema.rs`
- `src-tauri/src/infrastructure/sqlite/migrations.rs`

**Estimated scope:** M (4 files)

---

#### Task 1.2: SqliteNoteRepository Implementation & Inbound Command Port
**Description:** Implement `SqliteNoteRepository` fulfilling `NoteRepository` with atomic `save_batch` transactions. Create `commands/storage.rs` exposing `load_notes`, `save_notes_batch`, `delete_notes`, `load_app_state`, and `save_app_state`.

**Acceptance criteria:**
- [ ] `save_notes_batch` wraps writes in an atomic transaction; errors trigger clean rollbacks.
- [ ] Inbound commands registered in Tauri invoke handler.
- [ ] Zero partial state commits on write failures.

**Verification:**
- [ ] `cargo test --lib infrastructure::sqlite::repository` and `cargo test --lib commands::storage` pass.

**Dependencies:** Task 1.1  
**Files likely touched:**
- `src-tauri/src/infrastructure/sqlite/repository.rs`
- `src-tauri/src/domain/note/service.rs`
- `src-tauri/src/commands/storage.rs`
- `src-tauri/src/lib.rs`

**Estimated scope:** M (4 files)

---

#### Task 1.3: Client Spatial Virtualizer (In-Memory R-Tree) & Frontend Bridge
**Description:** Implement `src/utils/spatialIndex.ts` using a fast 2D R-Tree (`rbush`). Connect `InfiniteCanvas.tsx` to mount only visible NoteCards within the viewport + 500px overscan buffer. Implement `src/lib/rustStorage.ts` with Tauri IPC invocations and IndexedDB fallback. Connect `src/hooks/useNotesManager.ts` ViewModel to load on mount, debounced autosave, and wire immediate flushes on window close / blur.

**Acceptance criteria:**
- [ ] `useNotesManager.ts` loads notes from SQLite on startup.
- [ ] Client R-Tree performs frustum culling: with 1,000 notes, only ~50-150 cards are mounted in the DOM.
- [ ] Immediate flush triggers on `WindowEvent::CloseRequested` and window blur.
- [ ] One-time auto-migration moves existing IndexedDB notes to SQLite on first launch.
- [ ] Status bar displays "Native SQLite Engine".

**Verification:**
- [ ] `npm test` passes all storage, spatial index, and hook test suites.
- [ ] `npm run lint` reports 0 errors.

**Dependencies:** Task 1.2  
**Files likely touched:**
- `src/utils/spatialIndex.ts`
- `src/components/InfiniteCanvas.tsx`
- `src/lib/rustStorage.ts`
- `src/hooks/useNotesManager.ts`
- `src/components/StatusBar.tsx`

**Estimated scope:** M (5 files)

---

### Checkpoint 1: Storage Engine & Spatial Virtualization Gate
- [ ] `cargo test` passes all storage infrastructure and domain tests.
- [ ] 10,000 note spatial culling verified: DOM contains $< 200$ nodes during pan/zoom.
- [ ] Rapid window close after edit preserves latest note edits ($100\%$ durability).
- [ ] IndexedDB legacy notes migrate seamlessly into SQLite.

---

### Phase 2: Content-Addressable Asset Store & Custom Protocol

#### Task 2.1: SHA-256 Content-Addressable Asset Store & Staging Pipeline
**Description:** Implement `infrastructure/filesystem/asset_store.rs` to write images to `temp/`, hash via SHA-256, atomic-rename to `assets/originals/<hash>.<ext>`, generate WebP thumbnails via `image` crate, and handle disk-full (`ENOSPC`) errors gracefully.

**Acceptance criteria:**
- [ ] Images deduplicated by SHA-256 hash.
- [ ] Atomic staging ensures partial/corrupt files are never linked to notes.
- [ ] Disk-full errors abort cleanly with user-friendly alerts.

**Verification:**
- [ ] `cargo test --lib infrastructure::filesystem::asset_store` passes.

**Dependencies:** Checkpoint 1  
**Files likely touched:**
- `src-tauri/src/infrastructure/filesystem/asset_store.rs`
- `src-tauri/src/domain/asset/service.rs`
- `src-tauri/src/commands/assets.rs`

**Estimated scope:** M (4 files)

---

#### Task 2.2: Secure Custom URI Protocol (`diarynote-asset://`)
**Description:** Register asynchronous custom URI handler `diarynote-asset://` in Tauri setup with strict hash regex validation (`^[a-f0-9]{64}$`), path canonicalization, and magic byte MIME verification to block path traversal attacks.

**Acceptance criteria:**
- [ ] Rejects any path traversal attempts (`..`, backslashes) with `400 Bad Request`.
- [ ] Serves binary image streams directly to canvas cards.
- [ ] Updates `useNativeFileDrop.ts` to reference asset URIs instead of Base64 blobs.

**Verification:**
- [ ] `cargo test --lib commands::assets` passes.
- [ ] Dropped 10MB photo renders instantly with $< 2\text{KB}$ note JSON size.

**Dependencies:** Task 2.1  
**Files likely touched:**
- `src-tauri/src/lib.rs`
- `src/hooks/useNativeFileDrop.ts`
- `src/lib/rustAssets.ts`

**Estimated scope:** M (3 files)

---

### Checkpoint 2: Asset Engine Verification Gate
- [ ] Path traversal security drill passes.
- [ ] Canvas renders image assets with zero Base64 memory bloat.

---

### Phase 3: Hardware Cryptographic Vault & Memory Zeroization

#### Task 3.1: Rust Crypto Adapter & Memory-Safe Session Vault
**Description:** Implement `infrastructure/crypto/` with Argon2id key derivation and AES-256-GCM authenticated encryption. Implement `domain/vault/` with `SessionVault` implementing `zeroize::ZeroizeOnDrop` for automatic key erasure.

**Acceptance criteria:**
- [ ] Supports Argon2id and backward-compatible PBKDF2-SHA256 formats.
- [ ] In-memory session key is overwritten with zeros upon lock or timeout.
- [ ] Plaintext never committed to database or persisted disk files.

**Verification:**
- [ ] `cargo test --lib infrastructure::crypto` and `cargo test --lib domain::vault` pass.

**Dependencies:** Checkpoint 2  
**Files likely touched:**
- `src-tauri/Cargo.toml`
- `src-tauri/src/infrastructure/crypto/mod.rs`
- `src-tauri/src/domain/vault/mod.rs`

**Estimated scope:** M (3 files)

---

#### Task 3.2: Inbound Vault Commands & TS Crypto Integration
**Description:** Expose Tauri commands (`vault_set_passcode`, `vault_verify_passcode`, `vault_encrypt_note`, `vault_decrypt_note`, `vault_lock`) with native exponential backoff rate-limiting. Refactor `src/services/cryptoVaultService.ts` to delegate to Rust.

**Acceptance criteria:**
- [ ] Rate-limiting blocks brute-force attempts in Rust backend.
- [ ] Frontend `SecurityModal` and lock badges adapt seamlessly.

**Verification:**
- [ ] `cargo test` passes.
- [ ] `npm test` passes all crypto and security test suites.

**Dependencies:** Task 3.1  
**Files likely touched:**
- `src-tauri/src/commands/vault.rs`
- `src-tauri/src/lib.rs`
- `src/services/cryptoVaultService.ts`
- `src/lib/rustVault.ts`

**Estimated scope:** M (4 files)

---

### Checkpoint 3: Crypto Verification Gate
- [ ] Zero plaintext discovered in SQLite file for locked notes.
- [ ] Memory zeroing on lock verified.

---

### Phase 4: Dual-Tier Full-Text Search & Link Graph Engine

#### Task 4.1: Dual-Tier SQLite FTS5 Search Adapter
**Description:** Create persistent `notes_fts` table with trigram tokenizer for public notes, and a transient in-memory FTS index for unlocked vault notes. Implement `commands/search.rs` to query both tiers seamlessly.

**Acceptance criteria:**
- [ ] Public notes indexed on disk in FTS5 virtual table.
- [ ] Unlocked vault notes indexed into transient in-memory FTS table; dropped on lock.
- [ ] Search queries return BM25-ranked note IDs in $< 2\text{ms}$.

**Verification:**
- [ ] `cargo test --lib infrastructure::sqlite::fts` and `cargo test --lib commands::search` pass.

**Dependencies:** Checkpoint 3  
**Files likely touched:**
- `src-tauri/src/infrastructure/sqlite/fts.rs`
- `src-tauri/src/domain/search/mod.rs`
- `src-tauri/src/commands/search.rs`
- `src/components/Modals/SearchModal.tsx`

**Estimated scope:** M (4 files)

---

#### Task 4.2: Markdown AST Parser & Link Graph Domain Service
**Description:** Implement `domain/graph/` using `pulldown-cmark` to parse markdown AST, extract `@[Title](id)` mentions and `#tags`, and manage bi-directional graph topology.

**Acceptance criteria:**
- [ ] AST parser extracts mentions and tags in microseconds without regex thrashing.
- [ ] `get_note_connections` and `get_note_backlinks` commands return accurate graph links.
- [ ] Replaces `src/workers/search.worker.ts` and `src/utils/markdownMention.ts`.

**Verification:**
- [ ] `cargo test --lib domain::graph` passes.
- [ ] `npm test` passes all mention and search tests.

**Dependencies:** Task 4.1  
**Files likely touched:**
- `src-tauri/Cargo.toml`
- `src-tauri/src/domain/graph/mod.rs`
- `src-tauri/src/commands/graph.rs`
- `src/lib/rustSearch.ts`

**Estimated scope:** M (4 files)

---

### Checkpoint 4: Search & Graph Verification Gate
- [x] Sub-millisecond FTS5 search queries verified across languages.
- [x] Locked note search isolation (appears when unlocked, vanishes on lock) verified.

---

### Phase 5: WAL-Safe Online Backup & Archive Engine

#### Task 5.1: SQLite Online Backup API & Streaming ZIP Exporter
**Description:** Implement `infrastructure/filesystem/backup.rs` using `rusqlite::backup::Backup` and `zip-rs` to export complete `.diarynote` archive bundles containing checkpointed database state, manifest, and image assets.

**Acceptance criteria:**
- [x] Uses SQLite Online Backup API to create consistent snapshots during concurrent writes.
- [x] Bundles database and referenced assets into a compressed archive.
- [x] Staged import preview modal inspects archive with duplicate resolution options.

**Verification:**
- [x] `cargo test --lib infrastructure::filesystem::backup` passes roundtrip archive tests.

**Dependencies:** Checkpoint 4  
**Files likely touched:**
- `src-tauri/src/infrastructure/filesystem/backup.rs`
- `src-tauri/src/commands/backup.rs`
- `src/components/Modals/ImportPreviewModal.tsx`

**Estimated scope:** M (3 files)

---

### Checkpoint 5: Backup Engine Verification Gate
- [x] Export during active writing produces 100% valid backup.
- [x] Full vault restore verified with zero data corruption.

---

### Phase 6: Secure Streaming AI Gateway

#### Task 6.1: Reqwest Streaming AI Client & Credential Protection
**Description:** Implement `infrastructure/network/ai_client.rs` using `reqwest` for streaming LLM requests (Gemini, OpenAI, OpenRouter). Store credentials in backend and stream tokens over Tauri event channel `ai:stream-chunk`.

**Acceptance criteria:**
- [x] API keys never exposed in WebView memory or network devtools.
- [x] Token streaming emits smooth chunks to UI for note synthesis.
- [x] Replaces browser fetch in `src/services/ai/aiMergeService.ts`.

**Verification:**
- [x] `cargo test --lib infrastructure::network` passes.
- [x] AI Settings and synthesis work end-to-end with real-time streaming.

**Dependencies:** Checkpoint 4  
**Files likely touched:**
- `src-tauri/src/infrastructure/network/ai_client.rs`
- `src-tauri/src/domain/ai/mod.rs`
- `src-tauri/src/commands/ai.rs`
- `src/services/ai/aiMergeService.ts`

**Estimated scope:** M (4 files)

---

### Checkpoint 6: AI Gateway Verification Gate
- [x] Token streaming verified without UI blocking.
- [x] DevTools network tab reveals zero API credentials.

---

### Phase 7: Cross-Platform Hardening & Release Polish

#### Task 7.1: Final Cleanup, Deprecation Removal & Static Analysis
**Description:** Remove legacy fallback code, run comprehensive static analysis, update documentation and UI component registry, and perform end-to-end release builds.

**Acceptance criteria:**
- [x] `cargo test --all` passes 100%.
- [x] `cargo check` outputs 0 warnings.
- [x] `npm run lint` (`oxlint && tsc --noEmit`) outputs 0 errors.
- [x] `npm test` passes all suites.
- [x] `AGENTS.md` UI registry updated.

**Verification:**
- [x] `npm run build` succeeds cleanly.

**Dependencies:** Tasks 0.1–6.1  
**Files likely touched:**
- `AGENTS.md`
- `README.md`
- `src/lib/storage.ts`

**Estimated scope:** S (3 files)

---

### Checkpoint 7: Complete Desktop Release Verification
- [x] All milestone gates cleared.
- [x] Desktop app verified resilient against crashes, disk-full, and power-loss edge cases.

