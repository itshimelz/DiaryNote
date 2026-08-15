import React, { useState, useRef } from 'react';
import {
  ZoomInAreaIcon,
  Download01Icon,
  Upload04Icon,
} from '@hugeicons/core-free-icons';
import { IconButton } from '../ui';
import { Note, FrameStyle } from '../../types';
import { ImageLightboxModal } from '../Modals/ImageLightboxModal';

interface NoteImageViewProps {
  note: Note;
  isEditing: boolean;
  onUpdateNote: (updated: Note) => void;
  fontClass?: string;
}

export const NoteImageView: React.FC<NoteImageViewProps> = ({
  note,
  isEditing,
  onUpdateNote,
  fontClass = '',
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameStyle: FrameStyle = note.frameStyle || 'polaroid';

  if (!note.imageUrl) {
    return null;
  }

  const handleDownloadImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = note.imageUrl!;
    a.download = `${(note.title || 'polaroid-image').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReplaceImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
        onUpdateNote({
          ...note,
          imageUrl: dataUrl,
          imageType: file.type,
          imageAspectRatio: aspectRatio,
          updatedAt: new Date().toISOString(),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // 1. Polaroid Frame Layout
  if (frameStyle === 'polaroid') {
    return (
      <>
        <div className="relative group/image w-full flex flex-col p-3.5 pb-2">
          {/* Photo Frame Container */}
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="relative w-full aspect-4/3 sm:aspect-square bg-slate-950 overflow-hidden rounded-xs border border-black/15 dark:border-white/10 shadow-inner flex items-center justify-center cursor-pointer"
          >
            <img
              src={note.imageUrl}
              alt={note.title || 'Polaroid photo'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-[1.02]"
              loading="lazy"
            />

            {/* Quick Action Overlay on Hover */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/65 backdrop-blur-xs p-1 rounded-sm border border-white/20 text-white z-20">
              <IconButton
                icon={ZoomInAreaIcon}
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                aria-label="View full image"
                title="Expand View"
                className="text-white hover:bg-white/20"
              />
              <IconButton
                icon={Upload04Icon}
                size="xs"
                variant="ghost"
                onClick={handleReplaceImage}
                aria-label="Replace image"
                title="Replace Photo"
                className="text-white hover:bg-white/20"
              />
              <IconButton
                icon={Download01Icon}
                size="xs"
                variant="ghost"
                onClick={handleDownloadImage}
                aria-label="Download image"
                title="Download Photo"
                className="text-white hover:bg-white/20"
              />
            </div>
          </div>

          {/* Polaroid Caption Area (in the classic bottom margin) */}
          <div className="mt-2.5 px-1 min-h-[32px] flex items-center justify-center text-center">
            {isEditing ? (
              <input
                type="text"
                value={note.content || ''}
                onChange={(e) =>
                  onUpdateNote({
                    ...note,
                    content: e.target.value,
                    updatedAt: new Date().toISOString(),
                  })
                }
                placeholder="Write a caption..."
                className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-blue-500 text-center outline-none py-1 text-sm ${fontClass} text-slate-800 dark:text-slate-100`}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                className={`text-sm text-slate-700 dark:text-slate-200 tracking-wide select-text ${fontClass} line-clamp-2`}
              >
                {note.content || note.title || ''}
              </p>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <ImageLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageUrl={note.imageUrl}
          title={note.title || 'Polaroid Image'}
          caption={note.content}
        />
      </>
    );
  }

  // 2. Photo Print Frame Layout
  if (frameStyle === 'photo') {
    return (
      <>
        <div className="relative group/image w-full p-2.5">
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="relative w-full aspect-16/10 overflow-hidden rounded-xs border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center cursor-pointer bg-slate-900"
          >
            <img
              src={note.imageUrl}
              alt={note.title || 'Photo'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-[1.02]"
              loading="lazy"
            />

            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/65 backdrop-blur-xs p-1 rounded-sm border border-white/20 text-white z-20">
              <IconButton
                icon={ZoomInAreaIcon}
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                aria-label="View full image"
                title="Expand View"
                className="text-white hover:bg-white/20"
              />
              <IconButton
                icon={Upload04Icon}
                size="xs"
                variant="ghost"
                onClick={handleReplaceImage}
                aria-label="Replace image"
                title="Replace Photo"
                className="text-white hover:bg-white/20"
              />
              <IconButton
                icon={Download01Icon}
                size="xs"
                variant="ghost"
                onClick={handleDownloadImage}
                aria-label="Download image"
                title="Download Photo"
                className="text-white hover:bg-white/20"
              />
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <ImageLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageUrl={note.imageUrl}
          title={note.title || 'Photo Print'}
          caption={note.content}
        />
      </>
    );
  }

  // 3. Frameless / Edge-to-Edge Layout
  return (
    <>
      <div className="relative group/image w-full">
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(true);
          }}
          className="relative w-full aspect-16/10 overflow-hidden flex items-center justify-center cursor-pointer bg-slate-900"
        >
          <img
            src={note.imageUrl}
            alt={note.title || 'Image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-[1.02]"
            loading="lazy"
          />

          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/65 backdrop-blur-xs p-1 rounded-sm border border-white/20 text-white z-20">
            <IconButton
              icon={ZoomInAreaIcon}
              size="xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              aria-label="View full image"
              title="Expand View"
              className="text-white hover:bg-white/20"
            />
            <IconButton
              icon={Upload04Icon}
              size="xs"
              variant="ghost"
              onClick={handleReplaceImage}
              aria-label="Replace image"
              title="Replace Photo"
              className="text-white hover:bg-white/20"
            />
            <IconButton
              icon={Download01Icon}
              size="xs"
              variant="ghost"
              onClick={handleDownloadImage}
              aria-label="Download image"
              title="Download Photo"
              className="text-white hover:bg-white/20"
            />
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={note.imageUrl}
        title={note.title || 'Image'}
        caption={note.content}
      />
    </>
  );
};
