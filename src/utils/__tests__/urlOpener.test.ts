import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeExternalUrl, openExternalUrl } from '../urlOpener';

describe('urlOpener utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes URLs correctly', () => {
    expect(normalizeExternalUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeExternalUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeExternalUrl('github.com/itshimelz')).toBe('https://github.com/itshimelz');
    expect(normalizeExternalUrl('www.google.com')).toBe('https://www.google.com');
    expect(normalizeExternalUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('rejects internal note anchors and invalid protocols', () => {
    expect(normalizeExternalUrl('#note-12345')).toBeNull();
    expect(normalizeExternalUrl('#heading')).toBeNull();
    expect(normalizeExternalUrl('')).toBeNull();
    expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeExternalUrl('ftp://example.com')).toBeNull();
  });

  it('falls back to window.open in browser test environment', async () => {
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null);
    await openExternalUrl('https://github.com');
    expect(spy).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener,noreferrer');
  });
});
