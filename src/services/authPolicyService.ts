import { Note } from '../types';

export type AccessIntent =
  | 'read'
  | 'copy'
  | 'export'
  | 'delete'
  | 'sendToAI'
  | 'graphIndex'
  | 'searchIndex';

export interface AuthPolicyResult {
  allowed: boolean;
  reason?: string;
  lockedNoteIds: string[];
  authorizedNotes: Note[];
  redactedNotes: Note[];
}

export interface SessionAuthState {
  isMasterUnlocked: boolean;
  unlockedNoteIds: Set<string>;
}

const globalSessionAuth: SessionAuthState = {
  isMasterUnlocked: false,
  unlockedNoteIds: new Set<string>(),
};

/**
 * Returns the current memory-resident session authentication state.
 */
export function getSessionAuthState(): SessionAuthState {
  return globalSessionAuth;
}

/**
 * Marks the entire session as unlocked (e.g. valid master passcode provided).
 */
export function setMasterSessionUnlocked(unlocked: boolean): void {
  globalSessionAuth.isMasterUnlocked = unlocked;
  if (!unlocked) {
    globalSessionAuth.unlockedNoteIds.clear();
  }
}

/**
 * Marks an individual note as unlocked for the active session.
 */
export function setNoteSessionUnlocked(noteId: string, unlocked: boolean): void {
  if (unlocked) {
    globalSessionAuth.unlockedNoteIds.add(noteId);
  } else {
    globalSessionAuth.unlockedNoteIds.delete(noteId);
  }
}

/**
 * Checks if a specific note is authorized for access under the active session.
 */
export function isNoteAuthorized(note: Note, sessionState?: SessionAuthState): boolean {
  if (!note || !note.isLocked) {
    return true;
  }
  const session = sessionState || globalSessionAuth;
  return session.isMasterUnlocked || session.unlockedNoteIds.has(note.id);
}

/**
 * Centralized domain authorization policy for single or batch note access.
 */
export function authorizeNotes(
  notes: Note[],
  intent: AccessIntent,
  sessionState?: SessionAuthState
): AuthPolicyResult {
  const session = sessionState || globalSessionAuth;
  const lockedNotes = (notes || []).filter((n) => n && n.isLocked && !isNoteAuthorized(n, session));
  const lockedNoteIds = lockedNotes.map((n) => n.id);

  // Deletion is permitted with warning, but content operations require authentication
  if (intent === 'delete') {
    return {
      allowed: true,
      lockedNoteIds,
      authorizedNotes: notes,
      redactedNotes: notes,
    };
  }

  const allAuthorized = lockedNotes.length === 0;

  const authorizedNotes = (notes || []).filter((n) => n && isNoteAuthorized(n, session));
  const redactedNotes = (notes || []).map((n) => {
    if (!n) return n;
    if (isNoteAuthorized(n, session)) return n;

    return {
      ...n,
      title: n.title ? '🔒 Locked Note' : '🔒 Locked Note',
      content: '<!-- CONTENT ENCRYPTED / LOCKED -->',
      tags: [],
    };
  });

  return {
    allowed: allAuthorized,
    reason: allAuthorized
      ? undefined
      : `${lockedNotes.length} locked note(s) require passcode verification for ${intent}.`,
    lockedNoteIds,
    authorizedNotes,
    redactedNotes,
  };
}

/**
 * Filters out unauthorized locked notes, returning only notes the user or subsystem may access.
 */
export function filterAuthorizedNotes(
  notes: Note[],
  intent: AccessIntent,
  sessionState?: SessionAuthState
): Note[] {
  const result = authorizeNotes(notes, intent, sessionState);
  return result.authorizedNotes;
}

/**
 * Redacts unauthorized locked notes for safe UI display (e.g. search preview or graph).
 */
export function redactLockedNotes(
  notes: Note[],
  sessionState?: SessionAuthState
): Note[] {
  const result = authorizeNotes(notes, 'read', sessionState);
  return result.redactedNotes;
}
