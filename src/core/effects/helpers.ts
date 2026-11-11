import { RGB, clamp } from '../color';
import { KEYS, Key, pdist } from '../layout';
import type { Ctx, ParamDef } from './types';

export const TAU = Math.PI * 2;
export const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) * (x - mu)) / (2 * s * s));

/** Adds a soft glowing dot at normalized (px, py); radius in board heights. */
export function glow(c: Ctx, px: number, py: number, color: RGB, radius = 0.18, power = 1) {
  for (const k of c.keys) {
    const d = pdist(k.x, k.y, px, py);
    if (d > radius * 2.2) continue;
    const v = Math.exp(-(d * d) / (radius * radius)) * power;
    if (v > 0.01) c.add(k, [color[0] * v, color[1] * v, color[2] * v]);
  }
}

/** Distance from a key to a point, in board heights. */
export const kdist = (k: Key, px: number, py: number) => pdist(k.x, k.y, px, py);

// ------------------------------------------------------------------ grid
// A coarse 16x6 grid for cellular effects; wide keys average the cells they cover.

export const GW = 16;
export const GH = 6;

const KEY_CELLS = KEYS.map((k) => {
  const c0 = clamp(Math.floor(((k.rect[0] - 30) / 600) * GW), 0, GW - 1);
  const c1 = clamp(Math.floor(((k.rect[2] - 31) / 600) * GW), c0, GW - 1);
  return { row: k.row, c0, c1 };
});

export class Grid {
  data: Float32Array;
  constructor(public w = GW, public h = GH) {
    this.data = new Float32Array(w * h * 3);
  }
  idx(x: number, y: number) {
    return (y * this.w + x) * 3;
  }
  set(x: number, y: number, c: RGB) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = this.idx(x, y);
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }
  get(x: number, y: number): RGB {
    const i = this.idx(x, y);
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }
  fade(f: number) {
    for (let i = 0; i < this.data.length; i++) this.data[i] *= f;
  }
  clear() {
    this.data.fill(0);
  }
  /** Draws the grid onto the keys. */
  blit(c: Ctx, mode: 'avg' | 'max' = 'max') {
    for (const k of c.keys) {
      const kc = KEY_CELLS[k.index];
      let r = 0, g = 0, b = 0;
      for (let x = kc.c0; x <= kc.c1; x++) {
        const i = this.idx(x, kc.row);
        if (mode === 'max') {
          r = Math.max(r, this.data[i]);
          g = Math.max(g, this.data[i + 1]);
          b = Math.max(b, this.data[i + 2]);
        } else {
          r += this.data[i];
          g += this.data[i + 1];
          b += this.data[i + 2];
        }
      }
      if (mode === 'avg') {
        const n = kc.c1 - kc.c0 + 1;
        r /= n; g /= n; b /= n;
      }
      c.set(k, [r, g, b]);
    }
  }
}

export function keyCell(k: Key): [number, number] {
  const kc = KEY_CELLS[k.index];
  return [Math.round((kc.c0 + kc.c1) / 2), kc.row];
}

/** Fixed-rate stepping for simulations: calls `step` as many times as `rate` per effect-second demands. */
export function stepper(rate: number) {
  let acc = 0;
  return (dt: number, step: () => void) => {
    acc += dt * rate;
    let n = 0;
    while (acc >= 1 && n < 8) {
      acc -= 1;
      step();
      n++;
    }
    if (acc > 4) acc = 0;
  };
}

export const directionParam: ParamDef = {
  key: 'dir', label: 'Yön', type: 'select', default: 'right',
  options: [
    { value: 'right', label: 'Sağa →' },
    { value: 'left', label: 'Sola ←' },
    { value: 'down', label: 'Aşağı ↓' },
    { value: 'up', label: 'Yukarı ↑' },
    { value: 'diag', label: 'Çapraz ↘' },
    { value: 'center', label: 'Merkezden ◎' },
  ],
};

/** Position along a direction, 0..~1. */
export function along(k: Key, dir: string): number {
  switch (dir) {
    case 'left': return 1 - k.x;
    case 'down': return k.y * 0.45;
    case 'up': return (1 - k.y) * 0.45;
    case 'diag': return (k.x + k.y * 0.4) / 1.4;
    case 'center': return k.dist * 0.7;
    default: return k.x;
  }
}

export const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);
