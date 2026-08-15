import React, { useEffect, useRef } from 'react';

/**
 * Hidden off-screen listener that captures external (OS/desktop) Ctrl+V text and image pastes.
 */
interface HiddenClipboardListenerProps {
  /** Called with the pasted text to create a note. */
  onPasteText: (text: string) => void;
  /** Called with the pasted image file to create a polaroid/image card. */
  onPasteImage?: (imageFile: File) => void;
}

export const HiddenClipboardListener: React.FC<HiddenClipboardListenerProps> = ({
  onPasteText,
  onPasteImage,
}) => {
  const onPasteTextRef = useRef(onPasteText);
  const onPasteImageRef = useRef(onPasteImage);

  useEffect(() => {
    onPasteTextRef.current = onPasteText;
  }, [onPasteText]);

  useEffect(() => {
    onPasteImageRef.current = onPasteImage;
  }, [onPasteImage]);

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
        if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
          try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              const imageType = item.types.find((t) => t.startsWith('image/'));
              if (imageType) {
                const blob = await item.getType(imageType);
                const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: imageType });
                e.preventDefault();
                onPasteImageRef.current?.(file);
                return;
              }
            }
          } catch {
            // Permission restricted or unsupported: fallback to native window 'paste' event
          }
        }

        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().length > 0) {
              e.preventDefault();
              onPasteTextRef.current(text.trim());
            }
          } catch {
            // Fallback to paste event
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

      // Check for image items first
      const items = e.clipboardData?.items;
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              onPasteImageRef.current?.(file);
              return;
            }
          }
        }
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
