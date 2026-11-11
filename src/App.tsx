import { useEffect, useState } from 'react';
import { DeviceView } from './components/DeviceView';
import { EffectsView } from './components/EffectsView';
import { HardwareView } from './components/HardwareView';
import { Icon, Logo } from './components/icons';
import { PaintView } from './components/PaintView';
import { SettingsView } from './components/SettingsView';
import { EFFECTS } from './core/effects';
import { controller } from './state/controller';
import { View, store, useStore } from './state/store';

const NAV: { id: View; icon: string; label: string }[] = [
  { id: 'effects', icon: 'sparkles', label: 'Efektler' },
  { id: 'hardware', icon: 'chip', label: 'Donanım' },
  { id: 'paint', icon: 'brush', label: 'Boyama' },
  { id: 'device', icon: 'keyboard', label: 'Cihaz' },
  { id: 'settings', icon: 'settings', label: 'Ayarlar' },
];

function DevicePill() {
  const conn = useStore((s) => s.conn);
  const live = useStore((s) => s.live);
  const fps = useStore((s) => s.fps);
  const label =
    conn.status === 'ready' ? `AULA F75 · ${conn.link === 'wired' ? 'Kablo' : '2.4G'}` :
    conn.status === 'connecting' ? 'Bağlanıyor…' :
    conn.status === 'asleep' ? 'Klavye uykuda' :
    conn.status === 'bluetooth' ? 'Bluetooth (ayar yok)' : 'Klavye bağlı değil';
  return (
    <button className={'device-pill ' + conn.status} onClick={() => store.set({ view: 'device' })}>
      <i />
      <span>{label}</span>
      {conn.status === 'ready' && conn.battery != null && <em><Icon name="battery" size={13} /> %{conn.battery}</em>}
      {conn.status === 'ready' && live && fps > 0 && <em className="fps">{fps} FPS</em>}
    </button>
  );
}

function TitleBar() {
  const [max, setMax] = useState(false);
  useEffect(() => window.aula?.onMaximized(setMax), []);
  return (
    <header className="titlebar">
      <div className="brand">
        <Logo size={22} />
        <b>AULA F75</b>
        <span>STUDIO</span>
      </div>
      <div className="drag" />
      <DevicePill />
      <div className="win-btns">
        <button onClick={() => window.aula?.minimize()} title="Küçült"><Icon name="min" size={14} /></button>
        <button onClick={() => window.aula?.maximize()} title={max ? 'Geri yükle' : 'Büyüt'}><Icon name="max" size={12} /></button>
        <button className="close" onClick={() => window.aula?.close()} title="Kapat"><Icon name="close" size={14} /></button>
      </div>
    </header>
  );
}

function Sidebar() {
  const view = useStore((s) => s.view);
  return (
    <nav className="sidebar">
      {NAV.map((n) => (
        <button key={n.id} className={view === n.id ? 'on' : ''} onClick={() => store.set({ view: n.id })}>
          <Icon name={n.icon} size={21} />
          <span>{n.label}</span>
        </button>
      ))}
      <div className="side-foot">
        <span>{EFFECTS.length}</span>
        <small>efekt</small>
      </div>
    </nav>
  );
}

function Toast() {
  const t = useStore((s) => s.toast);
  if (!t) return null;
  return (
    <div key={t.id} className={'toast ' + t.kind}>
      <Icon name={t.kind === 'err' ? 'info' : t.kind === 'ok' ? 'bolt' : 'info'} size={16} />
      <span>{t.msg}</span>
    </div>
  );
}

export function App() {
  const view = useStore((s) => s.view);
  useEffect(() => controller.start(), []);

  // Without the global hook (uiohook), react to keys typed inside the window.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (store.get().globalKeys) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const id = codeToId(e.code);
      if (id) controller.keyDown(id);
    };
    const up = (e: KeyboardEvent) => {
      if (store.get().globalKeys) return;
      const id = codeToId(e.code);
      if (id) controller.keyUp(id);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return (
    <div className="app">
      <TitleBar />
      <div className="body">
        <Sidebar />
        <main className="content">
          {view === 'effects' && <EffectsView />}
          {view === 'hardware' && <HardwareView />}
          {view === 'paint' && <PaintView />}
          {view === 'device' && <DeviceView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>
      <Toast />
    </div>
  );
}

const CODE_MAP: Record<string, string> = {
  Escape: 'esc', Backquote: 'grave', Minus: 'minus', Equal: 'equal', Backspace: 'backspace', Delete: 'delete',
  Tab: 'tab', BracketLeft: 'lbracket', BracketRight: 'rbracket', Backslash: 'backslash', PageUp: 'pgup',
  CapsLock: 'capslock', Semicolon: 'semicolon', Quote: 'quote', Enter: 'enter', PageDown: 'pgdn',
  ShiftLeft: 'lshift', Comma: 'comma', Period: 'period', Slash: 'slash', ShiftRight: 'rshift', ArrowUp: 'up',
  End: 'end', Home: 'end', ControlLeft: 'lctrl', MetaLeft: 'lwin', AltLeft: 'lalt', Space: 'space', AltRight: 'ralt',
  ControlRight: 'ralt', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right', IntlBackslash: 'lshift',
};

function codeToId(code: string): string | null {
  if (CODE_MAP[code]) return CODE_MAP[code];
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1].toLowerCase();
  m = /^Digit(\d)$/.exec(code);
  if (m) return m[1];
  m = /^F(\d+)$/.exec(code);
  if (m && +m[1] <= 12) return 'f' + m[1];
  return null;
}
