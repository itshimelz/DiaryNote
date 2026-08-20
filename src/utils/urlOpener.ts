import { isTauriEnvironment } from '../lib/rustStorage';
import { invoke } from '@tauri-apps/api/core';

/**
 * Normalizes and validates a web URL for external browser opening.
 */
export function normalizeExternalUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  if (!url) return null;

  // Ignore internal note anchor links
  if (url.startsWith('#note-') || url.startsWith('#')) {
    return null;
  }

  // Prepend https:// if user entered domain.com or www.domain.com
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    url = `https://${url}`;
  }

  // Only allow web & mail protocols
  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
    return null;
  }

  return url;
}

/**
 * Opens a URL in the user's default/active desktop browser via Rust native command.
 */
export async function openExternalUrl(rawUrl: string): Promise<boolean> {
  const url = normalizeExternalUrl(rawUrl);
  if (!url) return false;

  if (isTauriEnvironment()) {
    try {
      await invoke('open_external_url', { url });
      return true;
    } catch (err) {
      console.warn('Native open_external_url failed, falling back to window.open', err);
    }
  }

  // Fallback for browser / testing
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return win !== null;
  } catch (err) {
    console.error('Failed to open URL in browser:', err);
    return false;
  }
}
