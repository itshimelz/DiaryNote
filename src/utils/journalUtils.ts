import { Note, JournalMood } from '../types';

/**
 * Returns formatted ISO date YYYY-MM-DD for local timezone
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date into human friendly string (e.g., "Tuesday, Aug 11, 2026")
 */
export function formatJournalDateDisplay(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calculate current consecutive day journaling streak
 */
export function calculateJournalStreak(notes: Note[]): { currentStreak: number; totalEntries: number; datesWithEntries: Set<string> } {
  const datesWithEntries = new Set<string>();

  notes.forEach((note) => {
    if (note.entryDate) {
      datesWithEntries.add(note.entryDate);
    } else if (note.isDailyEntry || (note.tags && note.tags.includes('journal'))) {
      const createdDate = getLocalDateString(new Date(note.createdAt));
      datesWithEntries.add(createdDate);
    } else {
      // Check title for YYYY-MM-DD pattern
      const dateMatch = note.title.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        datesWithEntries.add(dateMatch[0]);
      }
    }
  });

  let currentStreak = 0;
  const todayStr = getLocalDateString();
  const today = new Date();

  // Check today first, if not filled yet check yesterday to maintain streak
  let checkDate = new Date(today);
  if (!datesWithEntries.has(todayStr)) {
    // If today hasn't been written yet, start checking from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = getLocalDateString(checkDate);
    if (datesWithEntries.has(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreak,
    totalEntries: datesWithEntries.size,
    datesWithEntries,
  };
}

export const MOOD_CONFIG: Record<JournalMood, { label: string; iconName: string; colorClass: string }> = {
  happy: { label: 'Happy', iconName: 'Smile', colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  calm: { label: 'Calm', iconName: 'Sun', colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  focused: { label: 'Focused', iconName: 'Zap', colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' },
  reflective: { label: 'Reflective', iconName: 'Coffee', colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  low: { label: 'Low Energy', iconName: 'CloudRain', colorClass: 'text-sky-500 bg-sky-500/10 border-sky-500/30' },
};
