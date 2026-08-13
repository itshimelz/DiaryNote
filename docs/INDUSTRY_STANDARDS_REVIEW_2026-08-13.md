# DiaryNote industry-standard and use-case review

**Date:** 2026-08-13  
**Scope:** Static review of the React/Tauri source, configuration, documentation, CI, and feature interactions. Three independent review passes covered architecture/security, product/UX flows, and engineering/release quality.  
**Verification:** `npm run lint`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml` pass. Passing compilation is not evidence that personal data is safe or that critical flows work.

## Bottom line

DiaryNote is trying to be three products at once: a local-first spatial notebook, a private daily journal, and an optional AI assistant. That is a valid product direction, but the implementation currently treats them as a feature collection rather than as one coherent personal-data system.

Against normal industry expectations for a desktop note/journal application, the project is **not release-ready for private or sensitive use**. The most important gaps are:

1. The advertised lock does not provide confidentiality and is bypassed by connected features.
2. Persistence is not reliable enough for a primary note-taking product.
3. Import/export/AI are untrusted-data boundaries without shared authorization, validation, or durable workflows.
4. The engineering quality gates validate builds and versions, but not user behavior or native safety.

## Intended use case and minimum standard

For this product, a reasonable user expectation is:

> “My notes remain on my device, are not silently sent elsewhere, survive restarts, and protected notes cannot be exposed or changed without my consent.”

| Product promise / use case | Industry-standard baseline | Current state |
| --- | --- | --- |
| Local-first notes | Every mutation is durably saved or visibly marked unsaved; recovery is possible. | Fails: new, pasted, undo/redo, and failed writes can diverge from storage. |
| Private journal | A lock means encrypted-at-rest content or is clearly labelled as visual hiding. | Fails: lock is a UI boolean; note bodies remain plaintext. |
| Backup and restore | Versioned schema, validation, preview, atomic import, secrets excluded by default. | Fails: raw objects/settings are exported and merged with minimal validation. |
| Optional AI | Explicit data-send consent, provider disclosure, cancellation, limits, and locked-data policy. | Fails: selected text is sent immediately; locked notes are not centrally blocked. |
| Desktop application | Sandboxed native commands, restrictive CSP, signed/update-safe release process. | Fails: write command accepts untrusted path parts and CSP is disabled. |
| Accessible productivity app | Semantic dialogs, predictable focus, keyboard-complete controls. | Below baseline: overlays and drawer do not provide complete dialog semantics. |

## Feature-interaction map

The high-risk problems occur where ordinary features connect, not in isolated screens.

```text
Create / Paste / Import / AI merge / Undo
                │
                ▼
          Note state in React
                │
       dirty-ID autosave mechanism
                │
                ▼
      IndexedDB + localStorage migration
                │
                ▼
 Search / Sidebar / Graph / Calendar / Export / AI
                │
        isLocked flag (UI-only today)
                │
                ▼
  Clipboard / files / external AI provider / native filesystem
