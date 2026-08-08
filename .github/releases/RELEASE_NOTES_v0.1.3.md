# Release Notes - DiaryNote v0.1.3

Canvas interaction smoothness, selection precision, viewport persistence, export structure, and a full round of performance fixes.

---

## Performance

- Debounced canvas transform persistence: 60-120 writes/sec during zoom reduced to 2/sec.
- Incremental IndexedDB upserts replace full clear+bulkPut autosave; saves only dirty notes.
- Stabilized `React.memo` comparator on NoteCard and added memo wrapping to canvas child components.
- Fixed layout thrashing: removed height-reset reflow trick in the text engine and batched DOM dimension reads.
- Stripped heavy binary data from history snapshots and cleaned up event-listener leaks.
- Throttled minimap updates (100ms) and memoized sidebar filter/sort.

## Canvas & Selection

- Dynamic initial view centering; fixed note jump/race on refresh.
- Exact DOM bounding-rect drag selection for long notes; deferred selection box until mouse moves >3px.
- Symmetrical canvas panning in all directions; wheel zoom/pan works even while hovering note cards.
- 60fps lockstep group dragging without trailing animation.

## Persistence

- Canvas position and zoom automatically persist across refreshes and restarts.
- Export to dedicated `~/DiaryNote/` folder (`Backups`, `Notes`) with structured file naming.

## UI

- Sidebar shows full note titles, compact rows with a minimal hover style.
- High-density search modal with compact rows and clean one-line plain-text snippets.
