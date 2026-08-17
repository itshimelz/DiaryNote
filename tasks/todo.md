# Task List: Rust Native Desktop Migration (Milestone Checkpoints)

## Phase 0: OS Foundation, Repository Contracts & Lifecycle
- [x] **Task 0.1: Tauri Platform-Aware Path Resolver & Single-Instance Mutex**
  - [x] Add `tauri-plugin-single-instance` to `src-tauri/Cargo.toml`
  - [x] Create `src-tauri/src/infrastructure/os/paths.rs` (AppData directory resolver)
  - [x] Configure single-instance focus handler in `src-tauri/src/lib.rs`
  - [x] Add unit tests for path resolver across platforms
- [x] **Task 0.2: Hexagonal Domain Contracts & Storage Error Types**
  - [x] Create `src-tauri/src/domain/note/repository.rs` (`NoteRepository` trait)
  - [x] Create `src-tauri/src/domain/note/error.rs` (`StorageError` enum with `DiskFull`, `Corruption`)
  - [x] Implement `src-tauri/src/models/note.rs` and `models/app_state.rs`
  - [x] Add in-memory mock repository tests

### Checkpoint 0: OS Foundation & Contracts
- [x] Single-instance and platform path resolution verified
- [x] In-memory repository contract unit tests pass

---

## Phase 1: Native SQLite Storage Engine & Client Spatial Virtualizer
- [x] **Task 1.1: rusqlite WAL Connection Pool & Versioned Migrations**
  - [x] Add `rusqlite` with `bundled` and `bundled-fts5` features
  - [x] Create `src-tauri/src/infrastructure/sqlite/connection.rs` with WAL mode and `PRAGMA synchronous = NORMAL;`
  - [x] Create `src-tauri/src/infrastructure/sqlite/schema.rs` with B-Tree indexes (`updated_timestamp`, daily entries)
  - [x] Create `src-tauri/src/infrastructure/sqlite/migrations.rs` with `PRAGMA user_version` tracking
  - [x] Add unit tests for connection pool and migration runner
- [x] **Task 1.2: SqliteNoteRepository Implementation & Inbound Command Port**
  - [x] Create `src-tauri/src/infrastructure/sqlite/repository.rs` (atomic `save_batch` transactions)
  - [x] Create `src-tauri/src/domain/note/service.rs`
  - [x] Create `src-tauri/src/commands/storage.rs` exposing `load_notes`, `save_notes_batch`, `delete_notes`
  - [x] Register commands in `src-tauri/src/lib.rs`
- [x] **Task 1.3: Client Spatial Virtualizer & Frontend Bridge**
  - [x] Implement `src/canvas/spatialIndex.ts` (in-memory 2D R-Tree with dynamic overscan buffer)
  - [x] Update `src/components/InfiniteCanvas.tsx` to mount only visible NoteCards
  - [x] Create `src/lib/rustStorage.ts` with Tauri IPC invocations and IndexedDB fallback
  - [x] Connect `src/hooks/useNotesManager.ts` ViewModel to load on mount and debounced autosave
  - [x] Wire immediate flush on `WindowEvent::CloseRequested` and window blur
  - [x] Implement one-time auto-migration from IndexedDB to SQLite on first launch
  - [x] Update `src/components/StatusBar.tsx` to indicate Native SQLite Engine

### Checkpoint 1: Storage Engine, Durability & Spatial Virtualization
- [x] `cargo test` passes all storage tests (21/21 passed)
- [x] Spatial virtualization verified: mounting only visible DOM nodes via dynamic frustum
- [x] Atomic transactions verified with SQLite rollback on failure
- [x] Immediate flush on window blur/unload wired to save dirty notes
- [x] IndexedDB notes migrate into SQLite on initial boot

---

## Phase 2: Content-Addressable Asset Store & Custom Protocol
- [x] **Task 2.1: SHA-256 Content-Addressable Asset Store & Staging Pipeline**
  - [x] Create `src-tauri/src/infrastructure/filesystem/asset_store.rs` (SHA-256 disk storage)
  - [x] Implement atomic staging pipeline via `temp/<uuid>.tmp` with `ENOSPC` handling
  - [x] Implement WebP thumbnail generation using `image` crate
  - [x] Create `src-tauri/src/commands/assets.rs`
- [x] **Task 2.2: Secure Custom URI Protocol (`diarynote-asset://`)**
  - [x] Register `diarynote-asset://` custom protocol handler in `src-tauri/src/lib.rs`
  - [x] Enforce strict hash regex validation (`^[a-f0-9]{64}$`) and path canonicalization
  - [x] Update `src/hooks/useNativeFileDrop.ts` to reference asset URIs instead of Base64 blobs
  - [x] Create `src/lib/rustAssets.ts`

