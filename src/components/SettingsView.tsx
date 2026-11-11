import { useEffect, useState } from 'react';
import { EFFECTS } from '../core/effects';
import { store, useStore } from '../state/store';
import { Slider } from './ControlPanel';
import { Icon, Logo } from './icons';

export function SettingsView() {
  const s = useStore((st) => st);
  const [version, setVersion] = useState('');
  useEffect(() => {
    window.aula?.info().then((i) => setVersion(i.version)).catch(() => undefined);
  }, []);

  return (
    <div className="page scroll">
      <div className="cards">
        <section className="card">
          <h3>Uygulama</h3>
          <label className="toggle-row">
            <span>Kapatınca sistem tepsisinde çalışmaya devam et<small>Animasyonlar arka planda klavyede oynamaya devam eder</small></span>
            <input type="checkbox" className="switch" checked={s.closeToTray} onChange={(e) => {
              store.set({ closeToTray: e.target.checked });
              window.aula?.setCloseToTray(e.target.checked);
            }} />
          </label>
          <label className="toggle-row">
            <span>Windows açılışında başlat<small>Tepsiye küçültülmüş olarak başlar ve son efekti oynatır</small></span>
            <input type="checkbox" className="switch" checked={s.autostart} onChange={async (e) => {
              const v = await window.aula?.setAutostart(e.target.checked);
              store.set({ autostart: !!v });
            }} />
          </label>
          <label className="toggle-row">
            <span>Tuşa tepki efektlerinde boştayken demo basışları</span>
            <input type="checkbox" className="switch" checked={s.demoPresses} onChange={(e) => store.set({ demoPresses: e.target.checked })} />
          </label>
        </section>

        <section className="card">
          <h3>2.4 GHz Yayın Kalitesi</h3>
          <p className="muted">Alıcı üzerinden her kare sınırlı sayıda pakete sığmalı. Daha fazla paket = daha çok renk ama daha düşük FPS ve kare kaybı riski.</p>
          <div className="seg wrap">
            {([
              ['fast', 'Hızlı (7 paket)'],
              ['balanced', 'Dengeli (9 paket)'],
              ['quality', 'Kaliteli (12 paket)'],
              ['max', 'Maksimum (14 paket)'],
            ] as const).map(([v, l]) => (
              <button key={v} className={s.wirelessQuality === v ? 'on' : ''} onClick={() => store.set({ wirelessQuality: v })}>{l}</button>
            ))}
          </div>
          <Slider label="Paketler arası bekleme" value={s.wirelessGap} min={3} max={12} step={1} format={(v) => v + ' ms'} onChange={(v) => store.set({ wirelessGap: v })} />
          <p className="muted small">5 ms test edilmiş en akıcı değerdir. Takılma veya kaybolan kareler görürsen artır.</p>
        </section>

        <section className="card">
          <h3>USB-C Kablo</h3>
          <Slider label="Hedef kare hızı" value={s.wiredFps} min={10} max={60} step={1} format={(v) => v + ' FPS'} onChange={(v) => store.set({ wiredFps: v })} />
        </section>

        <section className="card about">
          <Logo size={44} />
          <div>
            <h3>AULA F75 Studio {version && <span className="muted">v{version}</span>}</h3>
            <p className="muted">{EFFECTS.length} yazılım animasyonu, 15 donanım efekti, tuş boyama ve cihaz ayarları.</p>
            <p className="muted small">AULA'ya bağlı değildir. Protokol, resmi sürücünün tersine mühendisliğiyle çıkarılmış açık kaynak çalışmalara dayanır (aula-f75-hub, aula-f75-linux).</p>
            <button className="ghost-btn" onClick={() => window.aula?.quit()}><Icon name="power" size={15} /> Uygulamadan tamamen çık</button>
          </div>
        </section>
      </div>
    </div>
  );
}
