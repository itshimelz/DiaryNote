import React, { useEffect, useRef } from 'react';

/**
 * Hidden off-screen textarea that captures external (OS/desktop) Ctrl+V pastes.
 *
 * On Linux/Wayland with its WebKitGTK, WebKit frequently fires the native
 * `paste` event with an EMPTY ClipboardEvent.clipboardData (the OS inserts the
 * text directly). Relying on that (or `navigator.clipboard.readText()`, which
 * distros block) reads nothing -> no note. So on Ctrl+V this focuses the hidden
 * textarea and triggers a synchronous `document.execCommand('paste')`, then
 * reads the resulting `textarea.value` directly.
 */
interface HiddenClipboardListenerProps {
  /** Called with the pasted text to create a note. */
  onPasteText: (text: string) => void;
}

export const HiddenClipboardListener: React.FC<HiddenClipboardListenerProps> = ({ onPasteText }) => {
  const onPasteTextRef = useRef(onPasteText);
  useEffect(() => {
    onPasteTextRef.current = onPasteText;
  }, [onPasteText]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a real input/textarea/contenteditable
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
        // Attempt async clipboard read on first keydown if available
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().length > 0) {
              e.preventDefault();
              onPasteTextRef.current(text.trim());
            }
          } catch {
            // Permission restricted or unsupported: fallback to native window 'paste' event without e.preventDefault()
          }
        }
      }
    };

    const handlePasteEvent = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text/plain');
      if (pastedText && pastedText.trim().length > 0) {
        e.preventDefault();
        onPasteTextRef.current(pastedText.trim());
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('paste', handlePasteEvent, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('paste', handlePasteEvent, true);
    };
  }, []);

  return null;
};
