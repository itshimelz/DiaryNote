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

export type PaperTheme = 'white' | 'cream' | 'ruled' | 'ruled-dark' | 'dark' | 'graphite' | 'transparent' | 'kraft';

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
  createdAt: string; // ISO String, immutable creation date
  updatedAt: string; // ISO String, modified date
  fontFamily: HandFont;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  paperTheme: PaperTheme;
  isPinned?: boolean;
  zIndex: number;
  tags?: string[];
  imageUrl?: string;
  drawingData?: string;
  activeMode?: 'text' | 'draw' | 'image' | 'checklist';
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
