# F75 Kontrol

AULA F75 (ve aslında her klavye) için kendi kurallarını koyabileceğin, Python ile yazılmış küçük bir Windows uygulaması. AULA'nın kendi yazılımının yanında çalışır, onun yerine geçmez.

## Neler yapabiliyor

- **Kısayollar & Makrolar:** Bir tuş kombinasyonuna (ör. `ctrl+alt+n`) şu eylemlerden birini bağlarsın:
  - metin yazdırma (hazır mesajlar, imza, e-posta adresi…)
  - başka bir tuş kombinasyonu gönderme (ör. `play/pause media`, `ctrl+shift+esc`)
  - program veya dosya açma
  - web adresi açma
  - `cmd` komutu çalıştırma
- **Tuş Atama:** Bir tuşu başka bir tuş gibi davrandırır (ör. `caps lock` → `esc`).
- **Klavye (HID):** Bilgisayara bağlı USB HID cihazlarını listeler ve AULA klavyeye ait olabilecek arayüzleri işaretler. Işık (RGB) kontrolü yazmak istersen ilk adım bu olur.

Ayarlar `%APPDATA%\F75Kontrol\config.json` dosyasına kaydedilir.

## Kurulum (Windows)

1. [Python 3.11+](https://www.python.org/downloads/) kur ("Add python.exe to PATH" kutusunu işaretle).
2. Bu klasörde bir komut istemi aç:

```bat
pip install -r requirements.txt
python main.py
```

3. Üstteki **Etkinleştir** düğmesine bas. Kısayollar o andan itibaren her uygulamada çalışır.

> Bazı programlar (yönetici olarak çalışan oyunlar, Görev Yöneticisi) içinde kısayolların çalışması için F75 Kontrol'ü de "Yönetici olarak çalıştır" ile açman gerekebilir.

### Tek dosya `.exe` yapmak

```bat
build_exe.bat
```

Çıktı `dist\F75Kontrol.exe` olur. Bunu Başlangıç klasörüne (`Win+R` → `shell:startup`) kısayol olarak koyarsan Windows açılınca kendiliğinden başlar.

## RGB ışıkları hakkında

AULA, klavyenin ışık ve ayar komutlarını herkese açık olarak yayınlamıyor. Bu yüzden ışık kontrolü için önce AULA yazılımının klavyeye ne gönderdiğini öğrenmek gerekiyor:

1. "Klavye (HID)" sekmesinde, AULA'ya ait ve **Üretici arayüzü** olarak işaretlenmiş satırın VID/PID değerlerini not al.
2. [Wireshark + USBPcap](https://wiki.wireshark.org/CaptureSetup/USB) ile AULA yazılımında bir renk değiştirirken giden USB paketlerini kaydet.
3. Aynı paketleri `hidapi` ile `f75kontrol/hid_scan.py` üzerinden gönderen bir eylem eklenebilir.

## Geliştirme

```bash
pip install pytest
python -m pytest -q
```

Kod yapısı:

- `f75kontrol/config.py`: ayar modeli, yükleme ve kaydetme
- `f75kontrol/actions.py`: eylemleri doğrulama ve çalıştırma
- `f75kontrol/engine.py`: global kısayolları ve tuş atamalarını açıp kapatma
- `f75kontrol/hid_scan.py`: USB HID cihaz taraması
- `f75kontrol/ui.py`: Tkinter arayüzü
