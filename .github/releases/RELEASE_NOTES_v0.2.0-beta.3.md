# DiaryNote v0.2.0-beta.3 (Pre-Release)

Pre-release notes for **DiaryNote v0.2.0-beta.3**, delivering native canvas image cards, drag-and-drop asset ingestion, image lightbox inspection, spatial layout commands, image dimension analysis, and comprehensive build/OS ignore rules.

---

### Image Cards & Native Asset Ingestion
- **Canvas Image Cards**: Full support for dedicated image cards with responsive aspect ratio rendering, polaroid styling, and rotation persistence.
- **Native Drag-and-Drop Ingestion**: Drag images directly onto the infinite canvas from the OS file manager with secure asset storage in the local AppData directory.
- **Image Lightbox Modal**: High-resolution image preview lightbox with zoom, rotation controls, and isolated event bubbling.
- **Asset Migration & Management**: Automated image asset migration, thumbnail caching, and database operations management.

---

### Spatial Layout & Canvas Performance
- **Native Layout Computations**: Backend-accelerated note alignment (align top, left, center, bottom), distribution, and grid packing.
- **Dimension Analysis**: Automatic image dimension analysis and metadata extraction.
- **Enhanced Export & Backup**: Staged JSON backup and import preview with transparent image asset bundling.

---

### Maintenance & CI
- **Comprehensive Gitignore**: Comprehensive ignore rules for Rust, Tauri, Node, coverage, and operating system artifacts.
- **Strict Verification**: 100% passing tests across Vitest and Rust unit test suites, zero Oxlint / TypeScript errors.
