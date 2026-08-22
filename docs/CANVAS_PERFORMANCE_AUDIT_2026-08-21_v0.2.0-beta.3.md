# Canvas Performance Audit — Pan & Drag Degradation Analysis

**Report Date:** 2026-08-21
**Application Version:** 0.2.0-beta.3
**Stack:** Tauri 2.x · Rust (tauri commands, SQLite) · React 19 · TypeScript · Vite
**Scope:** Deep review of the infinite canvas hot paths — pan, note drag, group drag, resize, marquee selection, zoom — across React frontend and Rust backend.
**Reviewer:** Senior product review + cross-platform desktop engineering audit

---

## Remediation Progress

> Status legend: ✅ shipped · 🔶 partially shipped · ⬜ open · ❌ won't do

### Batch 1 — P0 remediation (shipped 2026-08-21, same day as report)

| Item | Status | Notes |
|---|---|---|
| P0-1 memo defeated by inline props | ✅ | Latest-ref stable callbacks for all 7 inline props in App (`App.tsx`); `React.memo(InfiniteCanvas)` now holds |
| P0-2 mid-gesture commits | ✅ | Replaced fixed 120ms throttle with ~⅓-viewport **frustum-hysteresis commits**; one-shot glide-cancel commit at pan mousedown; minimap FG rect drawn imperatively inside pan rAF via shared `drawMinimapViewport`. Naive "commit only at mouseup" was rejected: it breaks culling on long pans and lets nav-glide fight direct-DOM writes |
| P0-3 backdrop-filter overlays | ✅ | Blur removed from dock, minimap panel, StatusBar, NoteToolbar, GroupFrame badge; Glass theme → translucent solid `bg-white/85` |
| P2-9 (memo half) | ✅ | `NoteConnections` numeric `viewportBounds` comparator added (identity-only changes skip re-render). Debounce-deps fix still open |
| Cover paint cheapening (follow-up audit) | ✅ | Duplicate washi `NoteDecorations` removed (uncovered notes painted tapes twice); airmail barber-pole de-rotated into axis-aligned 51×51 SVG pattern tile (no `patternTransform`); cover shadows `shadow-md/lg` → `shadow-sm` |
| AI latency (separate audit) | ✅ | Pooled `Arc<AiClient>` in Tauri state, connect timeout 5s / total 180s, reasoning-model suppression, merge-preview stream coalescing ≥80ms |

### Batch 1 deferred items → carried into Batch 2

P1-4 (incremental spatial index), P1-5 (bringToFront timing), P1-6 (group/resize rAF), P1-7 remainder, P1-8 (marquee DOM), P2-8/P2-9 (graph IPC deps), P2-10 (dead CSS vars), P2-11 misc.

### Batch 2 — trace-driven fixes (2026-08-22)

Triggered by a real 12.8s DevTools trace (`localhost-recording.json`): stutter is **main-thread React render cost at gesture boundaries** (mousedown ≤149ms, mouseup ≤85ms, scheduler/microtask flushes ≈0.9s combined), NOT compositor paint (Paint share 8.2%; pointermove handling measured at 0.06ms/event). See Batch 2 section at bottom of this file for outcomes.

---

## Executive Summary

The architecture is **fundamentally sound**: gestures write directly to the DOM inside `requestAnimationFrame`, note cards are `React.memo`'d with a field-level comparator, there is an R-tree spatial index with frustum culling, and persistence is debounced and dirty-tracked. Someone did real optimization work here.

What degrades pan/drag in practice is **death by a thousand cuts around the fast path**, not the fast path itself:

