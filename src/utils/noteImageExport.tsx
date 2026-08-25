/**
 * Exports a note as a PNG image: note content rendered in its paper theme
 * (no title), with a footer date. Snapshots real DOM via modern-screenshot so
 * markdown, checklists, fonts, and paper textures match the canvas exactly.
 */
import React, { createRoot } from 'react-dom/client';
import { domToPng } from 'modern-screenshot';
import { Note } from '../types';
import { FONT_CLASSES } from '../constants/fonts';
import { PAPER_THEMES } from '../constants/paperThemes';
import { NoteMarkdownView } from '../components/NoteCard/NoteMarkdownView';
import { formatDate, formatJournalDate } from './dateUtils';

const EXPORT_WIDTH = 720;
const EXPORT_SCALE = 2;

function getFontSizeClass(note: Note): string {
  switch (note.fontSize) {
    case 'sm':
      return 'text-base sm:text-lg';
    case 'lg':
      return 'text-xl sm:text-2xl';
    case 'xl':
      return 'text-2xl sm:text-3xl';
    default:
      return 'text-lg sm:text-xl';
  }
}

// Mirrors NoteCard's ruled-line-height mapping exactly for canvas parity
function getRuledLineHeight(fontSizeClass: string): string {
  if (fontSizeClass.includes('text-xs')) return '22px';
  if (fontSizeClass.includes('text-sm')) return '24px';
  if (fontSizeClass.includes('text-lg')) return '32px';
  if (fontSizeClass.includes('text-xl')) return '36px';
  return '28px';
}

function getFooterDate(note: Note): string {
  if (note.entryDate) return formatJournalDate(note.entryDate);
  return formatDate(note.createdAt);
}

const ExportCard: React.FC<{ note: Note; allNotes: Note[] }> = ({ note, allNotes }) => {
  const themeConfig = PAPER_THEMES[note.paperTheme || 'white'];
  const fontClass = FONT_CLASSES[note.fontFamily || 'sans'];
  const fontSizeClass = getFontSizeClass(note);
  const isRuled = note.paperTheme === 'ruled' || note.paperTheme === 'ruled-dark';

  return (
    <div
      className={`${themeConfig.bg} ${themeConfig.text} ${fontClass} ${fontSizeClass} rounded-sm`}
      style={{
        width: `${EXPORT_WIDTH}px`,
        padding: '40px 44px',
        ...(isRuled ? { '--ruled-line-height': getRuledLineHeight(fontSizeClass) } : {}),
      }}
    >
      <NoteMarkdownView
        note={note}
        allNotes={allNotes}
        fontClass={fontClass}
        fontSizeClass={fontSizeClass}
        onNavigateToNote={() => {}}
      />
      <div
        className={`mt-6 pt-4 border-t ${themeConfig.divider} text-right text-sm ${themeConfig.subtext}`}
      >
        {getFooterDate(note)}
      </div>
    </div>
  );
};

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export function buildExportImageFileName(note: Note): string {
  const cleanTitle = (note.title || 'Untitled_Note').trim().replace(/[^a-z0-9_-]/gi, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${cleanTitle}_${dateStr}.png`;
}

/** Downloads a PNG data URL via browser anchor (non-Tauri fallback). */
export function downloadDataUrl(fileName: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Renders an off-screen export card for the note and rasterizes it to a PNG data URL.
 */
export async function exportNoteAsImage(note: Note, allNotes: Note[]): Promise<string> {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${EXPORT_WIDTH}px;pointer-events:none;`;
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(<ExportCard note={note} allNotes={allNotes} />);
    await document.fonts.ready;
    await nextFrame();

    const cardEl = host.firstElementChild as HTMLElement;
    const dataUrl = await domToPng(cardEl, { scale: EXPORT_SCALE });
    return dataUrl;
  } finally {
    root.unmount();
    host.remove();
  }
}
