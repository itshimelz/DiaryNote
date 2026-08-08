import { HandFont } from '../types';

export const FONT_CLASSES: Record<HandFont, string> = {
  sans: 'font-sans',
  caveat: 'font-hand-caveat',
  kalam: 'font-hand-kalam',
  patrick: 'font-hand-patrick',
  architect: 'font-hand-architect',
  mono: 'font-mono-code',
  hind: 'font-hand-hind',
  anek: 'font-hand-anek',
  'noto-bengali': 'font-hand-noto-bengali',
};

export const FONT_NAMES: Record<HandFont, string> = {
  sans: 'Google Sans Flex (Default)',
  caveat: 'Caveat (Cursive)',
  kalam: 'Kalam (Handwriting)',
  patrick: 'Patrick Hand',
  architect: 'Architects Daughter',
  mono: 'Monospace',
  hind: 'Hind Siliguri (বাংলা)',
  anek: 'Anek Bangla (বাংলা)',
  'noto-bengali': 'Noto Serif (বাংলা)',
};
