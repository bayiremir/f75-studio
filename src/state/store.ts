import { useSyncExternalStore } from 'react';
import type { Category } from '../core/effects/types';
import type { EffectSettings } from '../core/engine';
import type { Link } from '../core/device';
import { LED_COUNT } from '../core/layout';

export type View = 'effects' | 'hardware' | 'paint' | 'device' | 'settings';

export interface ConnState {
  status: 'none' | 'connecting' | 'ready' | 'asleep' | 'bluetooth' | 'unsupported';
  link?: Link;
  name?: string;
  battery?: number | null;
  error?: string;
}

export interface AppState {
  view: View;
  effectId: string;
  effectSettings: Record<string, EffectSettings>;
  brightness: number;
  playing: boolean;
  live: boolean;
  favorites: string[];
  category: Category | 'all' | 'fav';
  search: string;
  conn: ConnState;
  fps: number;
  wirelessQuality: 'fast' | 'balanced' | 'quality' | 'max';
  wirelessGap: number;
  wiredFps: number;
  closeToTray: boolean;
  autostart: boolean;
  demoPresses: boolean;
  globalKeys: boolean;
  audioActive: boolean;
  audioError: string;
  hw: { effect: number; brightness: number; speed: number; color: number; customColor: string };
  dev: { sleep: number; side: number; winLock: boolean; knob: number; os: number; loaded: boolean };
  paintColor: string;
  paintFrame: number[];
  toast: { id: number; msg: string; kind: 'ok' | 'err' | 'info' } | null;
  busy: string;
}

const PERSIST: (keyof AppState)[] = [
  'effectId', 'effectSettings', 'brightness', 'live', 'favorites', 'wirelessQuality', 'wirelessGap',
  'wiredFps', 'closeToTray', 'hw', 'paintColor', 'paintFrame', 'demoPresses',
];

const initial: AppState = {
  view: 'effects',
  effectId: 'heartbeat',
  effectSettings: {},
  brightness: 1,
  playing: true,
  live: true,
  favorites: ['heartbeat', 'fire', 'aurora', 'matrix', 'ripple'],
  category: 'all',
  search: '',
  conn: { status: 'none' },
  fps: 0,
  wirelessQuality: 'balanced',
  wirelessGap: 5,
  wiredFps: 30,
  closeToTray: true,
  autostart: false,
  demoPresses: false,
  globalKeys: false,
  audioActive: false,
  audioError: '',
  hw: { effect: 3, brightness: 9, speed: 2, color: 7, customColor: '#ff00c8' },
  dev: { sleep: 0, side: 0, winLock: false, knob: 0, os: 0, loaded: false },
  paintColor: '#ff00c8',
  paintFrame: new Array(LED_COUNT * 3).fill(0),
  toast: null,
  busy: '',
};

function load(): AppState {
  try {
    const raw = localStorage.getItem('aula-f75-studio');
    if (!raw) return initial;
    const saved = JSON.parse(raw);
    const s = { ...initial };
    for (const k of PERSIST) if (k in saved) (s as Record<string, unknown>)[k] = saved[k];
    return s;
  } catch {
    return initial;
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

export const store = {
  get: () => state,
  set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
    const p = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...p };
    listeners.forEach((l) => l());
    if (PERSIST.some((k) => k in p)) {
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const out: Record<string, unknown> = {};
        for (const k of PERSIST) out[k] = state[k];
        localStorage.setItem('aula-f75-studio', JSON.stringify(out));
      }, 300);
    }
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(state));
}

let toastId = 0;
export function toast(msg: string, kind: 'ok' | 'err' | 'info' = 'ok') {
  const id = ++toastId;
  store.set({ toast: { id, msg, kind } });
  setTimeout(() => {
    if (store.get().toast?.id === id) store.set({ toast: null });
  }, kind === 'err' ? 6000 : 3200);
}

export const WIRELESS_BUDGET = { fast: 98, balanced: 126, quality: 168, max: 196 } as const;
