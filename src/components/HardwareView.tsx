import { useCallback, useEffect, useRef } from 'react';
import { COLOR_MULTI, HW_COLORS, HW_EFFECTS } from '../core/device';
import { EFFECT_BY_ID } from '../core/effects';
import { EffectDef, stateless } from '../core/effects/types';
import { Engine, defaultSettings } from '../core/engine';
import { controller } from '../state/controller';
import { store, useStore } from '../state/store';
import { ColorField, Slider } from './ControlPanel';
import { Icon } from './icons';
import { KeyboardView } from './KeyboardView';

const STATIC: EffectDef = { id: 'hw-static', name: '', category: 'pulse', description: '', uses: [], create: stateless((c) => c.fill(c.primary)) };
const OFF: EffectDef = { id: 'hw-off', name: '', category: 'pulse', description: '', uses: [], create: stateless((c) => c.fill([0, 0, 0])) };

/** Closest software look-alike, used only for the on-screen preview of firmware effects. */
const PREVIEW: Record<number, string> = {
  2: 'breathe-gradient', 3: 'color-cycle', 4: 'echo', 5: 'pond-drops', 6: 'gradient-scroll', 7: 'ripple', 8: 'confetti',
  10: 'arcade-chase', 11: 'gradient-scroll', 12: 'key-fade', 13: 'pulse-rings', 15: 'spiral', 16: 'rainbow-flow', 17: 'pulse-rings',
};

export function HardwareView() {
  const hw = useStore((s) => s.hw);
  const busy = useStore((s) => s.busy);
  const ready = useStore((s) => s.conn.status === 'ready');
  const live = useStore((s) => s.live);
  const engine = useRef<Engine>(new Engine(STATIC));
  const frame = useRef(new Float32Array(300));
  const meta = HW_EFFECTS.find((e) => e.hw === hw.effect) ?? HW_EFFECTS[0];

  useEffect(() => {
    const def = hw.effect === 0 ? OFF : hw.effect === 1 ? STATIC : EFFECT_BY_ID.get(PREVIEW[hw.effect] ?? '') ?? STATIC;
    const st = defaultSettings(def);
    const multi = hw.color === COLOR_MULTI || !meta.color;
    const col = hw.color === 0 && hw.customColor ? hw.customColor : HW_COLORS[hw.color] ?? '#ffffff';
    st.palette = multi ? 'rainbow' : 'mono';
    st.primary = multi ? st.primary : col;
    st.secondary = multi ? st.secondary : col;
    st.speed = 0.4 + hw.speed * 0.4;
    if (hw.effect === 16) st.params.dir = 'down';
    if (hw.effect === 13) st.params.dir = 'center';
    engine.current.setEffect(def, st);
    engine.current.autoPress = true;
  }, [hw.effect, hw.color, hw.speed, hw.customColor, meta.color]);

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const buf = engine.current.step((now - last) / 1000);
      last = now;
      const b = hw.brightness / 9;
      for (let i = 0; i < buf.length; i++) frame.current[i] = buf[i] * b;
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [hw.brightness]);

  const getColors = useCallback(() => frame.current, []);
  const set = (patch: Partial<typeof hw>) => store.set((s) => ({ hw: { ...s.hw, ...patch } }));

  return (
    <div className="page two-col">
      <div className="main-col">
        <section className="hero compact">
          <div className="hero-bg" />
          <div className="hero-head">
            <div>
              <div className="eyebrow"><Icon name="chip" size={14} /> Klavyenin kendi hafızası</div>
              <h1>Donanım Efektleri</h1>
              <p>Bu efektler klavyenin içindeki çipte çalışır; uygulama kapalıyken ve başka bilgisayarda da devam eder.</p>
            </div>
            <div className="hero-actions">
              <button className="primary-btn" disabled={!!busy || !ready} onClick={() => controller.applyHardware()}>
                <Icon name="save" /> {busy || 'Klavyeye Uygula'}
              </button>
            </div>
          </div>
          <div className="hero-kb short"><KeyboardView getColors={getColors} reflection={false} /></div>
          {live && <div className="banner">Uygularken canlı yazılım efektleri durdurulur, böylece donanım efekti görünür.</div>}
        </section>
        <section className="hw-grid">
          {HW_EFFECTS.map((e) => (
            <button key={e.hw} className={'hw-card' + (e.hw === hw.effect ? ' on' : '')} onClick={() => set({ effect: e.hw })}>
              <span className="hw-num">{e.hw === 0 ? '—' : String(e.hw).padStart(2, '0')}</span>
              <span className="hw-name">{e.name}</span>
            </button>
          ))}
        </section>
      </div>
      <aside className="panel controls">
        <div className="panel-title"><span>{meta.name}</span></div>
        <div className="group">
          <Slider label="Parlaklık" value={hw.brightness} min={0} max={9} step={1} onChange={(v) => set({ brightness: v })} />
          {meta.speed && <Slider label="Hız" value={hw.speed} min={0} max={4} step={1} onChange={(v) => set({ speed: v })} />}
        </div>
        {meta.color && (
          <div className="group">
            <div className="ctl-head"><span>Renk</span></div>
            <div className="hw-colors">
              {HW_COLORS.map((c, i) => (
                <button key={c} className={'sw big' + (hw.color === i ? ' on' : '')} style={{ background: c }} onClick={() => set({ color: i })} />
              ))}
              <button className={'sw big multi' + (hw.color === COLOR_MULTI ? ' on' : '')} title="Çok renkli" onClick={() => set({ color: COLOR_MULTI })} />
            </div>
          </div>
        )}
        {meta.color && (
          <div className="group">
            <ColorField label="Özel RGB Renk" value={hw.customColor} onChange={(v) => set({ customColor: v })} />
            <button className="secondary-btn" disabled={!!busy || !ready} onClick={() => controller.applyHardwareCustomColor()}>
              Bu rengi efekte yaz
            </button>
            <p className="muted small">Klavyenin efekt paletine istediğin RGB rengi yazar (orijinal sürücüde yalnızca 7 renk vardır).</p>
          </div>
        )}
        {!ready && <div className="note"><Icon name="info" size={16} /><div>Uygulamak için klavyeyi bağla.</div></div>}
      </aside>
    </div>
  );
}
