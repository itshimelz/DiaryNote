import { Note, AIProvider } from '../../types';
import { decryptApiKey } from '../../utils/aiSecurity';
import { recordAIRequest } from '../../utils/aiUsageTracker';
import { CURRENT_VERSION, REPO_URL, REPO_NAME } from '../../utils/updateChecker';
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

/**
 * Returns provider-compliant application identification headers.
 * OpenRouter officially supports HTTP-Referer and X-Title for app tracking & leaderboards.
 */
function getAIHeaders(provider: AIProvider, apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // OpenRouter officially supports and encourages these two headers in CORS
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = REPO_URL;
    headers['X-Title'] = REPO_NAME;
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return headers;
}

/**
 * Test AI API connection with a lightweight ping query
 */
export async function testAIConnection(config: AIServiceConfig, rawApiKey?: string): Promise<{ success: boolean; message: string }> {
  const apiKey = rawApiKey || (await decryptApiKey(config.encryptedApiKey, config.apiKeyIv));
  if (!apiKey.trim()) {
    return { success: false, message: 'API key is empty or invalid.' };
  }

  try {
    if (config.aiProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getAIHeaders('gemini'),
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK' }] }]
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, message: errJson?.error?.message || `HTTP ${res.status} Error` };
      }
      return { success: true, message: 'Google Gemini API key verified successfully!' };
    }

    // OpenAI, OpenRouter, or Custom/OpenAI-compatible
    let baseUrl = 'https://api.openai.com/v1';
    let modelName = 'gpt-4o-mini';

    if (config.aiProvider === 'openrouter') {
      baseUrl = (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      modelName = config.customModelName || 'google/gemini-2.0-flash-001';
    } else if (config.aiProvider === 'custom') {
      baseUrl = (config.customBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
      modelName = config.customModelName || 'deepseek-chat';
    }

    const endpoint = `${baseUrl}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAIHeaders(config.aiProvider, apiKey),
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 10
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, message: errJson?.error?.message || `HTTP ${res.status} Error` };
    }
    return { success: true, message: `${config.aiProvider.toUpperCase()} connection successful!` };

  } catch (err: any) {
    return { success: false, message: err?.message || 'Network connection failed.' };
  }
}



/**
 * Merge up to 5 notes into 1 synthesized note using selected AI provider
 */
export async function mergeNotesWithAI(
  notesToMerge: Note[],
  config: AIServiceConfig
): Promise<MergeNotesResult> {
  if (!notesToMerge || notesToMerge.length === 0) {
    throw new Error('No notes selected for merging.');
  }

  const apiKey = await decryptApiKey(config.encryptedApiKey, config.apiKeyIv);
  if (!apiKey.trim()) {
    throw new Error('API key is missing or could not be decrypted. Please check AI settings.');
  }

  // Construct source notes block
  const notesText = notesToMerge
    .map((n, i) => `[NOTE ${i + 1}: "${n.title || 'Untitled'}"]\n${n.content}\n`)
    .join('\n---\n');

  const systemPrompt = getNoteSynthesisSystemPrompt(notesToMerge.length);
  const userPrompt = getNoteSynthesisUserPrompt(notesToMerge.length, notesText);

  let rawOutput = '';

  if (config.aiProvider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAIHeaders('gemini'),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }]
      })
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
    let modelName = 'gpt-4o-mini';

    if (config.aiProvider === 'openrouter') {
      baseUrl = (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      modelName = config.customModelName || 'google/gemini-2.0-flash-001';
    } else if (config.aiProvider === 'custom') {
      baseUrl = (config.customBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
      modelName = config.customModelName || 'deepseek-chat';
    }

    const endpoint = `${baseUrl}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAIHeaders(config.aiProvider, apiKey),
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
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
    .replace(/^User Safety:.*$/gmi, '')
    .replace(/^Safety status:.*$/gmi, '')
    .trim();

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
    content = content.replace(/^#\s+.+$/m, '').trim();
  }

  // Format mentions in strict DiaryNote syntax: @[Title](id) inline separated by space and comma
  const mentionsList = notesToMerge
    .map((n) => `@[${(n.title || 'Untitled Note').replace(/[\[\]]/g, '')}](${n.id})`)
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
  config: AIServiceConfig
): Promise<string[]> {
  const apiKey = await decryptApiKey(config.encryptedApiKey, config.apiKeyIv);
  if (!apiKey.trim()) {
    throw new Error('API key is missing or invalid. Please configure AI settings.');
  }

  const systemPrompt = AUTO_TAGGING_SYSTEM_PROMPT;
  const userPrompt = getAutoTaggingUserPrompt(title, content);
  let rawOutput = '';

  if (config.aiProvider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAIHeaders('gemini'),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gemini API Error (HTTP ${res.status})`);
    }
    const data = await res.json();
    rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    let baseUrl = 'https://api.openai.com/v1';
    let modelName = 'gpt-4o-mini';

    if (config.aiProvider === 'openrouter') {
      baseUrl = (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      modelName = config.customModelName || 'google/gemini-2.0-flash-001';
    } else if (config.aiProvider === 'custom') {
      baseUrl = (config.customBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
      modelName = config.customModelName || 'deepseek-chat';
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: getAIHeaders(config.aiProvider, apiKey),
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 30,
        temperature: 0.2
      })
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
  let tags = matches.map(t => t.trim());
  if (tags.length === 0) {
    tags = rawOutput
      .split(/[\s,]+/)
      .map(w => w.replace(/^#+/, '').trim())
      .filter(Boolean)
      .map(w => `#${w}`);
  }

  recordAIRequest();

  return tags.slice(0, 3);
}

