import React from 'react';
import { CoverStyle, SealStyle } from '../types';

// Cover SVG Asset Imports (Single Source of Truth)
import coverClassicKraft from '../assets/note-covers/covers/cover-classic-kraft.svg';
import coverObsidianMinimal from '../assets/note-covers/covers/cover-obsidian-minimal.svg';
import coverVintageAirmail from '../assets/note-covers/covers/cover-vintage-airmail.svg';

// Seal SVG Asset Imports (Single Source of Truth)
import sealGoldenSun from '../assets/note-covers/seals/seal-golden-sun.svg';
import sealBotanicalBranch from '../assets/note-covers/seals/seal-botanical-branch.svg';
import sealOrigamiCrane from '../assets/note-covers/seals/seal-origami-crane.svg';
import sealMinimalKnot from '../assets/note-covers/seals/seal-minimal-knot.svg';
import sealCompassRose from '../assets/note-covers/seals/seal-compass-rose.svg';
import sealMonogramStar from '../assets/note-covers/seals/seal-monogram-star.svg';
import sealAirMailPostmark from '../assets/note-covers/seals/seal-air-mail-postmark.svg';
import sealEiffelPostageStamp from '../assets/note-covers/seals/seal-eiffel-postage-stamp.svg';
import sealPisaPostageStamp from '../assets/note-covers/seals/seal-pisa-postage-stamp.svg';
import sealPyramidPostageStamp from '../assets/note-covers/seals/seal-pyramid-postage-stamp.svg';
import sealMailCrestPostmark from '../assets/note-covers/seals/seal-mail-crest-postmark.svg';

export interface NoteCoverStyleConfig {
  id: CoverStyle;
  name: string;
  description: string;
  src?: string;
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
  src?: string;
  renderIcon: (props?: { className?: string; size?: number; color?: string }) => React.ReactNode;
}

export const NOTE_COVER_STYLES: NoteCoverStyleConfig[] = [
  {
    id: 'vintage-airmail',
    name: 'Vintage Airmail',
    description: 'Iconic airmail envelope with red-blue barber-pole border and postal markings',
    src: coverVintageAirmail,
    previewBg: 'bg-[#f4efe4] text-[#3d3326]',
    cardClass: 'bg-[#f7f3e8] text-[#3e3427] border-[#cfc3ad] shadow-sm',
    titleClass: 'text-[#2d2417]',
    promptClass: 'text-[#73624e]',
    borderClass: 'border border-[#cfc3ad]/80',
    accentColor: '#c83226',
  },
  {
    id: 'classic-kraft',
    name: 'Classic Kraft',
    description: 'Warm rustic cardboard paper with stitched edge detailing',
    src: coverClassicKraft,
    previewBg: 'bg-[#d8c3a5] text-[#4a3928]',
    cardClass: 'bg-[#d8c3a5] text-[#4a3928] border-[#bda685] shadow-sm',
    titleClass: 'text-[#3e2e1e]',
    promptClass: 'text-[#725e46]',
    borderClass: 'border-2 border-dashed border-[#bda685]/80',
    accentColor: '#8c6b45',
  },
  {
    id: 'obsidian-minimal',
    name: 'Obsidian Velvet',
    description: 'Midnight pitch black texture with subtle silver glow',
    src: coverObsidianMinimal,
    previewBg: 'bg-zinc-950 text-zinc-100',
    cardClass: 'bg-zinc-950 text-zinc-100 border-zinc-800 shadow-sm',
    titleClass: 'text-zinc-100',
    promptClass: 'text-zinc-400',
    borderClass: 'border border-zinc-800 ring-1 ring-white/5',
    accentColor: '#a1a1aa',
  },
];

export const DEFAULT_COVER_STYLE: CoverStyle = 'vintage-airmail';
export const DEFAULT_SEAL_STYLE: SealStyle = 'golden-sun';

