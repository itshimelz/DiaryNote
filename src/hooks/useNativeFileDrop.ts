import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { UnlistenFn } from '@tauri-apps/api/event';

export interface DroppedImageData {
  file_path: string;
  filename: string;
  title: string;
  mime_type: string;
  data_url: string;
  file_size: number;
  width?: number;
  height?: number;
  aspect_ratio?: number;
}

interface UseNativeFileDropOptions {
  onDropImages: (images: DroppedImageData[], clientX: number, clientY: number) => void;
  onDragStateChange?: (isDraggingOver: boolean) => void;
}

/**
 * Checks if the application is running inside a Tauri desktop webview environment
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

/**
 * Native Tauri OS drag-and-drop listener hook.
 * Captures files dragged from the OS desktop/file manager and processes them natively via Rust.
 * Includes fingerprint deduplication to prevent double-drop firing.
 */
export function useNativeFileDrop({
  onDropImages,
  onDragStateChange,
}: UseNativeFileDropOptions) {
  const onDropImagesRef = useRef(onDropImages);
  onDropImagesRef.current = onDropImages;

  const onDragStateChangeRef = useRef(onDragStateChange);
  onDragStateChangeRef.current = onDragStateChange;

  const lastDropRef = useRef<{ fingerprint: string; time: number }>({ fingerprint: '', time: 0 });

  useEffect(() => {
    if (!isTauriEnvironment()) {
      return;
    }

    let unlistenWebview: UnlistenFn | undefined;
    let isCancelled = false;

    const handleProcessPaths = async (paths: string[], clientX: number, clientY: number) => {
      if (!paths || paths.length === 0) return;

      // Deduplication guard: ignore duplicate drop events within 800ms
      const fingerprint = `${paths.join('|')}@${Math.round(clientX)},${Math.round(clientY)}`;
      const now = Date.now();
      if (
        lastDropRef.current.fingerprint === fingerprint &&
        now - lastDropRef.current.time < 800
      ) {
        return;
      }
      lastDropRef.current = { fingerprint, time: now };

      try {
        const images = await invoke<DroppedImageData[]>('read_image_files', { paths });
        if (images && images.length > 0 && !isCancelled) {
          onDropImagesRef.current(images, clientX, clientY);
        }
      } catch (err) {
        console.error('Failed to read dropped image files via Rust:', err);
      }
    };

    const setupListeners = async () => {
      try {
        const webview = getCurrentWebview();
        unlistenWebview = await webview.onDragDropEvent((event) => {
          if (isCancelled) return;

          const payload = event.payload;
          if (payload.type === 'enter' || payload.type === 'over') {
            onDragStateChangeRef.current?.(true);
          } else if (payload.type === 'leave') {
            onDragStateChangeRef.current?.(false);
          } else if (payload.type === 'drop') {
            onDragStateChangeRef.current?.(false);
            const pos = payload.position || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            handleProcessPaths(payload.paths, pos.x, pos.y);
          }
        });
      } catch (e) {
        console.warn('Tauri native drag drop listener setup skipped or not supported:', e);
      }
    };

    setupListeners();

    return () => {
      isCancelled = true;
      if (unlistenWebview) unlistenWebview();
    };
  }, []);
}
