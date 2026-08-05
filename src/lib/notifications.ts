import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

/**
 * Sends a native OS desktop notification with browser fallback
 */
export async function sendNativeAppNotification(title: string, body: string): Promise<void> {
  try {
    // Check if running inside Tauri environment
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      let permission = await isPermissionGranted();
      if (!permission) {
        const status = await requestPermission();
        permission = status === 'granted';
      }

      if (permission) {
        sendNotification({ title, body });
        return;
      }
    }

    // Fallback: Browser Web Notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }
    }
  } catch (err) {
    console.error('Failed to send native notification:', err);
  }
}