```

There is no single layer that answers both questions below before data moves:

- “Is this note available and durably saved?”
- “May this caller view, export, index, transform, or transmit it?”

That missing layer explains most of the findings that follow.

## Findings, reason, and effect

### P0 — The lock feature is not a security boundary

**Evidence:** `Note.isLocked` is only a boolean (`src/types/index.ts:32-56`). Full note objects, including bodies, are stored by Dexie (`src/lib/sqliteStorage.ts:5-20,139-145`). The lock changes what the card displays (`src/components/NoteCard/index.tsx:491-517`). Password/recovery verification is a single unsalted SHA-256 digest (`src/utils/security.ts:3-15`) with a four-character minimum (`src/components/Modals/SecurityModal.tsx:51-75`).

**What is wrong:** A personal journal’s “lock” is normally expected to protect stored content. Here it only hides it in one part of the UI. A local user, browser developer tools, copied profile, or malware can read content directly and alter `isLocked`.

**Effect:** The product’s privacy/security positioning is misleading, and users may put sensitive diary content into a store that is not a vault.

**Required direction:** Until real encryption exists, label this as “hide note content in the app” rather than protection. For actual privacy, design encrypted note bodies using authenticated encryption and a per-user key derived with Argon2id/scrypt/PBKDF2 plus random salt; keep credentials in the OS keychain, use a deliberate threat model, and add throttling/re-authentication.

### P0 — Lock policy is bypassed by export, AI, clipboard, search, graph, and batch actions

**Evidence:**

- Full and selected backups serialize raw notes (`src/lib/storage.ts:295-322`, `src/components/BatchActionBar.tsx:567-580`).
- Context-menu multi-export exports raw selected notes (`src/components/Modals/AppModals.tsx:285-292`).
- AI merge serializes selected title/content (`src/App.tsx:260-323`, `src/services/ai/aiMergeService.ts:146-152`); auto-tag does the same (`src/components/NoteCard/index.tsx:196-221`).
- The sidebar searches every note title/body before masking its display (`src/components/NotesSidebar.tsx:57-72`).
- Connection extraction reads all bodies and reveals note relationships/titles (`src/utils/markdownMention.ts:6-42`, `src/components/NoteConnections.tsx:98-203`).
- A card header copies body text to clipboard without a lock check (`src/components/NoteCard/NoteHeader.tsx:88-96,421-434`).

**What is wrong:** Authorization is enforced only in selected UI handlers. Industry practice is to make access policy a centralized domain rule, so every command—toolbar, shortcut, batch action, AI, export, search, graph—must ask the same policy service.

**Effect:** A user can lock a diary note and then expose it through a backup, clipboard, search query, graph label, or external AI request. The batch-delete flow can also circumvent protected-delete expectations.

**Required direction:** Introduce an `authorizeNotes(ids, intent)` policy for `read`, `search`, `navigate`, `copy`, `export`, `delete`, and `sendToAI`. Redact locked metadata from indexes/graphs. Require recent unlock verification for any protected material, require explicit AI consent per request, and test every feature path against the policy.

### P0 — Sensitive credentials are only obfuscated

**Evidence:** The AI encryption seed is compiled into renderer code (`src/utils/aiSecurity.ts:6-8`), the salt is stored in localStorage (`:33-42`), and ciphertext/IV live in settings.

**What is wrong:** If the code and profile are available, the key can be derived and decrypted. This is not secure key storage.

**Effect:** Users may trust their provider API key to a mechanism that offers no meaningful device-profile protection.

**Required direction:** Use a Tauri-supported OS credential vault/keychain. Do not show an existing secret by default; let the user replace it. Clearly identify custom AI endpoints and the data they receive.

### P0 — The native export command trusts path fragments from the webview

**Evidence:** `save_export_file` joins arbitrary `filename` and `subfolder` then writes them (`src-tauri/src/lib.rs:1-19`). CSP is disabled (`src-tauri/tauri.conf.json:24-26`).

**What is wrong:** `..`, path separators, or absolute paths can escape the intended export folder. Native commands must treat all renderer input as untrusted, especially where a webview can invoke file I/O.

**Effect:** A renderer compromise or future injection defect can overwrite accessible files outside the user’s DiaryNote export directory.

**Required direction:** Prefer a native save dialog. Otherwise accept only an allowlisted bare filename and fixed subfolder enum; reject absolute paths/separators/`..`, canonicalize, verify the target remains inside the export root, and use atomic non-overwriting writes. Deploy a restrictive CSP.

### P0 — Core note persistence can report success while losing data

**Evidence:** Generic note creation does not add the new ID to the dirty set (`src/hooks/useNotesManager.ts:57-105`), unlike daily-journal creation (`:166-170`). Paste first adds then modifies state directly (`src/components/Modals/AppModals.tsx:314-320`). Autosave clears dirty IDs before the async write completes (`src/hooks/useNotesManager.ts:35-48`), while storage functions catch errors and only log them (`src/lib/sqliteStorage.ts:139-215`). Undo/redo also set state directly (`src/hooks/useHistoryState.ts:25-40`).

**What is wrong:** A note app must treat state transition and durable write as one coordinated workflow. This implementation has multiple mutation paths that bypass or race the dirty queue.

**Effect:** Users can create, paste, undo, or rapidly edit/delete notes, see “saved” behavior, restart, and find data missing or stale.

**Required direction:** Create one note repository/command layer. Serialize writes, return a typed durable result, preserve dirty state until acknowledgement, surface save errors, retry safe failures, and flush best-effort on page/app exit. Route create/paste/import/AI/history through that layer.

### P1 — Migration can replace personal data with samples and remove recovery material

**Evidence:** Startup seeds/migrates, sets a local sentinel, then removes legacy keys (`src/lib/sqliteStorage.ts:31-52,248-256`). Any failure returns sample notes (`:85-91`).

**What is wrong:** Destructive cleanup happens before there is verified multi-launch recovery. Production note apps must never silently replace existing user data with demo data.

**Effect:** Partial migration, IndexedDB trouble, or a stale sentinel can make a journal look empty/demo-like while legacy recovery data is gone.

**Required direction:** Implement versioned, idempotent migrations in a transaction; verify record counts/content before completion; retain a backup until a later successful launch; enter recovery/read-only mode instead of returning samples for an existing profile.

### P1 — Backup/import is not a safe interchange contract

**Evidence:** Import accepts any JSON with a `notes` array (`src/lib/storage.ts:325-349`) and merges raw settings into the current profile (`src/App.tsx:395-450`). Full backup includes all settings alongside notes (`src/lib/storage.ts:295-306`).

**What is wrong:** Backup data is an external trust boundary. Industry-standard import requires a versioned schema, size limits, runtime validation, duplicate/conflict policy, migration, staging, and confirmation of security-sensitive settings.

**Effect:** A malformed/large/old backup can freeze or corrupt the canvas, import invalid IDs/dates/dimensions, replace AI endpoints/credentials or master lock metadata, and cause lockout. A normal backup also becomes a sensitive secrets bundle.

**Required direction:** Define a data-only backup as default. Exclude credentials and lock material unless the user explicitly makes an encrypted security export. Validate and normalize data before staging; show a preview/conflict summary; commit notes/layout/preferences atomically and require separate consent for each scope.

### P1 — Journal behavior relies on accidental metadata instead of a journal model

**Evidence:** Daily lookup treats matching titles as entries (`src/hooks/useNotesManager.ts:121-132`); streak logic treats a `journal` tag or dates in titles as entries (`src/utils/journalUtils.ts:41-53`); calendar matching similarly uses titles (`src/components/Modals/JournalCalendarModal.tsx:86-99`).

**What is wrong:** Journal statistics should be based on an explicit journal-entry record, not inference from free-form note titles/tags.

**Effect:** A normal note titled with a date or tagged “journal” can block a daily entry, create a false calendar marker, or inflate a wellbeing streak. Editing/deleting unrelated notes changes journal history.

**Required direction:** Make only `isDailyEntry && entryDate` authoritative. Migrate legacy inferred entries explicitly, resolve duplicate daily entries, and define timezone/date-change behavior.

### P1 — “Privacy-focused” and “100% offline” copy conflicts with automatic network behavior

**Evidence:** README makes those claims (`README.md:34-37,72-78`); app startup automatically checks GitHub releases (`src/App.tsx:120-127`, `src/utils/updateChecker.ts:42-117`). AI may transmit content to provider/custom endpoints.

**What is wrong:** Privacy products need accurate data-flow disclosure and user control. A silent update check exposes IP/timing/device usage to GitHub, even when the user has not opted into external services.

**Effect:** The documented privacy model is not truthful to users who expect no network traffic.

**Required direction:** Make update checks opt-in or clearly disclosed with an offline-only mode. Present AI consent with provider, selected-note count, and data destination before each first send and when the provider changes.

### P1 — Engineering quality gates do not protect feature behavior

**Evidence:** `package.json` exposes typecheck/build but no test command. There are no first-party test files. PR CI only checks version sync (`.github/workflows/version-check.yml`); the “50K benchmark” generates JSON and prints its size rather than exercising the app (`.github/workflows/benchmark.yml`).

**What is wrong:** For a stateful personal-data app, compilation does not test data integrity, authorization, native boundaries, or recovery. These are release-blocking invariants.

**Effect:** Regressions in create/paste/autosave, locking/export/AI, migrations, and import are mergeable and likely to recur.

**Required direction:** Add Vitest with fake IndexedDB for repository/migration/import/authorization tests; add Playwright/Tauri smoke tests for key journeys. Require frozen install, lint/typecheck, test, `cargo fmt --check`, clippy, cargo test, and a representative Tauri build on every PR.

### P2 — The “infinite canvas” does not yet scale as a full notebook system

**Evidence:** All notes are loaded in full at startup (`src/lib/sqliteStorage.ts:54`), and sidebar/search/tag/minimap/group/link features repeatedly scan global collections (`src/components/InfiniteCanvas.tsx:402-458`, `src/components/NotesSidebar.tsx:57-73`, `src/components/Modals/SearchModal.tsx:52-149`).

**What is wrong:** Rendering culling is helpful, but it is not data virtualization. For a spatial notebook, list/search/graph/minimap behavior must scale with data volume, not just visible cards.

**Effect:** The app will slow as a journal grows; linked/grouped notes can negate gains from card culling. The current benchmark cannot prove 50K-note usability.

**Required direction:** Maintain a metadata index, load bodies on demand, use indexed/worker-based search, virtualize lists, cull links/groups/minimap by viewport, and set measurable startup/latency/memory budgets in automated browser/Tauri scenarios.

### P2 — Modal, drawer, pointer, and error behavior is below desktop-app baseline

**Evidence:** Search/security/calendar overlays are plain containers without complete dialog roles/focus handling (`src/components/Modals/SearchModal.tsx:184-215`, `SecurityModal.tsx:106-137`, `JournalCalendarModal.tsx:138-173`). The sidebar uses clickable `div`s for note rows (`src/components/NotesSidebar.tsx:197-207`). Interaction code is primarily mouse-event based (`src/components/InfiniteCanvas.tsx`, `src/components/GroupFrame.tsx:77-148`). Production builds remove console statements (`vite.config.ts:60-62`) while errors are mainly console-only.

**What is wrong:** Accessibility and native productivity expectations require a shared dialog primitive, keyboard completion, touch/pointer support, and user-visible recovery from errors.

**Effect:** Keyboard/screen-reader users can tab behind dialogs or cannot activate sidebar rows. Small/touch windows are fragile. Storage/AI/native failures become hard to understand or support after release.

**Required direction:** Build shared Dialog/Drawer and ErrorBoundary primitives; use semantic buttons/labels/focus restoration; move gestures to Pointer Events; introduce typed errors, persistent save status, opt-in diagnostics, and a local support bundle.

### P2 — Project governance and documentation make releases less trustworthy

**Evidence:** Dependency use differs across contexts (`npm install` in benchmark CI vs `bun install` in release); `package.json` is named `react-example`, Vite is listed twice, README states React 18 while dependencies use React 19, and README calls Dexie “SQLite.” `docs/` is ignored by `.gitignore`, so engineering reports may not be reviewed/versioned.

**What is wrong:** A desktop app needs reproducible builds, accurate runtime/storage statements, release metadata, and a clear policy for durable technical documentation.

**Effect:** Builds can drift, contributors receive conflicting instructions, and users cannot make informed choices about storage/recovery/security.

**Required direction:** Choose one package manager and enforce frozen lockfiles with `packageManager`/engines; add dependency/license/SBOM checks; correct the product name/framework/storage claims; complete Cargo metadata; decide whether `docs/` is versioned project knowledge and remove the ignore rule if so.

## Recommended implementation sequence

1. **Define the security contract.** Decide whether the product supports true encrypted private journals. If not, immediately correct “secure/protected/offline” wording and hide/remove misleading promises.
2. **Build two core services before adding features:** a transactional note repository and a centralized authorization policy. Migrate existing feature handlers to these services.
3. **Fix P0 persistence and native path handling**, then add regression tests that restart the app/profile after create, paste, AI merge, undo, delete, export, and import.
4. **Make locked-note behavior consistent everywhere.** Block/redact index, graph, clipboard, export, batch operations, and AI until unlock; add specific test matrices.
5. **Replace backup/import with a versioned interchange format** and staging preview. Separate notes, layout/preferences, and secrets/security configuration.
6. **Make journaling explicit** in the data model and migrate inferred historical entries safely.
7. **Add release gates and observability.** Only after safety invariants are tested should performance work be benchmarked against realistic user workflows.
8. **Scale the data layer**, then improve canvas interactions/accessibility on top of reliable state boundaries.

## What is already heading in the right direction

- The project has a modular React structure, a real desktop shell, lazy-loaded modals, and build/version automation.
- Canvas culling, request-animation-frame batching, and debounced saves show awareness of performance costs.
- Markdown links use `noopener noreferrer`, and normal card/search display tries to mask locked content.
- Feature ambition is strong: spatial notes, journaling, links, groups, backup, and AI can work together once they are built on shared data and permission rules.

## Release decision

**Do not position the current beta as a secure or private journal application.** It can be used as an experimental local canvas for non-sensitive notes only, provided users make their own backups and understand the current storage/AI limitations. Address the P0 items and establish automated behavioral tests before a broader release.

