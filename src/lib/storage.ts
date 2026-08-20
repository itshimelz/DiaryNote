import { Note, CanvasTransform, GridType, CanvasTheme, AIProvider, AIProviderProfile } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { sendNativeAppNotification } from '../utils';
import { authorizeNotes } from '../services/authPolicyService';
import { validateAndParseBackupContent } from '../schemas/backupSchema';
import { DEFAULT_AI_MODELS_CATALOG } from '../constants/aiModelsCatalog';

const NOTES_STORAGE_KEY = 'infinite_notes_v1_notes';
const CANVAS_TRANSFORM_KEY = 'infinite_notes_v1_transform';
const SETTINGS_KEY = 'infinite_notes_v1_settings';

export interface AppSettings {
  gridType: GridType;
  themeMode: CanvasTheme;
  defaultFont: 'caveat' | 'kalam' | 'patrick' | 'architect' | 'sans';
  snapToGrid: boolean;
  showConnections: boolean;
  showMinimap: boolean;
  masterPasswordHash?: string;
  masterSecurityQuestion?: string;
  masterSecurityAnswerHash?: string;

  // Network Transparency
  checkForUpdatesOnLaunch?: boolean;

  // AI Service Settings
  enableAIServices?: boolean;
  aiProvider?: AIProvider;
  encryptedApiKey?: string;
  apiKeyIv?: string;
  customBaseUrl?: string;
  customModelName?: string;
  aiProviderProfiles?: Record<string, AIProviderProfile>;
}

