import { RGB, clamp, fbm, fract, hash, mix, noise3, scale } from '../color';
import { ASPECT, pdist } from '../layout';
import { GH, GW, Grid, TAU, glow, num, stepper } from './helpers';
import { EffectDef, stateless } from './types';

const FIRE: RGB[] = [[0, 0, 0], [60, 0, 0], [180, 10, 0], [255, 70, 0], [255, 150, 0], [255, 220, 60], [255, 255, 200]];
export function fireColor(h: number): RGB {
  h = clamp(h) * (FIRE.length - 1);
  const i = Math.floor(h);
  return mix(FIRE[i], FIRE[Math.min(FIRE.length - 1, i + 1)], h - i);
}

/** Heat simulation on the 16x6 grid; bottom row is fed, heat rises and cools. */
export class FireSim {
  heat = new Float32Array(GW * GH);
  step(rand: () => number, intensity = 1, feed = true) {
    const h = this.heat;
    if (feed) for (let x = 0; x < GW; x++) h[(GH - 1) * GW + x] = clamp((0.55 + rand() * 0.5) * intensity);
    for (let y = 0; y < GH - 1; y++) {
      for (let x = 0; x < GW; x++) {
        const b = (y + 1) * GW;
        const l = h[b + Math.max(0, x - 1)], m = h[b + x], r = h[b + Math.min(GW - 1, x + 1)];
        const below2 = y + 2 < GH ? h[(y + 2) * GW + x] : m;
        const v = (l + m * 2 + r + below2) / 5;
        h[y * GW + x] = Math.max(0, v - (0.09 + rand() * 0.13));
      }
    }
  }
  blit(grid: Grid) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) grid.set(x, y, fireColor(this.heat[y * GW + x] * 1.15));
  }
}

interface Drop { x: number; y: number; v: number; len: number }

