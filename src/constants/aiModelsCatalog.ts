import { AIProvider } from '../types';
import rawCatalog from '../../config/ai-models.json';

export interface AIModelSuggestion {
  id: string;
  name: string;
  category: string;
  recommended?: boolean;
  reasoning?: boolean;
}

export interface AIProviderCatalog {
  defaultModel: string;
  suggestedModels: AIModelSuggestion[];
}

export interface AIModelsCatalog {
  version: number;
  lastUpdated: string;
  providers: Record<AIProvider, AIProviderCatalog>;
}

/**
 * Bundled offline-first fallback catalog imported directly from config/ai-models.json.
 */
export const DEFAULT_AI_MODELS_CATALOG: AIModelsCatalog = rawCatalog as unknown as AIModelsCatalog;