| Rank | Issue | Where | Symptom |
|---|---|---|---|
| P0-1 | `React.memo(InfiniteCanvas)` is fully defeated by inline arrow props | `App.tsx:964–1053` | Every App render reconciles the entire canvas subtree |
| P0-2 | Mid-gesture React commits: pan pushes `setTransform` into App state every 120ms | `InfiniteCanvas.tsx:508–513`, `useCanvasTransform.ts:81–88` | Periodic frame spikes *during* an otherwise smooth gesture ("smooth-stutter-smooth" cadence) |
| P0-3 | `backdrop-filter` overlays sitting above the moving canvas | `App.tsx:1063`, `InfiniteCanvas.tsx:815`, `StatusBar.tsx:202`, `paperThemes.ts:159` | Compositor re-blurs the whole canvas beneath them every frame — brutal on Linux/WebKitGTK |
| P1-4 | Full R-tree rebuild + O(n) memos on every notes-array identity change | `InfiniteCanvas.tsx:564–579` | Keystroke, drag-end, and even *mousedown* (via z-index bump) pay O(n log n) |
| P1-5 | `bringToFront()` runs a full `setNotes` pass on every note mousedown | `useNoteDrag.ts:130`, `useNotesManager.ts:454` | Hitch at drag start, before the first pixel moves |
| P1-6 | Unthrottled mousemove handlers in GroupFrame drag and note resize | `GroupFrame.tsx:111–155`, `useNoteResize.ts:73–106` | High-polling-rate mice (125–1000Hz) starve the main thread |
| P1-7 | Forced synchronous layout at gesture start: `offsetWidth` on **all** notes | `useNoteDrag.ts:175–182`, `InfiniteCanvas.tsx:385–396` | Layout thrash spike exactly when the user expects instant response |
| P2-8 | Full-vault serialization over Tauri IPC after every typing burst | `NoteConnections.tsx:61–75`, `rustGraph.ts:74` | Multi-MB JSON round trips, CPU spike after each 150ms pause |
| P2-9 | Undo history diffs computed via `JSON.stringify` of the whole vault | `useHistoryState.ts:24`, `useNotesManager.ts:431` | Stringifying megabytes twice per history push |
| P2-10 | Dead CSS-variable writes on every transform commit; grid doesn't actually track pan | `InfiniteCanvas.tsx:244–259`, `index.css:66+` | Pure waste + a latent visual bug |

On Linux specifically (Tauri → WebKitGTK), P0-2 + P0-3 compound: WebKitGTK's compositing and `backdrop-filter` paths are far less optimized than WebView2 (Windows) or WKWebView (macOS). The same build that feels "okay-ish" on Windows can feel visibly laggy on Linux for these two reasons alone.

---

## Part 1 — Frontend Findings (React)

### P0-1 · InfiniteCanvas memoization is dead on arrival

**File:** `src/App.tsx:964–1053`

`InfiniteCanvas` is wrapped in `React.memo` (`InfiniteCanvas.tsx:875`), but it receives these props as inline arrows/lambdas created fresh on every App render:

```tsx
// App.tsx — all of these break memo:
onNavigateToNote={(id) => handleNavigateToNote(id, setSelectedNoteIds)}   // :979
onDropImageFiles={(files, clientX, clientY) => handleAddImageFiles(...)} // :985
onRequestLockNote={(id) => { ... }}       // :986
onRequestUnlockNote={(id) => { ... }}     // :1005
onContextMenuNote={(e, noteId) => {...}}  // :1025
onContextMenuCanvas={(e) => {...}}        // :1040
onMouseMoveCoord={(clientX, clientY) => {...}} // :1050
```

Since `transform` state lives in App (via `useCanvasTransform`), **every transform commit re-renders App**, and because of these unstable props, **every App render re-renders all of InfiniteCanvas** — element creation and reconciliation for group frames, connection SVG, minimap, and the entire visible-card list (cards individually bail out via their comparator, but the diff itself still walks everything).

**Fix:** Wrap each handler in `useCallback` in App (or move the bodies into existing callbacks). One-time refactor, ~20 lines, restores memo for the single most-rendered component in the app.

---

### P0-2 · Pan writes to global React state mid-gesture

**Files:** `src/components/InfiniteCanvas.tsx:487–516`, `src/hooks/useCanvasTransform.ts:81–88`

Pan gesture mechanics today:
1. `mousemove` → rAF → direct DOM `style.transform` on the world layer ✅ (correct, 0-latency)
2. But every 120ms, a throttled `onTransformChange(pendingTransform)` fires → `setTransform` in App → full App + InfiniteCanvas render **while the user is still dragging**
3. Final commit on `mouseup`

Each mid-gesture commit recomputes, in one render pass:
- `worldFrustum` memo (`InfiniteCanvas.tsx:581`) — new object every time
- `visibleNotes` filter over all notes (`:585`)
- `minimapScale`/bounds loop over all notes (`:600`)
- `noteGroups` grouping loop (`:632`)
- New `viewportBounds` object → defeats `React.memo(NoteConnections)` → full SVG path-string rebuild
- Minimap foreground canvas redraw effect (`:108`)

That's 4 × O(n) loops + a reconciliation walk landing on random frames mid-gesture, ~8 times per second. Individually cheap; collectively it is the periodic hitch users perceive as "pan lag."