export const natureEffects: EffectDef[] = [
  {
    id: 'fire',
    name: 'Ateş',
    category: 'nature',
    description: 'Klavyenin altından yükselen gerçekçi alevler.',
    uses: [],
    defaults: { speed: 1 },
    isNew: true,
    params: [{ key: 'power', label: 'Alev gücü', type: 'range', min: 0.5, max: 1.5, step: 0.05, default: 1 }],
    create: () => {
      const sim = new FireSim();
      const grid = new Grid();
      const tick = stepper(16);
      return {
        frame(c) {
          tick(c.dt, () => sim.step(c.rand, num(c.p.power, 1)));
          sim.blit(grid);
          grid.blit(c, 'avg');
        },
      };
    },
  },
  {
    id: 'frost',
    name: 'Buz Kristalleri',
    category: 'nature',
    description: 'Soğuk mavi buzun üzerinde parıldayan kristaller.',
    uses: ['primary'],
    defaults: { primary: '#2a7bff' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const n = fbm(k.x * 4, k.y * 3, c.t * 0.1, 3);
        const sparkle = Math.pow(clamp(noise3(k.x * 20, k.y * 20, c.t * 2) * 2), 6);
        const base = mix(scale(c.primary, 0.25), [160, 220, 255], n * 0.7);
        c.set(k, mix(base, [255, 255, 255], sparkle));
      }
    }),
  },
  {
    id: 'rain',
    name: 'Yağmur',
    category: 'nature',
    description: 'Tuşların üzerinden süzülen yağmur damlaları.',
    uses: ['primary'],
    defaults: { primary: '#2aa8ff' },
    params: [{ key: 'density', label: 'Yoğunluk', type: 'range', min: 2, max: 20, step: 1, default: 9 }],
    create: () => {
      const drops: Drop[] = [];
      return {
        frame(c) {
          const want = num(c.p.density, 9);
          while (drops.length < want) drops.push({ x: c.rand(), y: -c.rand() * 1.5, v: 0.8 + c.rand() * 0.8, len: 0.25 + c.rand() * 0.3 });
          c.fill(scale(c.primary, 0.04));
          for (const d of drops) {
            d.y += d.v * c.dt;
            for (const k of c.keys) {
              if (Math.abs(k.x - d.x) * ASPECT > k.w / 464 + 0.03) continue;
              const dy = d.y - k.y;
              if (dy < 0 || dy > d.len) continue;
              const v = 1 - dy / d.len;
              c.add(k, mix(scale(c.primary, v), [220, 240, 255], v > 0.85 ? 0.6 : 0));
            }
          }
          for (let i = drops.length - 1; i >= 0; i--) if (drops[i].y - drops[i].len > 1.1) drops.splice(i, 1);
        },
      };
    },
  },
  {
    id: 'storm',
    name: 'Gök Gürültülü Fırtına',
    category: 'nature',
    description: 'Karanlık bulutlar arasında aniden çakan şimşekler.',
    uses: ['primary'],
    defaults: { primary: '#1a2cff' },
    isNew: true,
    create: () => {
      let flash = 0;
      let boltX = 0.5;
      let next = 1;
      return {
        frame(c) {
          next -= c.dt;
          if (next <= 0) {
            flash = 1;
            boltX = 0.1 + c.rand() * 0.8;
            next = 1.2 + c.rand() * 3;
          }
          flash = Math.max(0, flash - c.dt * 2.5);
          const flicker = flash > 0.3 ? (Math.sin(c.t * 80) > 0 ? 1 : 0.5) : 1;
          for (const k of c.keys) {
            const cloud = fbm(k.x * 3 - c.t * 0.1, k.y * 2, c.t * 0.05, 2);
            const base = scale(c.primary, 0.05 + cloud * 0.18);
            const zig = boltX + Math.sin(k.y * 13 + boltX * 50) * 0.04;
            const bolt = Math.exp(-Math.pow((k.x - zig) * ASPECT * 6, 2)) * flash * 1.5;
            const sky = flash * flash * 0.35 * flicker;
            c.set(k, mix(base, [220, 230, 255], clamp(bolt + sky)));
          }
        },
      };
    },
  },
  {
    id: 'snow',
    name: 'Kar Yağışı',
    category: 'nature',
    description: 'Lapa lapa yağan kar taneleri, rüzgarla savrulur.',
    uses: ['primary'],
    defaults: { primary: '#0b1e5c', speed: 0.8 },
    create: () => {
      const flakes: { x: number; y: number; v: number; ph: number }[] = [];
      return {
        frame(c) {
          while (flakes.length < 12) flakes.push({ x: c.rand(), y: -c.rand(), v: 0.15 + c.rand() * 0.2, ph: c.rand() * TAU });
          c.fill(scale(c.primary, 0.5));
          for (const f of flakes) {
            f.y += f.v * c.dt;
            const x = f.x + Math.sin(c.t * 1.3 + f.ph) * 0.04;
            glow(c, x, f.y, [255, 255, 255], 0.11, 1);
          }
          for (let i = flakes.length - 1; i >= 0; i--) if (flakes[i].y > 1.15) flakes.splice(i, 1);
        },
      };
    },
  },
  {
    id: 'fireflies',
    name: 'Ateş Böcekleri',
    category: 'nature',
    description: 'Yaz gecesinde yavaşça uçuşan ve yanıp sönen ateş böcekleri.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#c8ff1a', secondary: '#001a08' },
    create: stateless((c) => {
      c.fill(c.secondary);
      for (let i = 0; i < 9; i++) {
        const x = 0.5 + 0.48 * noise3(i * 3.1, c.t * 0.15, 0) * 1.8;
        const y = 0.5 + 0.5 * noise3(i * 7.3, c.t * 0.15, 5) * 1.8;
        const blink = Math.pow(clamp(Math.sin(c.t * (1.3 + hash(i) * 1.5) + i * 4)), 3);
        glow(c, x, y, c.primary, 0.13, blink);
      }
    }),
  },
  {
    id: 'candle',
    name: 'Mum Işığı',
    category: 'nature',
    description: 'Sıcak, hafifçe titreyen romantik mum ışığı.',
    uses: ['primary'],
    defaults: { primary: '#ff7a10' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const f = 0.55 + 0.45 * fbm(k.x * 2, k.y * 2, c.t * 1.5, 3);
        const flick = 0.85 + 0.15 * Math.sin(c.t * 23 + k.x * 3) * Math.sin(c.t * 7.1);
        c.set(k, mix(scale(c.primary, f * flick), [255, 200, 80], Math.pow(f, 4) * 0.4));
      }
    }),
  },
  {
    id: 'sunset-sky',
    name: 'Gün Batımı',
    category: 'nature',
    description: 'Gökyüzü sabahtan geceye renk değiştirir, yıldızlar belirir.',
    uses: [],
    defaults: { speed: 1 },
    isNew: true,
    create: stateless((c) => {
      const day = fract(c.t * 0.03);
      const skies: RGB[][] = [
        [[255, 120, 40], [255, 60, 90], [80, 20, 120]],
        [[255, 200, 120], [120, 190, 255], [40, 120, 255]],
        [[255, 90, 0], [200, 30, 80], [40, 0, 90]],
        [[10, 10, 60], [5, 5, 30], [0, 0, 10]],
      ];
      const seg = day * skies.length;
      const i = Math.floor(seg);
      const a = skies[i], b = skies[(i + 1) % skies.length];
      const f = seg - i;
      const night = i === 3 ? 1 - Math.abs(f - 0.5) * 2 : 0;
      for (const k of c.keys) {
        const y = 1 - k.y;
        const lo = mix(a[0], b[0], f), md = mix(a[1], b[1], f), hi = mix(a[2], b[2], f);
        let col = y < 0.5 ? mix(lo, md, y * 2) : mix(md, hi, (y - 0.5) * 2);
        const star = night * Math.pow(clamp(Math.sin(c.t * 3 + hash(k.index) * 50)), 8) * (hash(k.index * 3) > 0.7 ? 1 : 0);
        col = mix(col, [255, 255, 255], star);
        c.set(k, col);
      }
    }),
  },
  {
    id: 'lava-flow',
    name: 'Volkan Lavı',
    category: 'nature',
    description: 'Kararmış kabuğun altından akan kızgın lav.',
    uses: [],
    defaults: { speed: 0.8 },
    create: stateless((c) => {
      for (const k of c.keys) {
        const n = fbm(k.x * 2.5 - c.t * 0.12, k.y * 2 + c.t * 0.05, c.t * 0.1, 4);
        const v = clamp((n - 0.35) * 2.2);
        c.set(k, fireColor(v * 0.85 + 0.05 * Math.sin(c.t * 2 + k.x * 10)));
      }
    }),
  },
  {
    id: 'bubbles',
    name: 'Asit Baloncukları',
    category: 'nature',
    description: 'Toksik sıvıdan yükselen ve patlayan baloncuklar.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#39ff14', secondary: '#002a10' },
    create: () => {
      const bubbles: { x: number; y: number; v: number; r: number }[] = [];
      return {
        frame(c) {
          if (bubbles.length < 7 && c.rand() < c.dt * 4) bubbles.push({ x: c.rand(), y: 1.15, v: 0.2 + c.rand() * 0.3, r: 0.06 });
          c.fill(c.secondary);
          for (const b of bubbles) {
            b.y -= b.v * c.dt;
            b.r = 0.06 + (1.15 - b.y) * 0.08;
            for (const k of c.keys) {
              const d = pdist(k.x, k.y, b.x + Math.sin(b.y * 8) * 0.02, b.y);
              const ring = Math.exp(-Math.pow((d - b.r) / 0.05, 2));
              if (ring > 0.02) c.add(k, scale(c.primary, ring));
            }
          }
          for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].y < -0.2) bubbles.splice(i, 1);
        },
      };
    },
  },
  {
    id: 'bioluminescence',
    name: 'Biyolüminesans',
    category: 'nature',
    description: 'Karanlık okyanusta ışıldayan planktonlar, dalgayla parlar.',
    uses: ['primary'],
    defaults: { primary: '#00fff0' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const wave = Math.pow(0.5 + 0.5 * Math.sin(k.x * 6 - c.t * 1.5 + k.y * 2), 4);
        const spark = Math.pow(clamp(noise3(k.x * 9, k.y * 9, c.t * 0.8) * 2.2), 3);
        c.set(k, scale(c.primary, 0.03 + wave * 0.5 * (0.3 + spark) + spark * 0.5));
      }
    }),
  },
  {
    id: 'pond-drops',
    name: 'Göl Damlaları',
    category: 'nature',
    description: 'Durgun göle düşen damlalar halka halka yayılır.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#7fd8ff', secondary: '#001830' },
    create: () => {
      const drops: { x: number; y: number; t: number }[] = [];
      let next = 0;
      return {
        frame(c) {
          next -= c.dt;
          if (next <= 0) {
            drops.push({ x: c.rand(), y: c.rand(), t: c.t });
            next = 0.4 + c.rand() * 0.8;
          }
          c.fill(c.secondary);
          for (const d of drops) {
            const age = c.t - d.t;
            const r = age * 0.6;
            for (const k of c.keys) {
              const dist = pdist(k.x, k.y, d.x, d.y);
              const ring = Math.exp(-Math.pow((dist - r) / 0.07, 2)) * Math.exp(-age * 1.2);
              if (ring > 0.01) c.add(k, scale(c.primary, ring));
            }
          }
          while (drops.length && c.t - drops[0].t > 4) drops.shift();
        },
      };
    },
  },
  {
    id: 'meadow',
    name: 'Rüzgarlı Çayır',
    category: 'nature',
    description: 'Rüzgarın çimenlerin üzerinde dalgalar oluşturduğu yeşil çayır.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#0a6b00', secondary: '#c6ff4a' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const gust = fbm(k.x * 2 - c.t * 0.5, k.y * 1.5, c.t * 0.1, 2);
        c.set(k, mix(c.primary, c.secondary, Math.pow(gust, 1.5) * (0.6 + 0.4 * (1 - k.y))));
      }
    }),
  },
];
