# DiaryNote v0.2.0-beta.3 — Pure Rust Foundation

> **⚠️ Pre-release**: This is a headless backend milestone. The GPUI-based graphical UI is not yet implemented — the binary will print a startup message and exit. This release validates the cross-platform build pipeline and the core Rust engine.

## What's New

### Pure Rust Architecture (Phase 1 & 2)

The entire application backend has been rewritten in 100% Rust with zero JavaScript/TypeScript dependencies.

#### Domain Engine (`crates/domain`)
- **Typed entities**: `Note`, `JournalEntry`, `GroupFrame` with `NoteId`, `GroupId`, `EdgeId` newtypes
- **Spatial index**: R-Tree powered viewport queries via `SpatialIndex` (sub-millisecond lookups)
- **Canvas camera**: `CanvasCamera` with zoom (0.1×–5.0×), pan, and screen↔world coordinate transforms
- **Undo/Redo**: Generic `HistoryStack<T>` with configurable depth (default 100 operations)
- **Markdown→plaintext**: `strip_markdown()` for full-text search indexing

#### Cryptography (`crates/crypto`)
- **AES-256-GCM** envelope encryption for locked notes
- **Argon2id** key derivation (19 MiB memory, 2 iterations, 1 lane)
- **Vault manager**: session-based unlock with zeroizing key material

#### SQLite Storage (`crates/storage`)
- **WAL-mode** database with PRAGMA-hardened configuration
- **Schema migrations**: versioned, idempotent DDL migration runner
- **FTS5 full-text search**: `notes_fts` virtual table with `strip_markdown` indexing
- **Repository pattern**: `NoteRepository`, `JournalRepository`, `GroupRepository` traits
- **Backup/Restore**: JSON export and staged import with duplicate ID resolution

### Cross-Platform Build Pipeline
- GitHub Actions CI/CD for Linux (x86_64), macOS (Intel + Apple Silicon), and Windows (x86_64)
- Optimized release profile: LTO, single codegen unit, stripped symbols

## Binary Artifacts

| Platform | File |
|---|---|
| Linux x86_64 | `DiaryNote-linux-x86_64.tar.gz` |
| macOS Apple Silicon | `DiaryNote-macos-aarch64.tar.gz` |
| macOS Intel | `DiaryNote-macos-x86_64.tar.gz` |
| Windows x86_64 | `DiaryNote-windows-x86_64.zip` |

## Next Milestones

- **Phase 3**: GPUI primitives — design tokens, theme engine, text rendering
- **Phase 4**: GPUI views — NoteCard, InfiniteCanvas, Sidebar, Modals
- **Phase 5**: Application wiring — App orchestrator, keybindings, window management
