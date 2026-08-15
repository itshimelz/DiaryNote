import React, { useState } from 'react';
import {
  Cancel01Icon,
  Copy01Icon,
  RotateRight01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
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
  const [copied, setCopied] = useState(false);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      className="p-0 overflow-hidden"
    >
      <DialogHeader title={title} onClose={onClose} className="px-5 py-3" />
      <DialogBody className="p-0">
        <div className="relative flex flex-col items-center justify-center min-h-[400px] max-h-[75vh] bg-slate-950/90 rounded-b-sm overflow-hidden select-none">
          {/* Floating Controls Toolbar */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 p-1 bg-slate-900/80 backdrop-blur-md rounded-sm border border-slate-700/80 text-white shadow-sm">
            <IconButton
              icon={ZoomInAreaIcon}
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              title="Zoom In"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <IconButton
              icon={ZoomOutAreaIcon}
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              title="Zoom Out"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <IconButton
              icon={RotateRight01Icon}
              size="sm"
              variant="ghost"
              onClick={handleRotate}
              aria-label="Rotate image"
              title="Rotate 90°"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
            <IconButton
              icon={Copy01Icon}
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
              aria-label="Close preview"
              title="Close Preview"
              className="text-slate-200 hover:text-white hover:bg-slate-800"
            />
          </div>

          {/* Image Display */}
          <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
            <img
              src={imageUrl}
              alt={title}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="max-w-full max-h-[62vh] object-contain rounded-xs shadow-sm"
            />
          </div>

          {/* Caption bar if present */}
          {caption && caption.trim().length > 0 && (
            <div className="w-full px-5 py-2.5 bg-slate-900/90 border-t border-slate-800 text-center text-sm text-slate-200 font-sans backdrop-blur-md">
              {caption}
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
};
