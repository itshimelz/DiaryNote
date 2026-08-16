import React, { useState, useRef, useEffect } from 'react';
import {
  Cancel01Icon,
  Copy01Icon,
  CheckmarkCircle02Icon,
  RotateRight01Icon,
  RotateLeft01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { Dialog, DialogHeader, DialogBody, IconButton } from '../ui';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  caption?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Image Preview',
  caption,
}) => {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  // Reset viewport transform when image or open state changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageUrl]);

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCopy = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopPropagation();
        handleZoomIn();
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopPropagation();
        handleZoomOut();
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        handleResetZoom();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) handleRotateLeft();
        else handleRotateRight();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // Mouse wheel zoom inside lightbox
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((prev) => {
      const next = Math.max(0.5, Math.min(4, Number((prev + zoomDelta).toFixed(2))));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Double click toggles between 1x and 2.25x zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2.25);
    }
  };

  // Pan dragging when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      moveEvt.preventDefault();
      moveEvt.stopPropagation();
      const dx = moveEvt.clientX - dragStartRef.current.x;
      const dy = moveEvt.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    };

    const handleMouseUp = (upEvt: MouseEvent) => {
      upEvt.preventDefault();
      upEvt.stopPropagation();
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    };

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      className="p-0 overflow-hidden"
    >
      <DialogHeader title={title} onClose={onClose} className="px-5 py-3" />
      <DialogBody className="p-0">
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          className={`relative flex flex-col items-center justify-center min-h-[420px] max-h-[75vh] bg-slate-950/95 rounded-b-sm overflow-hidden select-none touch-none ${
            scale > 1
              ? isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-zoom-in'
          }`}
        >
          {/* Floating Controls Toolbar */}
          <div
            className="absolute top-3 right-3 z-30 flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-sm border border-slate-700/80 text-white shadow-sm"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <IconButton
              icon={ZoomInAreaIcon}
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              aria-label="Zoom in (+)"
              title="Zoom In (+)"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <span className="text-[11px] font-mono px-1 text-slate-400 select-none min-w-[38px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <IconButton
              icon={ZoomOutAreaIcon}
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              aria-label="Zoom out (-)"
              title="Zoom Out (-)"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <IconButton
              icon={ViewIcon}
              size="sm"
              variant="ghost"
              onClick={handleResetZoom}
              aria-label="Reset zoom (0)"
              title="Reset Zoom (0)"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
            <IconButton
              icon={RotateLeft01Icon}
              size="sm"
              variant="ghost"
              onClick={handleRotateLeft}
              aria-label="Rotate left (Shift+R)"
              title="Rotate Counter-Clockwise (Shift+R)"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <IconButton
              icon={RotateRight01Icon}
              size="sm"
              variant="ghost"
              onClick={handleRotateRight}
              aria-label="Rotate right (R)"
              title="Rotate 90° (R)"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <IconButton
              icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              aria-label="Copy image"
              title={copied ? 'Copied!' : 'Copy to Clipboard'}
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <IconButton
              icon={Cancel01Icon}
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Close preview (Esc)"
              title="Close Preview (Esc)"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
          </div>

          {/* Image Display */}
          <div className="w-full h-full flex-1 flex items-center justify-center p-6 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              draggable={false}
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="max-w-full max-h-[62vh] object-contain rounded-xs shadow-sm select-none pointer-events-none"
            />
          </div>

          {/* Caption bar if present */}
          {caption && caption.trim().length > 0 && (
            <div
              className="w-full px-5 py-2.5 bg-slate-900/90 border-t border-slate-800 text-center text-sm text-slate-200 font-sans backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {caption}
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
};
