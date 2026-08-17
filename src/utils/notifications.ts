import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

// Cache permission check in memory
let cachedTauriPermission: boolean | null = null;
let cachedWebPermission: boolean | null = null;

// Throttling cache to prevent notification spam
const recentNotifications = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 400;

/**
 * Sends a native OS desktop notification with smart throttling and browser fallback.
 */
export async function sendNativeAppNotification(title: string, body: string): Promise<void> {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  if (!cleanTitle && !cleanBody) return;

  const key = `${cleanTitle}:::${cleanBody}`;
  const now = Date.now();
  const lastSent = recentNotifications.get(key);

  if (lastSent && now - lastSent < DEDUPLICATION_WINDOW_MS) {
    return;
  }
  recentNotifications.set(key, now);

  // Clean old keys periodically
  if (recentNotifications.size > 50) {
    for (const [k, time] of recentNotifications.entries()) {
      if (now - time > 5000) {
        recentNotifications.delete(k);
      }
    }
  }

  try {
    // Check if running inside Tauri environment
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      if (cachedTauriPermission === null) {
        try {
          const granted = await isPermissionGranted();
          if (granted) {
            cachedTauriPermission = true;
          } else {
            const status = await requestPermission();
            cachedTauriPermission = status === 'granted';
          }
        } catch {
          cachedTauriPermission = false;
        }
      }

      if (cachedTauriPermission) {
        sendNotification({ title: cleanTitle, body: cleanBody });
        return;
      }
    }

    // Fallback: Browser Web Notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (cachedWebPermission === null) {
        if (Notification.permission === 'granted') {
          cachedWebPermission = true;
        } else if (Notification.permission !== 'denied') {
          try {
            const permission = await Notification.requestPermission();
            cachedWebPermission = permission === 'granted';
          } catch {
            cachedWebPermission = false;
          }
        } else {
          cachedWebPermission = false;
        }
      }

      if (cachedWebPermission) {
        new Notification(cleanTitle, { body: cleanBody });
      }
    }
  } catch (err) {
    console.warn('Silent notification dispatch error:', err);
  }
}
