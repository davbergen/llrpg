import type { ClassType } from '../types';
import type { PixelGridData } from '../components/rpg/PixelGrid';

const _ = null;

// Back-facing hero sprite. The cloak uses three purple shades that get
// remapped per class via tintedHeroBack(). Skin tone and accent (gold buckle)
// are kept fixed across classes.
export const HERO_BACK: PixelGridData = [
  [_, _, _, '#5a2a88', '#5a2a88', '#5a2a88', '#5a2a88', '#5a2a88', _, _, _, _],
  [_, _, '#5a2a88', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#5a2a88', _, _, _],
  [_, _, '#5a2a88', '#f4d0a0', '#f4d0a0', '#f4d0a0', '#f4d0a0', '#f4d0a0', '#5a2a88', _, _, _],
  [_, _, '#5a2a88', '#f4d0a0', '#1a1a2e', '#f4d0a0', '#1a1a2e', '#f4d0a0', '#5a2a88', _, _, _],
  [_, _, '#5a2a88', '#f4d0a0', '#f4d0a0', '#f4d0a0', '#f4d0a0', '#f4d0a0', '#5a2a88', _, _, _],
  [_, '#5a2a88', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#e6a817', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#5a2a88', _, _],
  ['#5a2a88', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#5a2a88', _],
  ['#5a2a88', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#5a2a88', _],
  [_, '#f4d0a0', '#5a2a88', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#5a2a88', '#f4d0a0', _, _],
  [_, '#f4d0a0', '#5a2a88', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#7a3ca8', '#5a2a88', '#f4d0a0', _, _],
  [_, _, '#5a2a88', '#7a3ca8', '#5a2a88', _, _, '#5a2a88', '#7a3ca8', '#5a2a88', _, _],
  [_, _, '#5a2a88', '#5a2a88', _, _, _, _, '#5a2a88', '#5a2a88', _, _],
  [_, _, '#3d1a5a', '#3d1a5a', _, _, _, _, '#3d1a5a', '#3d1a5a', _, _],
  [_, '#3d1a5a', '#1a0a2a', _, _, _, _, _, _, '#1a0a2a', '#3d1a5a', _],
  [_, '#1a1a2e', '#0f0f1e', _, _, _, _, _, _, '#0f0f1e', '#1a1a2e', _],
  [_, _, _, _, _, _, _, _, _, _, _, _],
];

interface ClassPalette {
  base: string;
  mid: string;
  dark: string;
  glow: string;
}

const CLASS_PALETTES: Record<ClassType, ClassPalette> = {
  mage: { base: '#5a2a88', mid: '#9b5de5', dark: '#3d1a5a', glow: '#9b5de566' },
  warrior: { base: '#6b1818', mid: '#c44b4b', dark: '#3d0f0f', glow: '#c44b4b66' },
  priest: { base: '#8a6a0e', mid: '#e6a817', dark: '#5a4108', glow: '#e6a81766' },
};

export function heroPalette(classType: ClassType): ClassPalette {
  return CLASS_PALETTES[classType];
}

export function tintedHeroBack(classType: ClassType): PixelGridData {
  const p = CLASS_PALETTES[classType];
  return HERO_BACK.map((row) =>
    row.map((c) => {
      if (c === '#5a2a88') return p.base;
      if (c === '#7a3ca8') return p.mid;
      if (c === '#3d1a5a') return p.dark;
      return c;
    }),
  );
}
