import { describe, it, expect } from 'vitest';
import { mergeNotesWithAI, getModelName, AIServiceConfig } from '../ai/aiMergeService';
import { Note } from '../../types';
import { setMasterSessionUnlocked } from '../authPolicyService';

function createMockNote(id: string, isLocked: boolean = false): Note {
  return {
    id,
    title: `Note ${id}`,
    content: `Content of Note ${id}`,
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

describe('AI Merge Service Privacy & Transport Security (aiMergeService.ts)', () => {
  const dummyConfig: AIServiceConfig = {
    aiProvider: 'gemini',
    encryptedApiKey: 'dummy',
    apiKeyIv: 'dummy',
  };

  it('rejects merging when locked notes are not authenticated', async () => {
    setMasterSessionUnlocked(false);
    const notes = [createMockNote('1', false), createMockNote('2', true)];

    await expect(mergeNotesWithAI(notes, dummyConfig)).rejects.toThrow(
      /Cannot send locked notes to external AI service/
    );
  });

  it('resolves correct model names per provider', () => {
    expect(getModelName({ aiProvider: 'gemini', encryptedApiKey: '', apiKeyIv: '' })).toBe('gemini-2.5-flash');
    expect(getModelName({ aiProvider: 'openai', encryptedApiKey: '', apiKeyIv: '' })).toBe('gpt-4o-mini');
    expect(getModelName({ aiProvider: 'openrouter', encryptedApiKey: '', apiKeyIv: '' })).toBe('google/gemini-2.5-flash');
    expect(getModelName({ aiProvider: 'custom', encryptedApiKey: '', apiKeyIv: '', customModelName: 'custom-llm' })).toBe('custom-llm');
  });
});
