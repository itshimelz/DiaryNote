import { Note, AIProvider } from '../../types';
import { decryptApiKey } from '../../utils/aiSecurity';
import { recordAIRequest } from '../../utils/aiUsageTracker';
import { REPO_URL, REPO_NAME } from '../../utils/updateChecker';
import { authorizeNotes } from '../authPolicyService';
import { isEncryptedEnvelope } from '../cryptoVaultService';
import {
  getNoteSynthesisSystemPrompt,
  getNoteSynthesisUserPrompt,
  AUTO_TAGGING_SYSTEM_PROMPT,
  getAutoTaggingUserPrompt,
} from '../../constants/aiPrompts';

export interface AIServiceConfig {
  aiProvider: AIProvider;
  encryptedApiKey: string;
  apiKeyIv: string;
  customBaseUrl?: string;
  customModelName?: string;
}

export interface MergeNotesResult {
  title: string;
  content: string;
}

const DEFAULT_TIMEOUT_MS = 15000;

function createTimeoutSignal(externalSignal?: AbortSignal, timeoutMs: number = DEFAULT_TIMEOUT_MS): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`AI request timed out after ${timeoutMs / 1000}s`));
  }, timeoutMs);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort(externalSignal.reason);
    });
  }

  return controller.signal;
}

/**
 * Returns provider-compliant application identification and authorization headers.
 * Uses x-goog-api-key header for Gemini to prevent credential leakage in URL query logs.
 */
