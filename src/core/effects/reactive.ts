import { RGB, clamp, hash, hsv, mix, scale } from '../color';
import { KEYS, Key, pdist } from '../layout';
import { GH, GW, Grid, keyCell, num, stepper } from './helpers';
import { FireSim } from './nature';
import { Ctx, EffectDef, stateless } from './types';

const recent = (c: Ctx, maxAge: number) => c.presses.filter((p) => c.t - p.t < maxAge);

export const reactiveEffects: EffectDef[] = [
  {
    id: 'ripple',
    name: 'Su Halkası',
    category: 'reactive',
    description: 'Bastığın her tuştan suya taş atılmış gibi halkalar yayılır.',
    uses: ['palette'],
    defaults: { palette: 'neon' },
    params: [{ key: 'base', label: 'Arka plan ışığı', type: 'range', min: 0, max: 0.4, step: 0.01, default: 0.05 }],
    create: stateless((c) => {
      const base = num(c.p.base, 0.05);
      for (const k of c.keys) c.set(k, scale(c.pal(k.x * 0.3 + c.t * 0.03), base));
      for (const p of recent(c, 2.5)) {
        const age = c.t - p.t;
        const r = age * 1.2;
        const col = c.pal(p.seed);
        for (const k of c.keys) {
          const d = pdist(k.x, k.y, p.key.x, p.key.y);
          const v = Math.exp(-Math.pow((d - r) / 0.12, 2)) * Math.exp(-age * 1.4);
          if (v > 0.01) c.add(k, scale(col, v));
        }
        c.add(p.key, scale([255, 255, 255], Math.exp(-age * 6)));
      }
    }),
  },
  {
    id: 'shockwave',
    name: 'Gökkuşağı Şok Dalgası',
    category: 'reactive',
    description: 'Tuşa bastığında tüm gökkuşağı renkleriyle dolu bir şok dalgası patlar.',
    uses: [],
    defaults: { speed: 1 },
    create: stateless((c) => {
      c.fill([0, 0, 0]);
      for (const p of recent(c, 2)) {
        const age = c.t - p.t;
        const r = age * 1.6;
        for (const k of c.keys) {
          const d = pdist(k.x, k.y, p.key.x, p.key.y);
          if (d > r) continue;
          const v = Math.exp(-(r - d) * 2.5) * Math.exp(-age * 1.2);
          c.add(k, scale(hsv(d * 0.8 - age), v));
        }
      }
    }),
  },
  {
    id: 'heatmap',
    name: 'Isı Haritası',
    category: 'reactive',
    description: 'En çok kullandığın tuşlar kırmızıya, az kullandıkların maviye döner.',
    uses: [],
    defaults: { speed: 1 },
    isNew: true,
    params: [{ key: 'decay', label: 'Soğuma hızı', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.05 }],
    create: () => {
      const heat = new Float32Array(KEYS.length);
      return {
        press(k) { heat[k.index] = Math.min(1, heat[k.index] + 0.15); },
        frame(c) {
          const decay = num(c.p.decay, 0.05);
          for (const k of c.keys) {
            heat[k.index] = Math.max(0, heat[k.index] - decay * c.dt * 0.2);
            let total = 0;
            for (const n of c.keys) {
              const d = pdist(k.x, k.y, n.x, n.y);
              if (d < 0.25) total += heat[n.index] * (1 - d / 0.25) * 0.35;
            }
            const h = clamp(heat[k.index] + total);
            c.set(k, h < 0.02 ? [0, 0, 30] : hsv(0.66 - h * 0.66, 1, 0.3 + h * 0.7));
          }
        },
      };
    },
  },
  {
    id: 'key-fade',
    name: 'Tuş İzi',
    category: 'reactive',
    description: 'Bastığın tuşlar parlar ve yavaşça söner, yazdıkça iz bırakırsın.',
    uses: ['primary', 'palette'],
    defaults: { primary: '#ffffff', palette: 'galaxy' },
    params: [{ key: 'fade', label: 'Sönme süresi (sn)', type: 'range', min: 0.2, max: 4, step: 0.1, default: 1.2 }],
    create: () => {
      const life = new Float32Array(KEYS.length);
      return {
        press(k) { life[k.index] = 1; },
        frame(c) {
          const f = num(c.p.fade, 1.2);
          for (const k of c.keys) {
            life[k.index] = Math.max(0, life[k.index] - c.dt / f);
            const bg = scale(c.pal(k.x * 0.5 + c.t * 0.05), 0.18);
            c.set(k, mix(bg, c.primary, life[k.index]));
          }
        },
      };
    },
  },
  {
    id: 'laser-cross',
    name: 'Lazer Artı',
    category: 'reactive',
    description: 'Basılan tuşun satırı ve sütunu boyunca lazer ışınları fırlar.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff0040', secondary: '#00e5ff' },
    create: stateless((c) => {
      c.fill([0, 0, 0]);
      for (const p of recent(c, 1.5)) {
        const age = c.t - p.t;
        const reach = age * 2.5;
        for (const k of c.keys) {
          const sameRow = k.row === p.key.row;
          const sameCol = Math.abs(k.x - p.key.x) < 0.035;
          if (!sameRow && !sameCol) continue;
          const d = sameRow ? Math.abs(k.x - p.key.x) * 2.6 : Math.abs(k.y - p.key.y);
          if (d > reach) continue;
          const v = Math.exp(-(reach - d) * 3) * Math.exp(-age * 2);
          c.add(k, scale(sameRow ? c.primary : c.secondary, v));
        }
        c.add(p.key, scale([255, 255, 255], Math.exp(-age * 4)));
      }
    }),
  },
  {
    id: 'sparks',
    name: 'Kıvılcım Patlaması',
    category: 'reactive',
    description: 'Her tuştan etrafa saçılan, yerçekimiyle düşen kıvılcımlar.',
    uses: ['palette'],
    defaults: { palette: 'gold' },
    create: () => {
      const parts: { x: number; y: number; vx: number; vy: number; life: number; col: RGB }[] = [];
      return {
        press(k, c) {
          for (let i = 0; i < 8; i++) {
            const a = c.rand() * Math.PI * 2;
            const s = 0.3 + c.rand() * 0.6;
            parts.push({ x: k.x, y: k.y, vx: Math.cos(a) * s * 0.4, vy: Math.sin(a) * s - 0.3, life: 1, col: c.pal(c.rand()) });
          }
          if (parts.length > 160) parts.splice(0, parts.length - 160);
        },
        frame(c) {
          c.fill([0, 0, 0]);
          for (const p of parts) {
            p.x += p.vx * c.dt; p.y += p.vy * c.dt; p.vy += 1.6 * c.dt; p.life -= c.dt * 1.2;
            if (p.life <= 0) continue;
            for (const k of c.keys) {
              const d = pdist(k.x, k.y, p.x, p.y);
              if (d < 0.1) c.add(k, scale(p.col, (1 - d / 0.1) * p.life));
            }
          }
          for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
        },
      };
    },
  },
  {
    id: 'reactive-fire',
    name: 'Ateşli Parmaklar',
    category: 'reactive',
    description: 'Bastığın tuşlar alev alır, ateş yukarı doğru yükselir.',
    uses: [],
    defaults: { speed: 1 },
    isNew: true,
    create: () => {
      const sim = new FireSim();
      const grid = new Grid();
      const tick = stepper(16);
      return {
        press(k) {
          const [x, y] = keyCell(k);
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx >= 0 && xx < GW) sim.heat[y * GW + xx] = Math.min(1.3, sim.heat[y * GW + xx] + (dx === 0 ? 1.3 : 0.7));
            if (y + 1 < GH && xx >= 0 && xx < GW) sim.heat[(y + 1) * GW + xx] = Math.min(1.3, sim.heat[(y + 1) * GW + xx] + 0.8);
          }
        },
        frame(c) {
          tick(c.dt, () => {
            for (let x = 0; x < GW; x++) sim.heat[(GH - 1) * GW + x] = Math.max(sim.heat[(GH - 1) * GW + x] * 0.85, 0.12 + c.rand() * 0.15);
            sim.step(c.rand, 1, false);
          });
          sim.blit(grid);
          grid.blit(c, 'avg');
        },
      };
    },
  },
  {
    id: 'paint-splash',
    name: 'Boya Sıçraması',
    category: 'reactive',
    description: 'Her tuş vuruşu klavyeye renkli boya sıçratır; renkler birbirine karışır.',
    uses: ['palette'],
    defaults: { palette: 'vapor' },
    create: () => {
      const canvas = new Float32Array(KEYS.length * 3);
      return {
        press(k, c) {
          const col = c.pal(c.rand());
          for (const n of KEYS) {
            const d = pdist(n.x, n.y, k.x, k.y);
            const v = clamp(1 - d / (0.2 + c.rand() * 0.12));
            if (v <= 0) continue;
            const i = n.index * 3;
            for (let ch = 0; ch < 3; ch++) canvas[i + ch] = canvas[i + ch] * (1 - v) + col[ch] * v;
          }
        },
        frame(c) {
          const f = Math.pow(0.85, c.dt);
          for (const k of c.keys) {
            const i = k.index * 3;
            canvas[i] *= f; canvas[i + 1] *= f; canvas[i + 2] *= f;
            c.set(k, [canvas[i], canvas[i + 1], canvas[i + 2]]);
          }
        },
      };
    },
  },
  {
    id: 'typing-speed',
    name: 'Hız Göstergesi',
    category: 'reactive',
    description: 'Ne kadar hızlı yazarsan klavye o kadar dolar: yeşilden kırmızıya.',
    uses: [],
    defaults: { speed: 1 },
    isNew: true,
    create: () => {
      let level = 0;
      const times: number[] = [];
      return {
        press(_k, c) { times.push(c.t); },
        frame(c) {
          while (times.length && c.t - times[0] > 3) times.shift();
          const kps = times.length / 3;
          const target = clamp(kps / 9);
          level += (target - level) * Math.min(1, c.dt * 3);
          for (const k of c.keys) {
            const on = k.x <= level;
            const edge = Math.exp(-Math.pow((k.x - level) * 25, 2));
            const col = hsv(0.33 - k.x * 0.33);
            c.set(k, on ? col : mix([5, 5, 12], [255, 255, 255], edge * 0.4 * level));
          }
        },
      };
    },
  },
  {
    id: 'lightning-strike',
    name: 'Yıldırım Çarpması',
    category: 'reactive',
    description: 'Bastığın tuşa gökten zikzaklı bir yıldırım düşer.',
    uses: ['primary'],
    defaults: { primary: '#7a8cff' },
    create: stateless((c) => {
      c.fill(scale(c.primary, 0.03));
      let flash = 0;
      for (const p of recent(c, 0.8)) {
        const age = c.t - p.t;
        const v = Math.exp(-age * 5);
        flash = Math.max(flash, Math.exp(-age * 12) * 0.25);
        for (const k of c.keys) {
          if (k.y > p.key.y + 0.01) continue;
          const zig = p.key.x + Math.sin(k.row * 2.3 + p.seed * 40) * 0.04 * (p.key.row - k.row);
          const d = Math.abs(k.x - zig) * 2.6;
          if (d < 0.08) c.add(k, mix(c.primary, [255, 255, 255], 0.6).map((x) => x * v * (1 - d / 0.08)) as RGB);
        }
        c.add(p.key, scale([255, 255, 255], v));
      }
      if (flash > 0) for (const k of c.keys) c.add(k, scale([200, 210, 255], flash));
    }),
  },
  {
    id: 'echo',
    name: 'Yankı',
    category: 'reactive',
    description: 'Basılan tuşun ışığı satır boyunca iki yana yankılanarak kayar.',
    uses: ['palette'],
    defaults: { palette: 'cyberpunk' },
    create: stateless((c) => {
      c.fill([0, 0, 0]);
      for (const p of recent(c, 2)) {
        const age = c.t - p.t;
        const col = c.pal(p.seed);
        for (const k of c.keys) {
          if (Math.abs(k.row - p.key.row) > 0) continue;
          const d = Math.abs(k.x - p.key.x);
          const v = Math.exp(-Math.pow((d - age * 0.6) * 25, 2)) * Math.exp(-age * 1.5);
          c.add(k, scale(col, v));
        }
        c.add(p.key, scale(col, Math.exp(-age * 3)));
      }
    }),
  },
  {
    id: 'pulse-trail',
    name: 'Neon Patlama',
    category: 'reactive',
    description: 'Her tuş vuruşu klavyede kısa bir neon parlaması yaratır ve komşularına yayılır.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff00e1', secondary: '#00ffe1' },
    create: () => {
      const e = new Float32Array(KEYS.length);
      return {
        press(k) { e[k.index] = 1.4; },
        frame(c) {
          const next = new Float32Array(KEYS.length);
          for (const k of c.keys) {
            let s = 0;
            for (const n of c.keys) {
              const d = pdist(k.x, k.y, n.x, n.y);
              if (d > 0 && d < 0.2) s += e[n.index] * 0.12;
            }
            next[k.index] = Math.max(e[k.index], s) * Math.pow(0.12, c.dt);
          }
          e.set(next);
          for (const k of c.keys) {
            const v = clamp(e[k.index]);
            c.set(k, mix(scale(c.secondary, 0.04), mix(c.secondary, c.primary, v), v));
          }
        },
      };
    },
  },
];
