import { describe, it, expect } from 'vitest';
import {
  validateAndParseBackupContent,
  MAX_BACKUP_FILE_SIZE_BYTES,
} from '../backupSchema';


describe('backupSchema validation service', () => {
  it('successfully parses valid Backup V1 structure', () => {
    const validV1 = JSON.stringify({
      version: 1,
      exportedAt: '2026-08-14T01:00:00.000Z',
      notes: [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Hello world',
          x: 100,
          y: 200,
          width: 340,
          height: 300,
          createdAt: '2026-08-14T00:00:00.000Z',
          updatedAt: '2026-08-14T00:00:00.000Z',
          fontFamily: 'sans',
          fontSize: 'sm',
          paperTheme: 'white',
          zIndex: 1,
        },
      ],
    });

    const parsed = validateAndParseBackupContent(validV1);
    expect(parsed.version).toBe(1);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0].title).toBe('Test Note');
    expect(parsed.notes[0].createdTimestamp).toBeTypeOf('number');
    expect(parsed.notes[0].updatedTimestamp).toBeTypeOf('number');
  });

  it('successfully parses valid Backup V2 structure with metadata', () => {
    const validV2 = JSON.stringify({
      version: 2,
      exportedAt: '2026-08-14T01:00:00.000Z',
      notes: [
        {
          id: 'note-2',
          title: 'V2 Note',
          content: 'V2 Content',
          x: 50,
          y: 60,
          width: 400,
          height: 350,
          createdAt: '2026-08-14T00:00:00.000Z',
          updatedAt: '2026-08-14T00:00:00.000Z',
          fontFamily: 'mono',
          fontSize: 'md',
          paperTheme: 'dark',
          zIndex: 2,
        },
      ],
      settings: {
        gridType: 'dots',
        themeMode: 'dark',
        defaultFont: 'sans',
        snapToGrid: true,
        showConnections: true,
        showMinimap: true,
      },
    });

    const parsed = validateAndParseBackupContent(validV2);
    expect(parsed.version).toBe(2);
    expect(parsed.notes[0].paperTheme).toBe('dark');
    expect(parsed.settings?.snapToGrid).toBe(true);
  });

  it('rejects backup files exceeding maximum size of 50MB', () => {
    // Generate dummy string larger than 50MB length
    const hugeString = 'a'.repeat(MAX_BACKUP_FILE_SIZE_BYTES + 10);
    expect(() => validateAndParseBackupContent(hugeString)).toThrowError(
      /exceeds maximum allowed size of 50MB/
    );
  });

  it('rejects malformed JSON syntax gracefully', () => {
    const invalidJson = '{ "version": 1, "notes": [ { id: "note-1" } ';
    expect(() => validateAndParseBackupContent(invalidJson)).toThrowError(
      /Malformed JSON syntax/
    );
  });

  it('parses bare array of notes for legacy compatibility', () => {
    const bareArray = JSON.stringify([
      {
        id: 'legacy-1',
        title: 'Legacy Note',
        content: 'Legacy Content',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
        fontFamily: 'sans',
        fontSize: 'sm',
        paperTheme: 'white',
        zIndex: 1,
      },
    ]);

    const parsed = validateAndParseBackupContent(bareArray);
    expect(parsed.version).toBe(1);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0].id).toBe('legacy-1');
  });

  it('sanitizes master passwords and api keys on settings parsing', () => {
    const backupWithSecrets = JSON.stringify({
      version: 1,
      notes: [],
      settings: {
        gridType: 'grid',
        themeMode: 'light',
        defaultFont: 'sans',
        snapToGrid: false,
        showConnections: false,
        showMinimap: false,
        masterPasswordHash: 'secret-hash-value',
        encryptedApiKey: 'encrypted-api-key',
      },
    });

    const parsed = validateAndParseBackupContent(backupWithSecrets);
    expect(parsed.settings?.masterPasswordHash).toBe('');
    expect(parsed.settings?.encryptedApiKey).toBe('');
  });

  it('successfully parses image notes with polaroid frame, pin style, and rotation', () => {
    const backupWithImageNote = JSON.stringify({
      version: 2,
      notes: [
        {
          id: 'note-polaroid-1',
          title: 'Vacation Photo',
          content: 'Summer 2026',
          imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          imageType: 'image/png',
          imageAspectRatio: 1.33,
          frameStyle: 'polaroid',
          pinStyle: 'pushpin-red',
          rotation: -2,
          x: 120,
          y: 240,
          width: 320,
          height: 380,
          createdAt: '2026-08-14T00:00:00.000Z',
          updatedAt: '2026-08-14T00:00:00.000Z',
          fontFamily: 'sans',
          fontSize: 'md',
          paperTheme: 'white',
          zIndex: 1,
        },
      ],
      settings: {
        gridType: 'dots',
        themeMode: 'cork',
        defaultFont: 'sans',
        snapToGrid: false,
        showConnections: true,
        showMinimap: true,
      },
    });

    const parsed = validateAndParseBackupContent(backupWithImageNote);
    expect(parsed.notes[0].frameStyle).toBe('polaroid');
    expect(parsed.notes[0].pinStyle).toBe('pushpin-red');
    expect(parsed.notes[0].rotation).toBe(-2);
    expect(parsed.notes[0].imageUrl).toContain('data:image/png;base64');
    expect(parsed.settings?.themeMode).toBe('cork');
  });
});
