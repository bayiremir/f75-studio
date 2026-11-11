import type { RGB } from '../color';
import type { Key } from '../layout';
import type { PaletteFn } from '../palettes';

export type Category = 'pulse' | 'wave' | 'nature' | 'space' | 'retro' | 'reactive' | 'music';

export const CATEGORIES: { id: Category; name: string; hint: string }[] = [
  { id: 'pulse', name: 'Nabız & Ritim', hint: 'Kalp atışı, nefes, flaş' },
  { id: 'wave', name: 'Dalga & Akış', hint: 'Gökkuşağı, plazma, spiral' },
  { id: 'nature', name: 'Doğa', hint: 'Ateş, yağmur, fırtına, kar' },
  { id: 'space', name: 'Uzay & Işık', hint: 'Galaksi, meteor, havai fişek' },
  { id: 'retro', name: 'Retro & Dijital', hint: 'Matrix, yılan, tetris' },
  { id: 'reactive', name: 'Tuşa Tepki', hint: 'Bastığın tuşa göre canlanır' },
  { id: 'music', name: 'Müzik', hint: 'Bilgisayar sesine göre dans eder' },
];

export interface ParamDef {
  key: string;
  label: string;
  type: 'range' | 'select' | 'bool';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  default: number | string | boolean;
}

export type ParamValues = Record<string, number | string | boolean>;

export interface Press {
  key: Key;
  /** effect time of the press */
  t: number;
  /** stable random per press */
  seed: number;
}

export interface AudioLevels {
  level: number;
  bass: number;
  mid: number;
  treble: number;
  /** 16 log-spaced bands, 0..1 */
  bands: Float32Array;
  /** true on the frame a beat was detected */
  beat: boolean;
}

export interface Ctx {
  /** effect time in seconds (already multiplied by speed) */
  t: number;
  dt: number;
  keys: Key[];
  set(k: Key, c: RGB): void;
  add(k: Key, c: RGB): void;
  get(k: Key): RGB;
  fill(c: RGB): void;
  pal: PaletteFn;
  primary: RGB;
  secondary: RGB;
  p: ParamValues;
  presses: Press[];
  held: Set<string>;
  audio: AudioLevels;
  rand: () => number;
}

export interface Instance {
  frame(c: Ctx): void;
  press?(k: Key, c: Ctx): void;
}

export interface EffectDef {
  id: string;
  name: string;
  category: Category;
  description: string;
  /** which shared controls make sense for this effect */
  uses: ('palette' | 'primary' | 'secondary')[];
  params?: ParamDef[];
  defaults?: { speed?: number; palette?: string; primary?: string; secondary?: string };
  isNew?: boolean;
  create(): Instance;
}

export const stateless = (frame: (c: Ctx) => void) => () => ({ frame });