export const SEAL_STYLES: SealStyleConfig[] = [
  {
    id: 'golden-sun',
    name: 'Celestial Sun',
    category: 'Celestial',
    description: 'Radiant geometric sunburst with intricate solar rays',
    src: sealGoldenSun,
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
    src: sealBotanicalBranch,
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
    id: 'origami-crane',
    name: 'Origami Crane',
    category: 'Minimalist',
    description: 'Faceted geometric Japanese folded paper crane',
    src: sealOrigamiCrane,
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
    id: 'minimal-knot',
    name: 'Infinity Knot',
    category: 'Minimalist',
    description: 'Intertwined geometric loop representing continuity and focus',
    src: sealMinimalKnot,
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
    src: sealCompassRose,
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
    id: 'monogram-star',
    name: 'Ornamental Star',
    category: 'Minimalist',
    description: 'Four-point geometric diamond star with heraldic ring',
    src: sealMonogramStar,
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
  {
    id: 'air-mail-postmark',
    name: 'Air Mail Postmark',
    category: 'Airmail',
    description: 'Vintage circular postmark with wavy postal cancel lines',
    src: sealAirMailPostmark,
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Double circular postmark ring */}
        <circle cx="20" cy="24" r="16" stroke={color} strokeWidth="1.4" />
        <circle cx="20" cy="24" r="13" stroke={color} strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.7" />
        {/* Inner postal mark text & stars */}
        <text
          x="20"
          y="17"
          textAnchor="middle"
          fontSize="4"
          fontWeight="bold"
          fontFamily="monospace"
          fill={color}
          letterSpacing="0.5"
        >
          AIR-MAIL
        </text>
        <path d="M16 23.5H24M14 24.5H26" stroke={color} strokeWidth="1" strokeLinecap="round" />
        <circle cx="14" cy="20" r="0.7" fill={color} />
        <circle cx="26" cy="20" r="0.7" fill={color} />
        <text
          x="20"
          y="31"
          textAnchor="middle"
          fontSize="3.5"
          fontWeight="bold"
          fontFamily="monospace"
          fill={color}
          letterSpacing="0.5"
        >
          POST
        </text>
        {/* Flowing wavy cancel lines extending across right side */}
        <path
          d="M34 16C37 13.5 41 18.5 45 16M33 21C36.5 18.5 40.5 23.5 45 21M34 26C37 23.5 41 28.5 45 26M35 31C37.5 28.5 41.5 33.5 45 31"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'eiffel-postage-stamp',
    name: 'Eiffel Stamp',
    category: 'Postage',
    description: 'Vintage perforated postage stamp with Eiffel Tower engraving',
    src: sealEiffelPostageStamp,
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Perforated scalloped outer stamp frame */}
        <rect
          x="10"
          y="6"
          width="28"
          height="36"
          rx="1"
          stroke={color}
          strokeWidth="1.4"
          strokeDasharray="2.5 1.5"
        />
        {/* Inner frame */}
        <rect x="13" y="9" width="22" height="30" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.08" />
        {/* Top header */}
        <text
          x="24"
          y="14"
          textAnchor="middle"
          fontSize="3.5"
          fontWeight="bold"
          fontFamily="serif"
          fill={color}
          letterSpacing="0.5"
        >
          PARIS
        </text>
        {/* Eiffel Tower architectural engraving */}
        {/* Spire */}
        <path d="M24 16V18" stroke={color} strokeWidth="1" />
        {/* Top platform */}
        <path d="M22.5 18H25.5L26 23H22L22.5 18Z" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.2" />
        {/* Mid section */}
        <path d="M21.5 23H26.5L28 32H20L21.5 23Z" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.15" />
        {/* Lattice crosses */}
        <path d="M22 24L26 27M26 24L22 27M21 28L27 31M27 28L21 31" stroke={color} strokeWidth="0.6" opacity="0.7" />
        {/* Base arch */}
        <path
          d="M20 32C20 30 22 28.5 24 28.5C26 28.5 28 30 28 32"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Bottom postal value */}
        <text
          x="24"
          y="37"
          textAnchor="middle"
          fontSize="3"
          fontWeight="bold"
          fontFamily="monospace"
          fill={color}
        >
          25¢
        </text>
      </svg>
    ),
  },
  {
    id: 'pisa-postage-stamp',
    name: 'Pisa Tower Stamp',
    category: 'Postage',
    description: 'Classic perforated stamp featuring the Leaning Tower of Pisa',
    src: sealPisaPostageStamp,
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Perforated outer stamp frame */}
        <rect
          x="10"
          y="6"
          width="28"
          height="36"
          rx="1"
          stroke={color}
          strokeWidth="1.4"
          strokeDasharray="2.5 1.5"
        />
        <rect x="13" y="9" width="22" height="30" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.08" />
        <text
          x="24"
          y="14"
          textAnchor="middle"
          fontSize="3.2"
          fontWeight="bold"
          fontFamily="serif"
          fill={color}
          letterSpacing="0.5"
        >
          ITALIA
        </text>
        {/* Leaning Tower of Pisa tilted vector art */}
        <g transform="rotate(5 24 25)">
          {/* Belfry top */}
          <rect x="22" y="16" width="5" height="3" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.2" />
          <path d="M23 16V14.5H26V16" stroke={color} strokeWidth="0.8" />
          {/* Tiers with arcade columns */}
          <path d="M21 19H28V22H21V19Z" stroke={color} strokeWidth="0.7" fill={color} fillOpacity="0.1" />
          <path d="M20.5 22H28.5V25H20.5V22Z" stroke={color} strokeWidth="0.7" fill={color} fillOpacity="0.1" />
          <path d="M20 25H29V28H20V25Z" stroke={color} strokeWidth="0.7" fill={color} fillOpacity="0.1" />
          <path d="M19.5 28H29.5V31H19.5V28Z" stroke={color} strokeWidth="0.7" fill={color} fillOpacity="0.1" />
          {/* Base foundation */}
          <path d="M19 31H30V34H19V31Z" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.25" />
          {/* Colonnade tick marks */}
          <path d="M23 20V22M26 20V22M22.5 23V25M26.5 23V25M22 26V28M27 26V28M21.5 29V31M27.5 29V31" stroke={color} strokeWidth="0.6" />
        </g>
        <text
          x="24"
          y="37"
          textAnchor="middle"
          fontSize="3"
          fontWeight="bold"
          fontFamily="monospace"
          fill={color}
        >
          15L
        </text>
      </svg>
    ),
  },
  {
    id: 'pyramid-postage-stamp',
    name: 'Pyramid Stamp',
    category: 'Postage',
    description: 'Antique desert postage stamp with the Great Pyramids of Giza',
    src: sealPyramidPostageStamp,
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Perforated stamp frame */}
        <rect
          x="8"
          y="8"
          width="32"
          height="32"
          rx="1"
          stroke={color}
          strokeWidth="1.4"
          strokeDasharray="2.5 1.5"
        />
        <rect x="11" y="11" width="26" height="26" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.08" />
        {/* Desert Sun */}
        <circle cx="19" cy="18" r="3.5" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.25" />
        {/* Large Pyramid */}
        <polygon points="23,17 33,32 15,32" stroke={color} strokeWidth="1" fill={color} fillOpacity="0.15" />
        <polygon points="23,17 25,32 33,32" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.35" />
        {/* Smaller side pyramid */}
        <polygon points="15,22 22,32 9,32" stroke={color} strokeWidth="0.9" fill={color} fillOpacity="0.2" />
        {/* Desert baseline */}
        <path d="M11 32H37" stroke={color} strokeWidth="1" strokeLinecap="round" />
        <text
          x="24"
          y="35.5"
          textAnchor="middle"
          fontSize="2.8"
          fontWeight="bold"
          fontFamily="serif"
          fill={color}
          letterSpacing="0.4"
        >
          GIZA · POST
        </text>
      </svg>
    ),
  },
  {
    id: 'mail-crest-postmark',
    name: 'Official Mail Seal',
    category: 'Airmail',
    description: 'Double-ring official post office MAIL cancellation mark',
    src: sealMailCrestPostmark,
    renderIcon: ({ className = '', size = 40, color = 'currentColor' } = {}) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <ellipse cx="24" cy="24" rx="20" ry="16" stroke={color} strokeWidth="1.4" />
        <ellipse cx="24" cy="24" rx="17" ry="13" stroke={color} strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.7" />
        {/* Center MAIL banner */}
        <text
          x="24"
          y="26"
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={color}
          letterSpacing="1"
        >
          MAIL
        </text>
        {/* Top / Bottom postal decorative stars */}
        <circle cx="16" cy="15" r="0.8" fill={color} />
        <circle cx="24" cy="13" r="1" fill={color} />
        <circle cx="32" cy="15" r="0.8" fill={color} />
        <circle cx="16" cy="33" r="0.8" fill={color} />
        <circle cx="24" cy="35" r="1" fill={color} />
        <circle cx="32" cy="33" r="0.8" fill={color} />
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