**Fix (choose one, in order of preference):**
- **(a)** Commit transform to React state only on gesture end. During pan, the only live consumers are: the minimap viewport rectangle and (optionally) the zoom % readout. Update the minimap FG canvas imperatively inside the same rAF you already run — it's a 170×110 canvas, drawing one rect costs nothing. Zoom readout updates naturally on commit.
- **(b)** Keep a throttled sync but route it through a subscription store (`useSyncExternalStore`) so only the minimap subscribes — App never re-renders mid-pan.

Option (a) is fewer moving parts and matches the architecture you already use for note dragging (direct DOM + single commit at end). Wheel zoom needs slightly different handling since zoom genuinely affects card rendering, but your existing `pendingWheelTransformRef` + rAF commit already batches it correctly.

---

### P0-3 · `backdrop-filter` layered over the moving canvas

**Files:**
- Bottom dock: `App.tsx:1063` — `backdrop-blur-md`
- Minimap panel: `InfiniteCanvas.tsx:815` — `backdrop-blur-md`
- Status bar: `StatusBar.tsx:202` — `backdrop-blur-md`
- Group badge: `GroupFrame.tsx:173–174` — `backdrop-blur-md`
- Note toolbar: `NoteCard/NoteToolbar.tsx:92` — `backdrop-blur-xs`
- **Glass paper theme applies blur per note card**: `constants/paperThemes.ts:159` — `bg: 'bg-white/95 backdrop-blur-md'`
- Zen-mode badge, lightbox, sidebar: various

`backdrop-filter` forces the compositor to re-sample and Gaussian-blur **everything painted beneath the element on every frame**. When the content beneath is a panning canvas containing dozens of text-rendered cards, that is the single most expensive thing you can ask a compositor to do per frame.

This is platform-amplified: Tauri on Linux uses **WebKitGTK**, whose backdrop-filter and tiling/compositing performance is dramatically weaker than WebView2 (Windows) or WKWebView (macOS). If reports of lag come primarily from Linux, this + P0-2 is why.

**Fix:**
1. Remove blur from chrome that floats above the canvas (dock, minimap panel, status bar, toolbar). Replace with high-opacity solid fills (`bg-white/95` → `bg-white`, dark: `bg-slate-900/90` → `bg-slate-900`). Visually near-identical over a busy canvas, orders of magnitude cheaper.
2. Never allow per-note-card blur (Glass theme): swap `backdrop-blur-md` for a translucent solid. One glassy card is a curiosity; ten panning together is a slideshow.
3. If the frosted look is non-negotiable for the dock, at minimum strip it while `isPanning || isDragging` (conditional class swap), restoring it at rest.

---

### P1-4 · Spatial index and derived memos rebuild wholesale per notes change

**File:** `src/components/InfiniteCanvas.tsx:564–579`

```tsx
const spatialIndex = useMemo(() => {
  const index = new SpatialIndex();
  for (...) index.insert({...});
  return index;
}, [notes]);   // ← identity dep
```

