export const IS_MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || navigator.platform || '');

export const IS_WINDOWS =
  typeof navigator !== 'undefined' &&
  /Win/i.test(navigator.userAgent || navigator.platform || '');

export const IS_LINUX =
  typeof navigator !== 'undefined' &&
  /Linux/i.test(navigator.userAgent || navigator.platform || '');

export function getPlatformMetaKey(): string {
  return IS_MAC ? '⌘' : 'Ctrl';
}

export function getPlatformAltKey(): string {
  return IS_MAC ? '⌥' : 'Alt';
}

export function getPlatformShiftKey(): string {
  return IS_MAC ? '⇧' : 'Shift';
}

export function formatShortcutKey(key: string): string {
  if (!key) return '';
  if (IS_MAC) {
    if (key === 'Ctrl' || key === 'Cmd') return '⌘';
    if (key === 'Alt' || key === 'Option') return '⌥';
    if (key === 'Shift') return '⇧';
  }
  return key;
}

export function formatShortcut(shortcut: string): string {
  if (!shortcut) return '';
  if (IS_MAC) {
    return shortcut
      .replace(/\bCtrl\b/gi, '⌘')
      .replace(/\bCmd\b/gi, '⌘')
      .replace(/\bAlt\b/gi, '⌥')
      .replace(/\bOption\b/gi, '⌥')
      .replace(/\bShift\b/gi, '⇧');
  }
  return shortcut;
}
