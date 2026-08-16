import tape01 from '../assets/washi-tapes/washi-tape-01-hearts-coral.svg';
import tape02 from '../assets/washi-tapes/washi-tape-02-diagonal-wave-pink.svg';
import tape03 from '../assets/washi-tapes/washi-tape-03-gingham-peach.svg';
import tape04 from '../assets/washi-tapes/washi-tape-04-butterflies-lavender.svg';
import tape05 from '../assets/washi-tapes/washi-tape-05-waves-dots-mint.svg';
import tape06 from '../assets/washi-tapes/washi-tape-06-stars-taupe.svg';
import tape07 from '../assets/washi-tapes/washi-tape-07-vertical-waves-blue.svg';
import tape08 from '../assets/washi-tapes/washi-tape-08-swirl-pink.svg';
import tape09 from '../assets/washi-tapes/washi-tape-09-confetti-lightblue.svg';
import tape10 from '../assets/washi-tapes/washi-tape-10-grid-stars-lavender.svg';
import tape11 from '../assets/washi-tapes/washi-tape-11-leaves-pink.svg';
import tape12 from '../assets/washi-tapes/washi-tape-12-swirl-teal.svg';
import tape13 from '../assets/washi-tapes/washi-tape-13-floral-yellow.svg';
import tape14 from '../assets/washi-tapes/washi-tape-14-sparkle-mauve.svg';
import tape15 from '../assets/washi-tapes/washi-tape-15-glossy-tan.svg';

export interface WashiTapeConfig {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  src?: string;
  isClassic?: boolean;
  aliases?: string[];
}

export interface PushpinConfig {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  main: string;
  light: string;
  dark: string;
}

export const WASHI_TAPES: readonly WashiTapeConfig[] = [
  // Classic translucent tapes
  {
    id: 'tape-teal',
    label: 'Classic Teal',
    shortLabel: 'C-Teal',
    color: '#2dd4bf',
    isClassic: true,
  },
  {
    id: 'tape-pink',
    label: 'Classic Pink',
    shortLabel: 'C-Pink',
    color: '#f472b6',
    isClassic: true,
  },
  {
    id: 'tape-beige',
    label: 'Classic Beige',
    shortLabel: 'C-Beige',
    color: '#d6c4a8',
    isClassic: true,
  },
  {
    id: 'tape-yellow',
    label: 'Classic Yellow',
    shortLabel: 'C-Yellow',
    color: '#fcd34d',
    isClassic: true,
  },
  // Vector Pattern Tapes (excluding 8, 10, 11)
  {
    id: 'tape-01-hearts-coral',
    label: 'Coral Hearts',
    shortLabel: 'Hearts',
    color: '#F3A79C',
    src: tape01,
    aliases: ['tape-coral'],
  },
  {
    id: 'tape-02-diagonal-wave-pink',
    label: 'Pink Waves',
    shortLabel: 'Waves',
    color: '#F3BEDD',
    src: tape02,
  },
  {
    id: 'tape-03-gingham-peach',
    label: 'Peach Gingham',
    shortLabel: 'Gingham',
    color: '#F6C39A',
    src: tape03,
    aliases: ['tape-peach'],
  },
  {
    id: 'tape-04-butterflies-lavender',
    label: 'Lavender Butterflies',
    shortLabel: 'Butterflies',
    color: '#C6B3EA',
    src: tape04,
    aliases: ['tape-butterflies', 'tape-lavender'],
  },
  {
    id: 'tape-05-waves-dots-mint',
    label: 'Mint Ripples',
    shortLabel: 'Mint',
    color: '#A6E3C4',
    src: tape05,
    aliases: ['tape-mint'],
  },
  {
    id: 'tape-06-stars-taupe',
    label: 'Taupe Stars',
    shortLabel: 'Taupe',
    color: '#A39C93',
    src: tape06,
    aliases: ['tape-taupe'],
  },
  {
    id: 'tape-07-vertical-waves-blue',
    label: 'Sky Stripes',
    shortLabel: 'Sky',
    color: '#8FD6EA',
    src: tape07,
    aliases: ['tape-blue', 'tape-sky'],
  },
  {
    id: 'tape-09-confetti-lightblue',
    label: 'Cyan Confetti',
    shortLabel: 'Confetti',
    color: '#C9EFFB',
    src: tape09,
    aliases: ['tape-confetti', 'tape-cyan'],
  },
  {
    id: 'tape-12-swirl-teal',
    label: 'Teal Waves',
    shortLabel: 'Teal',
    color: '#3FA7B8',
    src: tape12,
  },
  {
    id: 'tape-14-sparkle-mauve',
    label: 'Mauve Sparkles',
    shortLabel: 'Mauve',
    color: '#D6BEC0',
    src: tape14,
    aliases: ['tape-mauve', 'tape-sparkles'],
  },
  {
    id: 'tape-15-glossy-tan',
    label: 'Glossy Tan',
    shortLabel: 'Glossy',
    color: '#EAC98B',
    src: tape15,
    aliases: ['tape-glossy', 'tape-flat-glossy', 'tape-style1-flat-glossy'],
  },
] as const;

