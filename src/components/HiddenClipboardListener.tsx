import React, { useEffect, useRef } from 'react';

interface HiddenClipboardListenerProps {
  onPasteText: (text: string) => void;
}

export const HiddenClipboardListener: React.FC<HiddenClipboardListenerProps> = ({ onPasteText }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return; // User is typing inside an input/textarea, bypass
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
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
      onPaste={(e) => {
        const text = e.clipboardData.getData('text/plain');
        if (text && text.trim().length > 0) {
          e.preventDefault();
          onPasteText(text.trim());
        }
      }}
    />
  );
};
