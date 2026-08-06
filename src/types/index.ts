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

export type CanvasTheme = 'dark' | 'light' | 'gradient';

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
  fontFamily: HandFont;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  paperTheme: PaperTheme;
  isPinned?: boolean;
  zIndex: number;
  tags?: string[];
  imageUrl?: string;
  drawingData?: string;
  activeMode?: 'text' | 'image' | 'checklist';
  embedding?: number[];
  isLocked?: boolean;
  groupId?: string;
  groupName?: string;
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
