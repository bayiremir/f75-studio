// AULA F75 driver over WebHID.
//
// Protocol recovered from AULA's OemDrv.exe and verified on hardware by the
// aula-f75-hub and aula-f75-linux projects:
// * 2.4 GHz receiver 3554:FA09 - vendor collection 0xFF02, report 0x13, 20-byte
//   packets [13 cmd total index (sub<<4)|len data*14 checksum], acked by echo.
// * USB-C cable 258A:010C - feature report 0x06, 520 bytes
//   [06 cmd sub 00 total index size_lo size_hi data*512].

import { LED_COUNT } from './layout';

export type Link = 'receiver' | 'wired';

export const VID_RECEIVER = 0x3554;
export const PID_RECEIVER = 0xfa09;
export const VID_WIRED = 0x258a;
export const PID_WIRED = 0x010c;
export const BLUETOOTH_PIDS = [0xfa07, 0xfa08];

const REPORT_RX = 0x13;
const PACKET = 20;
const CHUNK = 14;
const REPORT_WIRED = 0x06;
const WIRED_LEN = 520;
const WIRED_CHUNK = 512;

export const LED_BLOCK_LEN = 128;
export const OFF_EFFECT = 10;
export const OFF_WIN_LOCK = 15;
export const OFF_SIDE = 18;
export const OFF_SLEEP = 24;
export const OFF_KNOB = 26;
export const OFF_OS = 27;
const OFF_SLOTS = 58;

/** Firmware effect numbers as observed on a real F75. */
export const HW_EFFECTS: { hw: number; name: string; speed: boolean; color: boolean }[] = [
  { hw: 1, name: 'Sabit Renk', speed: false, color: true },
  { hw: 2, name: 'Nefes', speed: true, color: true },
  { hw: 3, name: 'Spektrum', speed: true, color: false },
  { hw: 4, name: 'Satır Dalgası (tuşa tepki)', speed: true, color: true },
  { hw: 5, name: 'Yağmur Damlası', speed: true, color: true },
  { hw: 6, name: 'Yavaş Dalga', speed: true, color: true },
  { hw: 7, name: 'Dalgalanma (tuşa tepki)', speed: true, color: true },
  { hw: 8, name: 'Yıldız Parıltısı', speed: true, color: true },
  { hw: 10, name: 'Retro Yılan', speed: true, color: true },
  { hw: 11, name: 'Neon Akış', speed: true, color: true },
  { hw: 12, name: 'Tepki (basılan tuş)', speed: true, color: true },
  { hw: 13, name: 'Merkez Dalgası', speed: true, color: true },
  { hw: 15, name: 'Gökkuşağı Çarkı', speed: true, color: false },
  { hw: 16, name: 'Renkli Şelale', speed: true, color: false },
  { hw: 17, name: 'Çiçek Açma', speed: true, color: true },
  { hw: 0, name: 'Kapalı', speed: false, color: false },
];

export const HW_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
export const COLOR_MULTI = 7;

/** Per-key / live mode: 32 shows the per-key table immediately over 2.4G, the cable uses 21. */
export const CUSTOM_RECEIVER = 32;
export const CUSTOM_WIRED = 21;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TRACE = new URLSearchParams(location.search).has('trace');
const hex = (b: ArrayLike<number>) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(' ');

export class DeviceError extends Error {}

export interface WirelessTuning {
  /** bytes per real-time frame (14 per packet) */
  budget: number;
  /** ms between packets */
  gap: number;
}

export class F75 {
  readonly link: Link;
  readonly hid: HIDDevice;
  /** returns true when no key is held - config traffic can swallow key releases */
  isIdle: () => boolean = () => true;
  /** 2.4G: the receiver announces when the keyboard links / drops (sleep, power) */
  onLinkChange: (online: boolean) => void = () => undefined;
  private inbox: Uint8Array[] = [];
  private waiters: (() => void)[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private onInput = (e: HIDInputReportEvent) => {
    if (e.reportId !== REPORT_RX) return;
    const d = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength);
    const p = new Uint8Array(PACKET);
    p[0] = REPORT_RX;
    p.set(d.subarray(0, PACKET - 1), 1);
    if (TRACE) console.log('< ' + hex(p));
    if (p[1] === 0x0a && p[5] === 0x02 && p[2] === 1) {
      this.onLinkChange(!!p[6]);
      return;
    }
    this.inbox.push(p);
    if (this.inbox.length > 256) this.inbox.shift();
    this.waiters.splice(0).forEach((w) => w());
  };

