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

export type FrameStyle = 'polaroid' | 'photo' | 'frameless' | 'standard';

export type PinStyle = 
  | 'none'
  | 'pushpin-red'
  | 'pushpin-blue'
  | 'pushpin-yellow'
  | 'pushpin-green'
  | 'tape-teal'
  | 'tape-pink'
  | 'tape-beige'
  | 'tape-yellow';

export type JournalMood = 'happy' | 'calm' | 'focused' | 'reflective' | 'low';

export type AIProvider = 'gemini' | 'openai' | 'openrouter' | 'custom';


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

export interface Connection {
  fromId: string;
  toId: string;
  toTitle: string;
}
