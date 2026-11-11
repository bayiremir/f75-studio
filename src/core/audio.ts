import type { AudioLevels } from './effects/types';
import { silentAudio } from './engine';

/** Captures system audio (Windows loopback via Electron) and turns it into band levels. */
export class AudioCapture {
  levels: AudioLevels = silentAudio();
  running = false;
  error = '';
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private stream?: MediaStream;
  private freq?: Uint8Array<ArrayBuffer>;
  private bassAvg = 0.1;
  private lastBeat = 0;
  private bandAgc = new Float32Array(16).fill(0.3);

  async start() {
    if (this.running) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      stream.getVideoTracks().forEach((t) => t.stop());
      if (!stream.getAudioTracks().length) throw new Error('Ses kaynağı bulunamadı');
      this.stream = stream;
      this.ctx = new AudioContext();
      const src = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.6;
      src.connect(this.analyser);
      this.freq = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.running = true;
      this.error = '';
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.running = false;
    }
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => undefined);
    this.stream = undefined;
    this.ctx = undefined;
    this.analyser = undefined;
    this.running = false;
    this.levels = silentAudio();
  }

  update(now: number): AudioLevels {
    const L = this.levels;
    if (!this.analyser || !this.freq || !this.ctx) return L;
    this.analyser.getByteFrequencyData(this.freq);
    const binHz = this.ctx.sampleRate / this.analyser.fftSize;
    const range = (lo: number, hi: number) => {
      const a = Math.max(1, Math.floor(lo / binHz));
      const b = Math.max(a + 1, Math.floor(hi / binHz));
      let s = 0;
      for (let i = a; i < b && i < this.freq!.length; i++) s += this.freq![i];
      return s / (b - a) / 255;
    };
    for (let i = 0; i < 16; i++) {
      const lo = 40 * Math.pow(16000 / 40, i / 16);
      const hi = 40 * Math.pow(16000 / 40, (i + 1) / 16);
      const raw = range(lo, hi);
      this.bandAgc[i] = Math.max(0.15, this.bandAgc[i] * 0.995, raw);
      L.bands[i] = Math.min(1, raw / this.bandAgc[i]) * Math.min(1, raw * 4);
    }
    L.bass = range(30, 150);
    L.mid = range(400, 2000);
    L.treble = range(4000, 12000);
    L.level = Math.min(1, (L.bass + L.mid + L.treble) / 1.6);
    this.bassAvg = this.bassAvg * 0.96 + L.bass * 0.04;
    L.beat = L.bass > this.bassAvg * 1.3 && L.bass > 0.25 && now - this.lastBeat > 0.22;
    if (L.beat) this.lastBeat = now;
    return L;
  }
}