  constructor(hid: HIDDevice, link: Link) {
    this.hid = hid;
    this.link = link;
  }

  get name() {
    return this.link === 'wired' ? 'USB-C Kablo' : '2.4 GHz Alıcı';
  }

  async open() {
    if (!this.hid.opened) await this.hid.open();
    this.hid.addEventListener('inputreport', this.onInput);
  }

  async close() {
    this.hid.removeEventListener('inputreport', this.onInput);
    try {
      if (this.hid.opened) await this.hid.close();
    } catch {
      /* already gone */
    }
  }

  /** Serializes every device operation (live frames and config writes never interleave). */
  run<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.queue.then(fn, fn);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private async waitIdle(limit = 4000) {
    const t0 = performance.now();
    while (!this.isIdle() && performance.now() - t0 < limit) await sleep(50);
  }

  // ------------------------------------------------------------ 2.4 GHz receiver

  private packet(cmd: number, total: number, index: number, sub: number, chunk: ArrayLike<number>) {
    const p = new Uint8Array(PACKET);
    p[0] = REPORT_RX;
    p[1] = cmd;
    p[2] = total;
    p[3] = index;
    p[4] = ((sub << 4) | chunk.length) & 0xff;
    p.set(chunk as Uint8Array, 5);
    let s = 0;
    for (let i = 0; i < PACKET - 1; i++) s += p[i];
    p[19] = s & 0xff;
    return p;
  }

  private async send20(p: Uint8Array) {
    if (TRACE && p[1] !== 0x88) console.log('> ' + hex(p));
    await this.hid.sendReport(REPORT_RX, p.slice(1));
  }

