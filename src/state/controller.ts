import { AudioCapture } from '../core/audio';
import { hexToRgb } from '../core/color';
import {
  COLOR_MULTI, DeviceError, F75, OFF_EFFECT, OFF_KNOB, OFF_OS, OFF_SIDE, OFF_SLEEP, OFF_WIN_LOCK, findKeyboard,
} from '../core/device';
import { EFFECTS, EFFECT_BY_ID } from '../core/effects';
import { Engine, EffectSettings, defaultSettings, toLedFrame } from '../core/engine';
import { KEYS, LED_COUNT } from '../core/layout';
import { WIRELESS_BUDGET, store, toast } from './store';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

class Controller {
  engine: Engine;
  audio = new AudioCapture();
  device: F75 | null = null;
  /** latest per-key colours (index order) */
  frame = new Float32Array(KEYS.length * 3);
  private ledFrame = new Uint8Array(LED_COUNT * 3);
  private needLiveMode = true;
  private held = new Set<string>();
  private lastKey = 0;
  private lastStep = performance.now();
  private frameCount = 0;
  private fpsT0 = performance.now();
  private connecting = false;
  private started = false;
  private lastDemo = 0;
  private shuttingDown = false;

  constructor() {
    const s = store.get();
    const def = EFFECT_BY_ID.get(s.effectId) ?? EFFECTS[0];
    this.engine = new Engine(def, this.settingsFor(def.id));
  }

  settingsFor(id: string): EffectSettings {
    const def = EFFECT_BY_ID.get(id) ?? EFFECTS[0];
    const saved = store.get().effectSettings[id];
    const base = defaultSettings(def);
    return saved ? { ...base, ...saved, params: { ...base.params, ...saved.params } } : base;
  }

  start() {
    if (this.started) return;
    this.started = true;
    setInterval(() => this.tick(), 1000 / 60);
    void this.streamLoop();
    void this.connect();
    setInterval(() => {
      const st = store.get().conn.status;
      if (st === 'none' || st === 'asleep') void this.connect();
    }, 4000);
    if ('hid' in navigator) {
      navigator.hid.addEventListener('connect', () => setTimeout(() => this.connect(), 600));
      navigator.hid.addEventListener('disconnect', (e) => {
        if (this.device && e.device === this.device.hid) this.dropDevice('Klavye bağlantısı kesildi');
      });
    }
    window.aula?.onKey((k) => (k.down ? this.keyDown(k.id) : this.keyUp(k.id)));
    window.aula?.onTrayToggle(() => this.togglePlay());
    window.aula?.onBeforeQuit(() => this.shutdown());
    window.aula?.info().then((i) => store.set({ globalKeys: i.globalKeys })).catch(() => undefined);
    window.aula?.getAutostart().then((v) => store.set({ autostart: v })).catch(() => undefined);
    window.aula?.setCloseToTray(store.get().closeToTray);
    this.syncAudio();
  }

  // ------------------------------------------------------------------ keys

  keyDown(id: string) {
    if (this.held.has(id)) return;
    this.held.add(id);
    this.lastKey = performance.now();
    this.engine.press(id);
  }

  keyUp(id: string) {
    this.held.delete(id);
    this.lastKey = performance.now();
    this.engine.release(id);
  }

  /** Key clicked on the on-screen keyboard. */
  virtualPress(id: string) {
    this.engine.press(id);
    this.engine.release(id);
  }

  private isIdle = () => this.held.size === 0 && performance.now() - this.lastKey > 400;

  // ------------------------------------------------------------------ effects

  selectEffect(id: string) {
    const def = EFFECT_BY_ID.get(id);
    if (!def) return;
    this.engine.setEffect(def, this.settingsFor(id));
    store.set({ effectId: id, playing: true });
    this.syncAudio();
  }

