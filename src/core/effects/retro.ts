import { RGB, clamp, fract, hash, hsv, mix, scale } from '../color';
import { ASPECT, KEY_BY_ID, PERIMETER, pdist } from '../layout';
import { GH, GW, Grid, glow, keyCell, num, stepper } from './helpers';
import { EffectDef, stateless } from './types';

const TETROMINOES: [number, number][][] = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
];

export const retroEffects: EffectDef[] = [
  {
    id: 'matrix',
    name: 'Matrix Kod Yağmuru',
    category: 'retro',
    description: 'Yeşil dijital kod sütunları beyaz başlarla yağar.',
    uses: ['primary'],
    defaults: { primary: '#00ff41' },
    isNew: true,
    create: () => {
      const cols = Array.from({ length: GW }, () => ({ y: -Math.random() * 6, v: 3 + Math.random() * 5 }));
      const grid = new Grid();
      return {
        frame(c) {
          grid.fade(Math.pow(0.08, c.dt));
          cols.forEach((col, x) => {
            col.y += col.v * c.dt;
            const y = Math.floor(col.y);
            if (y >= 0 && y < GH) {
              grid.set(x, y, [200, 255, 210]);
              if (y > 0) {
                const p = grid.get(x, y - 1);
                if (p[0] > 150) grid.set(x, y - 1, c.primary);
              }
            }
            if (col.y > GH + 4 + c.rand() * 4) { col.y = -c.rand() * 3; col.v = 3 + c.rand() * 5; }
          });
          grid.blit(c);
        },
      };
    },
  },
  {
    id: 'scanner',
    name: 'Kara Şimşek (KITT)',
    category: 'retro',
    description: '80\'lerin efsane arabası gibi sağa sola tarayan kırmızı göz.',
    uses: ['primary'],
    defaults: { primary: '#ff0000' },
    create: stateless((c) => {
      const s = Math.sin(c.t * 2.2);
      const x = 0.5 + 0.5 * s;
      const dir = Math.cos(c.t * 2.2) > 0 ? 1 : -1;
      for (const k of c.keys) {
        const d = (k.x - x) * dir;
        const v = d > 0 ? Math.exp(-d * d * 800) : Math.exp(-d * d * 30);
        c.set(k, scale(c.primary, v * Math.exp(-Math.pow((k.y - 0.5) * 2.2, 2)) + 0.02));
      }
    }),
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    category: 'retro',
    description: 'Pac-Man yemleri yiyerek ilerler, hayaletler peşinde!',
    uses: [],
    defaults: { speed: 1 },
    isNew: true,
    create: stateless((c) => {
      const cycle = fract(c.t * 0.12);
      const forward = cycle < 0.5;
      const p = forward ? cycle * 2 : (cycle - 0.5) * 2;
      const px = forward ? -0.15 + p * 1.5 : 1.15 - p * 1.5;
      const ghosts: RGB[] = [[255, 0, 0], [255, 120, 200], [0, 230, 255], [255, 160, 0]];
      const mouth = Math.abs(Math.sin(c.t * 14));
      for (const k of c.keys) {
        const inLane = k.row >= 2 && k.row <= 3;
        let col: RGB = inLane ? [0, 0, 50] : [0, 0, 160];
        if (inLane) {
          const eaten = forward ? k.x < px : k.x > px;
          if (!eaten && k.index % 2 === 0) col = [255, 200, 150];
          const d = Math.abs(k.x - px) * ASPECT;
          if (d < 0.18) col = mix([255, 230, 0], [0, 0, 0], d > 0.1 && mouth > 0.5 && k.row === 2 ? 1 : 0);
          ghosts.forEach((g, i) => {
            const gx = forward ? px - 0.14 * (i + 1.6) : px + 0.14 * (i + 1.6);
            if (Math.abs(k.x - gx) * ASPECT < 0.07) col = forward ? g : (Math.sin(c.t * 10) > 0 ? [30, 30, 255] : [255, 255, 255]);
          });
        }
        c.set(k, col);
      }
    }),
  },
  {
    id: 'snake-game',
    name: 'Yılan Oyunu',
    category: 'retro',
    description: 'Klavyede kendi kendine oynayan klasik Nokia yılan oyunu.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#00ff3c', secondary: '#ff1744' },
    create: () => {
      let snake: [number, number][] = [[3, 3], [2, 3], [1, 3]];
      let food: [number, number] = [10, 2];
      let dead = 0;
      const tick = stepper(7);
      const grid = new Grid();
      const free = (x: number, y: number) => x >= 0 && y >= 0 && x < GW && y < GH && !snake.some(([a, b]) => a === x && b === y);
      const reset = () => { snake = [[3, 3], [2, 3], [1, 3]]; };
      const placeFood = (rand: () => number) => {
        for (let i = 0; i < 100; i++) {
          const f: [number, number] = [Math.floor(rand() * GW), Math.floor(rand() * GH)];
          if (free(f[0], f[1])) { food = f; return; }
        }
        reset();
      };
      return {
        frame(c) {
          tick(c.dt, () => {
            if (dead > 0) { dead--; if (dead === 0) reset(); return; }
            const [hx, hy] = snake[0];
            const moves: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const opts = moves
              .map(([dx, dy]) => [hx + dx, hy + dy] as [number, number])
              .filter(([x, y]) => free(x, y))
              .sort((a, b) => (Math.abs(a[0] - food[0]) + Math.abs(a[1] - food[1])) - (Math.abs(b[0] - food[0]) + Math.abs(b[1] - food[1])) + (c.rand() - 0.5) * 0.5);
            if (!opts.length) { dead = 8; return; }
            snake.unshift(opts[0]);
            if (opts[0][0] === food[0] && opts[0][1] === food[1]) placeFood(c.rand);
            else snake.pop();
          });
          grid.clear();
          const blink = dead > 0 && dead % 2 === 0;
          if (!blink) snake.forEach(([x, y], i) => grid.set(x, y, i === 0 ? [220, 255, 220] : scale(c.primary, 1 - (i / snake.length) * 0.6)));
          grid.set(food[0], food[1], scale(c.secondary, 0.6 + 0.4 * Math.sin(c.t * 10)));
          grid.blit(c);
        },
      };
    },
  },
  {
    id: 'tetris',
    name: 'Tetris',
    category: 'retro',
    description: 'Düşen tetris blokları üst üste dizilir, dolan satırlar patlar.',
    uses: ['palette'],
    defaults: { palette: 'rainbow' },
    isNew: true,
    create: () => {
      const W = GW, H = GH;
      let board: (RGB | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
      let piece: { cells: [number, number][]; x: number; y: number; color: RGB } | null = null;
      let clearing: number[] = [];
      let flash = 0;
      const tick = stepper(6);
      const grid = new Grid();
      const fits = (cells: [number, number][], x: number, y: number) =>
        cells.every(([cx, cy]) => {
          const gx = x + cx, gy = y + cy;
          return gx >= 0 && gx < W && gy < H && (gy < 0 || !board[gy][gx]);
        });
      return {
        frame(c) {
          tick(c.dt, () => {
            if (flash > 0) {
              flash--;
              if (flash === 0) {
                board = board.filter((_, y) => !clearing.includes(y));
                while (board.length < H) board.unshift(Array(W).fill(null));
                clearing = [];
              }
              return;
            }
            if (!piece) {
              const shape = TETROMINOES[Math.floor(c.rand() * TETROMINOES.length)];
              const x = Math.floor(c.rand() * (W - 3));
              piece = { cells: shape, x, y: -2, color: c.pal(c.rand()) };
              if (!fits(shape, x, 0)) { board = Array.from({ length: H }, () => Array(W).fill(null)); }
              return;
            }
            if (fits(piece.cells, piece.x, piece.y + 1)) { piece.y++; return; }
            for (const [cx, cy] of piece.cells) {
              const gy = piece.y + cy;
              if (gy >= 0) board[gy][piece.x + cx] = piece.color;
            }
            piece = null;
            const full = board.map((row, y) => (row.filter(Boolean).length >= W - 2 ? y : -1)).filter((y) => y >= 0);
            if (full.length) { clearing = full; flash = 4; }
          });
          grid.clear();
          board.forEach((row, y) => row.forEach((col, x) => {
            if (clearing.includes(y)) grid.set(x, y, flash % 2 ? [255, 255, 255] : [40, 40, 40]);
            else if (col) grid.set(x, y, col);
          }));
          if (piece) for (const [cx, cy] of piece.cells) grid.set(piece.x + cx, piece.y + cy, piece.color);
          grid.blit(c);
        },
      };
    },
  },
  {
    id: 'game-of-life',
    name: 'Hayat Oyunu',
    category: 'retro',
    description: 'Conway\'in Hayat Oyunu: hücreler doğar, yaşar ve ölür.',
    uses: ['palette'],
    defaults: { palette: 'toxic' },
    create: () => {
      let cells = new Uint8Array(GW * GH);
      let age = new Float32Array(GW * GH);
      let stale = 0;
      let last = '';
      const tick = stepper(4);
      const grid = new Grid();
      const seed = (rand: () => number) => { for (let i = 0; i < cells.length; i++) cells[i] = rand() < 0.38 ? 1 : 0; age.fill(0); };
      let seeded = false;
      return {
        frame(c) {
          if (!seeded) { seed(c.rand); seeded = true; }
          tick(c.dt, () => {
            const next = new Uint8Array(GW * GH);
            for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
              let n = 0;
              for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (dx || dy) n += cells[((y + dy + GH) % GH) * GW + ((x + dx + GW) % GW)];
              }
              const i = y * GW + x;
              next[i] = n === 3 || (n === 2 && cells[i]) ? 1 : 0;
              age[i] = next[i] ? age[i] + 1 : 0;
            }
            cells = next;
            const key = cells.join('');
            stale = key === last ? stale + 1 : 0;
            last = key;
            if (stale > 3 || !cells.some(Boolean)) seed(c.rand);
          });
          grid.clear();
          for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
            const i = y * GW + x;
            if (cells[i]) grid.set(x, y, c.pal(Math.min(age[i], 10) / 12));
          }
          grid.blit(c);
        },
      };
    },
  },
  {
    id: 'glitch',
    name: 'Glitch',
    category: 'retro',
    description: 'Bozulan dijital sinyal: RGB kaymaları ve titreyen bloklar.',
    uses: ['palette'],
    defaults: { palette: 'cyberpunk' },
    create: stateless((c) => {
      const slot = Math.floor(c.t * 8);
      const glitchRow = hash(slot) > 0.6 ? Math.floor(hash(slot + 1) * 6) : -1;
      const shift = (hash(slot + 2) - 0.5) * 0.4;
      for (const k of c.keys) {
        const x = k.row === glitchRow ? k.x + shift : k.x;
        let col = c.pal(x * 0.5 + c.t * 0.05);
        if (k.row === glitchRow) col = [col[2], col[0], col[1]];
        const block = hash(Math.floor(k.x * 6) + k.row * 13 + slot * 7);
        if (block > 0.93) col = [255, 255, 255];
        else if (block < 0.05) col = [0, 0, 0];
        c.set(k, col);
      }
    }),
  },
  {
    id: 'loading',
    name: 'Yükleniyor...',
    category: 'retro',
    description: 'Klavye bir yükleme çubuğu gibi dolar, tamamlanınca parlar.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#00ffa2', secondary: '#0c1a2a' },
    create: stateless((c) => {
      const cyc = fract(c.t * 0.15);
      const prog = Math.min(1, cyc / 0.8);
      const done = cyc > 0.8 ? Math.sin(((cyc - 0.8) / 0.2) * Math.PI * 4) > 0 : false;
      for (const k of c.keys) {
        const filled = k.x <= prog;
        const edge = Math.exp(-Math.pow((k.x - prog) * 30, 2));
        c.set(k, done ? [255, 255, 255] : mix(filled ? c.primary : c.secondary, [255, 255, 255], edge * 0.6));
      }
    }),
  },
  {
    id: 'clock',
    name: 'Saat Göstergesi',
    category: 'retro',
    description: 'F tuşları saati, rakam satırı dakikayı, alt satır saniyeleri gösterir.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#00d0ff', secondary: '#ff9d00' },
    isNew: true,
    create: stateless((c) => {
      const now = new Date();
      const h = now.getHours() % 12 || 12;
      const m = now.getMinutes();
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      c.fill([4, 4, 10]);
      for (let i = 1; i <= 12; i++) {
        const k = KEY_BY_ID.get('f' + i)!;
        c.set(k, i === h ? c.primary : i < h ? scale(c.primary, 0.15) : [8, 8, 16]);
      }
      const tens = Math.floor(m / 10), ones = m % 10;
      for (let d = 0; d <= 9; d++) {
        const k = KEY_BY_ID.get(String(d))!;
        if (d === ones && d === tens) c.set(k, [255, 255, 255]);
        else if (d === tens) c.set(k, c.secondary);
        else if (d === ones) c.set(k, c.primary);
      }
      const row5 = c.keys.filter((k) => k.row === 5);
      for (const k of c.keys) if (k.row >= 2 && k.row <= 4) {
        const v = Math.exp(-Math.pow((k.x - s / 60) * 25, 2));
        c.set(k, scale(c.secondary, 0.05 + v * 0.9));
      }
      for (const k of row5) c.set(k, scale(c.primary, 0.1 + 0.4 * (1 - fract(s))));
      const esc = KEY_BY_ID.get('esc')!;
      c.set(esc, scale([255, 255, 255], fract(s) < 0.15 ? 1 : 0.1));
    }),
  },
  {
    id: 'marquee',
    name: 'Neon Tabela',
    category: 'retro',
    description: 'Eski sinema tabelası gibi kenarlarda kayan ampuller.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ffcc00', secondary: '#ff0066' },
    create: stateless((c) => {
      const step = Math.floor(c.t * 8);
      for (const k of c.keys) c.set(k, scale(c.secondary, 0.25 + 0.15 * Math.sin(c.t * 2 + k.x * 4)));
      PERIMETER.forEach((k, i) => c.set(k, (i + step) % 3 === 0 ? c.primary : scale(c.primary, 0.08)));
    }),
  },
  {
    id: 'checker',
    name: 'Satranç Tahtası',
    category: 'retro',
    description: 'Kareler sırayla dönerek renk değiştirir.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#ffffff', secondary: '#7a00ff' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const [x, y] = keyCell(k);
        const parity = (Math.floor(x / 1.5) + y) % 2;
        const flip = 0.5 + 0.5 * Math.sin(c.t * 2 - k.x * 4);
        const v = parity ? flip : 1 - flip;
        c.set(k, mix(c.secondary, c.primary, v));
      }
    }),
  },
  {
    id: 'crt',
    name: 'CRT Tarama',
    category: 'retro',
    description: 'Eski tüplü monitör gibi aşağı inen tarama çizgisi ve fosfor izi.',
    uses: ['primary'],
    defaults: { primary: '#ffb000' },
    create: stateless((c) => {
      const line = fract(c.t * 0.5) * 1.3 - 0.15;
      const flicker = 0.92 + 0.08 * Math.sin(c.t * 60);
      for (const k of c.keys) {
        const d = line - k.y;
        const v = d >= 0 ? Math.exp(-d * 4) : Math.exp(-d * d * 400);
        c.set(k, scale(c.primary, (0.08 + v * 0.92) * flicker));
      }
    }),
  },
  {
    id: 'dna',
    name: 'DNA Sarmalı',
    category: 'retro',
    description: 'Birbirine dolanan iki iplikli DNA sarmalı döner.',
    uses: ['primary', 'secondary'],
    defaults: { primary: '#00e1ff', secondary: '#ff2bd6' },
    isNew: true,
    create: stateless((c) => {
      for (const k of c.keys) {
        const ph = k.x * 9 - c.t * 2.5;
        const a = 2.5 + 2.4 * Math.sin(ph);
        const b = 2.5 - 2.4 * Math.sin(ph);
        const depthA = 0.5 + 0.5 * Math.cos(ph);
        const va = clamp(1 - Math.abs(k.row - a)) * (0.35 + 0.65 * depthA);
        const vb = clamp(1 - Math.abs(k.row - b)) * (0.35 + 0.65 * (1 - depthA));
        const rung = Math.abs(Math.cos(ph)) < 0.2 && k.row > Math.min(a, b) && k.row < Math.max(a, b) ? 0.3 : 0;
        c.set(k, [
          c.primary[0] * va + c.secondary[0] * vb + 255 * rung,
          c.primary[1] * va + c.secondary[1] * vb + 255 * rung,
          c.primary[2] * va + c.secondary[2] * vb + 255 * rung,
        ]);
      }
    }),
  },
  {
    id: 'bouncing',
    name: 'Zıplayan Toplar',
    category: 'retro',
    description: 'Renkli toplar klavyenin duvarlarına çarpıp seker.',
    uses: ['palette'],
    defaults: { palette: 'neon' },
    params: [{ key: 'count', label: 'Top sayısı', type: 'range', min: 1, max: 6, step: 1, default: 3 }],
    create: () => {
      const balls = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5), h: i / 6 }));
      return {
        frame(c) {
          c.fill([0, 0, 0]);
          const n = num(c.p.count, 3);
          for (let i = 0; i < n; i++) {
            const b = balls[i];
            b.x += b.vx * c.dt; b.y += b.vy * c.dt;
            if (b.x < 0 || b.x > 1) { b.vx *= -1; b.x = clamp(b.x); }
            if (b.y < 0 || b.y > 1) { b.vy *= -1; b.y = clamp(b.y); }
            glow(c, b.x, b.y, c.pal(b.h + c.t * 0.05), 0.15, 1.2);
          }
        },
      };
    },
  },
  {
    id: 'confetti',
    name: 'Konfeti',
    category: 'retro',
    description: 'Rastgele tuşlarda patlayan rengarenk konfetiler.',
    uses: ['palette'],
    defaults: { palette: 'candy' },
    create: () => {
      const life = new Float32Array(200);
      const hue = new Float32Array(200);
      return {
        frame(c) {
          for (const k of c.keys) {
            life[k.index] = Math.max(0, life[k.index] - c.dt * 1.5);
            if (c.rand() < c.dt * 0.6) { life[k.index] = 1; hue[k.index] = c.rand(); }
            c.set(k, scale(c.pal(hue[k.index]), Math.pow(life[k.index], 1.5)));
          }
        },
      };
    },
  },
  {
    id: 'binary',
    name: 'İkili Kod',
    category: 'retro',
    description: 'Tuşlar 0 ve 1 gibi açılıp kapanarak veri akışı oluşturur.',
    uses: ['primary'],
    defaults: { primary: '#00aaff' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const slot = Math.floor(c.t * (2 + hash(k.index) * 4));
        const bit = hash(k.index * 31 + slot) > 0.5;
        const scan = Math.exp(-Math.pow((k.x - fract(c.t * 0.4)) * 12, 2));
        c.set(k, mix(scale(c.primary, bit ? 0.85 : 0.06), [255, 255, 255], scan * 0.5));
      }
    }),
  },
  {
    id: 'arcade-chase',
    name: 'Atari Kovalamaca',
    category: 'retro',
    description: 'Renkli ışıklar satır satır zikzak çizerek birbirini kovalar.',
    uses: ['palette'],
    defaults: { palette: 'rainbow' },
    create: stateless((c) => {
      for (const k of c.keys) {
        const lane = k.row % 2 === 0 ? k.x : 1 - k.x;
        const pos = k.row + lane;
        const head = (c.t * 3) % 6;
        let d = head - pos;
        if (d < 0) d += 6;
        const v = d < 1.4 ? Math.pow(1 - d / 1.4, 2) : 0;
        c.set(k, scale(c.pal(pos / 6), v + 0.03));
      }
    }),
  },
];
