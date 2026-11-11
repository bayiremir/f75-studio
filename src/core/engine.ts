import { RGB, hexToRgb, rng } from './color';
import { EffectDef, Instance, Press, ParamValues, AudioLevels, Ctx } from './effects/types';
import { KEYS, KEY_BY_ID, Key, LED_COUNT } from './layout';
import { makePalette } from './palettes';

export interface EffectSettings {
  speed: number;
  palette: string;
  primary: string;
  secondary: string;
  params: ParamValues;
}

export function defaultSettings(def: EffectDef): EffectSettings {
  const params: ParamValues = {};
  for (const p of def.params ?? []) params[p.key] = p.default;
  return {
    speed: def.defaults?.speed ?? 1,
    palette: def.defaults?.palette ?? 'rainbow',
    primary: def.defaults?.primary ?? '#ff00c8',
    secondary: def.defaults?.secondary ?? '#00e5ff',
    params,
  };
}

export function silentAudio(): AudioLevels {
  return { level: 0, bass: 0, mid: 0, treble: 0, bands: new Float32Array(16), beat: false };
}

/** Synthetic music for previews when no real audio is captured. */
export function fakeAudio(t: number, out: AudioLevels): AudioLevels {
  const bpm = 118;
  const b = (t * bpm) / 60;
  const ph = b - Math.floor(b);
  const kick = Math.pow(1 - ph, 4);
  out.beat = ph < 0.05 && out.bass < 0.6;
  for (let i = 0; i < 16; i++) {
    const wob = 0.5 + 0.5 * Math.sin(t * (2 + i * 0.7) + i * 1.7) * Math.sin(t * 1.3 + i);
    const shape = i < 3 ? kick * 0.95 : (0.25 + 0.55 * wob) * (1 - i / 22);
    out.bands[i] = Math.max(0, Math.min(1, shape));
  }
  out.bass = kick;
  out.mid = 0.3 + 0.3 * Math.sin(t * 2.1);
  out.treble = 0.15 + 0.15 * Math.sin(t * 5.3);
  out.level = 0.35 + kick * 0.5;
  return out;
}

export class Engine {
  def: EffectDef;
  settings: EffectSettings;
  private inst: Instance;
  private t = 0;
  private presses: Press[] = [];
  private held = new Set<string>();
  private buf = new Float32Array(KEYS.length * 3);
  private ctx: Ctx;
  private primary: RGB = [255, 0, 200];
  private secondary: RGB = [0, 229, 255];
  private random = rng(7);
  private nextAuto = 0;
  /** simulate key presses (gallery previews) */
  autoPress = false;
  /** synthetic audio (gallery previews) */
  useFakeAudio = false;
  audio: AudioLevels = silentAudio();
  private fake = silentAudio();

  constructor(def: EffectDef, settings?: EffectSettings, seed = 7) {
    this.def = def;
    this.settings = settings ?? defaultSettings(def);
    this.random = rng(seed);
    this.inst = def.create();
    const buf = this.buf;
    const self = this;
    this.ctx = {
      t: 0,
      dt: 0,
      keys: KEYS,
      set(k: Key, c: RGB) {
        const i = k.index * 3;
        buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
      },
      add(k: Key, c: RGB) {
        const i = k.index * 3;
        buf[i] += c[0]; buf[i + 1] += c[1]; buf[i + 2] += c[2];
      },
      get(k: Key): RGB {
        const i = k.index * 3;
        return [buf[i], buf[i + 1], buf[i + 2]];
      },
      fill(c: RGB) {
        for (let i = 0; i < buf.length; i += 3) { buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; }
      },
      pal: makePalette('rainbow', this.primary, this.secondary),
      primary: this.primary,
      secondary: this.secondary,
      p: this.settings.params,
      presses: this.presses,
      held: this.held,
      audio: this.audio,
      rand: () => self.random(),
    };
    this.applySettings(this.settings);
  }

  setEffect(def: EffectDef, settings: EffectSettings) {
    this.def = def;
    this.inst = def.create();
    this.t = 0;
    this.presses.length = 0;
    this.buf.fill(0);
    this.applySettings(settings);
  }

  applySettings(s: EffectSettings) {
    this.settings = s;
    this.primary = hexToRgb(s.primary);
    this.secondary = hexToRgb(s.secondary);
    this.ctx.primary = this.primary;
    this.ctx.secondary = this.secondary;
    this.ctx.pal = makePalette(s.palette, this.primary, this.secondary);
    this.ctx.p = s.params;
  }

  press(id: string) {
    const k = KEY_BY_ID.get(id);
    if (!k) return;
    this.held.add(id);
    const p: Press = { key: k, t: this.t, seed: this.random() };
    this.presses.push(p);
    if (this.presses.length > 64) this.presses.splice(0, this.presses.length - 64);
    this.inst.press?.(k, this.ctx);
  }

  release(id: string) {
    this.held.delete(id);
  }

  /** Advances by `realDt` seconds and returns per-key colors (index order, 0..255 floats). */
  step(realDt: number): Float32Array {
    const dt = Math.min(0.1, realDt) * this.settings.speed;
    this.t += dt;
    if (this.autoPress) {
      this.nextAuto -= realDt;
      if (this.nextAuto <= 0) {
        this.nextAuto = 0.35 + this.random() * 0.6;
        const k = KEYS[Math.floor(this.random() * KEYS.length)];
        this.press(k.id);
        this.release(k.id);
      }
    }
    this.ctx.t = this.t;
    this.ctx.dt = dt;
    this.ctx.audio = this.useFakeAudio ? fakeAudio(this.t, this.fake) : this.audio;
    while (this.presses.length && this.t - this.presses[0].t > 6) this.presses.shift();
    this.inst.frame(this.ctx);
    return this.buf;
  }

  /** Runs the effect forward without rendering, so stateful previews look alive. */
  warmup(seconds: number, fps = 20) {
    const n = Math.round(seconds * fps);
    for (let i = 0; i < n; i++) this.step(1 / fps);
  }
}

/** Per-key buffer -> 126-LED frame (RGB bytes), with brightness 0..1. */
export function toLedFrame(buf: Float32Array, brightness: number, out = new Uint8Array(LED_COUNT * 3)): Uint8Array {
  out.fill(0);
  for (const k of KEYS) {
    const i = k.index * 3;
    const o = k.led * 3;
    out[o] = clampByte(buf[i] * brightness);
    out[o + 1] = clampByte(buf[i + 1] * brightness);
    out[o + 2] = clampByte(buf[i + 2] * brightness);
  }
  return out;
}

const clampByte = (v: number) => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));
