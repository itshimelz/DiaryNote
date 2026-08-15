# Implementation Plan: Native Rust Core & SQLite Persistence (Point 5)

## Overview
Transform DiaryNote from a WebView-bound IndexedDB application into a true desktop-native application powered by a compiled Rust application core with SQLite, FTS5 full-text indexing, R*Tree spatial indexing, and atomic persistence over Tauri IPC, while maintaining web/test fallback via a typed repository pattern and seamless automatic migration from legacy IndexedDB.

---

## Architectural Decisions

### 1. Unified Repository Interface (`IStorageRepository`)
- **Decision:** Define a platform-agnostic TypeScript repository interface (`IStorageRepository`).
- **Rationale:** Ensures clean separation of concerns. DiaryNote can run natively on desktop via `TauriSqliteRepository` (Tauri IPC), while seamlessly falling back to `IndexedDbRepository` during Vitest testing, CI benchmarks, or web development previews.

### 2. Rust Core Storage Engine (`rusqlite` with `bundled`, `fts5`, and `rtree`)
- **Decision:** Use `rusqlite` with bundled SQLite3 and FTS5 in `src-tauri`.
- **Rationale:** Bundled SQLite ensures 100% deterministic cross-platform behavior across Linux, macOS, and Windows with zero external system dependency requirements.
- **Features:**
  - WAL (Write-Ahead Logging) mode for concurrent high-speed reads and writes.
  - Foreign key enforcement and synchronous NORMAL mode for optimal 60 FPS desktop write performance.
  - FTS5 virtual table (`notes_fts`) with unicode61 tokenizer for sub-millisecond BM25 ranked full-text search.
  - R*Tree virtual table (`notes_spatial_rtree`) for database-level spatial bounding box queries.

### 3. File System Location & Single-File Portability
- **Decision:** Store the database at standard OS data directories:
  - Linux: `~/.local/share/diarynote/diarynote.db`
  - macOS: `~/Library/Application Support/diarynote/diarynote.db`
  - Windows: `%APPDATA%\diarynote\diarynote.db`
- **Rationale:** Gives users a single, robust, portable SQLite file that survives WebView cache purges and can be backed up directly.

### 4. Zero-Loss Automated Migration Pipeline
- **Decision:** Implement automatic one-time migration from IndexedDB to SQLite on first native boot.
- **Rationale:** When `TauriSqliteRepository` boots, if `diarynote.db` is empty but the WebView holds legacy notes in IndexedDB (`DiaryNoteSQLiteDB`), the frontend sends an import payload to Rust, commits it in a single transaction, and records a migration sentinel.

---

## Dependency Graph

```text
src-tauri/Cargo.toml (rusqlite + fts5 + serde)
       │
       ▼
src-tauri/src/db.rs (Schema, Connection, WAL, CRUD, FTS5, RTree)
       │
       ▼
src-tauri/src/lib.rs (Tauri IPC Commands: db_init, db_save_notes, etc.)
       │
       ▼
src/lib/repository/IStorageRepository.ts (TypeScript Storage Contract)
       │
       ├── src/lib/repository/TauriSqliteRepository.ts (Desktop IPC)
       └── src/lib/repository/IndexedDbRepository.ts (Web/Test Fallback)
       │
       ▼
src/lib/repository/index.ts (Repository Factory & Auto-Detection)
       │
       ▼
src/hooks/useNotesManager.ts & src/App.tsx (UI & State Integration)
```

---

## Task Breakdown

### Phase 1: Rust Core Persistence Layer
- [ ] **Task 1.1: Configure Rust Dependencies in `Cargo.toml`**
  - Add `rusqlite = { version = "0.32", features = ["bundled", "fts5"] }` and `directories` crate for OS path resolution.
- [ ] **Task 1.2: Implement SQLite Schema & Engine (`src-tauri/src/db.rs`)**
  - Implement tables: `notes`, `settings`, `transform`, `notes_fts` (FTS5), `notes_spatial_rtree` (R*Tree).
  - Implement WAL mode, foreign keys, and atomic batch transactions.
- [ ] **Task 1.3: Implement Rust Tauri Commands (`src-tauri/src/lib.rs`)**
  - Expose commands: `db_init`, `db_save_dirty_notes`, `db_delete_notes`, `db_save_settings`, `db_save_transform`, `db_search_fts`, `db_query_spatial_bounds`.
  - Add Rust unit tests in `src-tauri/src/db.rs`.

### Phase 2: Frontend Repository Abstraction & IPC Bridge
- [ ] **Task 2.1: Define `IStorageRepository` Interface (`src/lib/repository/IStorageRepository.ts`)**
  - Specify unified async methods matching application requirements.
- [ ] **Task 2.2: Implement `TauriSqliteRepository` (`src/lib/repository/TauriSqliteRepository.ts`)**
  - Connect TypeScript calls to `@tauri-apps/api/core` `invoke`.
- [ ] **Task 2.3: Wrap `IndexedDbStorage` into `IndexedDbRepository`**
  - Conform existing Dexie logic into `IStorageRepository` contract.
- [ ] **Task 2.4: Implement Repository Factory & Detection (`src/lib/repository/index.ts`)**
  - Detect runtime (`window.__TAURI_INTERNALS__`) and instantiate appropriate repository.

### Phase 3: Migration & Search Integration
- [ ] **Task 3.1: Automated One-Time IndexedDB -> SQLite Migration**
  - Detect legacy IndexedDB data upon first Tauri boot and import into SQLite.
- [ ] **Task 3.2: Wire FTS5 Search into `SearchModal.tsx` & Vector Extension Groundwork**
  - Delegate global search to Rust FTS5 when running natively for sub-millisecond multi-thousand note queries.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Existing User Data Loss** | Critical | Dual-check migration logic: inspect IndexedDB before initializing empty SQLite database. |
| **Test Environment Divergence** | Medium | Vitest runs in JSDOM / Node without Tauri IPC; `IndexedDbRepository` remains active for all unit test suites. |
| **IPC Serialization Latency on Rapid Edits** | Low | In-memory React state handles 60 FPS typing/dragging; writes to Rust are debounced using the existing dirty-ID tracking queue. |

---

## Open Questions
- None. The architecture provides backward compatibility and zero downtime transition.
