# DiaryNote v0.2.0-beta.2 (Pre-Release)

Pre-release notes for **DiaryNote v0.2.0-beta.2**, delivering Phase 0 and Phase 1 of the native Rust desktop architecture: embedded SQLite WAL storage engine, client-side R-Tree spatial virtualization, OS-aware platform path resolution, single-instance mutex protection, and complete UI primitive standardization with Hugeicons.

---

### Native SQLite Storage Engine & Hexagonal Backend
- **Embedded SQLite WAL Engine**: Integrated `rusqlite` with Write-Ahead Logging (WAL mode), `PRAGMA synchronous = NORMAL;`, and versioned schema migrations (`001_initial_schema.sql` and `002_asset_tables.sql`) tracked via `PRAGMA user_version`.
- **Hexagonal Architecture (`domain/` & `infrastructure/`)**: Clean domain layer contracts with `NoteRepository` trait, domain `NoteService`, and `SqliteNoteRepository` adapter with atomic multi-note `save_batch` transactions and automated rollbacks on failure.
- **OS Platform Path Resolver**: Dynamic, platform-aware AppData directory resolution across Linux (`~/.local/share/DiaryNote`), macOS (`~/Library/Application Support/DiaryNote`), and Windows (`%APPDATA%/DiaryNote`) with automatic `assets/`, `backups/`, and `temp/` folder initialization.
- **Single-Instance Mutex**: Integrated `tauri-plugin-single-instance` to prevent database lock contention by focusing existing window on duplicate launches.
- **Zero-Loss Durability**: Immediate persistence flush hooks on window close (`CloseRequested`) and window blur to guarantee zero data loss.

---

### Client-Side Spatial Virtualizer (In-Memory R-Tree)
- **Dedicated Canvas Engine (`src/canvas/`)**: High-performance client-side spatial indexing using 2D R-Tree (`rbush`), zoom-aware dynamic overscan calculation, and viewport frustum culling.
- **Massive Canvas Scaling**: Canvas mounts only visible NoteCards within the camera viewport + overscan buffer (~50–200 DOM nodes), maintaining 60/120 FPS panning and zooming even with 10,000+ notes on canvas.
- **Zero-IPC Immediate Pointer Synchronization**: Dragging and resizing updates local spatial coordinates immediately in memory with zero IPC latency.

---

### UI Design System Standardization & Single Source of Truth
- **Universal `@ui` Primitives**: Replaced ad-hoc controls with standardized `@ui` components (`Button`, `IconButton`, `Icon`, `Input`, `Select`, `SegmentedControl`, `Switch`, `Checkbox`, `Dialog`, `Tabs`, `Menu`, `Tooltip`, `Badge`, `Kbd`).
- **Complete Hugeicons Migration**: Migrated 100% of application icons to Hugeicons (1.5px stroke weight) and removed legacy icon dependencies.
- **Dock-Integrated Batch Action Bar**: Seamlessly embedded the multi-note selection action bar into the bottom dock with smooth height and opacity transitions.
- **Full Light/Dark Theme Adaptability**: Class-based dark mode synchronization across all modals, dialogs, floating menus, and note card components.

---

### Test Suites & Build Verification
- **Automated Test Coverage**: 134 frontend Vitest tests across 30 test suites and 21 Rust native backend tests passing 100%.
- **Zero Lint & Type Errors**: Validated with ultra-fast `oxlint` and TypeScript strict type checking (`tsc --noEmit`).
