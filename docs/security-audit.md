# DiaryNote Security Audit — User Data Leakage

**Date:** 2026-08-06  
**Scope:** Local-first Tauri + React diary/note app (`DiaryNote`)  
**Focus:** Confidentiality and integrity of user diary data, lock/passcode design, storage, export, and UI leakage  

---

## Executive summary

DiaryNote presents a master passcode and “locked notes” as security features, but **lock is primarily a UI gate**, not real protection of user data.

- Locked note content is stored **in plaintext** (IndexedDB + `localStorage`).
- Passwords use **unsalted SHA-256** with lowercasing (not a proper password KDF).
- Backup export dumps **all notes + security hashes** without re-authentication.
- Share, duplicate, and batch delete can bypass lock expectations.

**Bottom line:** This is local privacy theater, not a secure vault. Anyone with filesystem access, a backup file, or DevTools can recover diary content.

---

## Architecture snapshot (security-relevant)

| Area | Implementation |
|------|----------------|
| Desktop shell | Tauri v2 |
| Frontend | React + Vite + TypeScript |
| Primary storage | Dexie (IndexedDB) named `DiaryNoteSQLiteDB` |
| Fallback storage | `localStorage` keys `infinite_notes_v1_*` |
| Lock model | Boolean `note.isLocked` + global `masterPasswordHash` in settings |
| Hashing | Web Crypto `SHA-256` in `src/lib/security.ts` |
| CSP | `csp: null` in `src-tauri/tauri.conf.json` |

---

## Critical findings

### 1. Locked notes are stored in plaintext

**Severity:** Critical  
**Location:** `src/lib/sqliteStorage.ts`, `src/lib/storage.ts`

Locking only sets `isLocked: true`. Title, body, tags, drawings, images, and embeddings are **not encrypted**.

Readable offline from:

| Store | Key / DB | Contents |
|-------|----------|----------|
| IndexedDB | `DiaryNoteSQLiteDB` → `notes` | Full note objects |
| localStorage | `infinite_notes_v1_notes` | Full notes JSON (synced on every save) |
| localStorage / DB | settings | Password hashes + recovery question |

Every save dual-writes to both IndexedDB and `localStorage`:

```ts
// saveNoteToDB — also mirrors all notes to localStorage
await db.notes.put(note);
const all = await db.notes.toArray();
localStorage.setItem('infinite_notes_v1_notes', JSON.stringify(all));
```

**Impact:** Disk access, profile copy, malware, or forensics recovers the entire journal regardless of passcode.

---

### 2. Full backup export bypasses lock and exports credentials

**Severity:** Critical  
**Location:** `src/lib/storage.ts` → `exportBackup`, `src/App.tsx`

`exportBackup(notes, transform, settings)` serializes:

- All notes (including locked) in **plaintext**
- Canvas transform
- Full settings, including:
  - `masterPasswordHash`
  - `masterSecurityQuestion`
  - `masterSecurityAnswerHash`

No unlock / re-auth gate on export.

**Impact:** One click produces a complete data + credential-hash dump. Sharing or cloud-syncing that file is a full breach.

---

### 3. Share / clipboard copies locked content

**Severity:** Critical  
**Location:** `src/components/NoteCard/NoteHeader.tsx`

```ts
const shareText = `${note.title || 'Untitled Note'}\n\n${note.content || ''}`;
navigator.clipboard.writeText(shareText);
```

No `isLocked` check. Header (and share control) still render on locked cards, so private body text can leave the app without unlocking.

---

### 4. Duplicate locked notes without unlock

**Severity:** Critical  
**Location:** `src/components/NoteCard/index.tsx` (duplicate handler)

Duplicate clones the full note object (content included) with no lock verification. Creates another plaintext copy of private material.

---

### 5. Batch delete skips lock protection

**Severity:** Critical (integrity / availability)  
**Location:** `src/App.tsx` — `BatchActionBar` `onDeleteNotes`

Single-note delete uses `handleDeleteProtectedNote` / `requestDeleteNotes` (passcode for locked notes). Batch delete opens the confirm modal directly and does **not** require unlock.

**Impact:** Locked notes can be mass-deleted without passcode.

---

## High findings

### 6. Password hashing is cryptographically weak

**Severity:** High  
**Location:** `src/lib/security.ts`

```ts
export async function hashSecurityInput(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  // ...
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
}
```

Issues:

| Issue | Risk |
|-------|------|
| Bare SHA-256 (no salt) | Rainbow tables / identical password detection |
| No slow KDF (Argon2id / scrypt / PBKDF2) | Fast offline brute-force |
| Lowercases password | Cuts entropy |
| Min length 4 | Trivial guessing |
| Same scheme for recovery answers | Common Q&A is weak |

Recovery questions include predictable prompts (first pet, birth city, nickname).

---

### 7. Unlock is permanent state, not a session

**Severity:** High  
**Location:** `src/App.tsx` `onSuccessUnlock`

Successful unlock sets `isLocked: false` and persists it. Content stays open until locked again. No:

- App-wide lock screen
- Idle auto-lock
- Session-only decryption
- Memory scrubbing after lock

---

### 8. Content Security Policy disabled

**Severity:** High (defense-in-depth)  
**Location:** `src-tauri/tauri.conf.json`

```json
"security": {
  "csp": null
}
```

If XSS appears later (markdown, imports, future web features), there is little browser-side containment.

---

## Medium findings

### 9. Locked note titles still visible on canvas

**Severity:** Medium  
**Location:** `NoteHeader`, `NoteCard` `aria-label`

Body shows “Protected Note”, but:

- Real title remains in the card header
- `aria-label` includes the real title

Sidebar/search mask as “Locked Note”; canvas does not.

---

