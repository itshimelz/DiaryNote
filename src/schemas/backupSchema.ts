import { z } from 'zod';
import { Note, CanvasTransform, HandFont, PaperTheme, GridType, CanvasTheme, JournalMood, AIProvider } from '../types';
import { AppSettings } from '../lib/storage';

export const MAX_BACKUP_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const HandFontSchema: z.ZodType<HandFont> = z.enum([
  'caveat',
  'kalam',
  'patrick',
  'architect',
  'sans',
  'mono',
  'hind',
  'anek',
  'noto-bengali',
]);

export const PaperThemeSchema: z.ZodType<PaperTheme> = z.enum([
  'white',
  'cream',
  'ruled',
  'dotted',
  'ruled-dark',
  'dark',
  'graphite',
  'transparent',
  'kraft',
]);

export const GridTypeSchema: z.ZodType<GridType> = z.enum(['dots', 'grid', 'ruled', 'blank']);
export const CanvasThemeSchema: z.ZodType<CanvasTheme> = z.enum(['dark', 'light', 'gradient']);
export const JournalMoodSchema: z.ZodType<JournalMood | undefined> = z.enum(['happy', 'calm', 'focused', 'reflective', 'low']).optional();
export const AIProviderSchema: z.ZodType<AIProvider> = z.enum(['gemini', 'openai', 'openrouter', 'custom']);

export const NoteSchema = z.object({
  id: z.string().min(1).default(() => `note-${crypto.randomUUID()}`),
  title: z.string().default('Untitled Note'),
  content: z.string().default(''),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive().default(340),
  height: z.number().positive().default(300),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  createdTimestamp: z.number().optional(),
  updatedTimestamp: z.number().optional(),
  fontFamily: HandFontSchema.default('sans'),
  fontSize: z.enum(['sm', 'md', 'lg', 'xl']).default('sm'),
  paperTheme: PaperThemeSchema.default('white'),
  isPinned: z.boolean().optional().default(false),
  zIndex: z.number().default(1),
  tags: z.array(z.string()).optional().default([]),
  activeMode: z.enum(['text', 'checklist']).optional().default('text'),
  embedding: z.array(z.number()).optional(),
  isLocked: z.boolean().optional().default(false),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  entryDate: z.string().optional(),
  isDailyEntry: z.boolean().optional(),
  mood: JournalMoodSchema,
}).transform((rawNote): Note => {
  const cTime = rawNote.createdTimestamp || (rawNote.createdAt ? new Date(rawNote.createdAt).getTime() : Date.now());
  const uTime = rawNote.updatedTimestamp || (rawNote.updatedAt ? new Date(rawNote.updatedAt).getTime() : cTime);

  return {
    ...rawNote,
    id: rawNote.id,
    createdTimestamp: isNaN(cTime) ? Date.now() : cTime,
    updatedTimestamp: isNaN(uTime) ? Date.now() : uTime,
  };
});

export const CanvasTransformSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  zoom: z.number().positive().default(1),
});

export const AppSettingsSchema = z.object({
  gridType: GridTypeSchema.default('dots'),
  themeMode: CanvasThemeSchema.default('gradient'),
  defaultFont: z.enum(['caveat', 'kalam', 'patrick', 'architect', 'sans']).default('sans'),
  snapToGrid: z.boolean().default(false),
  showConnections: z.boolean().default(true),
  showMinimap: z.boolean().default(true),
  checkForUpdatesOnLaunch: z.boolean().default(true),
  enableAIServices: z.boolean().optional().default(false),
  aiProvider: AIProviderSchema.optional().default('gemini'),
  customBaseUrl: z.string().optional().default(''),
  customModelName: z.string().optional().default(''),
  // Explicitly ignore/strip sensitive keys on import
  masterPasswordHash: z.string().optional(),
  masterSecurityQuestion: z.string().optional(),
  masterSecurityAnswerHash: z.string().optional(),
  encryptedApiKey: z.string().optional(),
  apiKeyIv: z.string().optional(),
}).transform((settings): AppSettings => ({
  ...settings,
  gridType: settings.gridType,
  themeMode: settings.themeMode,
  defaultFont: settings.defaultFont,
  snapToGrid: settings.snapToGrid,
  showConnections: settings.showConnections,
  showMinimap: settings.showMinimap,
  masterPasswordHash: '',
  masterSecurityAnswerHash: '',
  encryptedApiKey: '',
  apiKeyIv: '',
}));

export const BackupV1Schema = z.object({
  version: z.literal(1).optional().default(1),
  exportedAt: z.string().optional(),
  notes: z.array(NoteSchema).default([]),
  transform: CanvasTransformSchema.optional(),
  settings: AppSettingsSchema.optional(),
});

export const BackupV2Schema = z.object({
  version: z.literal(2),
  exportedAt: z.string().optional(),
  notes: z.array(NoteSchema).default([]),
  transform: CanvasTransformSchema.optional(),
  settings: AppSettingsSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AnyBackupSchema = z.union([BackupV2Schema, BackupV1Schema]);

export interface ParsedBackupResult {
  version: number;
  exportedAt?: string;
  notes: Note[];
  transform?: CanvasTransform;
  settings?: AppSettings;
}

/**
 * Validates and parses raw backup JSON string.
 */
export function validateAndParseBackupContent(jsonString: string): ParsedBackupResult {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('Empty or invalid backup payload.');
  }

  // 50MB protection
  if (jsonString.length > MAX_BACKUP_FILE_SIZE_BYTES) {
    throw new Error(`Backup file exceeds maximum allowed size of 50MB.`);
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonString);
  } catch (err: any) {
    throw new Error(`Malformed JSON syntax: ${err?.message || 'Unable to parse'}`);
  }

  // Handle bare array of notes or full backup envelope
  if (Array.isArray(rawJson)) {
    const parsedNotes = z.array(NoteSchema).parse(rawJson);
    return {
      version: 1,
      notes: parsedNotes,
    };
  }

  const parsed = AnyBackupSchema.safeParse(rawJson);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid backup schema format (${errorDetails})`);
  }

  return {
    version: parsed.data.version || 1,
    exportedAt: parsed.data.exportedAt,
    notes: parsed.data.notes,
    transform: parsed.data.transform,
    settings: parsed.data.settings,
  };
}
