# AGENTS.md — Agent Working Rules & Verified Architecture

**Document Version:** 2.0.0 (full rewrite — every claim below verified against source on 2026-08-21, app v0.2.0-beta.3)
**Target Application:** DiaryNote Desktop (Tauri 2 + Rust + React 19 + TypeScript)

> [!IMPORTANT]
> **RULE #1 (UI CHANGE MANIFEST):**
> Whenever an agent modifies, refactors, creates, or deletes **any UI component, modal, hook affecting rendering, or stylesheet** (`src/components/**`, `src/hooks/**`, `src/index.css`), the agent **MUST immediately add a row to the UI Component Modification Registry below**, describing what changed and how to verify no regression.
> Historical entries are pruned to those reflecting current live behavior; superseded entries live in git history.

## Active UI Component Modification Registry

| Phase & Task ID | File Path | UI Elements Affected | Nature of Change | Expected Visual & Functional Behavior | Regression Verification Checklist |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Typing Latency Root-Cause Fix (Trailing Coarse Debounce & Decoupled App Root)** | `src/stores/notesStore.ts`, `src/App.tsx`, `src/components/NoteCard/ConnectedCards.tsx`, `src/components/StatusBar.tsx`, `src/hooks/useNoteSelection.ts` | Keystroke input responsiveness, App re-render isolation, timer fan-out storm during note editing | Replaced leading throttle in `scheduleCoarse` with trailing debounce (400ms quiet window); decoupled `App.tsx` from `useNotesList()` and `useSaveStatus()` by reading store snapshots on-demand in callbacks; moved `useSaveStatus()` consumption directly into `StatusBar.tsx`; wrapped `CanvasCard` and connected wrappers in `React.memo`; eliminated intermediate keystroke re-renders across the canvas shell. | Rapid typing in any note card produces zero re-renders in `App`, siblings, canvas shell, minimap, or status bar; keystrokes are processed with 0ms main-thread blockage and no buffering freezes; coarse lists (sidebar search, status bar counts, connections) update silently 400ms after typing ceases; save indicator changes re-render only the status bar chip. | 1. Type rapidly (10+ keystrokes/sec) into any note card -> 0 frame drops, 0 input freezes.<br>2. Check React DevTools Profiler during typing -> ONLY the active card commits.<br>3. Status bar word/char counts and save indicator update properly after typing ceases.<br>4. Undo/redo, cut/paste, group/ungroup, cover/uncover -> 100% operational.<br>5. `bun run lint`, `bun run test`, `bun run build` -> 100% pass. |
| **Trace-Driven Gesture-Boundary Fixes (Batch 2)** | `src/hooks/useNoteDrag.ts`, `src/hooks/useCanvasTransform.ts`, `src/hooks/useHistoryState.ts`, `src/hooks/useNotesManager.ts`, `src/components/InfiniteCanvas.tsx`, `src/components/NoteConnections.tsx`, `src/components/NoteCard/NoteCoverDecorations.tsx`, `src/assets/note-covers/covers/airmail-border-tile@2x.png` | Drag-start cost, gesture-boundary renders, history push cost, per-commit style invalidation, connection SVG rebuilds, covered-card mount rasterization | Removed the all-notes `offsetWidth` scan at drag start (group frames size from persisted dims; element handles cached per gesture); value-identical transform commits now bail before rendering (glide-cancel + zero-distance mouseup become free); history diffs and undo dirty-marking compare object identity instead of `JSON.stringify` pairs; deleted two dead CSS-custom-property effects that invalidated world-subtree styles every commit; `NoteConnections` hoists all path geometry into a `[connections, noteMap]` memo so culling re-renders skip math; airmail border replaced live inline SVG `<pattern>` with a pre-rendered seamless 2× bitmap tile (682 B, background-image repeat). | Pressing/releasing gestures no longer produce 50–150ms main-thread blocks from measurement or redundant renders; undo/redo granularity unchanged; group-frame sizing during drag may briefly lag auto-height drift until drop (corrected by GroupFrame's ResizeObserver); covered vintage-airmail border visually identical (same 51px stripe geometry as bitmap). | 1. Click/drag notes with DevTools Performance recording -> no forced-layout entries at mousedown.<br>2. Press-and-hold without moving -> no App re-render fires (React Profiler or CPU flat).<br>3. Undo/redo across content edits, note creation/deletion, z-order changes -> identical restore behavior.<br>4. Pan with connections visible -> SVG paths stay put relative to cards, no flicker.<br>5. Covered airmail note -> stripe direction "/" and widths unchanged vs previous build.<br>6. `bun run lint`, `bun run test`, `bun run build` -> 100% pass. |
| Phase & Task ID | File Path | UI Elements Affected | Nature of Change | Expected Visual & Functional Behavior | Regression Verification Checklist |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **State-Ownership Refactor (External Notes Store) + Seal Sizing** | `src/stores/notesStore.ts` (new), `src/stores/noteActions.ts` (new), `src/components/NoteCard/ConnectedCards.tsx` (new), `src/App.tsx`, `src/components/InfiniteCanvas.tsx`, `src/components/NoteConnections.tsx`, `src/components/StatusBar.tsx`, `src/components/NotesSidebar.tsx`, `src/components/BatchActionBar.tsx`, `src/components/CanvasControls.tsx`, `src/components/Modals/AppModals.tsx`, `src/components/NoteCard/NoteCover.tsx`; deleted `src/hooks/useNotesManager.ts` (+tests); `zustand` dependency added | All note-data flow now runs through an external zustand store (`notesById`+`order`+`layoutVersion`) instead of App-owned `useState`; canvas cards subscribe per-note via `CanvasCard`/`ConnectedCards` wrappers; canvas-shell derivations (spatial index, culling, groups, minimap bounds) are keyed to `layoutVersion`, which content-only edits never bump; chrome components pull `useNotesList()` internally; cover seal size now clamped to ≤42% of the card's shorter side (tall-narrow cards no longer overflow) | Persistence (dirty set + debounced save + beforeunload/blur flush) moved inside store actions; autosave clears dirty flags only when `updatedAt` is unchanged after IPC (fixes known-gap #3 lost-update race); history integrates via bridge (`registerNotesHistoryBridge`); impure setState updaters eliminated (known-gap #5 resolved); legacy hook deleted | Typing in one card re-renders only that card; drag-end/keystroke no longer rebuild R-tree or re-render chrome; visual output identical; seals stay proportional on extreme aspect ratios; undo/redo granularity unchanged; first-insert z-index is 2 (legacy parity) | 1. Type rapidly in a card with React Profiler open -> verify only that card commits.<br>2. Drag notes / pan -> positions persist after reload; group frames track drags.<br>3. Undo/redo across edit/create/delete/z-order -> identical restore behavior.<br>4. Sidebar search & status-bar stats update live while typing.<br>5. Covered note on tall-narrow card -> seal fits within width.<br>6. `bun run lint`, `bun run test`, `bun run build` -> 100% pass. |
| **Notification Noise Reduction (High-Priority Only)** | `src/App.tsx`, `src/components/Modals/AppModals.tsx`, `src/components/BatchActionBar.tsx`, `src/components/NoteCard/index.tsx`, `src/components/NoteCard/ImageNoteCard.tsx`, `src/components/Modals/DatabaseOperationsModal.tsx` | Native desktop toasts only | Removed 22 low-priority notification call sites (cover/uncover, pin/unpin, theme applied, group/ungroup/duplicate, note/photo created, cut/placed/cancelled, AI settings saved, AI merge started, generating tags, auto-tag complete, path copied, lock/unlock toggles). Retained: errors/failures, security & auth events, guards explaining blocked actions, async completions, file receipts with paths, destructive receipts (Notes Deleted). | Routine state changes complete silently; OS toasts fire only for errors, security events, blocked actions, long-running async results, and file receipts. No handler logic changed. | 1. Toggle cover/pin/theme/group -> NO toast.<br>2. Export (.md/.json) or full backup -> receipt toast WITH save path.<br>3. Copy from locked note / batch-delete locked notes -> guard toast.<br>4. Force AI merge failure (bad key) -> failure toast.<br>5. `npm run lint`, `npm test`, `npm run build` -> 100% pass. |
| **Note Cover Discoverability UX (Mouse Affordances + Shortcut Collapse)** | `src/components/NoteContextMenu.tsx`, `src/components/BatchActionBar.tsx`, `src/components/NoteCard/NoteStylePicker.tsx`, `src/components/Modals/AppModals.tsx`, `src/App.tsx`, `src/hooks/useNoteSelection.ts`, `src/constants/shortcuts.ts` | Context-menu "Cover / Remove Cover" item with Alt+C hint (single & multi-selection), BatchActionBar "Cover / Uncover" button next to Pin, Cover tab header state chip ("Covered · Alt+C to unseal" / "Not covered · Alt+C to seal"), cover shortcut collapsed to canonical Alt+C only (Shift+C / Ctrl+Shift+C removed) | Added `onToggleCover` prop threading from App through AppModals into context menu and batch bar; picker chip reflects live `note.isCovered` informationally (no on/off switch); keydown guard requires bare Alt+C with all other modifiers absent. | Covers can be enabled/removed entirely via mouse; only bare Alt+C toggles covers; plain C still toggles connections; Ctrl+L still locks. | 1. Right-click note -> "Cover Note" with Alt+C hint -> seals.<br>2. Right-click covered note -> "Remove Cover" -> unseals.<br>3. Marquee-select ≥2 -> batch bar "Cover" -> all seal.<br>4. Shift+C / Ctrl+Shift+C -> NO cover toggle fires.<br>5. Plain C -> connections toggle.<br>6. Lint/test/build pass. |
| **Canvas Pan/Drag Performance P0 (Memo Restoration, Hysteresis Commits, Blur Removal, Cover Paint Cheapening)** | `src/App.tsx`, `src/components/InfiniteCanvas.tsx`, `src/components/NoteConnections.tsx`, `src/components/StatusBar.tsx`, `src/components/NoteCard/NoteToolbar.tsx`, `src/components/GroupFrame.tsx`, `src/constants/paperThemes.ts`, `src/constants/noteCovers.tsx`, `src/components/NoteCard/NoteCoverDecorations.tsx`, `src/components/NoteCard/index.tsx` | InfiniteCanvas memo boundary (latest-ref stable callbacks), pan frustum-hysteresis commits + navigation glide cancel + imperative minimap viewport rect, NoteConnections numeric `viewportBounds` comparator, backdrop-blur removal from dock/minimap/status bar/note toolbar/group badge, Glass theme translucent solid, duplicate washi decoration removal, axis-aligned airmail SVG pattern tile (no `patternTransform`), cover shadows → `shadow-sm` | Replaced inline arrow props in App with latest-ref stable callbacks so `React.memo(InfiniteCanvas)` holds; replaced fixed 120ms mid-pan commits with ~⅓-viewport hysteresis commits; one-shot glide-cancel commit at pan mousedown; minimap FG rect drawn imperatively inside pan rAF via shared `drawMinimapViewport`. | Pan/drag produce near-zero mid-gesture React commits; long pans never show blank culling voids; minimap rect tracks gesture without commits; starting a pan during arrow-key glide cancels instantly; dock/minimap/statusbar render flat opaque panels; covered vintage-airmail borders visually identical with cheap axis-aligned tiling. | 1. Pan across >2 viewports -> smooth, no voids, minimap glued.<br>2. Arrow-key navigation then pan -> glide cancels instantly.<br>3. Release pan -> position persists after reload.<br>4. Drag text/checklist/image/covered notes -> smooth.<br>5. Dock/statusbar/minimap opaque in both themes.<br>6. Airmail border direction "/" and widths unchanged.<br>7. Uncovered taped note renders exactly one tape.<br>8. Lint/test/build/cargo pass. |
| **AI Latency Fixes (Pooled Client, Reasoning Suppression, Stream Coalescing)** | `src-tauri/src/lib.rs`, `src-tauri/src/commands/ai.rs`, `src-tauri/src/infrastructure/network/ai_client.rs`, `src/App.tsx` | Merge-preview update cadence during synthesis | Single shared `Arc<AiClient>` managed in Tauri state (warm TLS pool across test→merge→auto-tag); connect timeout 5s, total timeout 180s; name-gated reasoning suppression (Gemini pro/thinking/2.5+ → `thinkingBudget:0`; OpenAI `o*`/`gpt-5*` → `reasoning_effort:"low"`; OpenRouter opus/thinking/r1/o-series → `reasoning.effort:"low"`; custom providers untouched); merge preview flushes coalesced at ≥80ms with final flush and failure-path timer teardown. | Second consecutive AI request starts visibly faster (warm pool); reasoning models emit first output quickly; canvas stays responsive while merge streams; failed merges never resurrect the placeholder card. | 1. Run two consecutive merges -> second starts faster.<br>2. Merge with a reasoning model -> near-instant first tokens.<br>3. Fail a merge mid-stream -> placeholder card is deleted and stays deleted.<br>4. `cargo test` incl. `test_reasoning_model_detection` passes. |

---

> [!CAUTION]
> **RULE #2 (NO DEV SERVER EXECUTION):**
> Never run `npm run dev`, `bun dev`, `vite`, or spawn background dev servers. DiaryNote is validated via static checks, unit tests, and production builds only.

> [!IMPORTANT]
> **RULE #3 (LINT GATE):**
> Always run `npm run lint` (oxlint + `tsc --noEmit`) before concluding any task. Tasks must never be marked complete with lint errors.

---

## 1. Verified Architecture Facts

These statements were verified against source on 2026-08-21. Do not restate outdated claims from older documents.

### Storage & Persistence
- **Authority: SQLite via Tauri IPC.** Notes persist exclusively through `save_notes_batch` → `NoteRepository` (Rust). There is **no IndexedDB** anywhere in the stack — legacy comments mentioning IndexedDB (`App.tsx`, `useNoteResize.ts`, `StatusBar.tsx`) are stale.
- **Autosave:** dirty-set based, 500ms debounce (`useNotesManager.ts`). Only dirty notes serialize over IPC.
- **localStorage** mirrors transform + app settings (hydrated first at boot, then overwritten by DB values) and is the **sole durable home of `aiProviderProfiles`** — the Rust `AppSettings` model has no such field, so serde silently drops them on every `save_app_settings`. This is a known data-loss gap (see §2).
- **Images:** content-addressable files on disk (SHA-256 dedup via `AssetStore`) + metadata row in `assets` table. Fallback path stores base64 data URLs directly in `notes.image_url`. **No orphan GC exists** — `delete_asset` command has zero frontend callers.
- **Backups (`.diarynote`):** manifest + online SQLite snapshot + asset files; atomic staged writes; import supports KeepBoth/Skip/Overwrite.

### Security — Actual Behavior (not aspirational)
- **Locked notes are flag-based redaction, NOT encryption at rest.** Locking sets `isLocked: true` and persists **plaintext content** to SQLite. The redaction layer is real and enforced in: search service (snippet/match suppression), sidebar/search UI (`Passcode protected · Content hidden`), graph service (locked nodes omitted), AI/export guards (`authPolicyService`). But anyone with filesystem access reads locked content directly from the DB.
- **Unwired crypto machinery exists**: PBKDF2-HMAC-SHA256 (600k iter) key derivation + AES-256-GCM envelopes (`aes_gcm.rs`, `$aes-gcm$<salt>$<iv>$<ct>` format), session vault with backoff (`VaultService`), `vault_encrypt_note`/`vault_decrypt_note` commands, TS mirror in `cryptoVaultService.ts`. The **lock flow never calls any of it**. Wiring it up is the top known gap.
- Passcode and recovery-answer hashes use PBKDF2-SHA256 with random salt (not bcrypt/argon2 — fine, but documented accurately here).
- **Known gap:** because content is plaintext at rest, `.diarynote` backups contain readable secrets.

### AI Pipeline
- Frontend resolves model from `config/ai-models.json` catalog (24h-cached from GitHub, bundled fallback); credentials AES-GCM-encrypted client-side before storage.
- Desktop path always routes through Rust: `ai_stream_synthesis` streams SSE → per-chunk `ai:stream-chunk` events → frontend coalesces (~80ms) into React updates.
- Shared pooled `reqwest::Client`; reasoning-suppression params gated by model-name heuristics (see registry row above).
- Default models: `gemini-3.7-flash`, `gpt-5.5`, `anthropic/claude-opus-5` (OpenRouter default intentionally kept), `deepseek-v4-flash`.

### Canvas Performance Architecture (current design — do not regress)
- Gestures write DOM transforms directly inside rAF; React state receives only hysteresis-committed updates (~⅓ viewport travel) or final commit.
- `React.memo(InfiniteCanvas)` is preserved by latest-ref callback props in App — **never pass inline arrow props to InfiniteCanvas**.
- `NoteCard` uses a hand-rolled field-level memo comparator — **any new `Note` field consumed by the card must be added to that comparator** (known fragility).
- Frustum culling unmounts off-screen cards; local-only card state (`isRevealed`, `isEditing`) resets on cull by design.
- `backdrop-filter` is banned on elements overlaying the moving canvas.

---

## 2. Known Gaps (tracked, honest)

Ranked by severity. Fix or consciously accept before building new features on top.

1. **Locked-note plaintext at rest** — encryption machinery unwired from lock flow (§Security).
2. **`aiProviderProfiles` not persisted to SQLite** — silently dropped by serde; localStorage is single copy.
3. **Dirty-flag race in autosave** — IDs re-added during an in-flight save get cleared with the stale snapshot (`useNotesManager.ts:62–66`); lost-update until next edit.
4. **Close-time flush is fire-and-forget** — `beforeunload` invoke not awaited; native close may drop ≤500ms of edits. No `on_window_event(CloseRequested)` handler exists.
5. **Impure setState updaters** in `useNotesManager` (history pushes, timers, ref writes, one IPC delete inside updaters) — StrictMode double-invoke hazard; latent prod race.
6. **No orphan asset GC** — deleted notes' images accumulate forever and ship inside backups.
7. **Dead surface** — `cull_notes_in_frustum`, `compute_batch_drag_snapping`, whole `rustLayout.ts` duplicate layer, `get_note_backlinks` (no UI), `inspect_vault_archive` (unreachable), `note.embedding`, `AppSettings.showMinimap`, `note.coverPrompt` (read-plumbed, never writable). Delete or wire.
8. **TypeScript strict mode is OFF** (`tsconfig.json`) despite historical docs claiming otherwise.
9. **Core canvas untested** — `InfiniteCanvas.tsx`, `NoteCard/index.tsx`, `NoteConnections`, `GroupFrame` have no tests; peripheral features do.
10. **Failed saves retry only on next edit**; failed deletes leave resurrecting rows; swallowed migration errors bump schema version anyway.

---

## 3. Core Architectural Invariants for Agents

1. **Desktop Native & Offline First.** Tauri + Rust + React. No remote server/cloud assumptions. All network (updates, AI) strictly opt-in and user-configured.
2. **Persistence discipline.** All note mutations flow through `useNotesManager` handlers → dirty set → debounced SQLite save. Never bypass with direct state overrides. Keep `setState` updaters pure — side effects (IPC, history, timers, refs) belong outside updaters.
3. **Redaction boundaries (current truth).** Until at-rest encryption ships, locked-note protection = the redaction layer: search, snippets, graph edges, exports, clipboard, and AI prompts must exclude unauthorized locked content. Preserve every existing guard; add none that assume ciphertext exists.
4. **CPU & rendering rules.** No `getBoundingClientRect`/`offsetWidth` inside mousemove/touchmove loops; gestures write DOM transforms in rAF; heavy work stays in Rust commands or workers; decouple note metadata from markdown bodies.
5. **Memo hygiene.** Stable callback props into memoized components (latest-ref pattern); extend the NoteCard comparator when adding card-visible fields; numeric comparators for object-valued props (see `NoteConnections`).
6. **Quality gate before completion:**

```bash
bun run lint        # oxlint && tsc --noEmit
bun run test        # vitest, must be green (never `bun test`)
bun run build       # production bundle
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml   # when Rust touched
```

---

## 4. UI Regression Troubleshooting Guide

If a component misbehaves after a change:
1. Check the Registry table above for the last row touching that file; run its checklist.
2. Event delegation: verify Pointer Events aren't blocked by overlapping containers; `touch-action: none` present where needed.
3. Portals: floating menus/popovers mount via `createPortal(..., document.body)` to escape overflow clipping.
4. Tailwind v4 syntax only — no deprecated arbitrary values.
5. If a fix touches shared card logic, apply it to **both** `NoteCard/index.tsx` and `ImageNoteCard.tsx` (known duplication) — or extract to the shared module instead of copying.
