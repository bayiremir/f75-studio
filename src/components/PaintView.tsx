import { useCallback, useRef, useState } from 'react';
import { hexToRgb, rgbToHex } from '../core/color';
import { KEYS, KEY_BY_ID, LED_COUNT } from '../core/layout';
import { PALETTES, makePalette, paletteCss } from '../core/palettes';
import { controller } from '../state/controller';
import { store, useStore } from '../state/store';
import { ColorField } from './ControlPanel';
import { Icon } from './icons';
import { KeyboardView } from './KeyboardView';

type Tool = 'brush' | 'eraser' | 'dropper';

const THEMES: { name: string; build: (f: number[]) => void }[] = [
  {
    name: 'Oyuncu (WASD)',
    build: (f) => {
      fillAll(f, [10, 20, 80]);
      for (const id of ['w', 'a', 's', 'd', 'space', 'lshift', 'lctrl', 'e', 'q', 'r']) setKey(f, id, [255, 0, 40]);
      for (const id of ['1', '2', '3', '4', '5']) setKey(f, id, [255, 160, 0]);
    },
  },
  {
    name: 'Yazılımcı',
    build: (f) => {
      fillAll(f, [20, 0, 40]);
      for (const k of KEYS) if (/^f\d+$/.test(k.id)) setKey(f, k.id, [0, 200, 255]);
      for (const id of ['lbracket', 'rbracket', 'semicolon', 'quote', 'slash', 'backslash', 'minus', 'equal', 'comma', 'period']) setKey(f, id, [255, 0, 200]);
      for (const id of ['enter', 'backspace', 'tab', 'esc']) setKey(f, id, [0, 255, 120]);
    },
  },
  { name: 'Gün Batımı', build: (f) => gradient(f, 'sunset') },
  { name: 'Okyanus', build: (f) => gradient(f, 'ocean') },
  { name: 'Cyberpunk', build: (f) => gradient(f, 'cyberpunk') },
  {
    name: 'Ay Yıldız',
    build: (f) => {
      fillAll(f, [255, 0, 0]);
      for (const id of ['g', 'h', 'y', 'b', 'n', 'j', 'k', 'u', 'i', 'm']) setKey(f, id, [255, 255, 255]);
    },
  },
];

function setKey(f: number[], id: string, c: [number, number, number]) {
  const k = KEY_BY_ID.get(id);
  if (!k) return;
  f[k.led * 3] = c[0]; f[k.led * 3 + 1] = c[1]; f[k.led * 3 + 2] = c[2];
}
function fillAll(f: number[], c: [number, number, number]) {
  for (const k of KEYS) setKey(f, k.id, c);
}
function gradient(f: number[], palette: string) {
  const pal = makePalette(palette, [255, 0, 200], [0, 229, 255]);
  for (const k of KEYS) setKey(f, k.id, pal(k.x * 0.9).map(Math.round) as [number, number, number]);
}

export function PaintView() {
  const color = useStore((s) => s.paintColor);
  const busy = useStore((s) => s.busy);
  const ready = useStore((s) => s.conn.status === 'ready');
  const live = useStore((s) => s.live);
  const [tool, setTool] = useState<Tool>('brush');
  const colors = useRef(new Float32Array(KEYS.length * 3));

  const getColors = useCallback(() => {
    const f = store.get().paintFrame;
    for (const k of KEYS) {
      colors.current[k.index * 3] = f[k.led * 3];
      colors.current[k.index * 3 + 1] = f[k.led * 3 + 1];
      colors.current[k.index * 3 + 2] = f[k.led * 3 + 2];
    }
    return colors.current;
  }, []);

  const edit = (fn: (f: number[]) => void) => {
    const f = store.get().paintFrame.slice();
    while (f.length < LED_COUNT * 3) f.push(0);
    fn(f);
    store.set({ paintFrame: f });
  };

  const onKey = (id: string) => {
    const k = KEY_BY_ID.get(id)!;
    if (tool === 'dropper') {
      const f = store.get().paintFrame;
      store.set({ paintColor: rgbToHex([f[k.led * 3], f[k.led * 3 + 1], f[k.led * 3 + 2]]) });
      setTool('brush');
      return;
    }
    edit((f) => setKey(f, id, tool === 'eraser' ? [0, 0, 0] : hexToRgb(color)));
  };

  return (
    <div className="page two-col">
      <div className="main-col">
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-head">
            <div>
              <div className="eyebrow"><Icon name="brush" size={14} /> Tuş tuş renklendirme</div>
              <h1>Tuş Boyama</h1>
              <p>Tuşlara tıkla veya sürükleyerek boya. {live && ready ? 'Değişiklikler anında klavyede görünür.' : ''} Kaydettiğinde klavyenin hafızasına yazılır.</p>
            </div>
            <div className="hero-actions">
              <button className="primary-btn" disabled={!!busy || !ready} onClick={() => controller.savePaint()}>
                <Icon name="save" /> {busy || 'Klavyeye Kaydet'}
              </button>
            </div>
          </div>
          <div className="hero-kb">
            <KeyboardView getColors={getColors} onKey={onKey} cursor={tool === 'dropper' ? 'crosshair' : 'cell'} />
          </div>
        </section>
      </div>
      <aside className="panel controls">
        <div className="panel-title"><span>Araçlar</span></div>
        <div className="group">
          <div className="seg tools">
            <button className={tool === 'brush' ? 'on' : ''} onClick={() => setTool('brush')}><Icon name="brush" size={16} /> Fırça</button>
            <button className={tool === 'eraser' ? 'on' : ''} onClick={() => setTool('eraser')}><Icon name="eraser" size={16} /> Silgi</button>
            <button className={tool === 'dropper' ? 'on' : ''} onClick={() => setTool('dropper')}><Icon name="dropper" size={16} /> Damlalık</button>
          </div>
          <ColorField label="Fırça Rengi" value={color} onChange={(v) => store.set({ paintColor: v })} />
        </div>
        <div className="group">
          <div className="btn-row">
            <button className="secondary-btn" onClick={() => edit((f) => fillAll(f, hexToRgb(color)))}><Icon name="fill" size={16} /> Tümünü boya</button>
            <button className="secondary-btn" onClick={() => edit((f) => f.fill(0))}><Icon name="eraser" size={16} /> Temizle</button>
          </div>
        </div>
        <div className="group">
          <div className="ctl-head"><span>Paletle Doldur</span></div>
          <div className="palettes">
            {PALETTES.filter((p) => p.id !== 'mono').map((p) => (
              <button key={p.id} title={p.name} className="pal" style={{ background: paletteCss(p.id) }} onClick={() => edit((f) => gradient(f, p.id))} />
            ))}
          </div>
        </div>
        <div className="group">
          <div className="ctl-head"><span>Hazır Temalar</span></div>
          <div className="theme-list">
            {THEMES.map((t) => <button key={t.name} className="chip" onClick={() => edit(t.build)}>{t.name}</button>)}
          </div>
        </div>
      </aside>
    </div>
  );
}
