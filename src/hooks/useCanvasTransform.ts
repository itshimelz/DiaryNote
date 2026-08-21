import { useState, useEffect, useCallback, useRef } from 'react';
import { CanvasTransform, Note } from '../types';
import { loadTransform, saveTransform, loadSettings, saveSettings, AppSettings } from '../lib/storage';
import { saveCanvasTransformToDB as saveTransformToDB, saveAppSettingsToDB as saveSettingsToDB } from '../lib/rustStorage';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '../constants/canvas';

export function screenToWorld(
  screenX: number,
  screenY: number,
  transform: CanvasTransform,
  cardWidth = DEFAULT_NOTE_WIDTH,
  cardHeight = DEFAULT_NOTE_HEIGHT
) {
  return {
    worldX: Math.round((screenX - transform.x) / transform.zoom - cardWidth / 2),
    worldY: Math.round((screenY - transform.y) / transform.zoom - cardHeight / 2),
  };
}

export function worldToScreen(worldX: number, worldY: number, transform: CanvasTransform) {
  return {
    screenX: Math.round(worldX * transform.zoom + transform.x),
    screenY: Math.round(worldY * transform.zoom + transform.y),
  };
}

export function useCanvasTransform(notes: Note[], bringToFront: (noteId: string) => void) {
  const [transform, setTransform] = useState<CanvasTransform>(() => loadTransform());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);

  const navigationFrameRef = useRef<number | null>(null);
  const transformSaveTimerRef = useRef<number>(0);
  const settingsSaveTimerRef = useRef<number>(0);
  const focusedNoteTimerRef = useRef<number>(0);
  const fitRestoreRef = useRef<CanvasTransform | null>(null);

  // Sync dark mode root class with settings
  useEffect(() => {
    if (settings.themeMode === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [settings.themeMode]);

  // Save transform to DB & localStorage (debounced to avoid thrashing during animations)
  useEffect(() => {
    window.clearTimeout(transformSaveTimerRef.current);
    transformSaveTimerRef.current = window.setTimeout(() => {
      saveTransformToDB(transform);
      saveTransform(transform);
    }, 500);
    return () => window.clearTimeout(transformSaveTimerRef.current);
  }, [transform]);

  // Save settings to DB & localStorage (debounced)
  useEffect(() => {
    window.clearTimeout(settingsSaveTimerRef.current);
    settingsSaveTimerRef.current = window.setTimeout(() => {
      saveSettingsToDB(settings);
      saveSettings(settings);
    }, 500);
    return () => window.clearTimeout(settingsSaveTimerRef.current);
  }, [settings]);

  // Cleanup RAF and timers on unmount
  useEffect(() => {
    return () => {
      if (navigationFrameRef.current !== null) {
        cancelAnimationFrame(navigationFrameRef.current);
      }
      window.clearTimeout(transformSaveTimerRef.current);
      window.clearTimeout(settingsSaveTimerRef.current);
      window.clearTimeout(focusedNoteTimerRef.current);
    };
  }, []);

  const handleCanvasTransformChange = useCallback((nextTransform: CanvasTransform) => {
    if (navigationFrameRef.current !== null) {
      cancelAnimationFrame(navigationFrameRef.current);
      navigationFrameRef.current = null;
    }
    fitRestoreRef.current = null;
    // Bail on value-identical commits (glide-cancel at pan mousedown, zero-distance
    // mouseup) — returning the same reference makes React skip the render entirely.
    setTransform((prev) =>
      prev.x === nextTransform.x && prev.y === nextTransform.y && prev.zoom === nextTransform.zoom
        ? prev
        : nextTransform
    );
  }, []);

  const getViewport = useCallback(() => ({
    width: window.innerWidth,
    height: Math.max(1, window.innerHeight - 32),
  }), []);

  const getZoomBounds = useCallback(() => {
    if (notes.length === 0) return { min: 0.15, max: 3 };
    const minWidth = Math.min(...notes.map((n) => n.width || DEFAULT_NOTE_WIDTH));
    const minHeight = Math.min(...notes.map((n) => n.height || DEFAULT_NOTE_HEIGHT));
    const maxZoom = Math.min(2.5, Math.max(1.8, Math.min(1000 / minWidth, 800 / minHeight)));
    return { min: 0.1, max: Math.max(1.5, maxZoom) };
  }, [notes]);

  const animateTransformTo = useCallback((targetTransform: CanvasTransform) => {
    if (navigationFrameRef.current !== null) {
      cancelAnimationFrame(navigationFrameRef.current);
      navigationFrameRef.current = null;
    }

    const startTransform = { ...transform };
    const startTime = performance.now();
    const duration = 280;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      setTransform({
        x: Math.round(startTransform.x + (targetTransform.x - startTransform.x) * ease),
        y: Math.round(startTransform.y + (targetTransform.y - startTransform.y) * ease),
        zoom: Number((startTransform.zoom + (targetTransform.zoom - startTransform.zoom) * ease).toFixed(4)),
      });

      if (progress < 1) {
        navigationFrameRef.current = requestAnimationFrame(step);
      } else {
        navigationFrameRef.current = null;
      }
    };

    navigationFrameRef.current = requestAnimationFrame(step);
  }, [transform]);

  const handleZoomIn = useCallback(() => {
    const { max } = getZoomBounds();
    const newZoom = Math.min(max, transform.zoom * 1.25);
    const viewport = getViewport();
    const centerWorldX = (viewport.width / 2 - transform.x) / transform.zoom;
    const centerWorldY = (viewport.height / 2 - transform.y) / transform.zoom;

    animateTransformTo({
      zoom: Number(newZoom.toFixed(3)),
      x: Math.round(viewport.width / 2 - centerWorldX * newZoom),
      y: Math.round(viewport.height / 2 - centerWorldY * newZoom),
    });
  }, [animateTransformTo, getViewport, getZoomBounds, transform]);

  const handleZoomOut = useCallback(() => {
    const { min } = getZoomBounds();
    const newZoom = Math.max(min, transform.zoom / 1.25);
    const viewport = getViewport();
    const centerWorldX = (viewport.width / 2 - transform.x) / transform.zoom;
    const centerWorldY = (viewport.height / 2 - transform.y) / transform.zoom;

    animateTransformTo({
      zoom: Number(newZoom.toFixed(3)),
      x: Math.round(viewport.width / 2 - centerWorldX * newZoom),
      y: Math.round(viewport.height / 2 - centerWorldY * newZoom),
    });
  }, [animateTransformTo, getViewport, getZoomBounds, transform]);

  const handleResetZoom = useCallback(() => {
    const newZoom = 1;
    const viewport = getViewport();
    const centerWorldX = (viewport.width / 2 - transform.x) / transform.zoom;
    const centerWorldY = (viewport.height / 2 - transform.y) / transform.zoom;

    animateTransformTo({
      zoom: newZoom,
      x: Math.round(viewport.width / 2 - centerWorldX * newZoom),
      y: Math.round(viewport.height / 2 - centerWorldY * newZoom),
    });
  }, [animateTransformTo, getViewport, transform]);

  const handleFitNotes = useCallback(() => {
    if (notes.length === 0) return;

    if (fitRestoreRef.current) {
      const restore = fitRestoreRef.current;
      fitRestoreRef.current = null;
      animateTransformTo(restore);
      return;
    }

    const minX = Math.min(...notes.map((n) => n.x));
    const minY = Math.min(...notes.map((n) => n.y));
    const maxX = Math.max(...notes.map((n) => n.x + (n.width || DEFAULT_NOTE_WIDTH)));
    const maxY = Math.max(...notes.map((n) => n.y + (n.height || DEFAULT_NOTE_HEIGHT)));

    const boundingWidth = Math.max(100, maxX - minX);
    const boundingHeight = Math.max(100, maxY - minY);
    const viewport = getViewport();

    const padding = 120;
    const availableWidth = Math.max(200, viewport.width - padding * 2);
    const availableHeight = Math.max(200, viewport.height - padding * 2);

    const zoomX = availableWidth / boundingWidth;
    const zoomY = availableHeight / boundingHeight;
    const { min, max } = getZoomBounds();
    const targetZoom = Math.max(min, Math.min(max, Math.min(zoomX, zoomY)));

    const centerX = minX + boundingWidth / 2;
    const centerY = minY + boundingHeight / 2;

    fitRestoreRef.current = { ...transform };

    animateTransformTo({
      zoom: Number(targetZoom.toFixed(3)),
      x: Math.round(viewport.width / 2 - centerX * targetZoom),
      y: Math.round(viewport.height / 2 - centerY * targetZoom),
    });
  }, [animateTransformTo, getViewport, getZoomBounds, notes, transform]);

  const handleNavigateToNote = useCallback((targetNoteId: string, setSelectedNoteIds: (ids: string[]) => void) => {
    const targetNote = notes.find((n) => n.id === targetNoteId);
    if (!targetNote) return;

    setSelectedNoteIds([targetNoteId]);
    fitRestoreRef.current = null;
    bringToFront(targetNoteId);

    setFocusedNoteId(targetNoteId);
    window.clearTimeout(focusedNoteTimerRef.current);
    focusedNoteTimerRef.current = window.setTimeout(() => setFocusedNoteId(null), 1800);

    const viewport = getViewport();
    const screenCenterX = viewport.width / 2;
    const screenCenterY = viewport.height / 2;

    const noteWidth = targetNote.width || DEFAULT_NOTE_WIDTH;
    const noteHeight = targetNote.height || DEFAULT_NOTE_HEIGHT;
    const noteCenterX = targetNote.x + noteWidth / 2;
    const noteCenterY = targetNote.y + noteHeight / 2;

    // Standard comfortable zoom distance (capped between 0.85 and 1.10, defaulting to ~1.0)
    const fitZoomX = (viewport.width - 320) / noteWidth;
    const fitZoomY = (viewport.height - 240) / noteHeight;
    const calculatedFit = Math.min(fitZoomX, fitZoomY);
    const targetZoom = Math.min(1.1, Math.max(0.85, calculatedFit));

    animateTransformTo({
      zoom: Number(targetZoom.toFixed(3)),
      x: Math.round(screenCenterX - noteCenterX * targetZoom),
      y: Math.round(screenCenterY - noteCenterY * targetZoom),
    });
  }, [animateTransformTo, bringToFront, getViewport, notes]);

  return {
    transform,
    setTransform,
    settings,
    setSettings,
    focusedNoteId,
    handleCanvasTransformChange,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitNotes,
    handleNavigateToNote,
  };
}
