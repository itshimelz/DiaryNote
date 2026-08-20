export type HandFont = 
  | 'caveat' 
  | 'kalam' 
  | 'patrick' 
  | 'architect' 
  | 'sans' 
  | 'mono' 
  | 'hind' 
  | 'anek' 
  | 'noto-bengali';

export type PaperTheme = 
  | 'white' 
  | 'cream' 
  | 'ruled' 
  | 'dotted' 
  | 'ruled-dark' 
  | 'dark' 
  | 'graphite' 
  | 'transparent' 
  | 'kraft';

export type GridType = 'dots' | 'grid' | 'ruled' | 'blank';

export type CanvasTheme = 'dark' | 'light' | 'gradient' | 'cork';

export type FrameStyle = 'polaroid' | 'photo' | 'frameless';

export type PinStyle = 
  | 'none'
  | 'pushpin-red'
  | 'pushpin-blue'
  | 'pushpin-yellow'
  | 'pushpin-green'
  | 'tape-01-hearts-coral'
  | 'tape-02-diagonal-wave-pink'
  | 'tape-03-gingham-peach'
  | 'tape-04-butterflies-lavender'
  | 'tape-05-waves-dots-mint'
  | 'tape-06-stars-taupe'
  | 'tape-07-vertical-waves-blue'
  | 'tape-08-swirl-pink'
  | 'tape-09-confetti-lightblue'
  | 'tape-10-grid-stars-lavender'
  | 'tape-11-leaves-pink'
  | 'tape-12-swirl-teal'
  | 'tape-13-floral-yellow'
  | 'tape-14-sparkle-mauve'
  | 'tape-15-glossy-tan'
  | 'tape-teal'
  | 'tape-pink'
  | 'tape-beige'
  | 'tape-yellow'
  | (string & {});

export type JournalMood = 'happy' | 'calm' | 'focused' | 'reflective' | 'low';

export type AIProvider = 'gemini' | 'openai' | 'openrouter' | 'custom';

export interface AIProviderProfile {
  provider: AIProvider;
  encryptedApiKey: string;
  apiKeyIv: string;
  customBaseUrl?: string;
  activeModel: string;
  modelHistory: string[];
}

export type {
  AIModelSuggestion,
  AIProviderCatalog,
  AIModelsCatalog,
} from '../constants/aiModelsCatalog';

export type CoverStyle =
  | 'classic-kraft'
  | 'leather-journal'
  | 'obsidian-minimal'
  | 'botanical-linen'
  | 'sakura-blush'
  | 'vintage-parchment'
  | 'ocean-navy'
  | 'celestial-gold'
  | 'matcha-vellum'
  | 'clean-monochrome'
  | (string & {});

export type SealStyle =
  | 'wax-seal-crest'
  | 'golden-sun'
  | 'botanical-branch'
  | 'vintage-stamp'
  | 'origami-crane'
  | 'mystic-eye'
  | 'minimal-knot'
  | 'feather-quill'
  | 'monogram-star'
  | 'compass-rose'
  | (string & {});

export interface Note {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  createdTimestamp?: number;
  updatedTimestamp?: number;
  fontFamily: HandFont;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  paperTheme: PaperTheme;
  isPinned?: boolean;
  zIndex: number;
  tags?: string[];
  activeMode?: 'text' | 'checklist';
  embedding?: number[];
  isLocked?: boolean;
  groupId?: string;
  groupName?: string;
  entryDate?: string;
  isDailyEntry?: boolean;
  mood?: JournalMood;
  imageUrl?: string;
  imageType?: string;
  imageAspectRatio?: number;
  frameStyle?: FrameStyle;
  pinStyle?: PinStyle;
  rotation?: number;
  isCovered?: boolean;
  coverStyle?: CoverStyle;
  sealStyle?: SealStyle;
  coverPrompt?: string;
}

export interface CanvasTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface MentionReference {
  targetNoteId: string;
  targetTitle: string;
}

// Re-export auto-generated Rust backend types
export type {
  AiConnectionTestResult,
  AiProvider as GeneratedAiProvider,
  AiRequestConfig,
  AiStreamChunkPayload,
  AiSynthesisResult,
  AppSettings,
  AssetInfo,
  BacklinkItem,
  BackupManifest,
  CanvasTransform as GeneratedCanvasTransform,
  ConflictResolutionMode,
  DatabaseStats,
  DroppedImageData,
  LoadedAppState,
  MarkdownLink,
  MentionLink,
  Note as GeneratedNote,
  NoteConnection,
  NoteLayoutInput,
  NoteLayoutOutput,
  NotePosition,
  ParsedLinks,
  RelocatedNoteResult,
  SearchFilter,
  SearchItemMatch,
  SearchResultItem,
  SpatialDirection,
  VaultArchiveInspection,
  VaultExportSummary,
  VaultImportSummary,
  VaultStatus,
} from './generated';

