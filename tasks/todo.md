# Task List: Point 5 (Native Rust SQLite Persistence) & Point 4 (Storage Cleanup)

## Point 4: Storage Terminology & Import Cleanup (Immediate Execution)
- [x] Task 4.1: Update `README.md` to accurately document IndexedDB (Dexie.js) and remove misleading SQLite badges.
- [x] Task 4.2: Update `StatusBar.tsx` badge to "IndexedDB Engine" / "IndexedDB Local Storage Engine".
- [x] Task 4.3: Refactor all imports across `App.tsx`, `useNotesManager.ts`, `useCanvasTransform.ts`, `ErrorBoundary.tsx`, `lib/index.ts`, and test files from `sqliteStorage` to `indexedDbStorage`.
- [x] Task 4.4: Add deprecation notice to `src/lib/sqliteStorage.ts`.
- [x] Task 4.5: Update `AGENTS.md` UI component and architecture registry.
- [x] Task 4.6: Run verification suite (`npm test`, `npm run lint`, `cargo check`).

---

## Point 5: Native Rust & SQLite Persistence Architecture (Future Phase)

### Phase 1: Rust Core Persistence Layer
- [ ] Task 5.1: Add `rusqlite` (with `bundled` and `fts5`) & OS directory resolver to `src-tauri/Cargo.toml`.
- [ ] Task 5.2: Create `src-tauri/src/db.rs` with SQLite connection manager, WAL mode, schema tables (`notes`, `settings`, `transform`), FTS5 virtual table, and atomic transactions.
- [ ] Task 5.3: Register Tauri IPC command handlers in `src-tauri/src/lib.rs` and write Rust unit tests.

### Phase 2: Frontend Repository Abstraction & IPC Bridge
- [ ] Task 5.4: Define `IStorageRepository` interface in `src/lib/repository/IStorageRepository.ts`.
- [ ] Task 5.5: Implement `TauriSqliteRepository` connecting TypeScript to Rust IPC commands.
- [ ] Task 5.6: Implement `IndexedDbRepository` wrapping Dexie.js for Web/Vitest environments.
- [ ] Task 5.7: Create repository auto-detector in `src/lib/repository/index.ts`.

### Phase 3: Migration & Search Integration
- [ ] Task 5.8: Implement automated one-time IndexedDB to SQLite migration on first boot.
- [ ] Task 5.9: Wire Rust FTS5 into `SearchModal.tsx` for desktop native search.
- [ ] Task 5.10: Run full desktop integration tests and benchmark.
