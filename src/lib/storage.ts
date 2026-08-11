import { Note, CanvasTransform, GridType, CanvasTheme } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { sendNativeAppNotification } from '../utils';

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
}

export const DEFAULT_SETTINGS: AppSettings = {
  gridType: 'dots',
  themeMode: 'gradient',
  defaultFont: 'sans',
  snapToGrid: false,
  showConnections: true,
  showMinimap: true,
};

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


const nowISO = new Date().toISOString();
const yesterdayISO = new Date(Date.now() - 86400000 * 2).toISOString();

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
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=400&q=80',
    x: 480,
    y: 60,
    width: 380,
    height: 340,
    createdAt: new Date('2023-02-08T17:39:00Z').toISOString(),
    updatedAt: new Date('2023-02-08T17:39:00Z').toISOString(),
    fontFamily: 'sans',
    fontSize: 'sm',
    paperTheme: 'white',
    activeMode: 'image',
    isPinned: false,
    zIndex: 9,
    tags: ['nature', 'flowers'],
  },
  {
    id: 'note-scribbles',
    title: 'Scribbles',
    content: 'Freehand flower doodle and sunny sketch.',
    drawingData: '',
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
    tags: ['drawing', 'art'],
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
    fontSize: 'sm',
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
 * Saves file content either via native Tauri Rust command to ~/DiaryNote/<subfolder>/
 * or via browser download fallback. Triggers OS notification with saved path.
 */
export async function saveFileWithNotification(
  filename: string,
  content: string,
  subfolder: string = 'Notes',
  contentType: string = 'application/json'
): Promise<string> {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  let savedPath = `~/DiaryNote/${subfolder}/${filename}`;

  if (isTauri) {
    try {
      savedPath = await invoke<string>('save_export_file', { filename, content, subfolder });
    } catch (err) {
      console.warn('Tauri save_export_file failed, falling back to browser download', err);
      triggerBrowserDownload(filename, content, contentType);
    }
  } else {
    triggerBrowserDownload(filename, content, contentType);
  }

  sendNativeAppNotification('Export Successful', `Saved file to: ${savedPath}`);
  return savedPath;
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
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `DiaryNote-Backup-${dateStr}.json`;
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes,
    transform,
    settings,
  };
  const jsonString = JSON.stringify(data, null, 2);
  return saveFileWithNotification(filename, jsonString, 'Backups', 'application/json');
}

export async function exportNotesBackup(notesToExport: Note[], customFilename?: string): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const count = notesToExport.length;
  const filename = customFilename || (count === 1
    ? `${(notesToExport[0]?.title || 'Note').replace(/[^a-z0-9]/gi, '_')}_${dateStr}.json`
    : `DiaryNote-Selection-${count}-notes_${dateStr}.json`);

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notesToExport,
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
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.notes)) {
          resolve({
            notes: parsed.notes,
            transform: parsed.transform,
            settings: parsed.settings,
          });
        } else if (Array.isArray(parsed)) {
          resolve({ notes: parsed });
        } else {
          reject(new Error('Invalid JSON backup file structure'));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read backup file'));
    reader.readAsText(file);
  });
}
