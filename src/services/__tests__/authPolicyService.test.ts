import { describe, it, expect, beforeEach } from 'vitest';
import {
  authorizeNotes,
  filterAuthorizedNotes,
  redactLockedNotes,
  isNoteAuthorized,
  setMasterSessionUnlocked,
  setNoteSessionUnlocked,
} from '../authPolicyService';
import { Note } from '../../types';

function createMockNote(id: string, isLocked: boolean = false, title: string = 'Test Note'): Note {
  return {
    id,
    title,
    content: `Content of ${title}`,
    x: 0,
    y: 0,
    width: 340,
    height: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fontFamily: 'sans',
    fontSize: 'sm',
    paperTheme: 'white',
    zIndex: 1,
    isLocked,
  };
}

describe('Centralized Authorization Policy Service (authPolicyService.ts)', () => {
  beforeEach(() => {
    setMasterSessionUnlocked(false);
  });

  it('permits all operations on unlocked notes', () => {
    const note1 = createMockNote('note-1', false, 'Public Note 1');
    const note2 = createMockNote('note-2', false, 'Public Note 2');

    const result = authorizeNotes([note1, note2], 'read');
    expect(result.allowed).toBe(true);
    expect(result.lockedNoteIds).toEqual([]);
    expect(result.authorizedNotes.length).toBe(2);
  });

  it('restricts export, copy, and AI merge when locked notes are not authenticated', () => {
    const publicNote = createMockNote('note-pub', false, 'Public Note');
    const lockedNote = createMockNote('note-lock', true, 'Secret Note');

    const exportAuth = authorizeNotes([publicNote, lockedNote], 'export');
    expect(exportAuth.allowed).toBe(false);
    expect(exportAuth.lockedNoteIds).toEqual(['note-lock']);
    expect(exportAuth.authorizedNotes).toEqual([publicNote]);

    const aiAuth = authorizeNotes([publicNote, lockedNote], 'sendToAI');
    expect(aiAuth.allowed).toBe(false);

    const copyAuth = authorizeNotes([lockedNote], 'copy');
    expect(copyAuth.allowed).toBe(false);
  });

  it('permits access when master session is unlocked', () => {
    const lockedNote = createMockNote('note-lock', true, 'Secret Note');

    expect(isNoteAuthorized(lockedNote)).toBe(false);

    setMasterSessionUnlocked(true);
    expect(isNoteAuthorized(lockedNote)).toBe(true);

    const auth = authorizeNotes([lockedNote], 'export');
    expect(auth.allowed).toBe(true);
    expect(auth.authorizedNotes.length).toBe(1);
  });

  it('permits access when individual note is unlocked in session', () => {
    const locked1 = createMockNote('lock-1', true, 'Note 1');
    const locked2 = createMockNote('lock-2', true, 'Note 2');

    setNoteSessionUnlocked('lock-1', true);

    expect(isNoteAuthorized(locked1)).toBe(true);
    expect(isNoteAuthorized(locked2)).toBe(false);

    const filtered = filterAuthorizedNotes([locked1, locked2], 'export');
    expect(filtered.map((n) => n.id)).toEqual(['lock-1']);
  });

  it('redacts content and sensitive fields on unauthorized locked notes', () => {
    const locked = createMockNote('lock-1', true, 'Top Secret Diary');
    const redactedList = redactLockedNotes([locked]);

    expect(redactedList[0].content).toBe('<!-- CONTENT ENCRYPTED / LOCKED -->');
    expect(redactedList[0].tags).toEqual([]);
  });

  it('always permits deletion requests while identifying locked note IDs', () => {
    const locked = createMockNote('lock-1', true, 'Secret');
    const delAuth = authorizeNotes([locked], 'delete');
    expect(delAuth.allowed).toBe(true);
    expect(delAuth.lockedNoteIds).toEqual(['lock-1']);
  });
});
