import React from 'react';
import { CoverStyle, SealStyle } from '../types';

export interface NoteCoverStyleConfig {
  id: CoverStyle;
  name: string;
  description: string;
  previewBg: string;
  cardClass: string;
  titleClass: string;
  promptClass: string;
  borderClass: string;
  accentColor: string;
}

export interface SealStyleConfig {
  id: SealStyle;
  name: string;
  category: string;
  description: string;
  renderIcon: (props?: { className?: string; size?: number; color?: string }) => React.ReactNode;
}

export const NOTE_COVER_STYLES: NoteCoverStyleConfig[] = [
  {
    id: 'clean-monochrome',
    name: 'Monochrome Slate',
    description: 'Clean, monotonic slate & white minimalist finish',
    previewBg: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
    cardClass: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-700/80 dark:border-slate-300',
    titleClass: 'text-white dark:text-slate-900',
    promptClass: 'text-slate-400 dark:text-slate-500',
    borderClass: 'border border-dashed border-slate-700 dark:border-slate-300/80',
    accentColor: '#64748b',
  },
  {
    id: 'classic-kraft',
    name: 'Classic Kraft',
    description: 'Warm rustic cardboard paper with stitched edge detailing',
    previewBg: 'bg-[#d8c3a5] text-[#4a3928]',
    cardClass: 'bg-[#d8c3a5] dark:bg-[#524433] text-[#4a3928] dark:text-[#f3e9dc] border-[#bda685] dark:border-[#6b5843]',
    titleClass: 'text-[#3e2e1e] dark:text-[#f7f0e6]',
    promptClass: 'text-[#725e46] dark:text-[#c4b39e]',
    borderClass: 'border-2 border-dashed border-[#bda685]/80 dark:border-[#826d55]/80',
    accentColor: '#8c6b45',
  },
  {
    id: 'leather-journal',
    name: 'Vintage Leather',
    description: 'Deep saddle brown leather tone with warm embossed trim',
    previewBg: 'bg-[#5c3a21] text-[#f8ebd7]',
    cardClass: 'bg-[#5c3a21] dark:bg-[#382011] text-[#f8ebd7] border-[#422714] dark:border-[#221309] shadow-md',
    titleClass: 'text-[#ffeedd]',
    promptClass: 'text-[#d4b99b]',
    borderClass: 'border border-[#8a5d3b]/60',
    accentColor: '#d4af37',
  },
  {
    id: 'obsidian-minimal',
    name: 'Obsidian Velvet',
    description: 'Midnight pitch black texture with subtle silver glow',
    previewBg: 'bg-zinc-950 text-zinc-100',
    cardClass: 'bg-zinc-950 text-zinc-100 border-zinc-800 shadow-lg',
    titleClass: 'text-zinc-100',
    promptClass: 'text-zinc-400',
    borderClass: 'border border-zinc-800 ring-1 ring-white/5',
    accentColor: '#a1a1aa',
  },
  {
    id: 'botanical-linen',
    name: 'Botanical Linen',
    description: 'Earthy sage green texture with serene herbal undertones',
    previewBg: 'bg-[#e2e8e1] text-[#2d3a2e] dark:bg-[#2d3b2e] dark:text-[#e4eee3]',
    cardClass: 'bg-[#e2e8e1] dark:bg-[#2d3b2e] text-[#2d3a2e] dark:text-[#e4eee3] border-[#c4cfc2] dark:border-[#3e4f40]',
    titleClass: 'text-[#202c21] dark:text-[#f0f7ef]',
    promptClass: 'text-[#566b58] dark:text-[#9fb3a0]',
    borderClass: 'border border-[#b8c6b6] dark:border-[#485b4a]',
    accentColor: '#4d7c57',
  },
  {
    id: 'sakura-blush',
    name: 'Sakura Blush',
    description: 'Delicate soft cherry blossom pink with warm rose hues',
    previewBg: 'bg-[#fceeed] text-[#5e3839] dark:bg-[#4a282b] dark:text-[#fceeed]',
    cardClass: 'bg-[#fceeed] dark:bg-[#4a282b] text-[#5e3839] dark:text-[#fceeed] border-[#f3d4d3] dark:border-[#633a3d]',
    titleClass: 'text-[#482829] dark:text-[#fff5f5]',
    promptClass: 'text-[#8b5a5c] dark:text-[#d9a8ab]',
    borderClass: 'border border-[#eec5c4] dark:border-[#6f4245]',
    accentColor: '#e07a7e',
  },
  {
    id: 'ocean-navy',
    name: 'Ocean Navy',
    description: 'Deep nautical midnight navy with royal navy accents',
    previewBg: 'bg-[#122238] text-[#e0ecfc]',
    cardClass: 'bg-[#122238] dark:bg-[#0c1624] text-[#e0ecfc] border-[#1f3759]',
    titleClass: 'text-[#eef6ff]',
    promptClass: 'text-[#8cb4e2]',
    borderClass: 'border border-[#2d4d7a]/60',
    accentColor: '#60a5fa',
  },
  {
    id: 'vintage-parchment',
    name: 'Aged Parchment',
    description: 'Antique weathered manuscript vellum with warm sepia lines',
    previewBg: 'bg-[#f4ebd0] text-[#42331f] dark:bg-[#3d3121] dark:text-[#f4ebd0]',
    cardClass: 'bg-[#f4ebd0] dark:bg-[#3d3121] text-[#42331f] dark:text-[#f4ebd0] border-[#ddce9f] dark:border-[#574630]',
    titleClass: 'text-[#302414] dark:text-[#fbf5e6]',
    promptClass: 'text-[#6e5638] dark:text-[#c4ae8f]',
    borderClass: 'border-2 border-double border-[#cbba87] dark:border-[#6e593d]',
    accentColor: '#b89758',
  },
];

