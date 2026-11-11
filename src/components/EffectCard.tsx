import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { EffectDef } from '../core/effects/types';
import { Engine, EffectSettings } from '../core/engine';
import { controller } from '../state/controller';
import { KeyboardRenderer } from './renderer';
import { Icon } from './icons';

interface Props {
  def: EffectDef;
  saved?: EffectSettings;
  active: boolean;
  favorite: boolean;
  seed: number;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  pulse: 'Nabız', wave: 'Dalga', nature: 'Doğa', space: 'Uzay', retro: 'Retro', reactive: 'Tepki', music: 'Müzik',
};

/** Gallery card with a mini keyboard: a still frame normally, animated on hover / when active. */
export const EffectCard = memo(function EffectCard({ def, saved, active, favorite, seed, onSelect, onFavorite }: Props) {
  const settings = useMemo(() => controller.settingsFor(def.id), [def.id, saved]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const state = useRef<{ engine: Engine; renderer: KeyboardRenderer } | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '200px' });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (!state.current) {
      const engine = new Engine(def, settings, seed);
      engine.autoPress = true;
      engine.useFakeAudio = true;
      engine.warmup(2.2);
      state.current = { engine, renderer: new KeyboardRenderer() };
    } else {
      state.current.engine.applySettings(settings);
    }
    const { engine, renderer } = state.current;
    const draw = (dt: number) => {
      const c = canvas.current;
      if (c) renderer.draw(c, engine.step(dt), { lite: true });
    };
    draw(0.05);
    if (!hover && !active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      draw((now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible, hover, active, settings, def, seed]);

  return (
    <div
      ref={box}
      className={'fx-card' + (active ? ' active' : '')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(def.id)}
    >
      <div className="fx-thumb">
        <canvas ref={canvas} />
        {def.isNew && <span className="badge-new">YENİ</span>}
        {active && <span className="badge-live"><i />AKTİF</span>}
      </div>
      <div className="fx-meta">
        <div className="fx-title">
          <span>{def.name}</span>
          <button
            className={'fav' + (favorite ? ' on' : '')}
            title={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            onClick={(e) => { e.stopPropagation(); onFavorite(def.id); }}
          >
            <Icon name={favorite ? 'star-fill' : 'star'} size={15} />
          </button>
        </div>
        <div className="fx-sub">
          <span className={'cat cat-' + def.category}>{CATEGORY_LABEL[def.category]}</span>
          {def.category === 'reactive' && <span className="hint">tuşa basınca</span>}
          {def.category === 'music' && <span className="hint">sese duyarlı</span>}
        </div>
      </div>
    </div>
  );
});
