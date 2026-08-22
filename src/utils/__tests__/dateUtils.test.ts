import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatJournalDate,
  formatAIUsageDate,
  formatMonthYearHeader,
  formatSlashCommandTimestamp,
  formatGroupTime,
  formatShortDate,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('returns empty string for nullish or empty input', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('formats ISO date string properly', () => {
      const formatted = formatDate('2026-08-22T10:30:00Z');
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Aug');
    });

    it('formats Date instance properly', () => {
      const d = new Date(2026, 7, 22, 14, 30);
      const formatted = formatDate(d);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2026');
    });

    it('returns original string if date is invalid', () => {
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('formatJournalDate', () => {
    it('formats YYYY-MM-DD journal date string', () => {
      const formatted = formatJournalDate('2026-08-22');
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Aug');
    });

    it('handles empty or malformed strings gracefully', () => {
      expect(formatJournalDate('')).toBe('');
      expect(formatJournalDate('invalid')).toBe('invalid');
    });
  });

  describe('formatAIUsageDate', () => {
    it('formats Date for AI usage chart', () => {
      const d = new Date(2026, 7, 22);
      const formatted = formatAIUsageDate(d);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Aug');
    });
  });

  describe('formatMonthYearHeader', () => {
    it('formats month and year', () => {
      const d = new Date(2026, 7, 1);
      const formatted = formatMonthYearHeader(d);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('August');
      expect(formatted).toContain('2026');
    });
  });

  describe('formatSlashCommandTimestamp', () => {
    it('returns formatted dateStr and timeStr', () => {
      const d = new Date(2026, 7, 22, 14, 30);
      const { dateStr, timeStr } = formatSlashCommandTimestamp(d);
      expect(dateStr).toBeTruthy();
      expect(timeStr).toBeTruthy();
      expect(dateStr).toContain('Aug');
      expect(dateStr).toContain('2026');
    });
  });

  describe('formatGroupTime', () => {
    it('returns formatted time string for groups', () => {
      const d = new Date(2026, 7, 22, 14, 30);
      const formatted = formatGroupTime(d);
      expect(formatted).toBeTruthy();
      expect(formatted).toMatch(/\d/);
    });
  });

  describe('formatShortDate', () => {
    it('formats short date for merged note title', () => {
      const d = new Date(2026, 7, 22);
      const formatted = formatShortDate(d);
      expect(formatted).toBeTruthy();
    });
  });
});
