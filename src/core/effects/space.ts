import { RGB, clamp, fbm, fract, hash, hsv, mix, scale } from '../color';
import { ASPECT, PERIMETER, pdist } from '../layout';
import { TAU, glow, num } from './helpers';
import { EffectDef, stateless } from './types';

interface Rocket { x: number; y: number; vy: number; peak: number; color: RGB; boom: number }

export const spaceEffects: EffectDef[] = [
  {
    id: 'galaxy',
    name: 'Sarmal Galaksi',
    category: 'space',
    description: 'Parlak çekirdeği etrafında dönen sarmal kollu galaksi.',
    uses: ['palette'],
    defaults: { palette: 'galaxy', speed: 0.8 },
    isNew: true,
    create: stateless((c) => {
      for (const k of c.keys) {
        const arm = Math.pow(0.5 + 0.5 * Math.cos(k.angle * 2 - k.dist * 9 + c.t * 0.8), 3);
        const core = Math.exp(-k.dist * k.dist * 30);
        const star = hash(k.index * 7.1) > 0.85 ? Math.pow(clamp(Math.sin(c.t * 4 + k.index)), 6) : 0;
        let col = scale(c.pal(k.dist * 0.8 - c.t * 0.05), arm * (1 - k.dist * 0.5));
        col = mix(col, [255, 240, 220], clamp(core * 1.5 + star));
        c.set(k, col);
      }
    }),
  },
  {
    id: 'meteor-shower',
    name: 'Meteor Yağmuru',
    category: 'space',
    description: 'Gece göğünde çapraz kayan, kuyruklu meteorlar.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ffffff', secondary: '#ff7b00' },
    create: () => {
      const m: { x: number; y: number; v: number }[] = [];
      return {
        frame(c) {
          if (m.length < 4 && c.rand() < c.dt * 3) m.push({ x: 0.3 + c.rand() * 1.0, y: -0.2, v: 0.5 + c.rand() * 0.5 });
          c.fill([0, 0, 6]);
          for (const s of m) {
            s.x -= s.v * c.dt * 0.6;
            s.y += s.v * c.dt * 1.2;
            for (const k of c.keys) {
              const dx = (k.x - s.x) * ASPECT, dy = k.y - s.y;
              const along = (dx * 0.45 - dy * 0.9);
              const across = Math.abs(dx * 0.9 + dy * 0.45);
              if (along < 0 || along > 0.7 || across > 0.12) continue;
              const v = (1 - along / 0.7) * (1 - across / 0.12);
              c.add(k, mix(c.secondary, c.primary, Math.pow(1 - along / 0.7, 3)).map((x) => x * v) as RGB);
            }
          }
          for (let i = m.length - 1; i >= 0; i--) if (m[i].y > 1.6) m.splice(i, 1);
        },
      };
    },
  },
  {
    id: 'starry-night',
    name: 'Yıldızlı Gece',
    category: 'space',
    description: 'Lacivert gökte göz kırpan yıldızlar ve arada bir kayan yıldız.',
    uses: ['primary'],
    defaults: { primary: '#06104a' },
    create: () => {
      let shoot = -1;
      let sy = 0.3;
      return {
        frame(c) {
          if (shoot < 0 && c.rand() < c.dt * 0.25) { shoot = 0; sy = 0.1 + c.rand() * 0.5; }
          for (const k of c.keys) {
            const tw = Math.pow(clamp(Math.sin(c.t * (1 + hash(k.index) * 2) + hash(k.index * 9) * 40)), 10);
            c.set(k, mix(scale(c.primary, 0.6), [255, 250, 230], tw * (hash(k.index * 5) > 0.45 ? 1 : 0.2)));
          }
          if (shoot >= 0) {
            shoot += c.dt * 1.4;
            for (const k of c.keys) {
              const along = shoot - k.x;
              if (along < 0 || along > 0.35) continue;
              const v = (1 - along / 0.35) * Math.exp(-Math.pow((k.y - sy - k.x * 0.25) * 6, 2));
              c.add(k, scale([255, 255, 255], v));
            }
            if (shoot > 1.4) shoot = -1;
          }
        },
      };
    },
  },
  {
    id: 'fireworks',
    name: 'Havai Fişek',
    category: 'space',
    description: 'Yükselen roketler gökyüzünde rengarenk patlar.',
    uses: ['palette'],
    defaults: { palette: 'rainbow' },
    isNew: true,
    create: () => {
      const rockets: Rocket[] = [];
      return {
        frame(c) {
          if (rockets.length < 3 && c.rand() < c.dt * 1.3) {
            rockets.push({ x: 0.1 + c.rand() * 0.8, y: 1.1, vy: 1.3 + c.rand() * 0.4, peak: 0.15 + c.rand() * 0.35, color: c.pal(c.rand()), boom: -1 });
          }
          c.fill([0, 0, 0]);
          for (const r of rockets) {
            if (r.boom < 0) {
              r.y -= r.vy * c.dt;
              glow(c, r.x, r.y, [255, 200, 120], 0.08, 1);
              if (r.y <= r.peak) r.boom = 0;
            } else {
              r.boom += c.dt;
              const rad = r.boom * 0.9;
              const fade = Math.max(0, 1 - r.boom / 1.4);
              for (const k of c.keys) {
                const d = pdist(k.x, k.y, r.x, r.peak + r.boom * r.boom * 0.15);
                const ring = Math.exp(-Math.pow((d - rad) / 0.09, 2));
                const flashCore = r.boom < 0.15 ? Math.exp(-d * d * 30) : 0;
                const sparkle = 0.6 + 0.4 * Math.sin(k.index * 3.7 + r.boom * 30);
                const v = (ring * sparkle + flashCore) * fade;
                if (v > 0.01) c.add(k, mix(r.color, [255, 255, 255], flashCore).map((x) => x * v) as RGB);
              }
            }
          }
          for (let i = rockets.length - 1; i >= 0; i--) if (rockets[i].boom > 1.5) rockets.splice(i, 1);
        },
      };
    },
  },
  {
    id: 'radar',
    name: 'Radar',
    category: 'space',
    description: 'Dönen radar ışını, yakaladığı hedefleri parlatır.',
    uses: ['primary'],
    defaults: { primary: '#00ff55' },
    create: stateless((c) => {
      const a = c.t * 2;
      for (const k of c.keys) {
        const diff = ((a - k.angle) % TAU + TAU) % TAU;
        const trail = Math.exp(-diff * 1.6);
        const blip = hash(k.index * 13) > 0.88 ? Math.exp(-diff * 0.5) : 0;
        const ring = Math.pow(0.5 + 0.5 * Math.cos(k.dist * 25), 20) * 0.15;
        c.set(k, mix(scale(c.primary, trail + ring + 0.02), [255, 255, 255], blip * 0.8));
      }
    }),
  },
  {
    id: 'comet',
    name: 'Kuyruklu Yıldız',
    category: 'space',
    description: 'Klavyenin kenarlarında dolaşan uzun kuyruklu bir kuyruklu yıldız.',
    uses: ['palette'],
    defaults: { palette: 'ice' },
    params: [{ key: 'tail', label: 'Kuyruk', type: 'range', min: 3, max: 25, step: 1, default: 12 }],
    create: stateless((c) => {
      const n = PERIMETER.length;
      const head = (c.t * 12) % n;
      const tail = num(c.p.tail, 12);
      c.fill([0, 0, 0]);
      for (const k of c.keys) c.set(k, scale(c.pal(k.x + c.t * 0.1), 0.05));
      PERIMETER.forEach((k, i) => {
        const back = (head - i + n) % n;
        if (back < tail) {
          const v = Math.pow(1 - back / tail, 1.6);
          c.set(k, mix(c.pal(back / tail * 0.5 + c.t * 0.1), [255, 255, 255], back < 1 ? 0.7 : 0).map((x) => x * v) as RGB);
        }
      });
    }),
  },
  {
    id: 'nebula',
    name: 'Nebula',
    category: 'space',
    description: 'Uzayın derinliklerinde süzülen renkli gaz bulutları.',
    uses: ['palette'],
    defaults: { palette: 'galaxy', speed: 0.6 },
    create: stateless((c) => {
      for (const k of c.keys) {
        const n = fbm(k.x * 2 + c.t * 0.05, k.y * 1.5, c.t * 0.08, 4);
        const m = fbm(k.x * 3 + 10, k.y * 2 - c.t * 0.04, c.t * 0.05, 3);
        const star = hash(k.index * 11) > 0.9 ? Math.pow(clamp(Math.sin(c.t * 2 + k.index)), 4) : 0;
        c.set(k, mix(scale(c.pal(n + m * 0.5), Math.pow(n, 1.4) * 1.2), [255, 255, 255], star * 0.8));
      }
    }),
  },
  {
    id: 'warp',
    name: 'Işık Hızı',
    category: 'space',
    description: 'Yıldızlar merkezden dışa doğru çizgiler halinde akar — hiper uzay!',
    uses: ['primary'],
    defaults: { primary: '#9fd3ff', speed: 1.2 },
    isNew: true,
    create: stateless((c) => {
      for (const k of c.keys) {
        const bin = Math.floor(((k.angle + Math.PI) / TAU) * 14);
        const ph = fract(k.dist * 1.6 - c.t * 0.9 + hash(bin) * 3);
        const streak = ph < 0.22 ? Math.pow(1 - ph / 0.22, 2) * k.dist * 1.6 : 0;
        c.set(k, mix([0, 0, 8], c.primary, clamp(streak)));
      }
    }),
  },
  {
    id: 'black-hole',
    name: 'Kara Delik',
    category: 'space',
    description: 'Karanlık merkezin etrafında dönen kızgın yığılma diski.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff9a00', secondary: '#ff00aa' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const disk = Math.exp(-Math.pow((k.dist - 0.35) / 0.15, 2));
        const swirl = 0.5 + 0.5 * Math.sin(k.angle * 3 - c.t * 3 + k.dist * 10);
        const hole = k.dist < 0.18 ? 0 : 1;
        c.set(k, scale(mix(c.secondary, c.primary, swirl), disk * hole * (0.4 + 0.6 * swirl)));
      }
    }),
  },
  {
    id: 'pulsar',
    name: 'Pulsar',
    category: 'space',
    description: 'Fener gibi dönen iki ışın ve atan bir yıldız çekirdeği.',
    uses: ['primary'],
    defaults: { primary: '#a06bff' },
    create: stateless((c) => {
      const a = c.t * 2.5;
      const pulse = Math.pow(0.5 + 0.5 * Math.sin(c.t * 10), 4);
      for (const k of c.keys) {
        const d1 = Math.abs(Math.sin(k.angle - a));
        const beam = Math.exp(-d1 * d1 * 40) * (0.4 + k.dist);
        const core = Math.exp(-k.dist * k.dist * 60) * (0.5 + pulse);
        c.set(k, mix(scale(c.primary, clamp(beam)), [255, 255, 255], clamp(core)));
      }
    }),
  },
  {
    id: 'solar-flare',
    name: 'Güneş Patlaması',
    category: 'space',
    description: 'Kaynayan güneş yüzeyi ve aniden fışkıran plazma patlamaları.',
    uses: [],
    defaults: { speed: 1 },
    create: stateless((c) => {
      for (const k of c.keys) {
        const n = fbm(k.x * 3, k.y * 3, c.t * 0.4, 3);
        const flare = Math.pow(clamp(Math.sin(c.t * 0.7 + k.x * 2) * 1.5 - 0.5), 2) * Math.exp(-k.y * 2);
        c.set(k, mix(hsv(0.02 + n * 0.1, 1, 0.5 + n * 0.5), [255, 255, 200], clamp(flare + Math.pow(n, 6))));
      }
    }),
  },
];
