import { EFFECT_BY_ID } from '../core/effects';
import type { ParamDef } from '../core/effects/types';
import { PALETTES, paletteCss } from '../core/palettes';
import { controller } from '../state/controller';
import { store, useStore } from '../state/store';
import { Icon } from './icons';

const SWATCHES = ['#ff0033', '#ff7a00', '#ffe600', '#39ff14', '#00ffd5', '#00a2ff', '#3b2bff', '#b000ff', '#ff00c8', '#ffffff'];

export function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="ctl">
      <div className="ctl-head">
        <span>{label}</span>
        <b>{format ? format(value) : value}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--p': pct + '%' } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="ctl">
      <div className="ctl-head"><span>{label}</span><b className="mono">{value.toUpperCase()}</b></div>
      <div className="color-row">
        <label className="color-big" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button key={c} className={'sw' + (c === value ? ' on' : '')} style={{ background: c }} onClick={() => onChange(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Param({ def, value, onChange }: { def: ParamDef; value: unknown; onChange: (v: number | string | boolean) => void }) {
  if (def.type === 'range') {
    return (
      <Slider
        label={def.label}
        value={typeof value === 'number' ? value : (def.default as number)}
        min={def.min ?? 0}
        max={def.max ?? 1}
        step={def.step ?? 0.01}
        onChange={onChange}
        format={(v) => (def.step && def.step >= 1 ? String(v) : v.toFixed(2))}
      />
    );
  }
  if (def.type === 'bool') {
    return (
      <label className="toggle-row">
        <span>{def.label}</span>
        <input type="checkbox" className="switch" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  }
  return (
    <div className="ctl">
      <div className="ctl-head"><span>{def.label}</span></div>
      <div className="seg">
        {def.options!.map((o) => (
          <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export function ControlPanel() {
  const effectId = useStore((s) => s.effectId);
  useStore((s) => s.effectSettings[s.effectId]);
  const brightness = useStore((s) => s.brightness);
  const def = EFFECT_BY_ID.get(effectId)!;
  const st = controller.settingsFor(effectId);

  return (
    <aside className="panel controls">
      <div className="panel-title">
        <span>Efekt Ayarları</span>
        <button className="ghost-btn" title="Varsayılana dön" onClick={() => controller.resetSettings()}>
          <Icon name="reset" size={15} /> Sıfırla
        </button>
      </div>

      <div className="group">
        <Slider
          label="Parlaklık"
          value={Math.round(brightness * 100)}
          min={0}
          max={100}
          step={1}
          format={(v) => v + '%'}
          onChange={(v) => store.set({ brightness: v / 100 })}
        />
        <Slider
          label="Hız"
          value={st.speed}
          min={0.1}
          max={4}
          step={0.05}
          format={(v) => v.toFixed(2) + '×'}
          onChange={(v) => controller.updateSettings({ speed: v })}
        />
      </div>

      {def.uses.includes('palette') && (
        <div className="group">
          <div className="ctl-head"><span>Renk Paleti</span><b>{PALETTES.find((p) => p.id === st.palette)?.name}</b></div>
          <div className="palettes">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                title={p.name}
                className={'pal' + (p.id === st.palette ? ' on' : '')}
                style={{ background: paletteCss(p.id, st.primary, st.secondary) }}
                onClick={() => controller.updateSettings({ palette: p.id })}
              />
            ))}
          </div>
        </div>
      )}

      {(def.uses.includes('primary') || (def.uses.includes('palette') && st.palette === 'mono')) && (
        <div className="group">
          <ColorField label="Ana Renk" value={st.primary} onChange={(v) => controller.updateSettings({ primary: v })} />
        </div>
      )}
      {(def.uses.includes('secondary') || (def.uses.includes('palette') && st.palette === 'mono')) && (
        <div className="group">
          <ColorField label="İkinci Renk" value={st.secondary} onChange={(v) => controller.updateSettings({ secondary: v })} />
        </div>
      )}

      {!!def.params?.length && (
        <div className="group">
          {def.params.map((p) => (
            <Param key={p.key} def={p} value={st.params[p.key]} onChange={(v) => controller.updateSettings({ params: { [p.key]: v } })} />
          ))}
        </div>
      )}

      {def.category === 'reactive' && <ReactiveHint />}
      {def.category === 'music' && <MusicHint />}
    </aside>
  );
}

function ReactiveHint() {
  const globalKeys = useStore((s) => s.globalKeys);
  const demo = useStore((s) => s.demoPresses);
  return (
    <div className="note">
      <Icon name="keyboard" size={16} />
      <div>
        <b>Tuşa tepki veren efekt.</b> {globalKeys
          ? 'Hangi programda olursan ol, klavyede bastığın tuşlar efekti tetikler.'
          : 'Bu pencere açıkken bastığın tuşlar efekti tetikler.'} Ekrandaki klavyeye tıklayarak da deneyebilirsin.
        <label className="toggle-row small">
          <span>Boştayken demo basışları</span>
          <input type="checkbox" className="switch" checked={demo} onChange={(e) => store.set({ demoPresses: e.target.checked })} />
        </label>
      </div>
    </div>
  );
}

function MusicHint() {
  const active = useStore((s) => s.audioActive);
  const err = useStore((s) => s.audioError);
  return (
    <div className={'note' + (active ? ' ok' : '')}>
      <Icon name="broadcast" size={16} />
      <div>
        {active
          ? <><b>Sistem sesi dinleniyor.</b> Spotify, YouTube, oyun… bilgisayardan çıkan her ses efekti oynatır.</>
          : <><b>Ses yakalanamadı</b>{err ? ` (${err})` : ''}. Şu an önizleme için sentetik ritim kullanılıyor.</>}
      </div>
    </div>
  );
}
