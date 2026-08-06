import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { PaperTheme } from '../../types';
import { PAPER_THEMES } from './types';

interface NoteImageViewProps {
  imageUrl?: string;
  onRemoveImage: () => void;
  textSnippet?: string;
  fontClass?: string;
  paperTheme?: string;
}

export const NoteImageView: React.FC<NoteImageViewProps> = ({
  imageUrl,
  onRemoveImage,
  textSnippet = 'A cherry blossom, also known as Japanese cherry or sakura, is a flower of many trees of genus Prunus or Prunus subg. Cerasus.',
  fontClass = 'font-sans',
  paperTheme = 'white',
}) => {
  const themeConfig = PAPER_THEMES[(paperTheme as PaperTheme) || 'white'];

  // Default sample sakura photo if no custom image URL provided
  const displayImage =
    imageUrl ||
    'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=400&q=80';

  return (
    <div className={`w-full flex-1 flex flex-col gap-2 p-1 ${fontClass}`}>
      <div className="flex gap-3 items-start">
        {/* Image Thumbnail */}
        <div className={`relative group/img shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border ${themeConfig.border} shadow-2xs ${themeConfig.isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <img
            src={displayImage}
            alt="Note attachment"
            className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-105"
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            onClick={onRemoveImage}
            className="absolute top-1 right-1 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
            title="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Full note text next to the image */}
        <div className={`flex-1 text-xs sm:text-sm ${themeConfig.text} leading-relaxed font-normal`}>
          <p>
            {textSnippet ||
              'A cherry blossom, also known as Japanese cherry or sakura, is a flower of many trees of genus Prunus or Prunus subg. Cerasus. They are common species in East Asia, including China, Korea and especially in Japan.'}
          </p>
        </div>
      </div>
    </div>
  );
};
