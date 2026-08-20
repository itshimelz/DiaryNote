import { AIProvider } from '../../types';
import {
  AIModelsCatalog,
  AIModelSuggestion,
  DEFAULT_AI_MODELS_CATALOG,
} from '../../constants/aiModelsCatalog';

const CACHE_KEY = 'diarynote_ai_models_catalog_v1';
const TIMESTAMP_KEY = 'diarynote_ai_models_catalog_timestamp';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

export const REMOTE_CATALOG_URL =
  'https://raw.githubusercontent.com/itshimelz/DiaryNote/main/config/ai-models.json';

/**
 * Returns the currently cached catalog from localStorage, falling back to bundled default catalog.
 */
export function getCachedModelsCatalog(): AIModelsCatalog {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AIModelsCatalog;
      if (parsed && parsed.providers && typeof parsed.providers === 'object') {
        // If the bundled default catalog is newer than the cache, prioritize the newer catalog
        if (
          (parsed.version || 0) < (DEFAULT_AI_MODELS_CATALOG.version || 0) ||
          (parsed.lastUpdated || '') < (DEFAULT_AI_MODELS_CATALOG.lastUpdated || '')
        ) {
          saveCatalogToCache(DEFAULT_AI_MODELS_CATALOG);
          return DEFAULT_AI_MODELS_CATALOG;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached AI models catalog:', err);
  }
  return DEFAULT_AI_MODELS_CATALOG;
}

/**
 * Checks if the catalog cache is still valid (less than 24 hours old).
 */
export function isCatalogCacheValid(): boolean {
  try {
    const tsStr = localStorage.getItem(TIMESTAMP_KEY);
    if (!tsStr) return false;
    const ts = parseInt(tsStr, 10);
    return Date.now() - ts < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Saves a catalog into localStorage with current timestamp.
 */
export function saveCatalogToCache(catalog: AIModelsCatalog): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(catalog));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
  } catch (err) {
    console.warn('Failed to save AI models catalog to localStorage:', err);
  }
}

/**
 * Fetches the latest models catalog from GitHub raw JSON with a 3-second timeout.
 * If cached and not forced, returns the cached version immediately to minimize internet usage.
 * Falls back seamlessly to cache or bundled defaults on network failure/offline mode.
 */
export async function fetchRemoteModelsCatalog(force: boolean = false): Promise<AIModelsCatalog> {
  if (!force && isCatalogCacheValid()) {
    return getCachedModelsCatalog();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(REMOTE_CATALOG_URL, {
      signal: controller.signal,
      cache: 'no-cache',
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as AIModelsCatalog;
      if (data && data.providers && typeof data.providers === 'object') {
        saveCatalogToCache(data);
        return data;
      }
    }
  } catch {
    // Network offline, timeout, or blocked: gracefully ignore and fall back
  } finally {
    clearTimeout(timeoutId);
  }

  return getCachedModelsCatalog();
}

/**
 * Helper to get suggested model chips for a given provider.
 */
export function getSuggestedModelsForProvider(
  provider: AIProvider,
  catalog: AIModelsCatalog = getCachedModelsCatalog()
): AIModelSuggestion[] {
  const providerData = catalog.providers?.[provider] || DEFAULT_AI_MODELS_CATALOG.providers[provider];
  return providerData?.suggestedModels || [];
}

/**
 * Helper to get default model name for a provider.
 */
export function getDefaultModelForProvider(
  provider: AIProvider,
  catalog: AIModelsCatalog = getCachedModelsCatalog()
): string {
  const providerData = catalog.providers?.[provider] || DEFAULT_AI_MODELS_CATALOG.providers[provider];
  return providerData?.defaultModel || DEFAULT_AI_MODELS_CATALOG.providers[provider]?.defaultModel || 'gemini-3.7-flash';
}