  private async recv(timeout: number): Promise<Uint8Array | null> {
    const deadline = performance.now() + timeout;
    while (true) {
      const p = this.inbox.shift();
      if (p) {
        let s = 0;
        for (let i = 0; i < PACKET - 1; i++) s += p[i];
        if ((s & 0xff) === p[19]) return p;
        continue;
      }
      const left = deadline - performance.now();
      if (left <= 0) return null;
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, left);
        this.waiters.push(() => { clearTimeout(t); resolve(); });
      });
    }
  }

  private split(cmd: number, sub: number, data: Uint8Array) {
    const out: Uint8Array[] = [];
    const total = Math.max(1, Math.ceil(data.length / CHUNK));
    for (let i = 0; i < total; i++) out.push(this.packet(cmd, total, i, sub, data.subarray(i * CHUNK, (i + 1) * CHUNK)));
    return out;
  }

  private async rxWrite(cmd: number, sub: number, data: Uint8Array) {
    await this.waitIdle();
    this.inbox.length = 0;
    for (const p of this.split(cmd, sub, data)) {
      let ok = false;
      for (let attempt = 0; attempt < 6 && !ok; attempt++) {
        await this.send20(p);
        const deadline = performance.now() + 1000;
        while (performance.now() < deadline) {
          const r = await this.recv(deadline - performance.now());
          if (!r) break;
          if (r[1] !== cmd || r[3] !== p[3]) continue;
          if (r[2] & 0x80) throw new DeviceError(`Klavye 0x${cmd.toString(16)} komutunu reddetti`);
          ok = true;
          break;
        }
      }
      if (!ok) throw new DeviceError('Klavye yanıt vermedi (uykuda olabilir — bir tuşa basıp tekrar dene)');
      await sleep(15);
    }
  }

  private async rxRead(cmd: number, sub = 0, raw = false, attempts = 5): Promise<Uint8Array> {
    const rcmd = raw ? cmd : cmd | 0x40;
    const parts = new Map<number, Uint8Array>();
    let total = 0;
    await this.waitIdle();
    for (let attempt = 0; attempt < attempts; attempt++) {
      this.inbox.length = 0;
      await this.send20(this.packet(rcmd, 1, 0, sub, []));
      let last = performance.now();
      const deadline = performance.now() + 1500;
      while (performance.now() < deadline) {
        if (parts.size && performance.now() - last > 250) break;
        const r = await this.recv(60);
        if (!r || (r[1] & 0x7f) !== (rcmd & 0x7f)) continue;
        if (r[2] & 0x80) throw new DeviceError(`Okuma reddedildi (0x${rcmd.toString(16)})`);
        last = performance.now();
        total = r[2] & 0x7f;
        const len = Math.min(CHUNK, r[4] & 0x0f);
        if (r[3] < total) parts.set(r[3], r.slice(5, 5 + len));
        if (total && parts.size === total) {
          const out: number[] = [];
          for (let i = 0; i < total; i++) out.push(...parts.get(i)!);
          return new Uint8Array(out);
        }
      }
      await sleep(80);
    }
    if (!total) throw new DeviceError('Klavye yanıt vermedi (uykuda olabilir — bir tuşa basıp tekrar dene)');
    throw new DeviceError('Okuma eksik kaldı, lütfen tekrar dene');
  }

  // ------------------------------------------------------------ USB-C cable

  private wiredPackets(cmd: number, sub: number, len: number, data?: Uint8Array) {
    const total = Math.max(1, Math.ceil(len / WIRED_CHUNK));
    const out: Uint8Array[] = [];
    for (let i = 0; i < total; i++) {
      const off = i * WIRED_CHUNK;
      const size = Math.min(WIRED_CHUNK, len - off);
      const p = new Uint8Array(WIRED_LEN);
      p[0] = REPORT_WIRED;
      p[1] = cmd;
      p[2] = sub;
      p[4] = total;
      p[5] = i;
      p[6] = size & 0xff;
      p[7] = size >> 8;
      if (data) p.set(data.subarray(off, off + size), 8);
      out.push(p);
    }
    return out;
  }

  private async wiredSend(p: Uint8Array) {
    let err: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        await this.hid.sendFeatureReport(REPORT_WIRED, p.slice(1));
        return;
      } catch (e) {
        err = e;
        await sleep(70);
      }
    }
    throw new DeviceError('Kablo üzerinden yazılamadı: ' + String(err));
  }

  private async wiredWrite(cmd: number, sub: number, data: Uint8Array, delay = 20) {
    for (const p of this.wiredPackets(cmd, sub, data.length, data)) {
      await sleep(delay);
      await this.wiredSend(p);
    }
  }

  private async wiredRead(cmd: number, sub: number, len: number) {
    const out: number[] = [];
    for (const p of this.wiredPackets(cmd | 0x80, sub, len)) {
      const size = p[6] | (p[7] << 8);
      await sleep(20);
      await this.wiredSend(p);
      await sleep(20);
      const dv = await this.hid.receiveFeatureReport(REPORT_WIRED);
      let d = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
      if (d.length >= WIRED_LEN && d[0] === REPORT_WIRED) d = d.subarray(1);
      // d now starts at the command byte (packet offset 1); payload at packet offset 8
      if (d.length < 7 + size) throw new DeviceError('Kablo yanıtı kısa');
      out.push(...d.subarray(7, 7 + size));
    }
    return new Uint8Array(out);
  }

  // ------------------------------------------------------------ high level

  private cmd(kind: 'led' | 'perkey' | 'palette' | 'live') {
    const wired = this.link === 'wired';
    switch (kind) {
      case 'led': return 0x04;
      case 'perkey': return wired ? 0x06 : 0x02;
      case 'palette': return wired ? 0x0a : 0x09;
      case 'live': return wired ? 0x08 : 0x88;
    }
  }

  private write(cmd: number, data: Uint8Array, sub = 0) {
    return this.link === 'wired' ? this.wiredWrite(cmd, sub, data) : this.rxWrite(cmd, sub, data);
  }

  private read(cmd: number, len: number, sub = 0) {
    return this.link === 'wired' ? this.wiredRead(cmd, sub, len) : this.rxRead(cmd, sub);
  }

  /** 2.4G only: whether the keyboard is linked to the receiver (answered by the receiver itself). */
  isOnline(): Promise<boolean | null> {
    if (this.link === 'wired') return Promise.resolve(true);
    return this.run(async () => {
      try {
        return !!(await this.rxRead(0x07, 0, true, 1))[0];
      } catch {
        return null;
      }
    });
  }

  /**
   * Checks the keyboard answers. Over 2.4G the receiver itself answers 0x07 with
   * whether the keyboard is linked; then the keyboard's profile reply carries battery %.
   */
  probe(): Promise<number | null> {
    return this.run(async () => {
      if (this.link === 'wired') {
        await this.getLedBlockRaw();
        return null;
      }
      let online: boolean | null = null;
      try {
        const o = await this.rxRead(0x07, 0, true, 2);
        online = !!o[0];
      } catch {
        online = null;
      }
      if (online === false) throw new DeviceError('Alıcı hazır ama klavye bağlı değil — klavye kapalı veya uykuda. Bir tuşa bas.');
      const d = await this.rxRead(0x0a, 0, false, online ? 4 : 2);
      return d.length && d[0] <= 100 ? d[0] : null;
    });
  }

  private async getLedBlockRaw() {
    const b = await this.read(this.cmd('led'), LED_BLOCK_LEN);
    if (b.length < LED_BLOCK_LEN || b[126] !== 0x5a || b[127] !== 0xa5) {
      throw new DeviceError('Işık ayar bloğu doğrulanamadı (5A A5 imzası yok) — yazma iptal edildi');
    }
    return b.slice(0, LED_BLOCK_LEN);
  }

  getLedBlock() {
    return this.run(() => this.getLedBlockRaw());
  }

  /** Read-modify-write of the 128-byte lighting block, like the official app. */
  editLedBlock(edit: (b: Uint8Array) => void) {
    return this.run(async () => {
      const b = await this.getLedBlockRaw();
      edit(b);
      b[126] = 0x5a;
      b[127] = 0xa5;
      await this.write(this.cmd('led'), b);
      return b;
    });
  }

  static slot(hw: number) {
    return OFF_SLOTS + 2 * (hw - 1);
  }

  private applyEffect(b: Uint8Array, hw: number, brightness: number, speed: number, color: number) {
    if (this.link === 'wired') b[9] = hw === CUSTOM_WIRED ? 1 : 0;
    b[OFF_EFFECT] = hw;
    if (hw >= 1 && hw <= 34) {
      const o = F75.slot(hw);
      b[o] = Math.max(0, Math.min(9, brightness));
      b[o + 1] = (Math.max(0, Math.min(4, speed)) << 4) | (color & 0x0f);
    }
  }

  setEffect(hw: number, brightness: number, speed: number, color: number) {
    return this.editLedBlock((b) => this.applyEffect(b, hw, brightness, speed, color));
  }

  get customMode() {
    return this.link === 'wired' ? CUSTOM_WIRED : CUSTOM_RECEIVER;
  }

  /** Puts the keyboard into the per-key mode that displays real-time frames. */
  enterLiveMode() {
    return this.setEffect(this.customMode, 9, 0, 0);
  }

  /** Stores a static per-key picture in the keyboard (survives power off). */
  setPerKey(frame: Uint8Array, brightness = 9) {
    return this.run(async () => {
      const len = this.link === 'wired' ? 384 : 378;
      const planar = new Uint8Array(len);
      for (let led = 0; led < LED_COUNT; led++) {
        planar[led] = frame[led * 3];
        planar[LED_COUNT + led] = frame[led * 3 + 1];
        planar[2 * LED_COUNT + led] = frame[led * 3 + 2];
      }
      await this.write(this.cmd('perkey'), planar);
      const b = await this.getLedBlockRaw();
      this.applyEffect(b, this.customMode, brightness, 0, 0);
      await this.write(this.cmd('led'), b);
    });
  }

  /** Gives a firmware effect an arbitrary colour through its palette (colour slot 0). */
  setEffectColor(hw: number, rgb: [number, number, number]) {
    return this.run(async () => {
      const pal = await this.read(this.cmd('palette'), 490);
      if (pal.length < 490 || hw < 0 || hw > 22) throw new DeviceError('Bu efekt için özel renk desteklenmiyor');
      const o = hw * 21;
      pal[o] = rgb[0];
      pal[o + 1] = rgb[1];
      pal[o + 2] = rgb[2];
      await this.write(this.cmd('palette'), pal.slice(0, 490));
    });
  }

  // ------------------------------------------------------------ real-time frames

  /** Sends one live frame (126 LEDs x RGB). Not stored, not acknowledged. */
  sendLive(frame: Uint8Array, tuning: WirelessTuning) {
    return this.run(async () => {
      if (this.link === 'wired') {
        const p = this.wiredPackets(0x08, 0, LED_COUNT * 3, frame)[0];
        await this.wiredSend(p);
        return 1;
      }
      const payload = encodeGroups(frame, tuning.budget);
      const packets = this.split(0x88, 1, payload);
      for (const p of packets) {
        await this.send20(p);
        await sleep(tuning.gap);
      }
      this.inbox.length = 0;
      return packets.length;
    });
  }
}