### Checkpoint 2: Asset Store & Security
- [x] Path traversal security drill passes (`..` and invalid hashes rejected)
- [x] High-resolution images load on canvas cards with $< 2\text{KB}$ note JSON size
- [x] Disk-full errors abort cleanly without broken card state

---

## Phase 3: Hardware Cryptographic Vault & Memory Zeroization
- [x] **Task 3.1: Rust Crypto Adapter & Memory-Safe Session Vault**
  - [x] Add `argon2`, `aes-gcm`, and `zeroize` dependencies to `src-tauri/Cargo.toml`
  - [x] Create `src-tauri/src/infrastructure/crypto/mod.rs` with Argon2id and AES-256-GCM
  - [x] Create `src-tauri/src/domain/vault/mod.rs` with `SessionVault` protected by `zeroize::ZeroizeOnDrop`
  - [x] Add unit tests for key derivation and envelope encryption/decryption roundtrips
- [x] **Task 3.2: Inbound Vault Commands & TS Crypto Integration**
  - [x] Create `src-tauri/src/commands/vault.rs` with native exponential backoff rate-limiting
  - [x] Create `src/lib/rustVault.ts`
  - [x] Refactor `src/services/cryptoVaultService.ts` to delegate crypto operations to Rust
  - [x] Test passcode verification, lock transitions, and rate-limiting

### Checkpoint 3: Crypto & Memory Security
- [x] Database contains zero plaintext for locked notes
- [x] In-memory session key is zeroed on lock or drop
- [x] Rate-limiter blocks brute-force attempts at Rust layer

---

## Phase 4: Dual-Tier Full-Text Search & Link Graph Engine
- [x] **Task 4.1: Dual-Tier SQLite FTS5 Search Adapter**
  - [x] Create `src-tauri/src/infrastructure/sqlite/fts.rs` with trigram virtual table for public notes
  - [x] Create transient in-memory FTS5 index for unlocked vault notes
  - [x] Implement `src-tauri/src/commands/search.rs` exposing unified `search_notes`
  - [x] Create `src/lib/rustSearch.ts` typed bridge
- [x] **Task 4.2: Markdown AST Parser & Link Graph Domain Service**
  - [x] Add `pulldown-cmark` dependency to `src-tauri/Cargo.toml`
  - [x] Implement AST parser in `src-tauri/src/domain/graph/mod.rs` to extract `@mentions` and `#tags`
  - [x] Implement `src-tauri/src/commands/graph.rs` exposing `get_note_connections` and `get_note_backlinks`
  - [x] Create `src/lib/rustGraph.ts` typed bridge

### Checkpoint 4: Search & Graph Engine
- [x] Sub-millisecond FTS5 search queries verified across languages
- [x] Locked note search isolation (appears when unlocked, vanishes on lock) verified
- [x] Mention autocomplete and backlinks verified via native parser

---

## Phase 5: WAL-Safe Online Backup & Archive Engine
- [ ] **Task 5.1: SQLite Online Backup API & Streaming ZIP Exporter**
  - [ ] Add `zip` crate to `src-tauri/Cargo.toml`
  - [ ] Create `src-tauri/src/infrastructure/filesystem/backup.rs` with `rusqlite::backup::Backup`
  - [ ] Implement `src-tauri/src/commands/backup.rs` exposing `export_vault_archive` and `import_vault_archive`
  - [ ] Connect `ImportPreviewModal.tsx` and settings export buttons to Rust commands

### Checkpoint 5: Online Backup Engine
- [ ] Export during active writing produces 100% valid backup
- [ ] Full vault restore verified with duplicate ID resolution

---

## Phase 6: Secure Streaming AI Gateway
- [ ] **Task 6.1: Reqwest Streaming AI Client & Credential Protection**
  - [ ] Add `reqwest` (with `json`, `stream`) to `src-tauri/Cargo.toml`
  - [ ] Create `src-tauri/src/infrastructure/network/ai_client.rs`
  - [ ] Create `src-tauri/src/domain/ai/mod.rs` and `src-tauri/src/commands/ai.rs`
  - [ ] Implement token streaming via Tauri event channels (`ai:stream-chunk`)
  - [ ] Refactor `src/services/ai/aiMergeService.ts` to consume native streams

### Checkpoint 6: Streaming AI Gateway
- [ ] Token streaming verified without UI blocking
- [ ] DevTools network tab reveals zero API credentials

---

## Phase 7: Cross-Platform Hardening & Release Polish
- [ ] **Task 7.1: Final Cleanup, Deprecation Removal & Static Analysis**
  - [ ] Update `AGENTS.md` UI Component Modification Registry
  - [ ] Verify `npm run lint` (0 errors)
  - [ ] Verify `npm test` (all test suites pass)
  - [ ] Verify `cargo check` and `cargo test --all` clean

### Checkpoint 7: Complete Desktop Release Verification
- [ ] All milestone gates cleared
- [ ] Production build verification (`npm run build` + `cargo check`)
