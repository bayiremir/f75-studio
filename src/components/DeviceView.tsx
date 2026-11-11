import { controller } from '../state/controller';
import { useStore } from '../state/store';
import { Icon } from './icons';

const SLEEP = [
  { v: 0, l: 'Asla' }, { v: 60, l: '1 dk' }, { v: 120, l: '2 dk' }, { v: 300, l: '5 dk' }, { v: 600, l: '10 dk' }, { v: 1200, l: '20 dk' },
];

export function DeviceView() {
  const conn = useStore((s) => s.conn);
  const dev = useStore((s) => s.dev);
  const busy = useStore((s) => s.busy);
  const ready = conn.status === 'ready';

  return (
    <div className="page scroll">
      <div className="cards">
        <section className={'card conn-card ' + conn.status}>
          <div className="conn-visual">
            <div className="orb"><Icon name={conn.link === 'wired' ? 'usb' : 'wifi'} size={30} /></div>
          </div>
          <div className="conn-text">
            <h2>{statusTitle(conn.status)}</h2>
            <p>{statusText(conn.status, conn.error)}</p>
            <div className="conn-meta">
              {conn.name && <span><Icon name={conn.link === 'wired' ? 'usb' : 'wifi'} size={14} /> {conn.name}</span>}
              {conn.battery != null && <span><Icon name="battery" size={14} /> %{conn.battery}</span>}
            </div>
            <button className="secondary-btn" onClick={() => controller.reconnect()}><Icon name="reset" size={15} /> Yeniden bağlan</button>
          </div>
        </section>

        <section className="card">
          <h3>Uyku Zamanlayıcısı</h3>
          <p className="muted">Kablosuz modda klavye bu süre boyunca kullanılmazsa ışıkları kapatır. Canlı efektlerin kesintisiz görünmesi için "Asla" önerilir.</p>
          <div className="seg wrap">
            {SLEEP.map((s) => (
              <button key={s.v} disabled={!ready || !!busy} className={dev.loaded && dev.sleep === s.v ? 'on' : ''} onClick={() => controller.setDeviceOption({ sleep: s.v })}>{s.l}</button>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Yan Işık Şeridi</h3>
          <p className="muted">Esc tuşunun yanındaki beyaz ışık çubuğu (Fn + Sol Shift ile de değişir).</p>
          <div className="seg wrap">
            {['Kapalı', 'Dolma', 'Nefes', 'Sabit'].map((l, i) => (
              <button key={l} disabled={!ready || !!busy} className={dev.loaded && dev.side === i ? 'on' : ''} onClick={() => controller.setDeviceOption({ side: i })}>{l}</button>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Düğme (Knob) Modu</h3>
          <p className="muted">Düğmeye uzun basarak da değiştirilebilir.</p>
          <div className="seg wrap">
            {['Medya (ses)', 'Işık (parlaklık / efekt)'].map((l, i) => (
              <button key={l} disabled={!ready || !!busy} className={dev.loaded && dev.knob === i ? 'on' : ''} onClick={() => controller.setDeviceOption({ knob: i })}>{l}</button>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>İşletim Sistemi Modu</h3>
          <div className="seg wrap">
            {['Windows', 'Android', 'Mac'].map((l, i) => (
              <button key={l} disabled={!ready || !!busy} className={dev.loaded && dev.os === i ? 'on' : ''} onClick={() => controller.setDeviceOption({ os: i })}>{l}</button>
            ))}
          </div>
          <label className="toggle-row">
            <span>Windows tuşunu kilitle (oyun modu)</span>
            <input type="checkbox" className="switch" disabled={!ready || !!busy} checked={dev.winLock} onChange={(e) => controller.setDeviceOption({ winLock: e.target.checked })} />
          </label>
        </section>

        <section className="card info">
          <h3><Icon name="info" size={16} /> Nasıl çalışıyor?</h3>
          <ul>
            <li><b>Yeni animasyonlar</b> bilgisayarda hesaplanır ve klavyeye saniyede onlarca kare olarak gönderilir. Bu yüzden uygulamanın açık olması gerekir. Pencereyi kapatınca sistem tepsisinde çalışmaya devam eder.</li>
            <li><b>USB-C kablo</b> ile bağlandığında her kare tek pakette gider, en akıcı sonuç (30+ FPS) buradadır.</li>
            <li><b>2.4 GHz alıcı</b> ile kareler sıkıştırılarak gönderilir (≈15 FPS). Renk sayısı kısıtlı olduğu için yakın renkler birleştirilebilir.</li>
            <li><b>Bluetooth</b> modunda klavye ayar kabul etmez; efektleri değiştirmek için 2.4G veya kabloya geç.</li>
            <li>Uygulama kapanınca klavye ~2 saniye içinde kendi efektine döner. <b>Donanım efektleri</b> ve <b>Tuş Boyama</b> klavyenin hafızasına kaydedilir.</li>
            <li>AULA'nın orijinal sürücüsünü aynı anda çalıştırma; ikisi birden klavyeye yazarsa çakışabilir.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function statusTitle(s: string) {
  switch (s) {
    case 'ready': return 'AULA F75 bağlı';
    case 'connecting': return 'Bağlanıyor…';
    case 'asleep': return 'Klavye yanıt vermiyor';
    case 'bluetooth': return 'Bluetooth modu';
    default: return 'Klavye bulunamadı';
  }
}

function statusText(s: string, err?: string) {
  switch (s) {
    case 'ready': return 'Her şey hazır. Efektler ve ayarlar doğrudan klavyeye gönderiliyor.';
    case 'connecting': return 'Klavyeyle el sıkışılıyor…';
    case 'asleep': return 'Alıcı takılı ama klavye cevap vermiyor. Klavye uykuda olabilir: bir tuşa bas, birkaç saniye içinde otomatik bağlanır. ' + (err ? `(${err})` : '');
    case 'bluetooth': return err ?? '';
    default: return '2.4 GHz alıcıyı tak veya klavyeyi USB-C kabloyla bağla (arka anahtar kablo konumunda olmalı). Bağlanınca otomatik algılanır.';
  }
}
