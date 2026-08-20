import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedModelsCatalog,
  saveCatalogToCache,
  isCatalogCacheValid,
  fetchRemoteModelsCatalog,
  getSuggestedModelsForProvider,
  getDefaultModelForProvider,
} from '../ai/aiModelsCatalogService';
import { DEFAULT_AI_MODELS_CATALOG } from '../../constants/aiModelsCatalog';

describe('aiModelsCatalogService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns bundled default catalog when cache is empty', () => {
    const catalog = getCachedModelsCatalog();
    expect(catalog).toEqual(DEFAULT_AI_MODELS_CATALOG);
    expect(catalog.providers.gemini.defaultModel).toBe(DEFAULT_AI_MODELS_CATALOG.providers.gemini.defaultModel);
    expect(catalog.providers.openai.defaultModel).toBe(DEFAULT_AI_MODELS_CATALOG.providers.openai.defaultModel);
  });

  it('saves and reads catalog from cache correctly', () => {
    const customCatalog = {
      version: 99,
      lastUpdated: '2026-12-31',
      providers: {
        ...DEFAULT_AI_MODELS_CATALOG.providers,
        gemini: {
          defaultModel: 'gemini-99-ultra',
          suggestedModels: [{ id: 'gemini-99-ultra', name: 'Gemini 99 Ultra', category: 'Future' }],
        },
      },
    };

    saveCatalogToCache(customCatalog);
    expect(isCatalogCacheValid()).toBe(true);

    const loaded = getCachedModelsCatalog();
    expect(loaded.version).toBe(99);
    expect(loaded.providers.gemini.defaultModel).toBe('gemini-99-ultra');
  });

  it('getSuggestedModelsForProvider returns suggestions for all providers', () => {
    const geminiSuggestions = getSuggestedModelsForProvider('gemini');
    expect(geminiSuggestions.length).toBeGreaterThan(0);

    const openaiSuggestions = getSuggestedModelsForProvider('openai');
    expect(openaiSuggestions.length).toBeGreaterThan(0);

    const openrouterSuggestions = getSuggestedModelsForProvider('openrouter');
    expect(openrouterSuggestions.length).toBeGreaterThan(0);
  });

  it('getDefaultModelForProvider returns correct default per provider', () => {
    expect(getDefaultModelForProvider('gemini')).toBe(DEFAULT_AI_MODELS_CATALOG.providers.gemini.defaultModel);
    expect(getDefaultModelForProvider('openai')).toBe(DEFAULT_AI_MODELS_CATALOG.providers.openai.defaultModel);
    expect(getDefaultModelForProvider('openrouter')).toBe(DEFAULT_AI_MODELS_CATALOG.providers.openrouter.defaultModel);
    expect(getDefaultModelForProvider('custom')).toBe(DEFAULT_AI_MODELS_CATALOG.providers.custom.defaultModel);
  });

  it('fetchRemoteModelsCatalog returns cached catalog when valid and force is false', async () => {
    const customCatalog = {
      version: 99,
      lastUpdated: '2026-12-31',
      providers: DEFAULT_AI_MODELS_CATALOG.providers,
    };
    saveCatalogToCache(customCatalog);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await fetchRemoteModelsCatalog(false);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.version).toBe(99);
  });

  it('fetchRemoteModelsCatalog falls back to cache/defaults if remote fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await fetchRemoteModelsCatalog(true);
    expect(result).toBeDefined();
    expect(result.providers.gemini.defaultModel).toBe(DEFAULT_AI_MODELS_CATALOG.providers.gemini.defaultModel);
  });
});
