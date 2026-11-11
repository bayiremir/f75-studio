import { useCallback, useMemo } from 'react';
import { CATEGORIES, EFFECTS, EFFECT_BY_ID } from '../core/effects';
import { controller } from '../state/controller';
import { store, useStore } from '../state/store';
import { ControlPanel } from './ControlPanel';
import { EffectCard } from './EffectCard';
import { Icon } from './icons';
import { KeyboardView } from './KeyboardView';

function Hero() {
  const effectId = useStore((s) => s.effectId);
  const playing = useStore((s) => s.playing);
  const live = useStore((s) => s.live);
  const fps = useStore((s) => s.fps);
  const conn = useStore((s) => s.conn);
  const favorite = useStore((s) => s.favorites.includes(s.effectId));
  const def = EFFECT_BY_ID.get(effectId)!;
  const cat = CATEGORIES.find((c) => c.id === def.category)!;
  const ready = conn.status === 'ready';
  const getColors = useCallback(() => controller.frame, []);

  const shuffle = () => {
    const others = EFFECTS.filter((e) => e.id !== effectId);
    controller.selectEffect(others[Math.floor(Math.random() * others.length)].id);
  };

  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-head">
        <div>
          <div className="eyebrow"><span className={'dot cat-' + def.category} />{cat.name}{def.isNew && <span className="pill-new">YENİ</span>}</div>
          <h1>{def.name}</h1>
          <p>{def.description}</p>
        </div>
        <div className="hero-actions">
          <button className="icon-btn" title="Rastgele efekt" onClick={shuffle}><Icon name="shuffle" /></button>
          <button className={'icon-btn' + (favorite ? ' fav-on' : '')} title="Favori" onClick={() => toggleFav(effectId)}>
            <Icon name={favorite ? 'star-fill' : 'star'} />
          </button>
          <button className="icon-btn" title="Bu kareyi klavyeye sabit olarak kaydet" onClick={() => controller.saveSnapshot()}>
            <Icon name="camera" />
          </button>
          <button className="icon-btn big" title={playing ? 'Duraklat' : 'Oynat'} onClick={() => controller.togglePlay()}>
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button
            className={'live-btn' + (live ? ' on' : '') + (live && ready ? ' streaming' : '')}
            onClick={() => controller.setLive(!live)}
            title="Animasyonu gerçek zamanlı olarak klavyeye gönder"
          >
            <Icon name="broadcast" />
            <span>{live ? (ready ? 'Klavyede Canlı' : 'Klavye bekleniyor…') : 'Klavyeye Gönder'}</span>
            {live && ready && <em>{fps} FPS</em>}
          </button>
        </div>
      </div>
      <div className="hero-kb">
        <KeyboardView getColors={getColors} onKey={(id) => controller.virtualPress(id)} />
      </div>
      <SleepHint />
    </section>
  );
}

function SleepHint() {
  const show = useStore((s) => s.live && s.conn.status === 'ready' && s.conn.link === 'receiver' && s.dev.loaded && s.dev.sleep > 0);
  const mins = useStore((s) => Math.round(s.dev.sleep / 60));
  if (!show) return null;
  return (
    <div className="banner">
      Klavye kullanılmadığında {mins} dk sonra uyur ve animasyon durur.{' '}
      <button className="link" onClick={() => controller.setDeviceOption({ sleep: 0 })}>Uykuyu kapat</button>
    </div>
  );
}

function toggleFav(id: string) {
  store.set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] }));
}

function Gallery() {
  const category = useStore((s) => s.category);
  const search = useStore((s) => s.search);
  const favorites = useStore((s) => s.favorites);
  const effectId = useStore((s) => s.effectId);
  const settings = useStore((s) => s.effectSettings);

  const list = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    if (q) return EFFECTS.filter((e) => (e.name + ' ' + e.description).toLocaleLowerCase('tr').includes(q));
    return EFFECTS.filter((e) => {
      if (category === 'fav') return favorites.includes(e.id);
      return category === 'all' || e.category === category;
    });
  }, [category, search, favorites]);

  const select = useCallback((id: string) => controller.selectEffect(id), []);
  const fav = useCallback((id: string) => toggleFav(id), []);

  return (
    <section className="gallery">
      <div className="gallery-head">
        <div className="tabs">
          <button className={category === 'all' ? 'on' : ''} onClick={() => store.set({ category: 'all' })}>
            Tümü <span>{EFFECTS.length}</span>
          </button>
          <button className={category === 'fav' ? 'on' : ''} onClick={() => store.set({ category: 'fav' })}>
            <Icon name="star-fill" size={12} /> Favoriler <span>{favorites.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={category === c.id ? 'on' : ''} title={c.hint} onClick={() => store.set({ category: c.id })}>
              <i className={'dot cat-' + c.id} />{c.name} <span>{EFFECTS.filter((e) => e.category === c.id).length}</span>
            </button>
          ))}
        </div>
        <div className="search">
          <Icon name="search" size={16} />
          <input placeholder="Efekt ara…" value={search} onChange={(e) => store.set({ search: e.target.value })} />
        </div>
      </div>
      <div className="grid">
        {list.map((e, i) => (
          <EffectCard
            key={e.id}
            def={e}
            seed={i + 3}
            saved={settings[e.id]}
            active={e.id === effectId}
            favorite={favorites.includes(e.id)}
            onSelect={select}
            onFavorite={fav}
          />
        ))}
        {!list.length && <div className="empty">Bu filtreye uyan efekt yok.</div>}
      </div>
    </section>
  );
}

export function EffectsView() {
  return (
    <div className="effects-view">
      <div className="main-col">
        <Hero />
        <Gallery />
      </div>
      <ControlPanel />
    </div>
  );
}
