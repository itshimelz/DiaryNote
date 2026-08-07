import React, { useEffect, useRef } from 'react';

/**
 * Hidden off-screen textarea that captures native Ctrl+V paste events.
 * On Ctrl+V keydown, it focuses itself so the browser dispatches a native
 * ClipboardEvent ('paste') to it. The global window 'paste' listener in
 * App.tsx then picks up the pasted text and opens the confirm modal.
 *
 * This approach bypasses distro/OS/browser clipboard permission restrictions
 * that block navigator.clipboard.readText().
 */
export const HiddenClipboardListener: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a real input/textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          (activeEl.tagName === 'TEXTAREA' && !activeEl.getAttribute('aria-hidden')) ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
        // Focus hidden textarea so browser dispatches native paste event to it
        if (textareaRef.current) {
          textareaRef.current.value = '';
          textareaRef.current.focus();
        }
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
