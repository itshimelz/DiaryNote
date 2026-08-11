import { Note, AIProvider } from '../../types';
import { decryptApiKey } from '../../utils/aiSecurity';
import { CURRENT_VERSION, REPO_URL, REPO_NAME } from '../../utils/updateChecker';

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

  const systemPrompt = `You are an expert note synthesizer. Your goal is to combine ${notesToMerge.length} user notes into a single cohesive Markdown document.

CRITICAL INSTRUCTIONS:
1. LANGUAGE MATCHING (MANDATORY):
   - Automatically detect the primary language used in the source notes.
   - If source notes are in Bengali (বাংলা), write the entire merged note (title, headings, body) in Bengali (বাংলা).
   - If source notes are in Banglish (Bengali text written in Latin alphabet, e.g. "amar ajke task complete korte hobe"), respond in natural Banglish/Bengali matching the user's style.
   - If source notes are in English, Spanish, French, German, or any other language, respond in that exact language.
   - For multilingual notes, synthesize using the dominant language while preserving original technical terms.
2. STRUCTURE & FORMATTING:
   - Provide a sharp, concise Markdown title on the very first line starting with '# Title'.
   - Structure the body with clear headings (##), bullet points, and synthesized insights without losing key details.
   - Do NOT create or append separate "Action Items", "অ্যাকশন আইটেম", "করণীয় কাজ", or summary checklist sections at the bottom of the note. Integrate all content naturally into the main body sections.
3. OUTPUT CLEANLINESS:
   - Do NOT output system safety metadata (such as "User Safety: safe"), disclaimers, or meta-commentary like "Here is your merged note:". Start directly with '# Title'.
   - Do NOT append source note mentions or lists yourself at the bottom; the application appends them automatically.`;



  const userPrompt = `Synthesize and merge these ${notesToMerge.length} notes into one document:\n\n${notesText}`;

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

  return { title, content };
}

