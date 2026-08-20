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
| **Hybrid Markdown Engine & Smart Interactions** | `src/components/NoteCard/SmartMarkdownText.tsx`, `src/components/NoteCard/index.tsx`, `src/components/NoteCard/NoteChecklist.tsx`, `src/utils/inlineMarkdownScanner.tsx`, `src/utils/noteTextEngine.ts`, `src/utils/markdownMention.ts` | Fast-path Tier 1 inline markdown scanner, smart auto-pairing, closing step-over, pair backspace, smart URL link pasting into selected text, multiline checklist paste parsing, reference-cached note lookup maps | Integrated `renderInlineMarkdown` fast-path for short strings and checklist rows bypassing heavy Remark AST parser; added auto-pair wrapping and step-over in `NoteCard` textarea; added URL link pasting over selected text in `NoteCard`; added multiline checklist paste splitting in `NoteChecklist`; added `getNoteLookupMaps` caching in `markdownMention.ts`. | Typing and editing feels instantaneous ($<8\text{ms}$); typing opening pairs wraps selection; pasting URLs over selected text automatically creates markdown links; checklist mode parses multiline pastes into individual rows without freezing or frame drops. | 1. Select text in note editor and press `[` -> verify text wrapped in `[]`.<br>2. Select text and paste `https://example.com` -> verify formatted as `[text](https://example.com)`.<br>3. Paste 3 lines of tasks into Checklist "Add task" -> verify 3 separate items created.<br>4. Run `npm test` -> verify all 38 test suites pass cleanly. |
| **Smart Popover Positioning (Slash Command & Mention)** | `src/components/NoteCard/SlashCommandMenu.tsx`, `src/components/MentionAutocomplete.tsx`, `src/utils/textareaCursor.ts`, `src/components/NoteCard/index.tsx` | Slash command menu `/` and Mention autocomplete `@` popovers | Unified cursor anchor computation; added dynamic DOM height/width measurement in `useLayoutEffect`; implemented directional vertical flipping (above/below cursor) based on available space and actual menu height; added horizontal note edge clamping. | Popovers always appear directly adjacent to the cursor line without jumping or floating in the middle of notes; when typed near the bottom of a note card, popovers flip snugly above the cursor; right and left edges never overflow the note boundary. | 1. Type `/auto` at the bottom line of a tall note -> verify popover sits snugly right above `/auto`.<br>2. Type `/` at the top of a note -> verify popover renders directly below the cursor.<br>3. Type `/` near the right edge -> verify menu does not clip outside the note.<br>4. Run `npm test` -> verify all test suites pass. |
| **Note Tab & Whitespace Indentation Persistence** | `src/components/NoteCard/BaseMarkdownRenderer.tsx`, `src/utils/noteTextEngine.ts` | Markdown preview mode paragraph indentation, tab rendering & multiple blank line preservation | Added `preserveNoteTabsAndIndentation` to prevent 4+ spaces / 1+ tabs from accidentally triggering CommonMark indented code blocks; converted leading tabs/spaces on normal lines to non-breaking whitespace; preserved multiple consecutive blank lines (3+ enters) as `&nbsp;` paragraph spacers; added `disableIndentedCodePlugin` to Remark plugins. | Single tabs (`\t`), multi-tabs (e.g. 5 tabs), and multiple blank lines (3+ enters) are persistent and preserved in view mode matching the exact physical height of edit mode with the note's normal font; paragraphs never collapse intentional whitespace; fenced code blocks (```` ``` ````) and nested markdown lists continue to render correctly. | 1. Type 1 tab before a sentence -> verify 1 tab indent in preview mode.<br>2. Type 5 tabs before a sentence -> verify 5 tabs indent with regular font.<br>3. Press Enter 3 times between paragraphs -> verify 2 visual blank lines preserved.<br>4. Run `npm test` -> verify all tests pass. |
| **Checklist Mode Regex Isolation & Zero-CPU Lockup** | `src/utils/inlineMarkdownScanner.tsx`, `src/components/NoteCard/NoteChecklist.tsx` | Inline markdown scanner regex instance isolation and recursion guard | Replaced module-level shared global `/g` regex with local instance per execution in `renderInlineMarkdown`; added `depth` recursion limit to prevent state corruption when parsing nested inline tokens (e.g., `**Borrow (`&T`)**`); wrapped `syncBackToContent` in `useCallback` and cleaned bullet marker stripping in `NoteChecklist`. | Switching any note (including notes with nested bold, code, and special symbols) to Checklist mode is instantaneous ($<5\text{ms}$) with zero memory leaks, zero CPU spikes, and zero browser freezing. | 1. Open note with nested code and bold (`**Borrow (`&T`)**`) -> click Checklist mode -> verify switches immediately without freezing.<br>2. Check CPU and RAM -> verify normal idle CPU (<2%).<br>3. Run `npm test` -> verify all 38 test suites pass. |
| **Theme-Adaptive Select Component & Unified Typography Pickers** | `src/components/ui/Select.tsx`, `src/components/NoteCard/NoteStylePicker.tsx`, `src/components/Modals/AISettingsModal.tsx`, `src/components/Modals/SecurityModal.tsx`, `src/components/NotesSidebar.tsx`, `src/components/Modals/SearchModal.tsx`, `src/components/StatusBar.tsx` | Font selection dropdown, sidebar sort selector, AI provider selector, security question selector | Fixed invalid `dark:bg-slate-850` in `Select.tsx` by transitioning to standard Tailwind `bg-slate-50/80 dark:bg-slate-800/90` with matching text/option colors; replaced native unstyled `<select>` elements in `AISettingsModal` and `SecurityModal` with unified `Select` component; cleaned up invalid `slate-850` classes in `SearchModal` and `StatusBar`. | All select dropdowns (Font selection in Card Style picker, Sidebar note sorter, AI provider, Security recovery question) adapt smoothly and cleanly to both light and dark themes with high contrast, legible typography, styled chevron arrows, and dark option backgrounds. | 1. Open Card Style & Typography on a dark note -> verify Handwriting & Font select has dark background and crisp white text.<br>2. Open Sidebar -> verify Newest Created select is dark themed.<br>3. Open AI Settings & Security Modals -> verify all selects match dark/light theme.<br>4. Run `npm test` and `npm run lint` -> verify 100% pass. |
| **Zero-Knowledge Locked Note Redaction & Search Shield** | `src/components/Modals/SearchModal.tsx`, `src/components/NotesSidebar.tsx`, `src-tauri/src/domain/search/service.rs` | Search modal note preview snippets, sidebar note snippets, tag aggregation stats, query content matching, Rust SQLite FTS search enrichment | Integrated `isNoteAuthorized` checks across frontend `SearchModal` and `NotesSidebar` to completely hide content snippets (`Passcode protected · Content hidden`), omit content-based hashtags, and block keyword matching on secret text for unauthorized locked notes; updated Rust `search_notes` and metadata retrieval in `service.rs` to select `is_locked` and redact snippets on locked notes. | Locked notes never leak plaintext snippets, hashtags, or search matches in Search Modal or Sidebar unless explicitly authenticated in session; unauthorized users only see the note's title and `Locked` badge with a secure passcode required placeholder. | 1. Create a locked note with secret keyword -> open Search Modal -> verify snippet displays "Passcode protected · Content hidden".<br>2. Search for the secret keyword -> verify locked note is NOT returned in search results.<br>3. Open Sidebar -> verify locked note displays "Passcode protected · Content hidden" and yellow Locked badge.<br>4. Run `npm test` and `cargo test` -> verify 100% pass. |

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
