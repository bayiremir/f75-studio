import { RGB, clamp, fract, hash, hsv, mix, scale } from '../color';
import { ASPECT } from '../layout';
import { GH, GW, Grid, TAU, gauss, keyCell, num } from './helpers';
import { EffectDef, stateless } from './types';

/** Double "lub-dub" envelope over one beat period (0..1). */
function beat(p: number): number {
  p = fract(p);
  return Math.min(1, gauss(p, 0.06, 0.035) + 0.75 * gauss(p, 0.24, 0.045));
}

export const pulseEffects: EffectDef[] = [
  {
    id: 'heartbeat',
    name: 'Kalp Atışı',
    category: 'pulse',
    description: 'Gerçek bir kalp gibi "güm-güm" çift atış, merkezden dışa yayılır.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff0a2a', secondary: '#2a0006' },
    isNew: true,
    params: [
      { key: 'bpm', label: 'Nabız (BPM)', type: 'range', min: 40, max: 180, step: 1, default: 72 },
      { key: 'spread', label: 'Yayılma', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5 },
    ],
    create: stateless((c) => {
      const period = 60 / num(c.p.bpm, 72);
      const spread = num(c.p.spread, 0.5);
      for (const k of c.keys) {
        const v = beat((c.t - k.dist * spread * 0.35) / period);
        c.set(k, mix(c.secondary, c.primary, v));
      }
    }),
  },
  {
    id: 'heart-icon',
    name: 'Atan Kalp',
    category: 'pulse',
    description: 'Klavyenin ortasında kalp şekli, nabız ritmiyle büyüyüp küçülür.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff1744', secondary: '#16000a' },
    isNew: true,
    params: [{ key: 'bpm', label: 'Nabız (BPM)', type: 'range', min: 40, max: 160, step: 1, default: 68 }],
    create: stateless((c) => {
      const period = 60 / num(c.p.bpm, 68);
      const env = beat(c.t / period);
      const s = 0.36 + 0.09 * env;
      for (const k of c.keys) {
        const u = ((k.x - 0.5) * ASPECT) / (s * 2.1);
        const v = -((k.y - 0.42) / s) * 0.95;
        const a = u * u + v * v - 1;
        const f = a * a * a - u * u * v * v * v;
        const inside = clamp(0.5 - f * 4);
        const rim = clamp(1 - Math.abs(f) * 6) * 0.6;
        c.set(k, mix(scale(c.secondary, 1 + env), mix(c.primary, [255, 220, 230], env * 0.25 * rim), Math.max(inside, rim)));
      }
    }),
  },
  {
    id: 'ecg',
    name: 'EKG Monitörü',
    category: 'pulse',
    description: 'Hastane monitörü gibi kalp ritmi çizgisi soldan sağa akar.',
    uses: ['primary'],
    defaults: { primary: '#00ff6a', speed: 1 },
    isNew: true,
    create: stateless((c) => {
      const head = fract(c.t * 0.3);
      for (const k of c.keys) {
        const u = fract(k.x * 1.5);
        const r = 2.6 - 0.5 * gauss(u, 0.2, 0.04) + 0.6 * gauss(u, 0.37, 0.015) - 2.8 * gauss(u, 0.43, 0.02)
          + 2.6 * gauss(u, 0.49, 0.02) - 0.9 * gauss(u, 0.72, 0.05);
        const line = clamp(1.15 - Math.abs(k.row - r));
        const age = fract(head - k.x);
        const trail = Math.exp(-age * 3.5);
        const headGlow = gauss(age, 0, 0.02);
        const col = mix(c.primary, [255, 255, 255], headGlow * 0.7);
        c.set(k, scale(col, line * trail + 0.03));
      }
    }),
  },
  {
    id: 'breathe-gradient',
    name: 'Nefes Gradyanı',
    category: 'pulse',
    description: 'Tüm renk paleti yumuşak bir nefes ritmiyle sönüp parlar.',
    uses: ['palette'],
    defaults: { palette: 'aurora', speed: 1 },
    create: stateless((c) => {
      const v = Math.pow(0.08 + 0.92 * (0.5 - 0.5 * Math.cos(c.t * TAU * 0.22)), 2.2);
      for (const k of c.keys) c.set(k, scale(c.pal(k.x * 0.5 + c.t * 0.03), v));
    }),
  },
  {
    id: 'strobe',
    name: 'Stroboskop',
    category: 'pulse',
    description: 'Parti ışığı gibi keskin flaşlar. Renkli modda her flaş farklı renk.',
    uses: ['primary'],
    defaults: { primary: '#ffffff', speed: 1 },
    params: [
      { key: 'rate', label: 'Flaş / saniye', type: 'range', min: 1, max: 15, step: 1, default: 6 },
      { key: 'colorful', label: 'Renkli', type: 'bool', default: true },
    ],
    create: stateless((c) => {
      const rate = num(c.p.rate, 6);
      const n = Math.floor(c.t * rate);
      const on = fract(c.t * rate) < 0.25;
      const col: RGB = c.p.colorful ? hsv(hash(n) ) : c.primary;
      c.fill(on ? col : [0, 0, 0]);
    }),
  },
  {
    id: 'pulse-rings',
    name: 'Nabız Halkaları',
    category: 'pulse',
    description: 'Merkezden dışarı doğru renkli halkalar yayılır.',
    uses: ['palette'],
    defaults: { palette: 'neon' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const ph = k.dist * 3 - c.t * 0.9;
        const v = Math.pow(0.5 + 0.5 * Math.cos(ph * TAU), 5);
        c.set(k, scale(c.pal(Math.floor(-ph) * 0.17), v));
      }
    }),
  },
  {
    id: 'metronome',
    name: 'Metronom',
    category: 'pulse',
    description: 'Işık çubuğu bir metronom gibi sağa sola salınır, uçlarda parlar.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#00e5ff', secondary: '#ff00c8' },
    create: stateless((c) => {
      const s = Math.sin(c.t * Math.PI * 1.2);
      const x = 0.5 + 0.5 * s;
      const edge = Math.pow(Math.abs(s), 30);
      for (const k of c.keys) {
        const d = Math.abs(k.x - x);
        const v = Math.exp(-d * d * 300);
        c.set(k, mix(scale(c.secondary, 0.08 + edge * 0.5), c.primary, v));
      }
    }),
  },
  {
    id: 'disco',
    name: 'Disko Zemini',
    category: 'pulse',
    description: '70\'lerin disko pisti gibi kareler ritimle renk değiştirir.',
    uses: ['palette'],
    defaults: { palette: 'vapor' },
    params: [{ key: 'bpm', label: 'Tempo (BPM)', type: 'range', min: 60, max: 180, step: 1, default: 120 }],
    create: stateless((c) => {
      const b = (c.t * num(c.p.bpm, 120)) / 60;
      const n = Math.floor(b);
      const env = 0.35 + 0.65 * Math.pow(1 - fract(b), 2);
      for (const k of c.keys) {
        const [cx, cy] = keyCell(k);
        const cell = Math.floor(cx / 2) * 7 + cy;
        c.set(k, scale(c.pal(hash(cell * 13 + n * 7.7)), env));
      }
    }),
  },
  {
    id: 'police',
    name: 'Polis Çakarı',
    category: 'pulse',
    description: 'Kırmızı-mavi çift flaşlı polis ışığı.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff0000', secondary: '#0030ff' },
    create: stateless((c) => {
      const ph = fract(c.t * 0.9);
      const left = (ph < 0.1 || (ph > 0.15 && ph < 0.25)) ? 1 : 0;
      const right = ((ph > 0.5 && ph < 0.6) || (ph > 0.65 && ph < 0.75)) ? 1 : 0;
      for (const k of c.keys) {
        if (k.x < 0.5) c.set(k, scale(c.primary, left + 0.04));
        else c.set(k, scale(c.secondary, right + 0.04));
      }
    }),
  },
  {
    id: 'beacon',
    name: 'Dönen Siren',
    category: 'pulse',
    description: 'Ortadan dönen bir ışık huzmesi, sirenin dönen lambası gibi.',
    uses: ['primary'],
    defaults: { primary: '#ff8800' },
    create: stateless((c) => {
      const a = c.t * 4;
      for (const k of c.keys) {
        let d = Math.abs(((k.angle - a) % TAU + TAU) % TAU - Math.PI);
        d = Math.PI - d;
        const v = Math.exp(-d * d * 3) + Math.exp(-(Math.PI - d) * (Math.PI - d) * 3);
        c.set(k, scale(c.primary, Math.min(1, v + 0.03)));
      }
    }),
  },
  {
    id: 'equalizer-pulse',
    name: 'Ritim Sütunları',
    category: 'pulse',
    description: 'Tuş sütunları sırayla zıplayan ritim çubukları gibi yükselir.',
    uses: ['palette'],
    defaults: { palette: 'cyberpunk' },
    create: () => {
      const grid = new Grid();
      return {
        frame(c) {
          grid.clear();
          for (let x = 0; x < GW; x++) {
            const h = (0.5 + 0.5 * Math.sin(c.t * 3 + x * 0.7) * Math.sin(c.t * 1.3 + x * 0.31)) * GH;
            for (let y = 0; y < GH; y++) {
              const fromBottom = GH - 1 - y;
              if (fromBottom < h) grid.set(x, y, c.pal(fromBottom / GH * 0.6 + x * 0.02));
            }
          }
          grid.blit(c);
        },
      };
    },
  },
];
