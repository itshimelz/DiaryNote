import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNativeFileDrop, isTauriEnvironment } from '../useNativeFileDrop';

describe('useNativeFileDrop hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('identifies non-tauri environment when __TAURI_INTERNALS__ is absent', () => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    expect(isTauriEnvironment()).toBe(false);
  });

  it('identifies tauri environment when __TAURI_INTERNALS__ is present', () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    expect(isTauriEnvironment()).toBe(true);
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('does not throw when rendered in non-tauri environment', () => {
    const onDropImages = vi.fn();
    const { unmount } = renderHook(() =>
      useNativeFileDrop({
        onDropImages,
      })
    );
    expect(onDropImages).not.toHaveBeenCalled();
    unmount();
  });
});
