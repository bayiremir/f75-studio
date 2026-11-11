# Aula Control

An unofficial Windows app for AULA F75 keyboards.
Battery, lighting effects, per-key RGB and a live preview.

[Download](#download) · [Features](#features) · [Troubleshooting](#troubleshooting)

---

## Read this first

I made this app for myself because AULA's official software is bad and its UI is terrible. I'm sharing it for anyone who wants to try it. It's free, and you use it on your own.

I don't even know coding, so use it at your own risk, or leave if you have any issue. It was made with the help of AI. If you have a personal problem with that, you're free to leave. I'm not earning anything from it, so I don't need to worry about it. I just want to share.

**Tested only on the AULA F75.** Every other model (F75 Pro, F87, F75 Max) is untested, so I don't know if it works. If you get an error, comment on the release.

**Not affiliated with AULA.**

---

## Download

Get **`Aula-Control-Setup.exe`** from [Releases](https://github.com/emir-bayir/f75-studio/releases) and run it. No admin needed. A portable **`Aula-Control-Portable.exe`** is there too.

Windows may warn about an unknown publisher because the app isn't code-signed: choose **More info → Run anyway**. No keyboard? Try **Start → Use Demo keyboard**.

### Build from source (Windows)

```bat
pip install -r requirements.txt
python main.py
```

To make the same files GitHub Actions publishes:

```bat
pip install -r requirements.txt pyinstaller==6.11.1
python -m PyInstaller --noconfirm AulaControl.spec
```

Then open `installer\aula-control.iss` in [Inno Setup](https://jrsoftware.org/isinfo.php) to produce `Aula-Control-Setup.exe`. Or push a `v*` tag and let the Release workflow build both.

---

## Features

- Battery level over the 2.4G dongle (USB-C cable alone usually reports no level)
- 15+ lighting effects with brightness, speed and colour
- Per-key RGB painter and presets
- Live preview of the F75 as a rendered picture, with a **Live / Picture** switch
- Key assignment (experimental) — changes are sent only when you press Apply
- Dark and light themes
- Start with Windows
- Demo keyboard so you can try the app without hardware

---

## Screenshots

Run the app and open **Lighting** or **Per-key**. With no keyboard plugged in, choose **Demo keyboard** on the Start page — that is the same UI people see in the screenshots.

---

## Troubleshooting

- Close the official AULA driver. Only one program can use the keyboard at a time.
- Lighting works over the **2.4G dongle** (best) or **USB-C cable**. Bluetooth support is limited.
- If Windows Defender or SmartScreen blocks the download, that is because the exe is not code-signed — use **More info → Run anyway**.
- Still stuck? Open an issue on the release and say whether you used the dongle, cable or demo.

---

## Protocol

The app talks to the keyboard over its vendor HID channel. The packet layout and command IDs come from public reverse-engineering of AULA's Windows driver (see community write-ups for the F75). Demo mode keeps everything in memory and never opens a device.

---

## License

MIT. Not affiliated with, endorsed by, or supported by AULA. "AULA" is used only to name the hardware this app works with.

Made with the help of AI.