  updateSettings(patch: Partial<EffectSettings>) {
    const id = store.get().effectId;
    const cur = this.settingsFor(id);
    const next: EffectSettings = { ...cur, ...patch, params: { ...cur.params, ...(patch.params ?? {}) } };
    this.engine.applySettings(next);
    store.set((s) => ({ effectSettings: { ...s.effectSettings, [id]: next } }));
  }

  resetSettings() {
    const id = store.get().effectId;
    const def = EFFECT_BY_ID.get(id)!;
    const s = defaultSettings(def);
    this.engine.applySettings(s);
    store.set((st) => {
      const copy = { ...st.effectSettings };
      delete copy[id];
      return { effectSettings: copy };
    });
  }

  togglePlay() {
    store.set((s) => ({ playing: !s.playing }));
  }

  private syncAudio() {
    const def = EFFECT_BY_ID.get(store.get().effectId);
    const wants = def?.category === 'music';
    if (wants && !this.audio.running) {
      void this.audio.start().then(() => {
        store.set({ audioActive: this.audio.running, audioError: this.audio.error });
        if (!this.audio.running) toast('Sistem sesi yakalanamadı: ' + this.audio.error, 'err');
      });
    } else if (!wants && this.audio.running) {
      this.audio.stop();
      store.set({ audioActive: false });
    }
  }

  private tick() {
    const now = performance.now();
    const dt = (now - this.lastStep) / 1000;
    this.lastStep = now;
    const s = store.get();
    if (!s.playing) return;
    if (this.audio.running) this.engine.audio = this.audio.update(now / 1000);
    const def = this.engine.def;
    this.engine.useFakeAudio = def.category === 'music' && !this.audio.running;
    if (s.demoPresses && def.category === 'reactive' && now - this.lastKey > 3000 && now - this.lastDemo > 450) {
      this.lastDemo = now;
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      this.virtualPress(k.id);
    }
    this.frame.set(this.engine.step(dt));
  }

  /** What the keyboard should show right now (paint view shows the painted picture). */
  currentLedFrame(): Uint8Array {
    const s = store.get();
    if (s.view === 'paint') {
      for (let i = 0; i < this.ledFrame.length; i++) this.ledFrame[i] = Math.round(s.paintFrame[i] * s.brightness);
      return this.ledFrame;
    }
    return toLedFrame(this.frame, s.brightness, this.ledFrame);
  }

  // ------------------------------------------------------------------ device

  async connect() {
    if (this.connecting || (this.device && store.get().conn.status === 'ready')) return;
    this.connecting = true;
    try {
      if (!this.device) {
        const found = await findKeyboard();
        if (!found) {
          store.set({ conn: { status: 'none' } });
          return;
        }
        if (found.link === 'bluetooth') {
          store.set({ conn: { status: 'bluetooth', error: 'Bluetooth modunda ayar yapılamıyor. Klavyenin arkasındaki anahtarı 2.4G veya kablo konumuna al.' } });
          return;
        }
        const dev = new F75(found.hid, found.link);
        dev.isIdle = this.isIdle;
        dev.onLinkChange = (online) => {
          this.needLiveMode = true;
          if (online) {
            // give the keyboard a moment after waking before writing to it
            setTimeout(() => this.connect(), 700);
          } else if (store.get().conn.status === 'ready') {
            store.set({ conn: { ...store.get().conn, status: 'asleep', error: 'Klavye uyku moduna geçti' }, fps: 0 });
          }
        };
        await dev.open();
        this.device = dev;
        store.set({ conn: { status: 'connecting', link: dev.link, name: dev.name } });
      }
      const dev = this.device;
      const wasAsleep = store.get().conn.status === 'asleep';
      const battery = await dev.probe();
      this.needLiveMode = true;
      store.set({ conn: { status: 'ready', link: dev.link, name: dev.name, battery } });
      toast(wasAsleep ? 'Klavye uyandı, efekt devam ediyor' : `AULA F75 bağlandı (${dev.name})`);
      await this.readDeviceState();
    } catch (e) {
      console.warn('connect failed: ' + errMsg(e));
      if (this.device) {
        store.set({ conn: { status: 'asleep', link: this.device.link, name: this.device.name, error: errMsg(e) } });
      } else {
        store.set({ conn: { status: 'none', error: errMsg(e) } });
      }
    } finally {
      this.connecting = false;
    }
  }

