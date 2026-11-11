import { RGB, clamp, fbm, fract, hsv, mix, noise3, scale } from '../color';
import { ASPECT, pdist } from '../layout';
import { TAU, along, directionParam, num } from './helpers';
import { EffectDef, stateless } from './types';

export const waveEffects: EffectDef[] = [
  {
    id: 'rainbow-flow',
    name: 'Gökkuşağı Akışı',
    category: 'wave',
    description: 'Kesintisiz gökkuşağı seçtiğin yönde akar.',
    uses: ['palette'],
    defaults: { palette: 'rainbow' },
    params: [directionParam, { key: 'width', label: 'Genişlik', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1 }],
    create: stateless((c) => {
      const dir = String(c.p.dir ?? 'right');
      const w = num(c.p.width, 1);
      for (const k of c.keys) c.set(k, c.pal(along(k, dir) / w - c.t * 0.25));
    }),
  },
  {
    id: 'spiral',
    name: 'Spiral Gökkuşağı',
    category: 'wave',
    description: 'Renkler merkez etrafında dönen bir girdap oluşturur.',
    uses: ['palette'],
    defaults: { palette: 'rainbow' },
    params: [{ key: 'twist', label: 'Burgu', type: 'range', min: 0, max: 4, step: 0.1, default: 1.5 }],
    create: stateless((c) => {
      const tw = num(c.p.twist, 1.5);
      for (const k of c.keys) c.set(k, c.pal(k.angle / TAU + k.dist * tw - c.t * 0.25));
    }),
  },
  {
    id: 'ocean',
    name: 'Okyanus Dalgaları',
    category: 'wave',
    description: 'Derin mavi sularda köpüklü dalgalar kıyıya vurur.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#0050ff', secondary: '#00ffd5' },
    isNew: true,
    create: stateless((c) => {
      for (const k of c.keys) {
        const w = Math.sin(k.x * 9 - c.t * 2.2 + Math.sin(k.y * 3 + c.t * 0.8) * 1.5);
        const w2 = Math.sin(k.x * 4 + c.t * 1.1 + k.y * 2);
        const v = (w * 0.6 + w2 * 0.4) * 0.5 + 0.5;
        const foam = Math.pow(clamp((v - 0.78) / 0.22), 2);
        const base = mix(scale(c.primary, 0.25), c.secondary, v * 0.8);
        c.set(k, mix(base, [255, 255, 255], foam * 0.85));
      }
    }),
  },
  {
    id: 'plasma',
    name: 'Plazma',
    category: 'wave',
    description: 'Demoscene klasiği: eriyen, akışkan renk plazması.',
    uses: ['palette'],
    defaults: { palette: 'galaxy' },
    create: stateless((c) => {
      const t = c.t * 0.8;
      for (const k of c.keys) {
        const x = k.x * ASPECT, y = k.y;
        const v = Math.sin(x * 3.2 + t) + Math.sin(y * 5 - t * 1.3) + Math.sin((x + y) * 2.5 + t * 0.7)
          + Math.sin(Math.hypot(x - 1.3 + Math.sin(t * 0.4), y - 0.5 + Math.cos(t * 0.5)) * 5 - t);
        c.set(k, c.pal(v / 8 + t * 0.05));
      }
    }),
  },
  {
    id: 'aurora',
    name: 'Kuzey Işıkları',
    category: 'wave',
    description: 'Gökyüzünde dalgalanan aurora perdeleri.',
    uses: ['palette'],
    defaults: { palette: 'aurora', speed: 0.8 },
    isNew: true,
    create: stateless((c) => {
      const t = c.t * 0.25;
      for (const k of c.keys) {
        const curtain = fbm(k.x * 2.2, t * 0.6, t, 3);
        const band = Math.exp(-Math.pow((k.y - (0.3 + curtain * 0.5)) * 2.8, 2));
        const shimmer = 0.6 + 0.4 * noise3(k.x * 6, k.y * 2, t * 4);
        c.set(k, scale(c.pal(curtain + k.x * 0.3 + t * 0.1), band * shimmer + 0.04));
      }
    }),
  },
  {
    id: 'lava-lamp',
    name: 'Lav Lambası',
    category: 'wave',
    description: 'Yavaşça birleşip ayrılan sıcak lav damlaları.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff2a00', secondary: '#3a005a' },
    create: stateless((c) => {
      const t = c.t * 0.35;
      const blobs = [0, 1, 2, 3, 4].map((i) => [
        0.5 + 0.42 * Math.sin(t * (0.7 + i * 0.13) + i * 2.1),
        0.5 + 0.55 * Math.sin(t * (0.9 + i * 0.17) + i * 1.3),
      ]);
      for (const k of c.keys) {
        let f = 0;
        for (const [bx, by] of blobs) {
          const d = pdist(k.x, k.y, bx, by);
          f += 0.04 / (d * d + 0.01);
        }
        const v = clamp((f - 0.8) * 0.8);
        c.set(k, mix(scale(c.secondary, 0.5), mix(c.primary, [255, 200, 0], clamp((f - 2) * 0.3)), v));
      }
    }),
  },
  {
    id: 'interference',
    name: 'Girişim Desenleri',
    category: 'wave',
    description: 'İki dalga kaynağının üst üste binmesiyle oluşan hipnotik desen.',
    uses: ['palette'],
    defaults: { palette: 'ice' },
    create: stateless((c) => {
      const t = c.t;
      const ax = 0.25 + 0.15 * Math.sin(t * 0.5), ay = 0.5 + 0.4 * Math.cos(t * 0.4);
      const bx = 0.75 + 0.15 * Math.cos(t * 0.45), by = 0.5 + 0.4 * Math.sin(t * 0.6);
      for (const k of c.keys) {
        const v = Math.sin(pdist(k.x, k.y, ax, ay) * 12 - t * 4) + Math.sin(pdist(k.x, k.y, bx, by) * 12 - t * 4);
        const b = Math.pow((v + 2) / 4, 2);
        c.set(k, scale(c.pal(v * 0.1 + t * 0.05), b));
      }
    }),
  },
  {
    id: 'kaleidoscope',
    name: 'Kaleydoskop',
    category: 'wave',
    description: 'Simetrik, sürekli değişen kaleydoskop desenleri.',
    uses: ['palette'],
    defaults: { palette: 'candy' },
    params: [{ key: 'folds', label: 'Simetri', type: 'range', min: 2, max: 8, step: 1, default: 6 }],
    create: stateless((c) => {
      const n = num(c.p.folds, 6);
      for (const k of c.keys) {
        const seg = TAU / n;
        let a = ((k.angle + c.t * 0.3) % seg + seg) % seg;
        a = Math.abs(a - seg / 2);
        const v = fbm(a * 2, k.dist * 3 - c.t * 0.3, c.t * 0.15, 2);
        c.set(k, scale(c.pal(v * 1.5 + c.t * 0.05), 0.4 + v * 0.8));
      }
    }),
  },
  {
    id: 'color-cycle',
    name: 'Renk Döngüsü',
    category: 'wave',
    description: 'Tüm klavye tek renk olarak paletin içinde yavaşça gezinir.',
    uses: ['palette'],
    defaults: { palette: 'rainbow', speed: 0.6 },
    create: stateless((c) => c.fill(c.pal(c.t * 0.08))),
  },
  {
    id: 'gradient-scroll',
    name: 'Gradyan Kayması',
    category: 'wave',
    description: 'Seçtiğin palet klavye üzerinde ipek gibi kayar.',
    uses: ['palette'],
    defaults: { palette: 'sunset' },
    params: [directionParam],
    create: stateless((c) => {
      const dir = String(c.p.dir ?? 'right');
      for (const k of c.keys) c.set(k, c.pal(along(k, dir) * 0.6 - c.t * 0.1));
    }),
  },
  {
    id: 'sine-ribbons',
    name: 'Sinüs Kurdeleleri',
    category: 'wave',
    description: 'Üç renkli kurdele birbirinin içinden geçerek dalgalanır.',
    uses: ['palette'],
    defaults: { palette: 'neon' },
    create: stateless((c) => {
      for (const k of c.keys) {
        let col: RGB = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
          const r = 2.5 + 2.4 * Math.sin(k.x * 5.5 + c.t * (1 + i * 0.35) + i * 2.1);
          const v = clamp(1 - Math.abs(k.row - r) * 0.9);
          const cc = c.pal(i / 3);
          col = [col[0] + cc[0] * v, col[1] + cc[1] * v, col[2] + cc[2] * v];
        }
        c.set(k, col);
      }
    }),
  },
  {
    id: 'vortex',
    name: 'Hipnoz Girdabı',
    category: 'wave',
    description: 'Seni içine çeken dönen spiral kollar.',
    uses: ['palette'],
    defaults: { palette: 'vapor' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const v = Math.sin(k.dist * 14 - c.t * 4 + k.angle * 3);
        c.set(k, scale(c.pal(k.angle / TAU + c.t * 0.1), Math.pow(clamp(v), 1.5)));
      }
    }),
  },
  {
    id: 'candy-stripes',
    name: 'Şeker Çubuğu',
    category: 'wave',
    description: 'Berber direği gibi çapraz çizgiler sonsuzca kayar.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ff0040', secondary: '#ffffff' },
    params: [{ key: 'count', label: 'Çizgi sayısı', type: 'range', min: 1, max: 6, step: 1, default: 3 }],
    create: stateless((c) => {
      const n = num(c.p.count, 3);
      for (const k of c.keys) {
        const u = fract((k.x * ASPECT * 0.4 + k.y * 0.6) * n * 0.5 - c.t * 0.5);
        const v = clamp(Math.abs(u - 0.5) * 6 - 1);
        c.set(k, mix(c.primary, c.secondary, v));
      }
    }),
  },
  {
    id: 'liquid',
    name: 'Sıvı Metal',
    category: 'wave',
    description: 'Paletin renkleri akışkan bir sıvı gibi birbirine karışır.',
    uses: ['palette'],
    defaults: { palette: 'gold' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const v = fbm(k.x * 1.8, k.y * 1.2, c.t * 0.2, 3);
        const hl = Math.pow(clamp((v - 0.62) * 4), 2);
        c.set(k, mix(c.pal(v * 1.6 + c.t * 0.04), [255, 255, 255], hl * 0.6));
      }
    }),
  },
  {
    id: 'prism',
    name: 'Prizma',
    category: 'wave',
    description: 'Beyaz ışık bir prizmadan geçip gökkuşağına ayrılır.',
    uses: [],
    defaults: { speed: 1 },
    isNew: true,
    create: stateless((c) => {
      for (const k of c.keys) {
        const pulse = 0.65 + 0.35 * Math.sin(k.x * 18 - c.t * 6);
        if (k.x < 0.42) {
          const v = Math.exp(-Math.pow((k.y - 0.5) * 5, 2)) * pulse;
          c.set(k, scale([255, 255, 255], v));
        } else {
          const spread = Math.max(0.08, (k.x - 0.42) * 2.4);
          const hue = ((k.y - 0.5) / spread) * 0.5 + 0.5;
          const inFan = clamp(1 - Math.max(0, Math.abs(hue - 0.5) - 0.5) * 8);
          c.set(k, scale(hsv(clamp(hue) * 0.8 + Math.sin(c.t * 0.5) * 0.04), inFan * pulse));
        }
      }
    }),
  },
];
