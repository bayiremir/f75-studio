import { CANVAS_H, KEYS, KNOB } from '../core/layout';

const WORLD_X = 6;
const WORLD_Y = 6;
const WORLD_W = 688;
const WORLD_H = 272;
const GLOW_SCALE = 0.1;

export interface DrawOptions {
  lite?: boolean;
  hover?: string | null;
  reflection?: boolean;
  legends?: boolean;
}

/** Draws an AULA F75 with per-key RGB onto a canvas. Colors are per key index (0..255). */
export class KeyboardRenderer {
  private glow = document.createElement('canvas');
  private gctx: CanvasRenderingContext2D;
  private refl = document.createElement('canvas');
  private rctx: CanvasRenderingContext2D;
  private caseGrad?: CanvasGradient;
  private lastScale = 0;

  constructor() {
    this.glow.width = this.refl.width = Math.ceil(700 * GLOW_SCALE);
    this.glow.height = this.refl.height = Math.ceil(CANVAS_H * GLOW_SCALE) + 2;
    this.gctx = this.glow.getContext('2d')!;
    this.rctx = this.refl.getContext('2d')!;
  }

  /** Scale + offset that fit the board into a canvas of the given CSS size. */
  static fit(w: number, h: number, reflection: boolean) {
    const worldH = WORLD_H + (reflection ? 34 : 0);
    const s = Math.min(w / WORLD_W, h / worldH);
    const ox = (w - WORLD_W * s) / 2 - WORLD_X * s;
    const oy = (h - worldH * s) / 2 - WORLD_Y * s;
    return { s, ox, oy };
  }

  /** Key under a CSS-pixel point, or null. */
  static hit(px: number, py: number, w: number, h: number, reflection: boolean): string | null {
    const { s, ox, oy } = KeyboardRenderer.fit(w, h, reflection);
    const x = (px - ox) / s, y = (py - oy) / s;
    for (const k of KEYS) {
      const [x1, y1, x2, y2] = k.rect;
      if (x >= x1 - 2 && x <= x2 + 2 && y >= y1 - 2 && y <= y2 + 2) return k.id;
    }
    return null;
  }

  draw(canvas: HTMLCanvasElement, colors: Float32Array, opt: DrawOptions = {}) {
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { s, ox, oy } = KeyboardRenderer.fit(cw, ch, !!opt.reflection);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr);
    const px = s * dpr;

    // glow source: one pixel block per key
    const g = this.gctx;
    g.clearRect(0, 0, this.glow.width, this.glow.height);
    for (const k of KEYS) {
      const i = k.index * 3;
      g.fillStyle = `rgb(${colors[i] | 0},${colors[i + 1] | 0},${colors[i + 2] | 0})`;
      const [x1, y1, x2, y2] = k.rect;
      g.fillRect(x1 * GLOW_SCALE, y1 * GLOW_SCALE, (x2 - x1) * GLOW_SCALE, (y2 - y1) * GLOW_SCALE);
    }
    const gw = this.glow.width / GLOW_SCALE, gh = this.glow.height / GLOW_SCALE;

    // reflection on the desk: flipped glow that fades out with real alpha
    if (opt.reflection) {
      const r = this.rctx;
      const h = this.refl.height;
      r.globalCompositeOperation = 'source-over';
      r.clearRect(0, 0, this.refl.width, h);
      r.save();
      r.translate(0, h);
      r.scale(1, -1);
      r.drawImage(this.glow, 0, 0);
      r.restore();
      r.globalCompositeOperation = 'destination-in';
      const fade = r.createLinearGradient(0, (gh - 262) * GLOW_SCALE, 0, (gh - 228) * GLOW_SCALE);
      fade.addColorStop(0, 'rgba(0,0,0,0.5)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      r.fillStyle = fade;
      r.fillRect(0, 0, this.refl.width, h);
      ctx.save();
      ctx.filter = `blur(${8 * px}px)`;
      ctx.drawImage(this.refl, 0, 282 - (gh - 262), gw, gh);
      ctx.restore();
    }

    // case
    if (!this.caseGrad || this.lastScale !== px) {
      this.caseGrad = ctx.createLinearGradient(0, 12, 0, 272);
      this.caseGrad.addColorStop(0, '#2a2d38');
      this.caseGrad.addColorStop(0.08, '#1a1c25');
      this.caseGrad.addColorStop(1, '#0c0d12');
      this.lastScale = px;
    }
    if (!opt.lite) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 30 * px;
      ctx.shadowOffsetY = 10 * px;
      roundRect(ctx, 12, 12, 676, 260, 20);
      ctx.fillStyle = this.caseGrad;
      ctx.fill();
      ctx.restore();
      roundRect(ctx, 12.5, 12.5, 675, 259, 20);
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // USB-C notch
      roundRect(ctx, 330, 4, 40, 10, 3);
      ctx.fillStyle = '#15161d';
      ctx.fill();
    } else {
      roundRect(ctx, 12, 12, 676, 260, 20);
      ctx.fillStyle = '#101118';
      ctx.fill();
    }
    // plate
    roundRect(ctx, 24, 23, 614, 245, 10);
    ctx.fillStyle = '#050609';
    ctx.fill();