  private dropDevice(msg: string) {
    const d = this.device;
    this.device = null;
    d?.close();
    store.set({ conn: { status: 'none' }, fps: 0 });
    toast(msg, 'info');
  }

  async readDeviceState() {
    if (!this.device) return;
    try {
      const b = await this.device.getLedBlock();
      const hwId = b[OFF_EFFECT];
      const custom = hwId === 21 || hwId === 32;
      store.set((s) => ({
        dev: {
          sleep: b[OFF_SLEEP] * 30,
          side: b[OFF_SIDE],
          winLock: !!b[OFF_WIN_LOCK],
          knob: b[OFF_KNOB],
          os: b[OFF_OS],
          loaded: true,
        },
        hw: custom || hwId > 34 ? s.hw : {
          ...s.hw,
          effect: hwId,
          brightness: hwId ? b[F75.slot(hwId)] : s.hw.brightness,
          speed: hwId ? b[F75.slot(hwId) + 1] >> 4 : s.hw.speed,
          color: hwId ? b[F75.slot(hwId) + 1] & 0x0f : s.hw.color,
        },
      }));
    } catch (e) {
      console.warn('LED block read failed', e);
    }
  }

  private wirelessTuning() {
    const s = store.get();
    return { budget: WIRELESS_BUDGET[s.wirelessQuality], gap: s.wirelessGap };
  }

  private async streamLoop() {
    let failures = 0;
    let lastOnlineCheck = performance.now();
    while (true) {
      const s = store.get();
      const dev = this.device;
      const streaming = !this.shuttingDown && s.live && (s.playing || s.view === 'paint') && dev && s.conn.status === 'ready';
      if (!streaming || !dev) {
        if (this.frameCount || s.fps) { this.frameCount = 0; store.set({ fps: 0 }); }
        await sleep(120);
        continue;
      }
      const t0 = performance.now();
      try {
        // live frames are not acknowledged, so ask the receiver now and then whether the keyboard fell asleep
        if (dev.link === 'receiver' && t0 - lastOnlineCheck > 3000) {
          lastOnlineCheck = t0;
          if ((await dev.isOnline()) === false) {
            this.needLiveMode = true;
            store.set({ conn: { ...store.get().conn, status: 'asleep', error: 'Klavye uyku moduna geçti' }, fps: 0 });
            continue;
          }
        }
        if (this.needLiveMode) {
          await dev.enterLiveMode();
          this.needLiveMode = false;
        }
        await dev.sendLive(this.currentLedFrame(), this.wirelessTuning());
        failures = 0;
        this.frameCount++;
        const now = performance.now();
        if (now - this.fpsT0 > 1000) {
          store.set({ fps: Math.round((this.frameCount * 1000) / (now - this.fpsT0)) });
          this.frameCount = 0;
          this.fpsT0 = now;
        }
      } catch (e) {
        failures++;
        console.warn('live frame failed', e);
        if (failures > 5) {
          this.needLiveMode = true;
          store.set({ conn: { ...store.get().conn, status: 'asleep', error: errMsg(e) } });
          failures = 0;
        }
        await sleep(300);
      }
      const minFrame = dev.link === 'wired' ? 1000 / store.get().wiredFps : 1000 / 20;
      const wait = minFrame - (performance.now() - t0);
      if (wait > 0) await sleep(wait);
    }
  }

  async setLive(on: boolean) {
    store.set({ live: on });
    if (on) {
      this.needLiveMode = true;
      return;
    }
    // give the keyboard its own effect back
    await sleep(150);
    if (this.device && store.get().conn.status === 'ready') await this.applyHardware(true);
  }

