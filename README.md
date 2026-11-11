# AULA F75 Studio

AULA F75 klavye için 85 yeni RGB animasyonu, canlı önizleme ve donanım kontrolü sunan Windows uygulaması.

## İndir

[Releases](https://github.com/bayiremir/f75-studio/releases/latest) sayfasından:

- **AULA-F75-Studio-Setup-x.x.x.exe** – kurulum (masaüstü ve Başlat menüsü kısayolu)
- **AULA-F75-Studio-Portable-x.x.x.exe** – kurulum gerektirmez

Uygulama imzasız olduğu için Windows "kişisel bilgisayarınızı korudu" uyarısı gösterebilir: **Ek bilgi → Yine de çalıştır**.

## Özellikler

- **85 yazılım animasyonu**, 7 kategori: Nabız & Ritim, Dalga & Akış, Doğa, Uzay & Işık, Retro & Dijital, Tuşa Tepki, Müzik
  (Kalp Atışı, EKG, Ateş, Matrix, Tetris, Yılan Oyunu, Havai Fişek, Kuzey Işıkları, Isı Haritası, Ses Spektrumu…)
- Her efekt için hız, parlaklık, renk paleti, renkler ve efekte özel ayarlar
- **Tuşa tepki** efektleri hangi programda olursan ol bastığın tuşlara cevap verir
- **Müzik** efektleri bilgisayardan çıkan sese göre oynar
- **Donanım efektleri**: klavyenin kendi 15 efekti, istediğin RGB renk ile – klavyeye kaydedilir
- **Tuş boyama**: tuş tuş renk verip klavye hafızasına kaydetme, hazır temalar
- **Cihaz ayarları**: uyku süresi, yan ışık şeridi, düğme modu, Windows tuşu kilidi, işletim sistemi modu
- Sistem tepsisinde çalışma ve Windows açılışında otomatik başlama

## Bağlantı

| Mod | Durum |
|---|---|
| 2.4 GHz alıcı (3554:FA09) | Destekleniyor, ~14 FPS canlı animasyon |
| USB-C kablo (258A:010C) | Destekleniyor, 30 FPS'e kadar |
| Bluetooth | Klavye ayar kabul etmiyor; 2.4G veya kabloya geç |

Yeni animasyonlar klavyenin çipine yüklenemez; bilgisayarda hesaplanıp klavyeye gerçek zamanlı gönderilir. Bu yüzden
uygulamanın (tepside de olsa) açık olması gerekir. Uygulamadan çıkınca klavye seçtiğin donanım efektine döner.
Donanım efektleri ve tuş boyama ise klavyenin hafızasına kaydedilir.

AULA'nın orijinal sürücüsüyle aynı anda çalıştırmayın.

## Geliştirme

Gereksinim: Node.js 20+

```bash
npm install
npm start        # derle ve çalıştır
npm run dist     # release/ klasörüne kurulum + portable exe üretir
```

Yapı:

- `src/core/effects` – animasyonlar
- `src/core/engine.ts` – animasyon motoru
- `src/core/device.ts` – WebHID üzerinden klavye sürücüsü (2.4G ve kablo protokolleri)
- `src/components` – arayüz (React)
- `electron` – pencere, sistem tepsisi, global tuş dinleme

## Teşekkür

Protokol, resmi sürücünün tersine mühendisliğiyle çıkarılmış şu açık kaynak çalışmalara dayanır:
[aula-f75-hub](https://github.com/bakiakyol/aula-f75-hub), [aula-f75-linux](https://github.com/trenbolone1122/aula-f75-linux).

AULA ile bağlantılı değildir.