function getAIHeaders(provider: AIProvider, apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = REPO_URL;
    headers['X-Title'] = REPO_NAME;
  }

  if (apiKey) {
    if (provider === 'gemini') {
      headers['x-goog-api-key'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  return headers;
}

/**
 * Resolves the target AI model name based on provider and user settings.
 */
export function getModelName(config: AIServiceConfig): string {
  if (config.customModelName && config.customModelName.trim()) {
    return config.customModelName.trim();
  }
  switch (config.aiProvider) {
    case 'gemini':
      return 'gemini-2.5-flash';
    case 'openai':
      return 'gpt-4o-mini';
    case 'openrouter':
      return 'google/gemini-2.5-flash';
    case 'custom':
      return 'deepseek-chat';
    default:
      return 'gemini-2.5-flash';
  }
}

/**
 * Test AI API connection with a lightweight ping query
 */
export async function testAIConnection(
  config: AIServiceConfig,
  rawApiKey?: string,
  externalSignal?: AbortSignal
): Promise<{ success: boolean; message: string }> {
  const apiKey = rawApiKey || (await decryptApiKey(config.encryptedApiKey, config.apiKeyIv));
  if (!apiKey.trim()) {
    return { success: false, message: 'API key is empty or invalid.' };
  }

  const modelName = getModelName(config);
  const signal = createTimeoutSignal(externalSignal, 10000);

  try {
    if (config.aiProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getAIHeaders('gemini', apiKey),
        signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK' }] }],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, message: errJson?.error?.message || `HTTP ${res.status} Error` };
      }
      return { success: true, message: `Google Gemini (${modelName}) key verified successfully!` };
    }

    // OpenAI, OpenRouter, or Custom/OpenAI-compatible
    let baseUrl = 'https://api.openai.com/v1';

    if (config.aiProvider === 'openrouter') {
      baseUrl = (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    } else if (config.aiProvider === 'custom') {
      baseUrl = (config.customBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    }

    const endpoint = `${baseUrl}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAIHeaders(config.aiProvider, apiKey),
      signal,
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, message: errJson?.error?.message || `HTTP ${res.status} Error` };
    }
    return { success: true, message: `${config.aiProvider.toUpperCase()} (${modelName}) connection successful!` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network connection failed.' };
  }
}

/**
 * Merge up to 5 notes into 1 synthesized note using selected AI provider
 */
export async function mergeNotesWithAI(
  notesToMerge: Note[],
  config: AIServiceConfig,
  externalSignal?: AbortSignal
): Promise<MergeNotesResult> {
  if (!notesToMerge || notesToMerge.length === 0) {
    throw new Error('No notes selected for merging.');
  }

  // Security & Privacy Policy Guard: Redact or reject unauthorized locked notes
  const authResult = authorizeNotes(notesToMerge, 'sendToAI');
  if (!authResult.allowed) {
    throw new Error('Cannot send locked notes to external AI service without authentication.');
  }

  const apiKey = await decryptApiKey(config.encryptedApiKey, config.apiKeyIv);
  if (!apiKey.trim()) {
    throw new Error('API key is missing or could not be decrypted. Please check AI settings.');
  }

  const signal = createTimeoutSignal(externalSignal, DEFAULT_TIMEOUT_MS);

  // Construct source notes block
  const notesText = notesToMerge
    .map((n, i) => `[NOTE ${i + 1}: "${n.title || 'Untitled'}"]\n${n.content}\n`)
    .join('\n---\n');

  const systemPrompt = getNoteSynthesisSystemPrompt(notesToMerge.length);
  const userPrompt = getNoteSynthesisUserPrompt(notesToMerge.length, notesText);

  let rawOutput = '';
  const modelName = getModelName(config);

  if (config.aiProvider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAIHeaders('gemini', apiKey),
      signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gemini API Error (HTTP ${res.status})`);
    }

    const data = await res.json();
    rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    // OpenAI, OpenRouter, Custom
    let baseUrl = 'https://api.openai.com/v1';

    if (config.aiProvider === 'openrouter') {
      baseUrl = (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    } else if (config.aiProvider === 'custom') {
      baseUrl = (config.customBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    }

    const endpoint = `${baseUrl}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAIHeaders(config.aiProvider, apiKey),
      signal,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `AI Provider Error (HTTP ${res.status})`);
    }

    const data = await res.json();
    rawOutput = data.choices?.[0]?.message?.content || '';
  }

  // Parse title and clean metadata
  let title = `Merged Note (${new Date().toLocaleDateString()})`;
  let content = rawOutput
    .replace(/^User Safety:.*$/gim, '')
    .replace(/^Safety status:.*$/gim, '')
    .trim();

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
    content = content.replace(/^#\s+.+$/m, '').trim();
  }

  // Format mentions in strict DiaryNote syntax: @[Title](id)
  const mentionsList = notesToMerge
    .map((n) => `@[${(n.title || 'Untitled Note').replace(/[\][]/g, '')}](${n.id})`)
    .join(', ');

  const referencesSection = `\n\n---\n**Merged from:** ${mentionsList}`;
  content = content + referencesSection;

  recordAIRequest();

  return { title, content };
}

/**
 * Generate max 3 tags based on note content via AI
 */
export async function generateAutoTagsWithAI(
  title: string,
  content: string,
  config: AIServiceConfig,
  externalSignal?: AbortSignal
): Promise<string[]> {
  if (isEncryptedEnvelope(content) || content.includes('CONTENT ENCRYPTED') || content.includes('Locked Note')) {
    throw new Error('Cannot generate tags for encrypted or locked note without authentication.');
  }

  const apiKey = await decryptApiKey(config.encryptedApiKey, config.apiKeyIv);
  if (!apiKey.trim()) {
    throw new Error('API key is missing or invalid. Please configure AI settings.');
  }

  const signal = createTimeoutSignal(externalSignal, DEFAULT_TIMEOUT_MS);
  const systemPrompt = AUTO_TAGGING_SYSTEM_PROMPT;
  const userPrompt = getAutoTaggingUserPrompt(title, content);
  const modelName = getModelName(config);
  let rawOutput = '';

  if (config.aiProvider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAIHeaders('gemini', apiKey),
      signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gemini API Error (HTTP ${res.status})`);
    }
    const data = await res.json();
    rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    let baseUrl = 'https://api.openai.com/v1';

    if (config.aiProvider === 'openrouter') {
      baseUrl = (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    } else if (config.aiProvider === 'custom') {
      baseUrl = (config.customBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: getAIHeaders(config.aiProvider, apiKey),
      signal,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 30,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `AI Provider Error (HTTP ${res.status})`);
    }
    const data = await res.json();
    rawOutput = data.choices?.[0]?.message?.content || '';
  }

  // Parse hashtags or words, strictly limit to max 3
  const matches = rawOutput.match(/#[a-zA-Z0-9_\-\u0980-\u09FF]+/g) || [];
  let tags = matches.map((t) => t.trim());
  if (tags.length === 0) {
    tags = rawOutput
      .split(/[\s,]+/)
      .map((w) => w.replace(/^#+/, '').trim())
      .filter(Boolean)
      .map((w) => `#${w}`);
  }

  recordAIRequest();

  return tags.slice(0, 3);
}