    // light bleeding onto the plate
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = opt.lite ? 0.9 : 0.85;
    ctx.filter = `blur(${(opt.lite ? 6 : 9) * px}px)`;
    ctx.drawImage(this.glow, 0, 0, gw, gh);
    if (!opt.lite) {
      ctx.globalAlpha = 0.5;
      ctx.filter = `blur(${22 * px}px)`;
      ctx.drawImage(this.glow, 0, 0, gw, gh);
    }
    ctx.restore();

    // keycaps
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const showLegend = opt.legends !== false && !opt.lite;
    for (const k of KEYS) {
      const i = k.index * 3;
      const r = colors[i], gg = colors[i + 1], b = colors[i + 2];
      const lum = Math.min(1, Math.max(r, gg, b) / 255);
      const [x1, y1, x2, y2] = k.rect;
      const w = x2 - x1, h = y2 - y1;
      // cap body
      roundRect(ctx, x1 + 1, y1 + 1, w - 2, h - 2, 4);
      ctx.fillStyle = `rgba(${18 + r * 0.12 | 0},${19 + gg * 0.12 | 0},${26 + b * 0.12 | 0},0.96)`;
      ctx.fill();
      // lit rim
      ctx.strokeStyle = `rgba(${r | 0},${gg | 0},${b | 0},${0.25 + lum * 0.6})`;
      ctx.lineWidth = opt.lite ? 1.4 : 1.1;
      ctx.stroke();
      if (!opt.lite) {
        // top face
        roundRect(ctx, x1 + 3.5, y1 + 2.5, w - 7, h - 8, 3);
        ctx.fillStyle = `rgba(${32 + r * 0.16 | 0},${34 + gg * 0.16 | 0},${44 + b * 0.16 | 0},0.95)`;
        ctx.fill();
      }
      if (showLegend && k.label) {
        const lr = Math.min(255, r * 0.75 + 70), lg = Math.min(255, gg * 0.75 + 70), lb = Math.min(255, b * 0.75 + 80);
        ctx.fillStyle = `rgb(${lr | 0},${lg | 0},${lb | 0})`;
        ctx.font = `600 ${k.label.length > 3 ? 7.2 : 9}px "Segoe UI Variable Display", "Segoe UI", sans-serif`;
        ctx.fillText(k.label, x1 + w / 2, y1 + h / 2 - 2);
      }
      if (opt.hover === k.id) {
        roundRect(ctx, x1 - 1, y1 - 1, w + 2, h + 2, 5);
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // knob
    const kg = ctx.createRadialGradient(KNOB.cx - 5, KNOB.cy - 6, 2, KNOB.cx, KNOB.cy, KNOB.r);
    kg.addColorStop(0, '#5a5e6c');
    kg.addColorStop(0.6, '#24262f');
    kg.addColorStop(1, '#0d0e13');
    ctx.beginPath();
    ctx.arc(KNOB.cx, KNOB.cy, KNOB.r, 0, Math.PI * 2);
    ctx.fillStyle = kg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!opt.lite) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      for (let a = 0; a < 36; a++) {
        const ang = (a / 36) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(KNOB.cx + Math.cos(ang) * (KNOB.r - 3), KNOB.cy + Math.sin(ang) * (KNOB.r - 3));
        ctx.lineTo(KNOB.cx + Math.cos(ang) * KNOB.r, KNOB.cy + Math.sin(ang) * KNOB.r);
        ctx.stroke();
      }
      // side light bar
      roundRect(ctx, 16, 90, 3, 60, 1.5);
      ctx.fillStyle = 'rgba(160,200,255,0.55)';
      ctx.fill();
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