export const DEFAULT_COVER_STYLE: CoverStyle = 'clean-monochrome';
export const DEFAULT_SEAL_STYLE: SealStyle = 'wax-seal-crest';

export const SEAL_STYLES: SealStyleConfig[] = [
  {
    id: 'wax-seal-crest',
    name: 'Wax Crest',
    category: 'Classic',
    description: 'Embossed heraldic seal with royal crown and laurel frame',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
        <circle cx="24" cy="24" r="18" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="2" />
        <circle cx="24" cy="24" r="14" stroke={color} strokeWidth="1" opacity="0.5" />
        {/* Crown & Star */}
        <path
          d="M17 26L19 19L24 23L29 19L31 26H17Z"
          fill={color}
          fillOpacity="0.4"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="18" r="1.5" fill={color} />
        <circle cx="19" cy="18" r="1" fill={color} />
        <circle cx="29" cy="18" r="1" fill={color} />
        <path d="M19 28H29" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'golden-sun',
    name: 'Celestial Sun',
    category: 'Celestial',
    description: 'Radiant geometric sunburst with intricate solar rays',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="8" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
        <circle cx="24" cy="24" r="3.5" fill={color} />
        {/* Cardinal rays */}
        <path d="M24 6V12M24 36V42M6 24H12M36 24H42" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Diagonal rays */}
        <path
          d="M11.27 11.27L15.51 15.51M32.49 32.49L36.73 36.73M11.27 36.73L15.51 32.49M32.49 15.51L36.73 11.27"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="19" stroke={color} strokeWidth="1" strokeDasharray="1 3" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'botanical-branch',
    name: 'Laurel Branch',
    category: 'Nature',
    description: 'Organic botanical wreath with delicate leaves',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="1.2" opacity="0.4" />
        {/* Stem */}
        <path
          d="M16 34C17.5 28 20 20 28 14"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Leaves */}
        <path
          d="M28 14C26 12 23 13 23 15C25 17 28 14 28 14Z"
          fill={color}
          fillOpacity="0.4"
          stroke={color}
          strokeWidth="1.2"
        />
        <path
          d="M24 18C21 17 19 19 20 21C22 22 24 18 24 18Z"
          fill={color}
          fillOpacity="0.4"
          stroke={color}
          strokeWidth="1.2"
        />
        <path
          d="M25 21C28 20 30 22 29 24C27 25 25 21 25 21Z"
          fill={color}
          fillOpacity="0.4"
          stroke={color}
          strokeWidth="1.2"
        />
        <path
          d="M20 25C17 25 16 28 18 29C20 30 20 25 20 25Z"
          fill={color}
          fillOpacity="0.4"
          stroke={color}
          strokeWidth="1.2"
        />
        <path
          d="M22 27C25 27 26 30 25 31C23 32 22 27 22 27Z"
          fill={color}
          fillOpacity="0.4"
          stroke={color}
          strokeWidth="1.2"
        />
      </svg>
    ),
  },
  {
    id: 'vintage-stamp',
    name: 'Postal Postmark',
    category: 'Vintage',
    description: 'Antique mail cancel mark and official postal stamp',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect x="7" y="7" width="34" height="34" rx="2" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
        <rect x="11" y="11" width="26" height="26" stroke={color} strokeWidth="1" opacity="0.7" />
        <circle cx="24" cy="24" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M17 24H31M24 17V31" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M13 39L35 39" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    id: 'origami-crane',
    name: 'Origami Crane',
    category: 'Minimalist',
    description: 'Faceted geometric Japanese folded paper crane',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
        {/* Crane Facets */}
        <path d="M24 10L14 26L24 38L34 26L24 10Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M24 10L24 38" stroke={color} strokeWidth="1.2" />
        <path d="M14 26L34 26" stroke={color} strokeWidth="1.2" />
        <path d="M14 26L8 16L18 20" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity="0.2" />
        <path d="M34 26L40 18L30 21" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'feather-quill',
    name: 'Calligraphy Quill',
    category: 'Literature',
    description: 'Elegant vintage writing feather and ink drop',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="1" opacity="0.3" />
        {/* Quill */}
        <path
          d="M34 10C34 10 32 20 22 26L16 38L18 32C22 28 30 22 34 10Z"
          fill={color}
          fillOpacity="0.2"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M16 38L28 18" stroke={color} strokeWidth="1.2" />
        {/* Ink droplets */}
        <circle cx="13" cy="40" r="1.5" fill={color} />
        <circle cx="10" cy="38" r="0.8" fill={color} opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'minimal-knot',
    name: 'Infinity Knot',
    category: 'Minimalist',
    description: 'Intertwined geometric loop representing continuity and focus',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="1" opacity="0.3" />
        <path
          d="M17 20C14 20 12 22 12 24C12 26 14 28 17 28C21 28 27 20 31 20C34 20 36 22 36 24C36 26 34 28 31 28C27 28 21 20 17 20Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={color}
          fillOpacity="0.1"
        />
        <circle cx="17" cy="24" r="1.5" fill={color} />
        <circle cx="31" cy="24" r="1.5" fill={color} />
      </svg>
    ),
  },
  {
    id: 'compass-rose',
    name: 'Compass Rose',
    category: 'Vintage',
    description: 'Classic eight-point exploration and navigational compass',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="19" stroke={color} strokeWidth="1.5" />
        <circle cx="24" cy="24" r="15" stroke={color} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" />
        {/* Star Points */}
        <polygon points="24,9 27,21 39,24 27,27 24,39 21,27 9,24 21,21" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.2" />
        {/* Half shading */}
        <polygon points="24,9 24,24 21,21" fill={color} />
        <polygon points="39,24 24,24 27,21" fill={color} />
        <polygon points="24,39 24,24 27,27" fill={color} />
        <polygon points="9,24 24,24 21,27" fill={color} />
        <circle cx="24" cy="24" r="2" fill={color} />
      </svg>
    ),
  },
  {
    id: 'mystic-eye',
    name: 'Celestial Eye',
    category: 'Celestial',
    description: 'Minimalist visionary eye with radiant star aura',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        {/* Eye contour */}
        <path
          d="M10 24C14 16 34 16 38 24C34 32 14 32 10 24Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill={color}
          fillOpacity="0.1"
        />
        <circle cx="24" cy="24" r="4.5" stroke={color} strokeWidth="1.5" />
        <circle cx="24" cy="24" r="2" fill={color} />
        {/* Eyelash stars */}
        <path d="M24 10V14M16 13L18 16M32 13L30 16" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'monogram-star',
    name: 'Ornamental Star',
    category: 'Minimalist',
    description: 'Four-point geometric diamond star with heraldic ring',
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="1.5" />
        <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="0.8" strokeDasharray="1 3" opacity="0.6" />
        <path
          d="M24 8L27 21L40 24L27 27L24 40L21 27L8 24L21 21L24 8Z"
          fill={color}
          fillOpacity="0.3"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="1.5" fill={color} />
      </svg>
    ),
  },
];

export function getCoverStyleById(id?: string): NoteCoverStyleConfig {
  return NOTE_COVER_STYLES.find((c) => c.id === id) || NOTE_COVER_STYLES[0];
}

export function getSealStyleById(id?: string): SealStyleConfig {
  return SEAL_STYLES.find((s) => s.id === id) || SEAL_STYLES[0];
}
