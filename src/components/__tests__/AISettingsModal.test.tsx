import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AISettingsModal } from '../Modals/AISettingsModal';

describe('AISettingsModal Component', () => {
  const onClose = vi.fn();
  const onSaveAISettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders multi-provider tabs, suggested chips, and master switch', () => {
    render(
      <AISettingsModal
        isOpen={true}
        onClose={onClose}
        enableAIServices={true}
        aiProvider="gemini"
        encryptedApiKey=""
        apiKeyIv=""
        onSaveAISettings={onSaveAISettings}
      />
    );

    expect(screen.getByText('AI Settings')).toBeDefined();
    expect(screen.getByText('Google Gemini')).toBeDefined();
    expect(screen.getByText('OpenAI')).toBeDefined();
    expect(screen.getByText('OpenRouter')).toBeDefined();
    expect(screen.getByText('Custom / Ollama')).toBeDefined();

    // Verify suggested chips for default Gemini provider
    expect(screen.getByText('Gemini 3.7 Flash')).toBeDefined();
    expect(screen.getByText('Gemini 3.1 Pro')).toBeDefined();
  });

  it('allows clicking suggested model chips to change active model', async () => {
    render(
      <AISettingsModal
        isOpen={true}
        onClose={onClose}
        enableAIServices={true}
        aiProvider="gemini"
        encryptedApiKey=""
        apiKeyIv=""
        onSaveAISettings={onSaveAISettings}
      />
    );

    const proChip = screen.getByText('Gemini 3.1 Pro');
    fireEvent.click(proChip);

    const modelInput = screen.getByPlaceholderText(/Enter model identifier/i) as HTMLInputElement;
    expect(modelInput.value).toBe('gemini-3.1-pro-preview');
  });

  it('preserves all provider profiles and keys even when toggled OFF and saved (Zero Data Loss)', async () => {
    const existingProfiles = {
      gemini: {
        provider: 'gemini' as const,
        encryptedApiKey: 'gemini_cipher',
        apiKeyIv: 'gemini_iv',
        activeModel: 'gemini-2.5-pro',
        modelHistory: ['gemini-2.5-pro', 'gemini-2.5-flash'],
      },
      openai: {
        provider: 'openai' as const,
        encryptedApiKey: 'openai_cipher',
        apiKeyIv: 'openai_iv',
        activeModel: 'o3-mini',
        modelHistory: ['o3-mini', 'gpt-4o'],
      },
      openrouter: {
        provider: 'openrouter' as const,
        encryptedApiKey: '',
        apiKeyIv: '',
        activeModel: 'google/gemini-2.5-flash',
        modelHistory: [],
      },
      custom: {
        provider: 'custom' as const,
        encryptedApiKey: '',
        apiKeyIv: '',
        activeModel: 'deepseek-chat',
        modelHistory: [],
      },
    };

    render(
      <AISettingsModal
        isOpen={true}
        onClose={onClose}
        enableAIServices={true}
        aiProvider="gemini"
        encryptedApiKey="gemini_cipher"
        apiKeyIv="gemini_iv"
        aiProviderProfiles={existingProfiles}
        onSaveAISettings={onSaveAISettings}
      />
    );

    // Toggle OFF AI Services
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    // Submit form
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSaveAISettings).toHaveBeenCalledTimes(1);
    });

    const savedPayload = onSaveAISettings.mock.calls[0][0];
    expect(savedPayload.enableAIServices).toBe(false);
    expect(savedPayload.aiProvider).toBe('gemini');
    expect(savedPayload.encryptedApiKey).toBe('gemini_cipher');
    expect(savedPayload.aiProviderProfiles.openai.encryptedApiKey).toBe('openai_cipher');
    expect(savedPayload.aiProviderProfiles.openai.activeModel).toBe('o3-mini');
  });
});
