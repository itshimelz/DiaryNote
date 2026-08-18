# AGENTS.md — Agent Working Rules & UI Component Registry

**Document Version:** 1.0.0  
**Target Application:** DiaryNote Desktop (Tauri + Rust + React + TypeScript)  
**Applicability:** Mandatory for all AI agents, subagents, and automated assistants operating on this codebase.

---

## 1. Mandatory Agent Rule: UI Component Modification Registry

> [!IMPORTANT]
> **RULE #1 (UI CHANGE MANIFEST):**
> Whenever an agent modifies, refactors, creates, or deletes **any UI component, modal, hook affecting rendering, or stylesheet** (`src/components/**`, `src/hooks/**`, `src/index.css`), the agent **MUST immediately update the UI Component Modification Registry below in this document (`AGENTS.md`)**.
>
> This enables instant identification of visual regressions, broken event handlers, or UI mismatches across phases.

### Active UI Component Modification Registry

| Phase & Task ID | File Path | UI Elements Affected | Nature of Change | Expected Visual & Functional Behavior | Regression Verification Checklist |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Optimization & Flaw Remediation (Spatial Nav & Graph Engine)** | `src/hooks/useNoteSelection.ts`, `src/components/NoteConnections.tsx`, `src/utils/layoutUtils.ts`, `src/lib/rustLayout.ts`, `src-tauri/src/commands/layout.rs`, `src-tauri/src/domain/graph/service.rs` | Arrow-key navigation concurrency guard, camera auto-framing, edge-to-edge spatial ray casting, debounced connection rendering, zero-knowledge locked note graph redaction | Added `navSequenceRef` & `activeNavTargetIdRef` in `useNoteSelection` to prevent out-of-order race conditions; integrated `onNavigateToNote` for off-screen viewport auto-glide; updated Rust spatial formula with edge-to-edge projection; debounced graph calculation by 150ms in `NoteConnections`; enforced zero-knowledge locked note omission in `GraphService`. | Rapid arrow keypresses smoothly glide focus across cards without race conditions or jitter; camera auto-pans when target is off-screen; unauthenticated locked note graph edges are redacted; typing does not trigger high CPU IPC graph re-calculations. | 1. Hold ArrowRight -> verify smooth sequential movement without jitter.<br>2. Navigate to off-screen card -> verify viewport auto-centers.<br>3. Create locked note with mention -> verify connections SVG excludes locked node. |
| **Linux Middle-Mouse Pan & Paste Guard** | `src/components/InfiniteCanvas.tsx`, `src/components/HiddenClipboardListener.tsx` | Middle mouse scroll button panning, canvas mousemove tracking, clipboard paste event guard | Added `onAuxClick` prevention, stopped middle mouse propagation on mousedown/mouseup, tracked mousemove coordinates during panning, and guarded `HiddenClipboardListener` so unprompted Linux middle-click/PRIMARY selection paste events are discarded unless explicitly initiated via Ctrl+V/Cmd+V. | Clicking and dragging with middle mouse button smoothly pans the canvas with `cursor-grabbing` and releasing it never accidentally pops open the Paste Note modal. | 1. Click and drag middle mouse button on canvas -> verify smooth canvas pan.<br>2. Release middle mouse button -> verify NO paste modal appears.<br>3. Press Ctrl+V with text in clipboard -> verify paste modal opens normally. |

---

## 2. Mandatory Operational Commands & Tool Rules

> [!CAUTION]
> **RULE #2 (NO DEV SERVER EXECUTION):**
> **DO NOT EVER run `npm run dev`, `bun dev`, `vite`, or launch background development servers.**
> DiaryNote is tested and validated via static checks, unit tests, and production build verification (`npm run lint`, `npm test`, `npm run build`, and `cargo check`). Do not spawn long-running server processes.

> [!IMPORTANT]
> **RULE #3 (ALWAYS CHECK LINT WITH OXLINT):**
> **Always execute `npm run lint` before concluding any task.**
> `npm run lint` is configured with `oxlint` as the default ultra-fast linter combined with TypeScript strict typechecking (`oxlint && tsc --noEmit`).
> Tasks must never be marked complete if `npm run lint` reports any errors.

---

## 3. Core Architectural Invariants for Agents

All agents working on DiaryNote must adhere to these standing principles:

1. **Desktop Native & Offline First:**
   - DiaryNote is a desktop application (Tauri + Rust + React). Do not introduce assumptions of remote web servers, cloud sync, or hosted SaaS infrastructure.
   - All network interactions (updates, AI endpoints) must be strictly user-configurable and default to privacy-preserving boundaries.

2. **Zero-Loss Persistence Protocol:**
   - Never bypass the note repository layer with direct React state overrides.
   - A note is only considered saved after IndexedDB storage confirmation resolves.

3. **Zero-Knowledge Security & Privacy:**
   - Locked notes must be encrypted at rest using Argon2id + AES-256-GCM. Plaintext locked content must never touch persistent storage or unauthenticated memory caches.
   - Exclude locked notes from exports, clipboard copies, AI prompts, and graph indexes unless explicitly authenticated.

4. **CPU & Rendering Performance:**
   - Never call `getBoundingClientRect()`, `offsetWidth`, or `offsetHeight` inside mousemove or touchmove loops.
   - Decouple note metadata from markdown bodies. Heavy search and cryptography operations must run in Web Workers or native Rust commands.

5. **Quality Verification Before Completion:**
   - Every task must pass:
     ```bash
     npm run lint
     npm run build
     cargo check --manifest-path src-tauri/Cargo.toml
     ```
   - Automated tests (`npm test`) must pass with zero errors before any task is marked done.

---

## 4. UI Regression Troubleshooting Guide

If a UI component stops functioning, misaligns, or clips after a task:
1. **Check the Registry Table Above:** Find the file in the registry and review what props, state, or DOM structure were altered in that phase.
2. **Inspect Event Delegation:** Ensure Pointer Events (`onPointerDown`, `setPointerCapture`) are not being blocked by overlapping containers or missing `touch-action: none`.
3. **Check Portal Mounting:** Ensure popovers and floating menus (e.g., Theme/Align menus) use `createPortal(..., document.body)` to prevent container overflow clipping.
4. **Verify CSS Classes:** Verify Tailwind CSS utility classes conform to Tailwind v4 syntax without deprecated arbitrary values.