The `notes` array identity changes on: every keystroke (`handleUpdateNote`), every drag-end, every `bringToFront`, every batch update. Each time, the R-tree is torn down and rebuilt from scratch (your `SpatialIndex.load()` isn't even used — it inserts one-by-one through the recursive path).

Same render also re-runs three other O(n) memos (`visibleNotes`, minimap bounds, `noteGroups`) — those are unavoidable on a real data change, but the tree rebuild is the expensive one.

**Fix:** Incremental maintenance. Keep the index in a ref; on `notes` change, diff against previous (you already have identity-per-note immutability, so a position/id comparison is cheap):

```ts
const indexRef = useRef<SpatialIndex>();
// on notes change: remove missing ids, update moved boxes (index.update exists), insert new
```

Your `SpatialIndex` already exposes `update`/`remove` — they're just unused. ~30 lines.

---

### P1-5 · `bringToFront` triggers a full state pass at drag start

**Files:** `src/hooks/useNoteDrag.ts:130`, `src/hooks/useNotesManager.ts:454–467`

Every note `mousedown` calls `onBringToFront(note.id)`, which calls `setNotes` (new array identity) unless the note is already topmost-and-unique. Consequences at drag start, before any movement:

1. Full App re-render + canvas reconciliation (compounded by P0-1)
2. R-tree rebuild (P1-4)
3. Autosave effect re-arms (`useNotesManager.ts:52`, harmless but pointless until drop)
4. `pendingHistoryNotesRef.current` is mutated but **no flush is ever scheduled** for it — it only gets committed if a later `handleUpdateNote` happens to fire; a pure click (no drag) leaves stale pending history. Minor correctness smell.

**Fix:** Don't mutate the array on mousedown. Render order doesn't need to change until visual overlap actually matters — apply z-order at first movement threshold (`hasMoved === true`, which you already track) or at drop time alongside the position commit. One-line relocation: move `onBringToFront(note.id)` inside the `if (!hasMoved)` block of `handleMouseMove`. Also fixes the pending-history leak for the click case.

Side note: `Math.max(...prevNotes.map(n => n.zIndex || 1))` (`:457`) uses spread — fine at hundreds of notes, a stack-overflow hazard at ~100k+. Use a `reduce` loop; it's the same length.

---

### P1-6 · Group-frame drag and note resize are not rAF-throttled

**Files:** `src/components/GroupFrame.tsx:111–155`, `src/hooks/useNoteResize.ts:73–106`

`useNoteDrag` correctly coalesces with `requestAnimationFrame` (`useNoteDrag.ts:254–259`). Two sibling gestures don't:

**GroupFrame badge drag:** raw `mousemove` handler doing, per event (potentially 500–1000/sec with gaming mice):
- `groupNotes.map(...)` with an inner `dragStartRef.current?.notePositions.find(...)` → **O(k²) per event**
- Direct DOM writes per event (fine) — but uncoalesced

**Note resize:** raw `mousemove` writing `style.width`/`style.minHeight` per event — each write forces layout of the card, and the `GroupFrame` `ResizeObserver` then schedules bounds recalculation. Layout-triggering properties at event rate = guaranteed jank while resizing near other content.

**Fix:** Copy the exact rAF-coalescing block from `useNoteDrag.ts:253–259` into both. Convert `notePositions` array to a `Map` at drag start. ~15 lines total; consistency bonus.

---

### P1-7 · Forced synchronous layout at gesture start

**Files:** `src/hooks/useNoteDrag.ts:175–182`, `src/components/InfiniteCanvas.tsx:385–396`

At mousedown, both gestures measure **every** note:

```ts
allNotesRef.current.forEach((n) => {
  const cardEl = document.getElementById(`note-card-${n.id}`);
  cardDimsMap.set(n.id, { width: cardEl?.offsetWidth ..., height: cardEl?.offsetHeight ... });
});
```

With N rendered cards this interleaves `getElementById` + `offsetWidth/offsetHeight` reads — reads that only resolve after layout is clean, so the browser performs repeated forced reflows. This is the AGENTS.md Rule #4 anti-pattern (`getBoundingClientRect/offsetWidth in hot paths`), just relocated to gesture start. With ~50 visible cards it's a few ms; with several hundred it's a perceptible hitch exactly at press.

Additionally, `processMoveDOM` re-queries `document.getElementById(...)` **every frame** for every dragged note (`:206, :223`) instead of caching the element handles captured at drag start.

**Fix:**
1. Measure lazily and narrowly: group-drag needs dimensions only for notes in affected groups; marquee needs them only for notes intersecting the swept region (or just trust `note.width/height` — the persisted values are authoritative for cards the user has resized, and auto-height drift only matters for the handful being touched).
2. Cache element refs at drag start in the `cardDimsMap` pass you already do; reuse them in `processMoveDOM`.

---

### P1-8 · Marquee selection re-renders the whole canvas every frame

**File:** `src/components/InfiniteCanvas.tsx:406–459`

`setSelectionBox({startX, startY, currentX, currentY})` per rAF during rubber-band select → full InfiniteCanvas render per frame (again compounded by P0-1). The intersection math itself is well done (pre-measured bounds, zero reflow, rAF-coalesced) — it's purely the React-state-per-frame for four numbers that hurts.

**Fix:** Draw the selection box via direct DOM (a ref'd overlay div, mutate `style.left/top/width/height` in the same rAF), commit once on mouseup. Mirrors your own pan/drag pattern. ~10 lines.

---

### P2-9 · `NoteConnections`: memo defeated + self-defeating debounce

**Files:** `src/components/NoteConnections.tsx:55–75`, `InfiniteCanvas.tsx:726–739`

Two compounding problems:

1. **Memo defeated:** `viewportBounds` is a fresh object literal every InfiniteCanvas render → `React.memo(NoteConnections)` (shallow) re-renders on every commit, rebuilding all bezier path strings and badge JSX.

2. **Debounce defeated:** the graph-compute effect declares `}, [connectionsContentKey, notes])` (`:75`). Including raw `notes` means every array identity change — i.e., **every keystroke** — tears down and restarts the 150ms timer, then fires `get_note_graph_connections` with the **entire serialized vault** over IPC. The `connectionsContentKey` (id:title:updatedAt hash) was designed to prevent exactly this, and then `notes` was added to the deps beside it, nullifying it. Position-only drags also trigger full graph recomputes even though edges don't depend on positions.

**Fix:**
- Deps: `[connectionsContentKey]` only. `updatedAt` changes on content edits; title changes are in the key; positions are irrelevant to edge computation. This single change eliminates the per-keystroke IPC storm.
- Memo comparator: compare bounds numerically (`prev.viewportBounds?.minX === next.viewportBounds?.minX && ...`), or pass the memoized `worldFrustum` object itself (it only changes when transform/viewport truly change).
- Longer term: have Rust return edges keyed by content hash and cache server-side (see Part 2).

---

### P2-10 · Dead CSS variables written on every transform commit (+ grid bug)

**Files:** `src/components/InfiniteCanvas.tsx:244–259`, `src/index.css:66–99`

Two `useEffect`s write `--canvas-x/y/zoom` and `--grid-pos-x/y/size` to the DOM on every transform change. Grep confirms **nothing consumes them** — `.bg-canvas-*` classes are static `background-image` + fixed `background-size: 32px 32px`.

Implications:
- Wasted DOM writes per commit (trivial cost, nonzero).
- **Actual bug:** the dotted/grid/ruled background is static — it does not translate or scale with pan/zoom. The world layer moves over an unmoving grid, which visually breaks the infinite-canvas illusion at any zoom ≠ 32px-multiples, and users read "the dots feel off while panning" as performance jank.

**Fix:** Either (a) delete the two effects and accept a decorative static texture, or (b) actually consume the vars — replace `background-size: 32px 32px` with `background-size: var(--grid-size)` and add `background-position: var(--grid-pos-x) var(--grid-pos-y)` to the `.bg-canvas-*` rules. Option (b) is ~4 lines of CSS and makes the grid genuinely infinite; `background-position/size` changes paint but don't relayout, so it's cheap.

---

### P2-11 · Smaller frontend items

| Item | Location | Note |
|---|---|---|
| `overlappingGroup` rebuilds a groups map per ungrouped visible card, deps include `allNotes` | `NoteCard/index.tsx:340–388` | O(visible × n) per notes change. Parent already computes `noteGroups` (`InfiniteCanvas.tsx:632`) — pass it down instead of rebuilding per card. |
| `ImageNoteCard` uses default shallow memo while receiving `allNotes`/`selectedNoteIds` arrays | `ImageNoteCard.tsx:604` | Re-renders fully on every notes change. Give it the same field-level comparator philosophy as `NoteCard` (compare `note.*` fields, membership checks for selection). |
| `NoteCard` comparator ignores `zoom` prop | `NoteCard/index.tsx:1000–1046` | Perf win, but a **latent correctness bug**: `useNoteDrag`/`useNoteResize` capture `zoom` at render; after a zoom commit that skips re-render, the next drag divides deltas by a stale zoom. Either compare `zoom` in the comparator or read zoom from a ref updated in an effect. |
| `handleWheel` re-registers the native listener on every transform change (dep on `transform`) | `InfiniteCanvas.tsx:267–356` | Works, but add/remove per wheel-tick-throttled commit. Read transform from a ref (you already maintain `pendingWheelTransformRef`); register once. |
| `getBoundingClientRect` per ctrl-wheel tick | `InfiniteCanvas.tsx:313` | Cache container rect on first wheel of a burst; invalidate on resize. Minor. |
| StrictMode double-invocation | `main.tsx` | Dev-only noise; do not profile with StrictMode on. Production builds unaffected. |

---

## Part 2 — Backend Findings (Rust / Tauri)

### B-1 · IPC payload shape: whole-vault graph computation per burst

**Files:** `src/lib/rustGraph.ts:74`, `src/components/NoteConnections.tsx:61–75`, `src-tauri/src/domain/graph/service.rs:41`

`get_note_graph_connections({ notes })` ships **every note's full content** JS → Rust (serde JSON deserialize), parses each with `pulldown-cmark` regex helpers, and returns edges. Triggered per typing burst (see P2-9). At 200 notes × avg 2KB content that's ~400KB serialized per burst; at journal-scale vaults (years of entries, images excluded) it reaches multi-MB territory. Serde deserialization of `Vec<Note>` dominates Rust-side time; the parse itself is fast.

The Rust implementation itself is clean — O(total content), locked-note ciphertext skip is correct and zero-knowledge compliant (`service.rs:63`), edge dedup via HashSet. Excessive `String` cloning in inner loops (`service.rs:98–108`) is measurable only at very large vaults — not worth touching until B-2 lands.

**Fix ladder:**
1. Frontend dep fix (P2-9) — eliminates the trigger. Do this first; it may be sufficient forever.
2. Content-hash request: send `[{id, contentHash}]`, Rust returns edges only for hashes it hasn't seen, caching parsed results in a `HashMap<String, ParsedLinks>` behind `State<Mutex<…>>`. Turns repeats into O(changed notes).
3. Only if profiling demands it: `#[tauri::command(async)]` is unnecessary here (sync commands already run on the pool), but consider `rayon` par_iter over notes for 10k+ vaults.

### B-2 · Unused native layout commands

**Files:** `src-tauri/src/commands/layout.rs:363–522`, `src/lib/rustLayout.ts`

`cull_notes_in_frustum` and `compute_batch_drag_snapping` are registered and tested but **never invoked from application code** — the frontend does its own R-tree culling and its own snapping math. This is actually the right call (an IPC round trip per frame would be far slower than local JS AABB checks), so: **delete them, or wire snapping exclusively at drag-commit time** where a single round trip is acceptable. Dead surface area confuses future audits and bloats the binary.

### B-3 · Persistence layer — healthy

- Dirty-set autosave with 500ms debounce and dirty-only serialization (`useNotesManager.ts:52–81` → `save_notes_batch`) is textbook correct. No action.
- Sync `#[tauri::command] pub fn`s run on Tauri's blocking pool — SQLite writes never block the webview. Correct as-is; don't convert to async without reason.
- Transform save debounced 500ms (`useCanvasTransform.ts:50–57`) — fine, provided P0-2(a) stops mid-gesture commits (otherwise you persist intermediate pan positions; harmless but noisy WAL churn).

### B-4 · Platform note: WebKitGTK (Linux)

If primary complaint machines are Linux:
- `backdrop-filter` cost is 5–20× WebView2/WKWebView depending on GPU path and fractional scaling.
- Verify hardware compositing is actually active: run with `WEBKIT_DISABLE_DMABUF_RENDERER=1` and `WEBKIT_DISABLE_COMPOSITING_MODE=1` **as diagnostics only** (each toggles a known-slow fallback — if either *improves* things, your driver path is the issue, and the fix belongs in launch configuration, not app code).
- Fractional display scaling (125%/150%) forces WebKitGTK into extra raster work on scaled layers; test at 100% to isolate.

None of this substitutes for P0-3 — removing blur-over-canvas helps on every platform.

---

## Part 3 — Prioritized Remediation Plan

| Priority | Action | Files | Effort | Expected effect |
|---|---|---|---|---|
| **P0** | Stabilize InfiniteCanvas props with `useCallback` | `App.tsx` | ~30 min | Restores memo; removes full-subtree reconciliation from every App render |
| **P0** | Commit pan transform only at gesture end; drive minimap rect imperatively | `InfiniteCanvas.tsx`, `useCanvasTransform.ts` | ~1 hr | Eliminates ~8 mid-gesture render storms/sec while panning |
| **P0** | Remove `backdrop-blur` from dock, minimap panel, status bar, toolbars; forbid per-card blur (Glass theme) | `App.tsx:1063`, `InfiniteCanvas.tsx:815`, `StatusBar.tsx:202`, `NoteToolbar.tsx:92`, `paperThemes.ts:159`, `GroupFrame.tsx:169–174` | ~30 min | Largest single compositor win; biggest on Linux/WebKitGTK |
| **P1** | Move `onBringToFront` to first-movement threshold | `useNoteDrag.ts:130` | 2 min | Kills drag-start hitch; fixes pending-history leak |
| **P1** | rAF-coalesce group drag + resize; Map for start positions | `GroupFrame.tsx`, `useNoteResize.ts` | ~45 min | Fixes high-Hz mouse starvation |
| **P1** | Lazy/narrow measurement at gesture start; cache element handles per frame | `useNoteDrag.ts`, `InfiniteCanvas.tsx:385` | ~30 min | Removes forced-reflow spike at press |
| **P1** | `NoteConnections` deps → `[connectionsContentKey]`; numeric bounds memo | `NoteConnections.tsx:75`, `InfiniteCanvas.tsx:732` | 10 min | Ends per-keystroke whole-vault IPC; ends per-commit SVG rebuild |
| **P1** | Incremental spatial index maintenance via ref | `InfiniteCanvas.tsx:564` | ~1 hr | O(changed) instead of O(n log n) per keystroke/commit |
| **P2** | Selection box via direct DOM, single commit | `InfiniteCanvas.tsx:800` | ~20 min | Smooth marquee over dense canvases |
| **P2** | History diff without `JSON.stringify` (object identity compare — updates are immutable) | `useHistoryState.ts:24`, `useNotesManager.ts:431` | ~30 min | Removes MB-scale stringification per push |
| **P2** | Grid consumes CSS vars or delete them | `InfiniteCanvas.tsx:244–259`, `index.css` | 15 min | Fixes "static grid" illusion + dead writes |
| **P2** | Pass shared `noteGroups` into cards; `ImageNoteCard` comparator; `zoom` staleness fix | `NoteCard/index.tsx`, `ImageNoteCard.tsx` | ~1 hr | Closes remaining per-change O(V×n) and a latent drag-zoom bug |
| **P2** | Delete or wire unused Rust culling/snapping commands | `layout.rs`, `rustLayout.ts` | 15 min | Hygiene |

**Do not do:** move culling/hit-testing into per-frame Rust IPC calls (worse than local JS); introduce a state library for transform; replace DOM cards with `<canvas>` rendering (enormous rewrite, current DOM approach with culling scales fine to thousands of notes once P0/P1 land).

---

## Part 4 — Verification Protocol

Reproduce before/after with a synthetic fixture (generate N notes programmatically at spread coordinates):

```
N = 100 / 500 / 2000 notes, mixed text/checklist/image, showConnections ON
Gestures: 10s continuous pan, single-card drag ×20, group drag ×5,
          rubber-band select ×5, pinch zoom in/out ×5, typing burst 60s
```

Measure:
1. **DevTools Performance panel** attached to the Tauri webview (enable `devtools` feature in `tauri.conf.json` → `app.windows[0].devtools` or via debug build). Look for: long tasks >50ms during gestures; `Recalculate Style`/`Layout` entries inside `mousemove` windows (P1-6/P1-7); React commit flame width mid-pan (P0-2).
2. **FPS via `requestAnimationFrame` delta counter** overlayed during pan (target: stable ≈ refresh rate; failure mode today: sawtooth 60→38→60 at ~8Hz cadence = P0-2 signature).
3. **IPC volume**: temporarily wrap `invoke` with a byte-counting logger; before P2-9 fix, watch KB spike after each typing pause.
4. **Linux specifically**: repeat at 100% and 125% scaling; toggles from B-4 as diagnostics.

Success criteria: zero long tasks >16ms attributable to gesture handlers at N=500; no invoke traffic during typing pauses beyond debounced saves; pan frame time variance < ±2ms after P0 batch.

---

## Batch 2 Outcomes — Trace-Driven Gesture-Boundary Fixes (2026-08-22)

**Evidence:** 12.8s DevTools trace (`localhost-recording.json`, dev build + StrictMode) captured while panning around a covered note. Key measurements that redirected this batch:

| Signal | Value | Implication |
|---|---|---|
| pointermove/mousemove handling | 729 events / **45ms total** (~0.06ms each) | The rAF direct-DOM fast path was already correct — motion itself was never the cost |
| `mousedown` handlers | 9 events / **260ms**, max **148.6ms** | Press-time cascade (bringToFront `setNotes` + selection + all-notes `offsetWidth` scan) |
| `mouseup` handlers | 9 events / **196ms**, max 85ms | Final commit renders + `JSON.stringify` history diffs |
| scheduler `message` + microtask flushes | ≈**0.9s combined**, max single flush 136/118ms | React render commits landing mid-gesture via hysteresis commits |
| Forced synchronous layouts | 12 reflows | The drag-start `offsetWidth` scan for every note |
| GC | 45 collections / **140ms** | Allocation churn from per-render array copies |
| Frames >100ms | 45 of 228; only 60 rAF ticks fired in ~13s | Long tasks starved the frame loop |

### Shipped in Batch 2

| # | Fix | File(s) | Audit item closed |
|---|---|---|---|
| 1 | Drag start no longer measures any DOM: group frames size from persisted dims during drag (ResizeObserver corrects drift after drop); dragged-note element handles cached once per gesture instead of `getElementById` per frame | `useNoteDrag.ts` | P1-7 ✅ (canvas half), part of mousedown spike |
| 2 | `handleCanvasTransformChange` bails on value-identical transforms → glide-cancel commit and zero-distance mouseup render nothing | `useCanvasTransform.ts` | P0-2 remainder ✅ |
| 3 | History diff + undo dirty-marking compare object identity (notes are immutable) instead of `JSON.stringify` pairs | `useHistoryState.ts`, `useNotesManager.ts` | P2-9(second) ✅ |
| 4 | Deleted both dead CSS-custom-property effects (wrote vars consumed nowhere; invalidated world-subtree styles every commit) | `InfiniteCanvas.tsx` | P2-10 ✅ (static-grid visual quirk remains by design — decorative texture) |
| 5 | `NoteConnections` hoists all edge geometry (edge points, bezier path, badge position, cull boxes) into a `[connections, noteMap]` memo; per-commit renders only run culling checks + color picks | `NoteConnections.tsx` | per-commit SVG rebuild ✅ |
| 6 | Airmail border: live inline SVG `<pattern>` replaced with pre-rendered seamless 2× bitmap tile (**682 bytes**, Vite-inlined), painted as `background-image: repeat`; negative-z-index stacking removed from cover decorations | `NoteCoverDecorations.tsx`, new asset | covered-card mount rasterization ✅ |

Verification at close of batch: `bun run lint` ✅ · `bun run test` 232/232 ✅ · `bun run build` ✅.

### Still open (unchanged priority)

P1-4 incremental spatial index · P1-5 bringToFront timing · P1-6 group-drag/resize rAF coalescing · P1-8 marquee direct-DOM · P2-8 graph IPC deps fix (`[connectionsContentKey]`) · P2-11 misc (ImageNoteCard comparator, zoom staleness, wheel-listener churn). Re-profile against a **production build** before pulling further levers — the Batch 2 trace was dev-mode inflated and the remaining items should be sized against prod numbers first.

---

## Batch 3 Outcomes — State-Ownership Refactor (2026-08-22)

**Trigger:** Batch 2 trace still showed 1.6s of React commit flushes + 0.5s mouseup handlers: every `setNotes` re-rendered App → canvas → all cards. Root cause was state architecture, not gesture math.

### Shipped

| Change | Detail |
|---|---|
| **External store** | New `src/stores/notesStore.ts` (zustand, ~1KB): `notesById`+`order`+`layoutVersion` replace the App-owned array; actions (`insert/update/updateBatch/remove/removeMany/bringToFront/restore/hydrate`) own persistence (dirty set, 500ms debounced save with **re-dirty guard fixing known-gap #3**, min-350ms saving display, beforeunload/blur flush) |
| **Per-card granularity** | `CanvasCard`/`ConnectedCards` wrappers subscribe each card to its own note via `useNote(id)` — a keystroke re-renders exactly one card subtree |
| **Shell scoped to layout** | Spatial index, frustum culling, group map, minimap bounds keyed to a new `layoutVersion` counter bumped only by geometry/membership changes — typing never touches them |
| **Chrome decoupled** | StatusBar / NotesSidebar / BatchActionBar / CanvasControls / AppModals pull `useNotesList()` internally instead of receiving `notes` props (AppModals also dropped unused `setNotes` prop) |
| **History via bridge** | `registerNotesHistoryBridge` keeps existing `useHistoryState` semantics; impure setState updaters eliminated (**known-gap #5 resolved**) |
| **Legacy deleted** | `useNotesManager.ts` + tests removed after full consumer migration |
| **Seal sizing** | Cover seal clamped to ≤42% of the card's shorter side (floored at 48px) — tall-narrow cards no longer grow oversized seals |

Also landed pre-store quick wins: marquee-selection `offsetWidth` sweep removed (canvas half of P1-7 ✅) and `NoteConnections` graph effect re-keyed to `[connectionsContentKey]` only (**P2-8 ✅** — ends whole-vault IPC per keystroke/drag burst).

Verification at close: `bun run lint` ✅ · vitest 232/232 ✅ · `bun run build` ✅.

### Remaining open items (unchanged)

P1-4 incremental spatial index (shell still scans O(n) per layout bump — now far rarer), P1-5 bringToFront timing, P1-6 group/resize rAF coalescing, P1-8 marquee direct-DOM box, P2-11 misc (ImageNoteCard comparator, zoom staleness). Next measurement must be a **production build** trace.

---

## Closing Assessment (original report, retained)

This is a well-architected canvas wearing three or four localized anchors. The gesture core (rAF + direct DOM + deferred commit) is exactly right — the problems are all *around* it: a defeated memo boundary, mid-gesture state writes, compositor-hostile blur overlays, and a graph pipeline that re-ships the vault per keystroke. The P0 batch (~2 hours of work) should recover the majority of perceived lag on all platforms; the P1 batch hardens it for high-polling mice and large vaults; P2 is hygiene with compounding returns at scale.
