import { clamp, hsv, mix, scale } from '../color';
import { pdist } from '../layout';
import { GH, GW, Grid, num } from './helpers';
import { EffectDef } from './types';

export const musicEffects: EffectDef[] = [
  {
    id: 'spectrum',
    name: 'Ses Spektrumu',
    category: 'music',
    description: 'Çalan müziğin frekansları klavyede ekolayzır çubukları olur.',
    uses: ['palette'],
    defaults: { palette: 'rainbow' },
    isNew: true,
    params: [{ key: 'gain', label: 'Hassasiyet', type: 'range', min: 0.3, max: 3, step: 0.05, default: 1.2 }],
    create: () => {
      const grid = new Grid();
      const peak = new Float32Array(GW);
      return {
        frame(c) {
          const gain = num(c.p.gain, 1.2);
          grid.clear();
          for (let x = 0; x < GW; x++) {
            const v = clamp(c.audio.bands[x] * gain);
            peak[x] = Math.max(v, peak[x] - c.dt * 0.6);
            const h = v * GH;
            for (let y = 0; y < GH; y++) {
              const fromBottom = GH - 1 - y;
              if (fromBottom < h) grid.set(x, y, c.pal(x / GW));
              else if (Math.abs(fromBottom - Math.floor(peak[x] * GH)) < 0.5) grid.set(x, y, [255, 255, 255]);
            }
          }
          grid.blit(c);
        },
      };
    },
  },
  {
    id: 'bass-pulse',
    name: 'Bas Vuruşu',
    category: 'music',
    description: 'Her bas vuruşunda tüm klavye renk değiştirerek patlar.',
    uses: ['palette'],
    defaults: { palette: 'neon' },
    create: () => {
      let hue = 0;
      let flash = 0;
      return {
        frame(c) {
          if (c.audio.beat) { hue += 0.17; flash = 1; }
          flash = Math.max(0, flash - c.dt * 3);
          const v = clamp(c.audio.bass * 1.3 + flash * 0.4);
          for (const k of c.keys) {
            const ring = clamp(1 - k.dist / Math.max(0.05, v * 1.2));
            c.set(k, scale(c.pal(hue + k.dist * 0.3), 0.06 + ring * v));
          }
        },
      };
    },
  },
  {
    id: 'vu-center',
    name: 'Merkez VU Metre',
    category: 'music',
    description: 'Ses seviyesi merkezden iki yana doğru büyür: yeşil, sarı, kırmızı.',
    uses: [],
    defaults: { speed: 1 },
    params: [{ key: 'gain', label: 'Hassasiyet', type: 'range', min: 0.3, max: 3, step: 0.05, default: 1.3 }],
    create: () => {
      let lvl = 0;
      return {
        frame(c) {
          const target = clamp(c.audio.level * num(c.p.gain, 1.3));
          lvl = target > lvl ? target : lvl - c.dt * 0.8;
          for (const k of c.keys) {
            const d = Math.abs(k.x - 0.5) * 2;
            const on = d <= lvl;
            c.set(k, on ? hsv(0.33 - d * 0.33) : [4, 4, 8]);
          }
        },
      };
    },
  },
  {
    id: 'beat-sparkle',
    name: 'Ritim Işıltısı',
    category: 'music',
    description: 'Tizler klavyede ışıltılar, baslar parlama yaratır.',
    uses: ['palette'],
    defaults: { palette: 'galaxy' },
    create: () => {
      const life = new Float32Array(200);
      const hue = new Float32Array(200);
      return {
        frame(c) {
          const chance = c.audio.treble * 6 + (c.audio.beat ? 0.4 : 0);
          for (const k of c.keys) {
            life[k.index] = Math.max(0, life[k.index] - c.dt * 2.5);
            if (Math.random() < chance * c.dt * 2) { life[k.index] = 1; hue[k.index] = Math.random(); }
            const base = scale(c.pal(k.x * 0.4 + c.t * 0.05), c.audio.bass * 0.4);
            c.set(k, mix(base, c.pal(hue[k.index]), life[k.index]));
          }
        },
      };
    },
  },
  {
    id: 'spectrogram',
    name: 'Spektrogram',
    category: 'music',
    description: 'Sesin frekans haritası sağdan sola akan renkli bir şelale olur.',
    uses: [],
    defaults: { speed: 1 },
    create: () => {
      const hist = Array.from({ length: GW }, () => new Float32Array(GH));
      let acc = 0;
      const grid = new Grid();
      return {
        frame(c) {
          acc += c.dt * 14;
          while (acc >= 1) {
            acc -= 1;
            hist.shift();
            const col = new Float32Array(GH);
            for (let y = 0; y < GH; y++) {
              const b0 = Math.floor(((GH - 1 - y) / GH) * 16);
              col[y] = clamp((c.audio.bands[b0] + c.audio.bands[Math.min(15, b0 + 1)]) * 0.7);
            }
            hist.push(col);
          }
          for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) {
            const v = hist[x][y];
            grid.set(x, y, v < 0.04 ? [0, 0, 6] : hsv(0.7 - v * 0.7, 1, 0.25 + v * 0.75));
          }
          grid.blit(c);
        },
      };
    },
  },
  {
    id: 'audio-ripple',
    name: 'Ses Dalgası',
    category: 'music',
    description: 'Müziğin her vuruşu merkezden yayılan renkli halkalar oluşturur.',
    uses: ['palette'],
    defaults: { palette: 'vapor' },
    create: () => {
      const rings: { t: number; h: number; s: number }[] = [];
      return {
        frame(c) {
          if (c.audio.beat) rings.push({ t: c.t, h: Math.random(), s: 0.5 + c.audio.bass });
          while (rings.length && c.t - rings[0].t > 2) rings.shift();
          for (const k of c.keys) c.set(k, scale(c.pal(c.t * 0.05), 0.03 + c.audio.level * 0.15));
          for (const r of rings) {
            const age = c.t - r.t;
            for (const k of c.keys) {
              const d = pdist(k.x, k.y, 0.5, 0.5);
              const v = Math.exp(-Math.pow((d - age * 1.3) / 0.1, 2)) * Math.exp(-age * 1.5) * r.s;
              if (v > 0.01) c.add(k, scale(c.pal(r.h), v));
            }
          }
        },
      };
    },
  },
];