// ------------------------------------------------------------ 2.4G frame encoding

/**
 * 2.4G real-time frames carry colour groups [R G B count led...] and must stay short
 * (~9 packets) or the radio drops them. Dark keys are simply left out; lit keys are
 * quantized to as many colours as the byte budget allows (median cut).
 */
export function encodeGroups(frame: Uint8Array, budget: number): Uint8Array {
  const lit: { led: number; c: [number, number, number] }[] = [];
  for (let led = 0; led < LED_COUNT; led++) {
    const r = frame[led * 3], g = frame[led * 3 + 1], b = frame[led * 3 + 2];
    if (r > 3 || g > 3 || b > 3) lit.push({ led, c: [r, g, b] });
  }
  if (!lit.length) return new Uint8Array([0, 0, 0, 1, 0]);
  // too many lit keys for even one group: keep the brightest
  if (lit.length > budget - 4) {
    lit.sort((a, b) => b.c[0] + b.c[1] + b.c[2] - (a.c[0] + a.c[1] + a.c[2]));
    lit.length = budget - 4;
  }
  const groups = Math.max(1, Math.floor((budget - lit.length) / 4));
  let boxes = [lit];
  const spread = (box: typeof lit) => {
    let best = 0, ch = 0;
    for (let c = 0; c < 3; c++) {
      let lo = 255, hi = 0;
      for (const p of box) { lo = Math.min(lo, p.c[c]); hi = Math.max(hi, p.c[c]); }
      if (hi - lo > best) { best = hi - lo; ch = c; }
    }
    return [best, ch] as const;
  };
  while (boxes.length < groups) {
    let bi = -1, bw = 0, bch = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const [w, ch] = spread(box);
      if (w > bw) { bw = w; bi = i; bch = ch; }
    });
    if (bi < 0 || bw < 6) break;
    const box = boxes[bi].slice().sort((a, b) => a.c[bch] - b.c[bch]);
    const half = box.length >> 1;
    boxes = [...boxes.slice(0, bi), box.slice(0, half), box.slice(half), ...boxes.slice(bi + 1)];
  }
  const out: number[] = [];
  for (const box of boxes) {
    if (!box.length) continue;
    const avg = [0, 1, 2].map((c) => Math.round(box.reduce((s, p) => s + p.c[c], 0) / box.length));
    if (!avg[0] && !avg[1] && !avg[2]) continue;
    out.push(avg[0], avg[1], avg[2], box.length, ...box.map((p) => p.led).sort((a, b) => a - b));
  }
  return new Uint8Array(out.length ? out : [0, 0, 0, 1, 0]);
}

