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
| **Washi Tape Overflow Restoration & Note Cover Raster Isolation** | `src/components/NoteCard/index.tsx`, `src/components/NoteCard/ImageNoteCard.tsx`, `src/components/NoteCard/NoteCardLOD.tsx`, `src/components/NoteCard/NoteCover.tsx`, `src/components/NoteCard/NoteCoverDecorations.tsx` | Canvas note cards, washi tape & pushpin decorations, covered notes | Removed paint containment and content-visibility from the outer note card shells (`NoteCard`, `ImageNoteCard`, `NoteCardLOD`) to restore `overflow: visible` so washi tapes, pushpins, group pills, and shadows protrude naturally onto the canvas; isolated `NoteCover` and `NoteCoverDecorations` with internal `contain: paint layout`, `transform-gpu`, and memoized SVG seal geometry. | Washi tapes and pushpins render naturally across the top border of note cards adhering to the canvas; covered notes pan smoothly without CPU raster re-calculations. | 1. Check taped notes -> washi tape extends above top card edge onto canvas with natural translucent look.<br>2. Check pinned notes -> pushpin extends above top edge.<br>3. Covered notes pan smoothly at 60/120 FPS.<br>4. `bun run test` passes. |

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