// Fallback lookup for unlisted / legacy tapes so older notes remain viewable
const FALLBACK_TAPES: Record<string, WashiTapeConfig> = {
  'tape-08-swirl-pink': {
    id: 'tape-08-swirl-pink',
    label: 'Rose Swirls',
    shortLabel: 'Rose',
    color: '#FAD3D8',
    src: tape08,
  },
  'tape-10-grid-stars-lavender': {
    id: 'tape-10-grid-stars-lavender',
    label: 'Periwinkle Grid',
    shortLabel: 'Periwinkle',
    color: '#D7D9F6',
    src: tape10,
  },
  'tape-11-leaves-pink': {
    id: 'tape-11-leaves-pink',
    label: 'Pink Leaves',
    shortLabel: 'Leaves',
    color: '#FBD7DD',
    src: tape11,
  },
  'tape-13-floral-yellow': {
    id: 'tape-13-floral-yellow',
    label: 'Yellow Floral',
    shortLabel: 'Floral',
    color: '#F4EFAE',
    src: tape13,
  },
};

export const PUSHPIN_OPTIONS: readonly PushpinConfig[] = [
  {
    id: 'pushpin-red',
    label: 'Red Pin',
    shortLabel: 'Red',
    color: '#dc2626',
    main: '#dc2626',
    light: '#fca5a5',
    dark: '#991b1b',
  },
  {
    id: 'pushpin-blue',
    label: 'Blue Pin',
    shortLabel: 'Blue',
    color: '#2563eb',
    main: '#2563eb',
    light: '#93c5fd',
    dark: '#1e40af',
  },
  {
    id: 'pushpin-yellow',
    label: 'Yellow Pin',
    shortLabel: 'Yellow',
    color: '#eab308',
    main: '#eab308',
    light: '#fef08a',
    dark: '#a16207',
  },
  {
    id: 'pushpin-green',
    label: 'Green Pin',
    shortLabel: 'Green',
    color: '#059669',
    main: '#059669',
    light: '#6ee7b7',
    dark: '#065f46',
  },
] as const;

export function getWashiTapeById(id?: string): WashiTapeConfig | undefined {
  if (!id) return undefined;
  return (
    WASHI_TAPES.find((t) => t.id === id || t.aliases?.includes(id)) ||
    FALLBACK_TAPES[id]
  );
}

export function getPushpinById(id?: string): PushpinConfig | undefined {
  if (!id) return undefined;
  return PUSHPIN_OPTIONS.find((p) => p.id === id);
}

export function isWashiTape(id?: string): boolean {
  if (!id) return false;
  return Boolean(getWashiTapeById(id)) || id.startsWith('tape-');
}

export function isPushpin(id?: string): boolean {
  if (!id) return false;
  return Boolean(getPushpinById(id)) || id.startsWith('pushpin-');
}