  private async guarded(label: string, fn: (d: F75) => Promise<unknown>, okMsg?: string) {
    const d = this.device;
    if (!d || store.get().conn.status !== 'ready') {
      toast('Önce klavyeyi bağla (2.4G alıcı veya USB-C kablo)', 'err');
      return false;
    }
    store.set({ busy: label });
    try {
      await fn(d);
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      toast(e instanceof DeviceError ? e.message : 'Hata: ' + errMsg(e), 'err');
      return false;
    } finally {
      store.set({ busy: '' });
    }
  }

  /** Writes the selected firmware effect (stops live streaming so it becomes visible). */
  async applyHardware(silent = false) {
    const { hw } = store.get();
    if (!silent) store.set({ live: false });
    await sleep(120);
    return this.guarded('Donanım efekti yazılıyor…', async (d) => {
      await d.setEffect(hw.effect, hw.brightness, hw.speed, hw.color);
      this.needLiveMode = true;
    }, silent ? undefined : 'Donanım efekti klavyeye kaydedildi');
  }

  async applyHardwareCustomColor() {
    const { hw } = store.get();
    store.set({ live: false });
    await sleep(120);
    return this.guarded('Özel renk yazılıyor…', async (d) => {
      await d.setEffectColor(hw.effect, hexToRgb(hw.customColor));
      await d.setEffect(hw.effect, hw.brightness, hw.speed, 0);
      store.set((s) => ({ hw: { ...s.hw, color: 0 } }));
      this.needLiveMode = true;
    }, 'Özel renk uygulandı');
  }

  async savePaint() {
    const { paintFrame } = store.get();
    store.set({ live: false });
    await sleep(120);
    return this.guarded('Tuş renkleri kaydediliyor…', async (d) => {
      await d.setPerKey(Uint8Array.from(paintFrame));
      this.needLiveMode = true;
    }, 'Tuş renkleri klavye hafızasına kaydedildi — uygulama kapalıyken de görünür');
  }

  /** Saves the current animation frame as the keyboard's static per-key picture. */
  async saveSnapshot() {
    const frame = toLedFrame(this.frame, 1, new Uint8Array(LED_COUNT * 3));
    store.set({ paintFrame: Array.from(frame) });
    return this.savePaint();
  }

  async setDeviceOption(patch: Partial<{ sleep: number; side: number; winLock: boolean; knob: number; os: number }>) {
    const ok = await this.guarded('Ayar yazılıyor…', async (d) => {
      await d.editLedBlock((b) => {
        if (patch.sleep !== undefined) b[OFF_SLEEP] = Math.round(patch.sleep / 30);
        if (patch.side !== undefined) b[OFF_SIDE] = patch.side;
        if (patch.winLock !== undefined) b[OFF_WIN_LOCK] = patch.winLock ? 1 : 0;
        if (patch.knob !== undefined) b[OFF_KNOB] = patch.knob;
        if (patch.os !== undefined) b[OFF_OS] = patch.os;
      });
    }, 'Ayar klavyeye kaydedildi');
    if (ok) store.set((s) => ({ dev: { ...s.dev, ...patch } }));
    this.needLiveMode = true;
  }

  /** On exit: stop streaming and give the keyboard its own firmware effect back. */
  async shutdown() {
    this.shuttingDown = true;
    const d = this.device;
    if (!d || store.get().conn.status !== 'ready') return;
    const { hw } = store.get();
    try {
      await d.setEffect(hw.effect, hw.brightness, hw.speed, hw.color);
    } catch (e) {
      console.warn('restore on exit failed', e);
    }
  }

  async reconnect() {
    const d = this.device;
    this.device = null;
    await d?.close();
    store.set({ conn: { status: 'none' } });
    await this.connect();
  }
}

export const controller = new Controller();
export { COLOR_MULTI };
