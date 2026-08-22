import { CanvasTransform, FrameStyle, PinStyle } from '../types';
import { AppSettings } from '../lib/storage';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';
import { WASHI_TAPES, PUSHPIN_OPTIONS } from '../constants/washiTapes';
import { getUniqueTitleForDay, getLocalDateString } from '../utils';
import { getNotesArray, useNotesStore } from './notesStore';

/**
 * Note-creation actions. Position/title math stays here; the store owns
 * z-ordering, dirty tracking, autosave and history commits.
 */

export function addTextNote(
  transform: CanvasTransform,
  settings: AppSettings,
  customX?: number,
  customY?: number,
  initialTitle?: string,
  initialContent?: string
): string {
  const newId = `note-${crypto.randomUUID()}`;

  let viewportX =
    typeof customX === 'number' && !isNaN(customX)
      ? customX
      : Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - 180);
  let viewportY =
    typeof customY === 'number' && !isNaN(customY)
      ? customY
      : Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - 150);

  if (settings.snapToGrid) {
    viewportX = Math.round(viewportX / 24) * 24;
    viewportY = Math.round(viewportY / 24) * 24;
  }

  const noteTitle = initialTitle || getUniqueTitleForDay('Untitled Note', newId, getNotesArray());

  return useNotesStore.getState().insert({
    id: newId,
    title: noteTitle,
    content: initialContent || '',
    x: viewportX,
    y: viewportY,
    width: DEFAULT_NOTE_WIDTH,
    height: DEFAULT_NOTE_HEIGHT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fontFamily: settings.defaultFont || 'sans',
    fontSize: 'md',
    paperTheme: 'white',
    activeMode: 'text',
    isPinned: false,
    zIndex: 1,
    tags: [],
  });
}

export function addImageNote(
  transform: CanvasTransform,
  settings: AppSettings,
  imageUrl: string,
  imageType?: string,
  customX?: number,
  customY?: number,
  initialTitle?: string,
  initialCaption?: string,
  frameStyle?: FrameStyle,
  pinStyle?: PinStyle,
  aspectRatio?: number
): string {
  const newId = `image-note-${crypto.randomUUID()}`;
  const cardWidth = 340;
  const cardHeight = 360;

  let viewportX =
    typeof customX === 'number' && !isNaN(customX)
      ? customX
      : Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - cardWidth / 2);
  let viewportY =
    typeof customY === 'number' && !isNaN(customY)
      ? customY
      : Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - cardHeight / 2);

  if (settings.snapToGrid) {
    viewportX = Math.round(viewportX / 24) * 24;
    viewportY = Math.round(viewportY / 24) * 24;
  }

  const noteTitle = initialTitle || getUniqueTitleForDay('Photo Note', newId, getNotesArray());

  const pinOptions: string[] = [
    ...PUSHPIN_OPTIONS.map((p) => p.id),
    ...WASHI_TAPES.map((t) => t.id),
  ];
  const chosenPin = pinStyle || pinOptions[Math.floor(Math.random() * pinOptions.length)];
  const randomTilt = parseFloat((Math.random() * 5 - 2.5).toFixed(1));

  return useNotesStore.getState().insert({
    id: newId,
    title: noteTitle,
    content: initialCaption || '',
    imageUrl,
    imageType: imageType || 'image/png',
    imageAspectRatio: aspectRatio || 1,
    frameStyle: frameStyle || 'polaroid',
    pinStyle: chosenPin as PinStyle,
    rotation: randomTilt,
    x: viewportX,
    y: viewportY,
    width: cardWidth,
    height: cardHeight,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fontFamily: 'caveat',
    fontSize: 'md',
    paperTheme: 'white',
    activeMode: 'text',
    isPinned: false,
    zIndex: 1,
    tags: ['photo'],
  });
}

export function createOrFocusDailyEntry(
  transform: CanvasTransform,
  settings: AppSettings,
  targetDateStr?: string
): { noteId: string; isNew: boolean } {
  const dateStr = targetDateStr || getLocalDateString();
  const todayStr = getLocalDateString();
  const formattedTitle = `${dateStr}`;

  const existingNote = getNotesArray().find(
    (n) => n.entryDate === dateStr || n.title === formattedTitle || n.title === dateStr
  );
  if (existingNote) {
    return { noteId: existingNote.id, isNew: false };
  }
  if (dateStr > todayStr) {
    return { noteId: '', isNew: false };
  }

  const newId = `journal-${dateStr}-${crypto.randomUUID()}`;
  let viewportX = Math.round((window.innerWidth / 2 - transform.x) / transform.zoom - 190);
  let viewportY = Math.round((window.innerHeight / 2 - transform.y) / transform.zoom - 170);

  if (settings.snapToGrid) {
    viewportX = Math.round(viewportX / 24) * 24;
    viewportY = Math.round(viewportY / 24) * 24;
  }

  useNotesStore.getState().insert({
    id: newId,
    title: formattedTitle,
    content: '',
    x: viewportX,
    y: viewportY,
    width: DEFAULT_NOTE_WIDTH,
    height: DEFAULT_NOTE_HEIGHT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fontFamily: settings.defaultFont || 'sans',
    fontSize: 'md',
    paperTheme: 'cream',
    activeMode: 'text',
    isPinned: false,
    zIndex: 1,
    tags: ['journal', 'daily'],
    isDailyEntry: true,
    entryDate: dateStr,
  });

  return { noteId: newId, isNew: true };
}
