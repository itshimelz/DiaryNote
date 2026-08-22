/**
 * High-performance global date and time formatting utilities.
 * 
 * Re-uses cached Intl.DateTimeFormat instances to eliminate the massive
 * CPU overhead of repeatedly initializing locale formatters on every render.
 */

// Cached Intl.DateTimeFormat instances (created once at module evaluation)
const defaultDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const journalDateDisplayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const aiUsageDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const monthYearHeaderFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

const slashDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const slashTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const groupTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined);

/**
 * Fast standard date formatter used across SearchModal, NotesSidebar, Note Cards, etc.
 * Example output: "Aug 22, 2026, 01:50 PM"
 */
export function formatDate(isoString: string | number | Date | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = isoString instanceof Date ? isoString : new Date(isoString);
    if (Number.isNaN(d.getTime())) {
      return typeof isoString === 'string' ? isoString : '';
    }
    return defaultDateFormatter.format(d);
  } catch {
    return typeof isoString === 'string' ? isoString : '';
  }
}

/**
 * Formats journal date string (YYYY-MM-DD) into friendly display string.
 * Example output: "Tue, Aug 11, 2026"
 */
export function formatJournalDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (Number.isNaN(d.getTime())) return dateStr;
    return journalDateDisplayFormatter.format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formats date for AI usage activity history.
 * Example output: "22 Aug 2026"
 */
export function formatAIUsageDate(date: Date): string {
  try {
    return aiUsageDateFormatter.format(date);
  } catch {
    return date.toDateString();
  }
}

/**
 * Formats month and year header for calendar modals.
 * Example output: "August 2026"
 */
export function formatMonthYearHeader(date: Date): string {
  try {
    return monthYearHeaderFormatter.format(date);
  } catch {
    return date.toDateString();
  }
}

/**
 * Formats current date and time for note slash command insertion.
 */
export function formatSlashCommandTimestamp(date: Date = new Date()): { dateStr: string; timeStr: string } {
  try {
    return {
      dateStr: slashDateFormatter.format(date),
      timeStr: slashTimeFormatter.format(date),
    };
  } catch {
    return {
      dateStr: date.toLocaleDateString(),
      timeStr: date.toLocaleTimeString(),
    };
  }
}

/**
 * Formats time for auto-generated group names.
 * Example output: "1:50 PM" or "13:50"
 */
export function formatGroupTime(date: Date = new Date()): string {
  try {
    return groupTimeFormatter.format(date);
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}

/**
 * Formats short locale date for AI merge note titles.
 */
export function formatShortDate(date: Date = new Date()): string {
  try {
    return shortDateFormatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}