// ------------------------------------------------------------ discovery

export type Found = { link: Link; hid: HIDDevice } | { link: 'bluetooth'; hid: HIDDevice };

function hasVendorRx(d: HIDDevice) {
  return d.collections.some((c) => c.usagePage === 0xff02 || (c.outputReports ?? []).some((r) => r.reportId === REPORT_RX));
}

function hasWiredFeature(d: HIDDevice) {
  return d.collections.some((c) => (c.featureReports ?? []).some((r) => r.reportId === REPORT_WIRED));
}

/** Finds the configuration interface of a connected F75 (cable preferred). */
export async function findKeyboard(): Promise<Found | null> {
  if (!('hid' in navigator)) return null;
  let devices = await navigator.hid.getDevices();
  if (TRACE) {
    for (const d of devices) {
      console.log(`hid ${d.vendorId.toString(16)}:${d.productId.toString(16)} "${d.productName}" ` +
        d.collections.map((c) => `[page ${c.usagePage?.toString(16)} usage ${c.usage?.toString(16)} in ${(c.inputReports ?? []).map((r) => r.reportId)} out ${(c.outputReports ?? []).map((r) => r.reportId)} feat ${(c.featureReports ?? []).map((r) => r.reportId)}]`).join(' '));
    }
  }
  if (!devices.length) {
    try {
      devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: VID_RECEIVER }, { vendorId: VID_WIRED }],
      });
    } catch {
      devices = [];
    }
  }
  const wired = devices.find((d) => d.vendorId === VID_WIRED && d.productId === PID_WIRED && hasWiredFeature(d));
  if (wired) return { link: 'wired', hid: wired };
  const rx = devices.find((d) => d.vendorId === VID_RECEIVER && d.productId === PID_RECEIVER && hasVendorRx(d));
  if (rx) return { link: 'receiver', hid: rx };
  const bt = devices.find((d) => d.vendorId === VID_RECEIVER && BLUETOOTH_PIDS.includes(d.productId));
  if (bt) return { link: 'bluetooth', hid: bt };
  return null;
}