export const DEFAULT_AI_PROFILES: Record<AIProvider, AIProviderProfile> = {
  gemini: {
    provider: 'gemini',
    encryptedApiKey: '',
    apiKeyIv: '',
    activeModel: DEFAULT_AI_MODELS_CATALOG.providers.gemini?.defaultModel || 'gemini-3.7-flash',
    modelHistory: DEFAULT_AI_MODELS_CATALOG.providers.gemini?.suggestedModels?.map((m) => m.id) || [],
  },
  openai: {
    provider: 'openai',
    encryptedApiKey: '',
    apiKeyIv: '',
    activeModel: DEFAULT_AI_MODELS_CATALOG.providers.openai?.defaultModel || 'gpt-5.5',
    modelHistory: DEFAULT_AI_MODELS_CATALOG.providers.openai?.suggestedModels?.map((m) => m.id) || [],
  },
  openrouter: {
    provider: 'openrouter',
    encryptedApiKey: '',
    apiKeyIv: '',
    customBaseUrl: 'https://openrouter.ai/api/v1',
    activeModel: DEFAULT_AI_MODELS_CATALOG.providers.openrouter?.defaultModel || 'anthropic/claude-opus-5',
    modelHistory: DEFAULT_AI_MODELS_CATALOG.providers.openrouter?.suggestedModels?.map((m) => m.id) || [],
  },
  custom: {
    provider: 'custom',
    encryptedApiKey: '',
    apiKeyIv: '',
    customBaseUrl: 'http://localhost:11434/v1',
    activeModel: DEFAULT_AI_MODELS_CATALOG.providers.custom?.defaultModel || 'deepseek-v4-flash',
    modelHistory: DEFAULT_AI_MODELS_CATALOG.providers.custom?.suggestedModels?.map((m) => m.id) || [],
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  gridType: 'dots',
  themeMode: 'gradient',
  defaultFont: 'sans',
  snapToGrid: false,
  showConnections: true,
  showMinimap: true,
  checkForUpdatesOnLaunch: true,
  enableAIServices: false,
  aiProvider: 'gemini',
  customBaseUrl: '',
  customModelName: '',
  aiProviderProfiles: DEFAULT_AI_PROFILES,
};

/**
 * Returns the profile for a given AI provider from settings, seamlessly migrating legacy single-key settings if needed.
 */
export function getProviderProfile(settings: Partial<AppSettings>, provider: AIProvider): AIProviderProfile {
  const profile = settings.aiProviderProfiles?.[provider];
  if (profile) return profile;

  // Fallback / legacy migration for active provider
  if (settings.aiProvider === provider && settings.encryptedApiKey && settings.apiKeyIv) {
    return {
      provider,
      encryptedApiKey: settings.encryptedApiKey,
      apiKeyIv: settings.apiKeyIv,
      customBaseUrl: settings.customBaseUrl || undefined,
      activeModel: settings.customModelName || DEFAULT_AI_PROFILES[provider].activeModel,
      modelHistory: [
        ...(settings.customModelName ? [settings.customModelName] : []),
        ...DEFAULT_AI_PROFILES[provider].modelHistory,
      ],
    };
  }

  return DEFAULT_AI_PROFILES[provider] || {
    provider,
    encryptedApiKey: '',
    apiKeyIv: '',
    activeModel: DEFAULT_AI_MODELS_CATALOG.providers[provider]?.defaultModel || 'gemini-3.7-flash',
    modelHistory: [],
  };
}

/**
 * Updates a specific provider's profile inside settings while keeping all other providers and legacy fields in sync.
 */
export function updateProviderProfile(
  settings: AppSettings,
  updatedProfile: AIProviderProfile
): AppSettings {
  const existingProfiles = settings.aiProviderProfiles || { ...DEFAULT_AI_PROFILES };
  const newProfiles = {
    ...existingProfiles,
    [updatedProfile.provider]: updatedProfile,
  };

  return {
    ...settings,
    aiProvider: updatedProfile.provider,
    encryptedApiKey: updatedProfile.encryptedApiKey,
    apiKeyIv: updatedProfile.apiKeyIv,
    customBaseUrl: updatedProfile.customBaseUrl || '',
    customModelName: updatedProfile.activeModel || '',
    aiProviderProfiles: newProfiles,
  };
}


export function getInitialTransform(notes: Note[] = SAMPLE_NOTES): CanvasTransform {
  const width = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1200;
  const height = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 800;

  if (!notes || notes.length === 0) {
    return { x: Math.round(width / 2 - 300), y: Math.round(height / 2 - 200), zoom: 1 };
  }

  const minX = Math.min(...notes.map((n) => n.x));
  const minY = Math.min(...notes.map((n) => n.y));
  const maxX = Math.max(...notes.map((n) => n.x + (n.width || 380)));
  const maxY = Math.max(...notes.map((n) => n.y + (n.height || 340)));

  const boundingWidth = Math.max(100, maxX - minX);
  const boundingHeight = Math.max(100, maxY - minY);

  const zoomX = (width - 160) / boundingWidth;
  const zoomY = (height - 160) / boundingHeight;
  const targetZoom = Math.min(1.0, Math.max(0.65, Math.min(zoomX, zoomY)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    x: Math.round(width / 2 - centerX * targetZoom),
    y: Math.round(height / 2 - centerY * targetZoom),
    zoom: Number(targetZoom.toFixed(3)),
  };
}


export const SAMPLE_NOTES: Note[] = [
  {
    id: 'note-todo',
    title: 'To Do List',
    content: `- [x] Daily UI Day 65\n- [ ] Buying Groceries\n- [x] Daily Chores\n- [x] Collecting research material\n- [ ] Completing Assignments`,
    x: 80,
    y: 60,
    width: 360,
    height: 340,
    createdAt: new Date('2023-02-09T15:39:00Z').toISOString(),
    updatedAt: new Date('2023-02-09T15:39:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    activeMode: 'checklist',
    isPinned: true,
    zIndex: 10,
    tags: ['todo', 'tasks'],
  },
  {
    id: 'note-flowers',
    title: 'Flowers',
    content: `A cherry blossom, also known as Japanese cherry or sakura, is a flower of many trees of genus Prunus or Prunus subg. Cerasus. They are common species in East Asia, including China, Korea and especially in Japan.`,
    x: 480,
    y: 60,
    width: 380,
    height: 340,
    createdAt: new Date('2023-02-08T17:39:00Z').toISOString(),
    updatedAt: new Date('2023-02-08T17:39:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    activeMode: 'text',
    isPinned: false,
    zIndex: 9,
    tags: ['nature', 'flowers'],
  },
  {
    id: 'note-scribbles',
    title: 'Notes & Thoughts',
    content: 'Quick notes, thoughts, and ideas.',
    x: 80,
    y: 440,
    width: 360,
    height: 340,
    createdAt: new Date('2023-02-09T18:39:00Z').toISOString(),
    updatedAt: new Date('2023-02-09T18:39:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    activeMode: 'text',
    isPinned: false,
    zIndex: 8,
    tags: ['notes', 'ideas'],
  },
  {
    id: 'note-quotes',
    title: 'Happy Quotes',
    content: `What makes me happy might not necessarily bring joy to you.

So, for you to live a happy life, you need to find your own source of inspiration and reason.

Life can be tough at times and it can be extremely hard to maintain a high level of inspiration.

But when the going gets tough, sometimes all it takes to relight the burning fire of motivation within you is to pause and reflect on your values.`,
    x: 480,
    y: 440,
    width: 380,
    height: 340,
    createdAt: new Date('2023-02-09T20:39:00Z').toISOString(),
    updatedAt: new Date('2023-02-09T20:39:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    activeMode: 'text',
    isPinned: false,
    zIndex: 7,
    tags: ['quotes', 'journal'],
  },
];

export const INITIAL_TRANSFORM: CanvasTransform = getInitialTransform(SAMPLE_NOTES);

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (raw === null) {
      saveNotes(SAMPLE_NOTES);
      return SAMPLE_NOTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return SAMPLE_NOTES;
  } catch (e) {
    console.error('Failed to load notes from localStorage', e);
    return SAMPLE_NOTES;
  }
}

export function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to localStorage', e);
  }
}

export function loadTransform(): CanvasTransform {
  try {
    const raw = localStorage.getItem(CANVAS_TRANSFORM_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load canvas transform', e);
  }
  return INITIAL_TRANSFORM;
}

export function saveTransform(transform: CanvasTransform): void {
  try {
    localStorage.setItem(CANVAS_TRANSFORM_KEY, JSON.stringify(transform));
  } catch (e) {
    console.error('Failed to save canvas transform', e);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

/**
 * Saves file content via native OS "Save As" file picker dialog or browser download.
 * Triggers OS notification with the saved file path/name upon completion.
 */
export async function saveFileWithNotification(
  filename: string,
  content: string,
  subfolder: string = 'Notes',
  contentType: string = 'application/json'
): Promise<string> {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  // Try Native Web File System Access API (Native OS Save As Dialog)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const ext = filename.split('.').pop() || (contentType.includes('json') ? 'json' : 'md');
      const cleanMime = contentType.split(';')[0].trim() || 'application/json';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: cleanMime === 'application/json' ? 'JSON Backup File' : 'Markdown Note File',
            accept: { [cleanMime]: [`.${ext}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();

      const savedName = handle.name || filename;
      sendNativeAppNotification('Export Successful', `Saved file: ${savedName}`);
      return savedName;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled the native save dialog picker
        return '';
      }
      console.warn('Native Save Picker unavailable, falling back to download handler', err);
    }
  }

  // Tauri Rust Native Direct Save Fallback
  if (isTauri) {
    try {
      const savedPath = await invoke<string>('save_export_file', { filename, content, subfolder });
      sendNativeAppNotification('Export Successful', `Saved file to: ${savedPath}`);
      return savedPath;
    } catch (err) {
      console.warn('Tauri save_export_file failed, falling back to browser download', err);
    }
  }

  // Web Browser Standard Blob Download Fallback
  triggerBrowserDownload(filename, content, contentType);
  sendNativeAppNotification('Export Successful', `Exported file: ${filename}`);
  return filename;
}

function triggerBrowserDownload(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportBackup(notes: Note[], transform: CanvasTransform, settings: AppSettings): Promise<string> {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const summary = await invoke<{ filePath: string; fileName: string }>('export_vault_archive');
      sendNativeAppNotification('Backup Created', `Full vault snapshot saved: ${summary.fileName}`);
      return summary.filePath;
    } catch (err) {
      console.warn('Native archive export fallback to JSON:', err);
    }
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `DiaryNote-Backup-${dateStr}.json`;

  // Strip sensitive credentials and security digests from backup files
  const sanitizedSettings: AppSettings = {
    ...settings,
    encryptedApiKey: '',
    apiKeyIv: '',
    masterPasswordHash: '',
    masterSecurityAnswerHash: '',
  };

  // Guard locked notes; redact unauthorized locked content from raw JSON export
  const authResult = authorizeNotes(notes, 'export');
  if (!authResult.allowed) {
    sendNativeAppNotification(
      'Backup Export Notice',
      `${authResult.lockedNoteIds.length} locked note(s) were redacted in this backup. Unlock notes to export full plaintext.`
    );
  }


  const exportNotes = authResult.redactedNotes;

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: exportNotes,
    transform,
    settings: sanitizedSettings,
  };
  const jsonString = JSON.stringify(data, null, 2);
  return saveFileWithNotification(filename, jsonString, 'Backups', 'application/json');
}

export async function exportNotesBackup(notesToExport: Note[], customFilename?: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const authResult = authorizeNotes(notesToExport, 'export');
  if (!authResult.allowed) {
    sendNativeAppNotification(
      'Export Restricted',
      `${authResult.lockedNoteIds.length} locked note(s) excluded from export. Unlock notes to export.`
    );
  }

  const exportNotes = authResult.authorizedNotes;
  if (exportNotes.length === 0) {
    return '';
  }

  const count = exportNotes.length;
  const filename = customFilename || (count === 1
    ? `${(exportNotes[0]?.title || 'Note').replace(/[^a-z0-9]/gi, '_')}_${dateStr}.json`
    : `DiaryNote-Selection-${count}-notes_${dateStr}.json`);

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: exportNotes,
  };
  const jsonString = JSON.stringify(data, null, 2);
  return saveFileWithNotification(filename, jsonString, 'Notes', 'application/json');
}

export function importBackup(file: File): Promise<{ notes: Note[]; transform?: CanvasTransform; settings?: AppSettings }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = validateAndParseBackupContent(content);
        resolve({
          notes: parsed.notes,
          transform: parsed.transform,
          settings: parsed.settings,
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read backup file'));
    reader.readAsText(file);
  });
}
