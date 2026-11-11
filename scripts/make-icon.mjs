// Renders the app icon (512x512 PNG) without external dependencies.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const S = 512;
const px = new Float32Array(S * S * 4);

const sdRoundRect = (x, y, cx, cy, hw, hh, r) => {
  const dx = Math.abs(x - cx) - hw + r;
  const dy = Math.abs(y - cy) - hh + r;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r;
};
const cov = (d) => Math.max(0, Math.min(1, 0.5 - d));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const stops = [[255, 43, 214], [122, 92, 255], [0, 229, 255]];
const grad = (t) => (t < 0.5 ? mix(stops[0], stops[1], t * 2) : mix(stops[1], stops[2], (t - 0.5) * 2));

function blend(i, rgb, a) {
  const o = px[i + 3];
  const na = a + o * (1 - a);
  for (let c = 0; c < 3; c++) px[i + c] = na ? (rgb[c] * a + px[i + c] * o * (1 - a)) / na : 0;
  px[i + 3] = na;
}

const keys = [];
const cols = [6, 6, 5];
cols.forEach((n, row) => {
  for (let k = 0; k < n; k++) {
    const w = 38, gap = 10;
    const total = n * w + (n - 1) * gap;
    keys.push({ cx: 256 - total / 2 + w / 2 + k * (w + gap), cy: 220 + row * 48, hw: w / 2, hh: 18 });
  }
});
keys.push({ cx: 256, cy: 364, hw: 92, hh: 18 });

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const bg = cov(sdRoundRect(x + 0.5, y + 0.5, 256, 256, 240, 240, 110));
    if (bg > 0) blend(i, grad((x + y) / (2 * S)), bg);
    const glow = Math.exp(-Math.pow(sdRoundRect(x, y, 256, 290, 176, 118, 34) / 28, 2)) * 0.5;
    if (glow > 0.01 && bg > 0) blend(i, [255, 255, 255], glow * 0.35 * bg);
    const body = cov(sdRoundRect(x + 0.5, y + 0.5, 256, 290, 172, 114, 32));
    if (body > 0) blend(i, [10, 11, 18], body * 0.94);
    for (const k of keys) {
      const d = sdRoundRect(x + 0.5, y + 0.5, k.cx, k.cy, k.hw, k.hh, 7);
      if (d < 1) {
        const t = (k.cx - 80) / 352;
        blend(i, mix(grad(t), [255, 255, 255], 0.55), cov(d));
      }
    }
  }
}

const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const o = y * (S * 4 + 1) + 1 + x * 4;
    raw[o] = Math.round(px[i]);
    raw[o + 1] = Math.round(px[i + 1]);
    raw[o + 2] = Math.round(px[i + 2]);
    raw[o + 3] = Math.round(px[i + 3] * 255);
  }
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

for (const dir of ['public', 'build']) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/icon.png`, png);
}
console.log('icon written', png.length, 'bytes');
