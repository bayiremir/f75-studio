import { RGB, clamp, fract, hexToRgb, hsv, mix } from './color';

export interface Palette {
  id: string;
  name: string;
  stops: string[];
  /** rainbow is computed in HSV for perfectly saturated hues */
  hsv?: boolean;
}

export const PALETTES: Palette[] = [
  { id: 'rainbow', name: 'Gökkuşağı', stops: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'], hsv: true },
  { id: 'neon', name: 'Neon', stops: ['#ff00c8', '#7a00ff', '#00e5ff', '#ff00c8'] },
  { id: 'cyberpunk', name: 'Cyberpunk', stops: ['#fcee09', '#ff003c', '#00f0ff', '#fcee09'] },
  { id: 'vapor', name: 'Vaporwave', stops: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#ff71ce'] },
  { id: 'sunset', name: 'Gün Batımı', stops: ['#ff3c00', '#ff8a00', '#ff2a6d', '#7b2cbf', '#ff3c00'] },
  { id: 'ocean', name: 'Okyanus', stops: ['#001aff', '#0077ff', '#00e1ff', '#00ffb3', '#001aff'] },
  { id: 'forest', name: 'Orman', stops: ['#0b6e00', '#38ff00', '#b4ff00', '#00ff6a', '#0b6e00'] },
  { id: 'lava', name: 'Lav', stops: ['#ff0000', '#ff4400', '#ffaa00', '#ff2200', '#ff0000'] },
  { id: 'ice', name: 'Buz', stops: ['#ffffff', '#9be7ff', '#0091ff', '#5f00ff', '#ffffff'] },
  { id: 'aurora', name: 'Kuzey Işıkları', stops: ['#00ff87', '#00b3ff', '#8f00ff', '#00ff87'] },
  { id: 'toxic', name: 'Toksik', stops: ['#39ff14', '#c6ff00', '#00ff9d', '#39ff14'] },
  { id: 'candy', name: 'Şeker', stops: ['#ff4fd8', '#ffd1f7', '#7af7ff', '#ff4fd8'] },
  { id: 'gold', name: 'Altın', stops: ['#ff9d00', '#ffd700', '#fff2b0', '#ff9d00'] },
  { id: 'blood', name: 'Kan Kırmızısı', stops: ['#ff0000', '#600000', '#ff1f3d', '#ff0000'] },
  { id: 'galaxy', name: 'Galaksi', stops: ['#2b00ff', '#ff00f7', '#00d9ff', '#7000ff', '#2b00ff'] },
  { id: 'police', name: 'Polis', stops: ['#ff0000', '#0000ff', '#ff0000'] },
  { id: 'turkiye', name: 'Ay Yıldız', stops: ['#ff0000', '#ffffff', '#ff0000'] },
  { id: 'mono', name: 'Tek Renk (Ana Renk)', stops: [] },
];

export const PALETTE_BY_ID = new Map(PALETTES.map((p) => [p.id, p]));

export type PaletteFn = (t: number) => RGB;

const cache = new Map<string, RGB[]>();

/** Returns a cyclic palette sampler: t is wrapped into 0..1. */
export function makePalette(id: string, primary: RGB, secondary: RGB): PaletteFn {
  const p = PALETTE_BY_ID.get(id) ?? PALETTES[0];
  if (p.hsv) return (t) => hsv(t);
  if (p.id === 'mono') {
    return (t) => {
      const u = fract(t);
      return mix(primary, secondary, 0.5 - 0.5 * Math.cos(u * Math.PI * 2));
    };
  }
  let stops = cache.get(p.id);
  if (!stops) {
    stops = p.stops.map(hexToRgb);
    cache.set(p.id, stops);
  }
  const s = stops;
  const n = s.length - 1;
  return (t) => {
    const u = fract(t) * n;
    const i = Math.floor(u);
    return mix(s[i], s[Math.min(n, i + 1)], u - i);
  };
}

/** CSS gradient for a palette swatch. */
export function paletteCss(id: string, primary = '#ff00c8', secondary = '#00e5ff'): string {
  const p = PALETTE_BY_ID.get(id) ?? PALETTES[0];
  const stops = p.id === 'mono' ? [primary, secondary, primary] : p.stops;
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export const clampByte = (v: number) => clamp(Math.round(v), 0, 255);