### 10. Tags leak from locked notes in search

**Severity:** Medium  
**Location:** `src/components/SearchModal.tsx` — `allTags`

Tag aggregation walks **all** notes’ `tags`, titles, and content with no `isLocked` filter. Hashtags inside locked diaries appear as filter chips.

Search *matching* for locked notes is partially restricted (good), but tag extraction still leaks.

---

### 11. Graph / mentions use locked content

**Severity:** Medium  
**Location:** `src/lib/markdownMention.ts` — `extractNoteConnections`, `processMarkdownMentions`

Connection extraction scans all note content. Mentions and graph edges can expose relationships and titles involving locked notes.

---

### 12. Undo history holds plaintext snapshots

**Severity:** Medium  
**Location:** `src/hooks/useHistoryState.ts`

Up to **50 full note-array snapshots** stay in memory. Locking does not scrub history. Process dumps / debugging can recover prior content.

---

### 13. Dual storage amplifies exposure

**Severity:** Medium  
**Location:** `src/lib/sqliteStorage.ts`

Every mutation writes IndexedDB **and** localStorage. Clearing one store leaves the other. Attackers only need one copy.

---

## Lower / environmental findings

### 14. Dev server binds all interfaces

**Severity:** Low–Medium (dev only)  
**Location:** `package.json`

```json
"dev": "vite --port=3000 --host=0.0.0.0"
```

On a shared LAN, other devices can reach the Vite UI and live session data. Prefer `localhost` for personal diary development.

---

### 15. Unused Google GenAI dependency

**Severity:** Low  
**Location:** `package.json` (`@google/genai`), `.env.example`

No live Gemini usage found in `src/`. Residual AI dependency + env template could invite future cloud leakage if embeddings are wired without a clear data policy.

---

### 16. Import overwrites data without integrity / re-auth

**Severity:** Low–Medium  
**Location:** `src/lib/storage.ts` — `importBackup`, `src/App.tsx`

Import trusts JSON loosely and can replace notes and security settings without confirmation beyond file pick / without current passcode.

---

### 17. External image URLs

**Severity:** Low  
**Location:** Sample notes / `NoteImageView`

Remote image URLs (e.g. Unsplash samples) load from the network. User-supplied remote `imageUrl`s can leak network fingerprints or request third-party hosts.

---

## What looks okay (for now)

- No hardcoded production API keys or real secrets in the repo (`.env*` gitignored; only `.env.example` placeholders).
- No obvious outbound diary sync or telemetry in application source.
- Tauri capabilities are minimal: `core:default`, `notification:default`.
- Search UI attempts to avoid matching locked note body/tags in keyword search (incomplete but intentional).
- Single-note delete / single export of locked notes generally prompts unlock first.

---

## Threat model (simplified)

| Attacker | Current outcome |
|----------|-----------------|
| Shoulder surfer (UI only) | Partially mitigated by lock UI |
| Same machine, user profile access | Full diary + hashes recoverable |
| Stolen backup JSON | Full diary + password/recovery hashes |
| Malware / disk dump | Full diary via IndexedDB or localStorage |
| Shared network during `npm run dev` | Possible live UI exposure |
| Remote internet attacker | Low direct risk today (local-first, no cloud sync found) |

---

## Priority fix roadmap

### P0 — stop direct leakage and start real protection

1. **Encrypt note fields at rest** (AES-GCM; key from passcode via Argon2id or PBKDF2 + random salt + per-note IV).
2. Stop dual-writing full plaintext notes to `localStorage`, or encrypt that mirror too.
3. Gate **backup export**, **share**, **duplicate**, and **batch delete** behind unlock.
4. Strip security hashes from plain export, or export only encrypted vaults.

### P1 — auth & session hygiene

5. Replace bare SHA-256 with salted slow KDF; raise min password length; do **not** lowercase passwords.
6. Treat unlock as a **session** (in-memory unlock set), not permanent `isLocked: false` on disk.
7. App-level lock screen + idle auto-lock.
8. Mask title / tags / connections / ARIA for locked notes everywhere.

### P2 — hardening

9. Set a strict Tauri CSP.
10. Bind Vite to `localhost` by default.
11. Require re-auth / confirmation on import when a master passcode exists.
12. Clear or redact sensitive undo history when locking.
13. Document that “lock” without encryption is not privacy.

---

## Key files reviewed

| Path | Role |
|------|------|
| `src/lib/security.ts` | Password / recovery hashing |
| `src/lib/storage.ts` | localStorage helpers, export/import |
| `src/lib/sqliteStorage.ts` | Dexie DB, dual-write, vector search helper |
| `src/components/SecurityModal.tsx` | Set / unlock / recovery UI |
| `src/App.tsx` | Lock/unlock flows, export, batch delete |
| `src/components/NoteCard/*` | Locked UI, share, duplicate, toolbar |
| `src/components/SearchModal.tsx` | Search masking + tag leakage |
| `src/components/NotesSidebar.tsx` | List masking |
| `src/hooks/useHistoryState.ts` | Undo snapshots |
| `src-tauri/tauri.conf.json` | CSP |
| `src-tauri/capabilities/default.json` | Plugin permissions |
| `package.json` | Dev host binding, dependencies |

---

## Recommended security statement (product honesty)

Until at-rest encryption ships, marketing and UI copy should not imply cryptographic protection. Prefer wording like:

> Lock hides notes in the UI and requires a passcode for some actions. Note content is still stored locally in readable form on this device.

---

## Document control

| Field | Value |
|-------|--------|
| Generated | Security review of local codebase |
| Status | Findings only — no fixes applied in this document |
| Sensitivity | Internal; may describe attack paths against user data |
| Git | Intended to stay out of version control via `.gitignore` |

---

*End of audit.*
