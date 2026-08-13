import { describe, it, expect } from 'vitest';
import { calculateJournalStreak, getLocalDateString } from '../journalUtils';
import { Note } from '../../types';

describe('journalUtils streak and daily entry calculations', () => {
  it('calculates 3-day consecutive streak correctly with explicit isDailyEntry and entryDate', () => {
    const today = new Date();
    const todayStr = getLocalDateString(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeStr = getLocalDateString(dayBefore);

    const notes: Note[] = [
      {
        id: 'journal-1',
        title: 'Today Entry',
        content: '',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        fontFamily: 'sans',
        fontSize: 'sm',
        paperTheme: 'cream',
        zIndex: 1,
        isDailyEntry: true,
        entryDate: todayStr,
      },
      {
        id: 'journal-2',
        title: 'Yesterday Entry',
        content: '',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        createdAt: yesterday.toISOString(),
        updatedAt: yesterday.toISOString(),
        fontFamily: 'sans',
        fontSize: 'sm',
        paperTheme: 'cream',
        zIndex: 1,
        isDailyEntry: true,
        entryDate: yesterdayStr,
      },
      {
        id: 'journal-3',
        title: 'Day Before Entry',
        content: '',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        createdAt: dayBefore.toISOString(),
        updatedAt: dayBefore.toISOString(),
        fontFamily: 'sans',
        fontSize: 'sm',
        paperTheme: 'cream',
        zIndex: 1,
        isDailyEntry: true,
        entryDate: dayBeforeStr,
      },
    ];

    const result = calculateJournalStreak(notes);
    expect(result.currentStreak).toBe(3);
    expect(result.totalEntries).toBe(3);
    expect(result.datesWithEntries.has(todayStr)).toBe(true);
  });

  it('does NOT count standard notes with date-like titles as journal entries', () => {
    const todayStr = getLocalDateString();
    const standardNotes: Note[] = [
      {
        id: 'standard-note-1',
        title: `${todayStr} Project Planning`,
        content: 'Not a journal entry',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fontFamily: 'sans',
        fontSize: 'sm',
        paperTheme: 'white',
        zIndex: 1,
        isDailyEntry: false, // Explicitly not a daily entry
      },
    ];

    const result = calculateJournalStreak(standardNotes);
    expect(result.currentStreak).toBe(0);
    expect(result.totalEntries).toBe(0);
  });
});
