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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onPasteTextRef = useRef(onPasteText);
  useEffect(() => {
    onPasteTextRef.current = onPasteText;
  }, [onPasteText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a real input/textarea/contenteditable
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
        const t = textareaRef.current;
        if (!t) return;
        e.preventDefault();
        t.value = '';
        t.focus();
        // ponytail: synchronous programmatic paste; reads real text where the native
        //   paste event / navigator.clipboard are unreliable (Wayland/WebKitGTK).
        document.execCommand('paste');
        const text = t.value.trim();
        if (text) onPasteTextRef.current(text);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
};
