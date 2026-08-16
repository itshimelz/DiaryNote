# DiaryNote — Codebase Dead & Redundant Code Audit Report

**Audit Date:** August 16, 2026  
**Target Application:** DiaryNote Desktop (Tauri + Rust + React + TypeScript)  
**Scope:** Full-tree static code analysis across `src/`, `src-tauri/`, configuration, and assets.

---

## Executive Summary

A comprehensive scan of the DiaryNote codebase was conducted to identify unused files, obsolete compatibility layers, dead functions, duplicate logic, and unreferenced dependencies.

### Key Metrics
- **Dead / Orphan Files Identified:** 4 files (~135 lines)
- **Duplicated / Redundant Code Identified:** ~160 lines (BatchActionBar layout duplicates, security wrapper)
- **Unused Utilities / Components:** 5 items (~170 lines)
- **Unused Backend Dependencies:** 1 crate (`serde_json` in `src-tauri/Cargo.toml`)
- **Total Net Lines Removable:** **~465+ lines**

---

## 1. Dead & Orphan Files (0 References in Codebase)

These files can be safely deleted without breaking any application features, imports, or test suites:

| File Path | Lines | Type | Rationale & Status |
| :--- | :---: | :--- | :--- |
| [`src/workers/search.worker.ts`](file:///home/itshimelz/Projects/DiaryNote/src/workers/search.worker.ts) | 122 | Orphan Web Worker | Search indexing was originally drafted as a background Web Worker, but `SearchModal.tsx` implements memoized fast in-memory token and regex search directly in React. The worker is never instantiated or posted messages to. |
| [`src/lib/sqliteStorage.ts`](file:///home/itshimelz/Projects/DiaryNote/src/lib/sqliteStorage.ts) | 9 | Deprecated Re-export | Placeholder file that re-exports `./indexedDbStorage`. All repository hooks, test suites, and components import directly from `indexedDbStorage`. Has **0 references**. |
| [`src/types.ts`](file:///home/itshimelz/Projects/DiaryNote/src/types.ts) | 2 | Redundant Re-export | 2-line stub `export * from './types/index'`. All module imports resolve to `src/types/index.ts` automatically via standard TypeScript module resolution. |
| [`src/components/NoteCard.tsx`](file:///home/itshimelz/Projects/DiaryNote/src/components/NoteCard.tsx) | 2 | Redundant Re-export | 2-line stub `export { NoteCard } from './NoteCard/index'`. `src/components/index.ts` can import directly from `./NoteCard`. |

---

## 2. Logic Duplication & Redundant Implementations

### A. Duplicate Layout & Alignment Math in `BatchActionBar.tsx`
- **Location:** [`src/components/BatchActionBar.tsx`](file:///home/itshimelz/Projects/DiaryNote/src/components/BatchActionBar.tsx) *(Lines 144–280, ~140 lines)*
- **Issue:** `BatchActionBar.tsx` defines its own local `getNoteWidth`, `getNoteHeight`, `handleAlignLeft`, `handleAlignCenterHorizontal`, `handleAlignRight`, `handleAlignTop`, `handleAlignCenterVertical`, `handleAlignBottom`, `handleDistributeHorizontal`, `handleDistributeVertical`, and `handleGridArrange` functions inline.
- **Redundancy:** [`src/utils/layoutUtils.ts`](file:///home/itshimelz/Projects/DiaryNote/src/utils/layoutUtils.ts) already provides single-pass, DOM-optimized functions for all 9 layout actions (`alignLeft`, `alignCenterHorizontal`, `alignRight`, `alignTop`, `alignCenterVertical`, `alignBottom`, `distributeHorizontally`, `distributeVertically`, `arrangeInGrid`) that batch dimension queries to prevent layout thrashing.
- **Remediation:** Replace the inline layout calculations in `BatchActionBar.tsx` with direct calls to `layoutUtils.ts`.

### B. Redundant Security Pass-Through Wrapper in `security.ts`
- **Location:** [`src/utils/security.ts`](file:///home/itshimelz/Projects/DiaryNote/src/utils/security.ts) *(21 lines)*
- **Issue:** `hashSecurityInput` and `verifySecurityInput` are 1-line wrapper functions that merely pass arguments straight through to `hashSecurityInputSecure` and `verifySecurityInputSecure` in [`src/services/cryptoVaultService.ts`](file:///home/itshimelz/Projects/DiaryNote/src/services/cryptoVaultService.ts).
- **Remediation:** Update callers (such as `SecurityModal.tsx`) to import directly from `cryptoVaultService.ts` and eliminate the intermediary file.

---

## 3. Unused Functions, Exports & Constants

These items are defined and exported in source files but have **zero call sites** across the application:

| File Path | Identifier | Type | Details |
| :--- | :--- | :--- | :--- |
| [`src/utils/logger.ts`](file:///home/itshimelz/Projects/DiaryNote/src/utils/logger.ts) | `logger`, `LogEntry`, `exportDiagnostics` | Module (90 lines) | Circular memory-buffer diagnostic logger designed for in-memory telemetry, but currently unreferenced by any module. |
| [`src/utils/journalUtils.ts`](file:///home/itshimelz/Projects/DiaryNote/src/utils/journalUtils.ts) | `MOOD_CONFIG` | Constant (8 lines) | Legacy mood configuration mapping string icon names (`'Smile'`, `'Sun'`, `'Zap'`, `'Coffee'`, `'CloudRain'`); current UI renders Hugeicons (`SmileIcon`, `Sun01Icon`, `FlashIcon`, `Coffee01Icon`, `CloudRainIcon`) directly in `NoteHeader.tsx`. |
| [`src/utils/noteTextEngine.ts`](file:///home/itshimelz/Projects/DiaryNote/src/utils/noteTextEngine.ts) | `isNoteTextEmpty` | Function (3 lines) | Unused text validation helper. |
| [`src/utils/osUtils.ts`](file:///home/itshimelz/Projects/DiaryNote/src/utils/osUtils.ts) | `IS_WINDOWS`, `IS_LINUX`, `getPlatformShiftKey` | Constants / Helper (10 lines) | OS platform detection flags and shift key helper with no active callers. |
| [`src/components/ui/Tooltip.tsx`](file:///home/itshimelz/Projects/DiaryNote/src/components/ui/Tooltip.tsx) | `Tooltip` | Component (70 lines) | UI primitive only referenced in its isolated unit test; actual toolbar, dock, and modal buttons use native OS tooltips (`title`) or inline badges. |

---

## 4. Unused Backend Dependencies

| Manifest | Dependency | Category | Details |
| :--- | :--- | :--- | :--- |
| [`src-tauri/Cargo.toml`](file:///home/itshimelz/Projects/DiaryNote/src-tauri/Cargo.toml) | `serde_json = "1.0"` | Rust Crate | Declared in `Cargo.toml`, but zero Rust files in `src-tauri/src/` import or invoke `serde_json` directly (Tauri's IPC macro handles JSON serialization via `serde`). |

---

## 5. Recommended Remediation & Cleanup Plan

1. **Delete Dead Files:**
   - Remove `src/workers/search.worker.ts`
   - Remove `src/lib/sqliteStorage.ts`
   - Remove `src/types.ts`
   - Remove `src/components/NoteCard.tsx`
2. **Deduplicate `BatchActionBar.tsx`:**
   - Wire `alignLeft`, `alignTop`, `distributeHorizontally`, etc. from `src/utils/layoutUtils.ts`.
3. **Streamline Utilities:**
   - Remove unused exports (`MOOD_CONFIG`, `isNoteTextEmpty`, `IS_WINDOWS`, `IS_LINUX`, `getPlatformShiftKey`).
   - Clean up `security.ts` or point callers directly to `cryptoVaultService.ts`.
4. **Prune Rust Dependencies:**
   - Remove unused `serde_json` from `src-tauri/Cargo.toml`.
