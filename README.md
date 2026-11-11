# Aula Control

Unofficial Windows app for **AULA F75** keyboards — battery, lighting, per-key RGB, live preview.

**You do not need Python.** Download the `.exe` and run it.

---

## Download (Windows)

1. Open **[Releases](https://github.com/bayiremir/f75-studio/releases/latest)**
2. Download **`Aula-Control-Setup.exe`** (installer, no admin)  
   or **`Aula-Control-Portable.exe`** (no install — double-click)
3. If Windows SmartScreen appears: **More info → Run anyway** (the app is not code-signed)
4. No keyboard plugged in? In the app: **Start → Use Demo keyboard**

That’s it. No `pip`, no Python, no terminal.

Direct links (after a release is published):

- [Aula-Control-Setup.exe](https://github.com/bayiremir/f75-studio/releases/latest/download/Aula-Control-Setup.exe)
- [Aula-Control-Portable.exe](https://github.com/bayiremir/f75-studio/releases/latest/download/Aula-Control-Portable.exe)

If the Releases page is empty, the Windows build has not been published yet — see [Publishing a release](#publishing-a-release) below (maintainers only).

---

## Read this first

I made this app for myself because AULA's official software is bad and its UI is terrible. I'm sharing it for anyone who wants to try it. It's free, and you use it on your own.

I don't even know coding, so use it at your own risk, or leave if you have any issue. It was made with the help of AI. If you have a personal problem with that, you're free to leave. I'm not earning anything from it, so I don't need to worry about it. I just want to share.

**Tested only on the AULA F75.** Every other model (F75 Pro, F87, F75 Max) is untested. If you get an error, comment on the release.

**Not affiliated with AULA.**

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

## Troubleshooting

- Close the official AULA driver. Only one program can use the keyboard at a time.
- Lighting works over the **2.4G dongle** (best) or **USB-C cable**. Bluetooth support is limited.
- If Windows Defender or SmartScreen blocks the download, that is because the exe is not code-signed — use **More info → Run anyway**.
- Still stuck? Open an issue on the release and say whether you used the dongle, cable or demo.

---

## Publishing a release

Maintainers: GitHub Actions builds both exes on a Windows runner and attaches them to the Release. Users never run `pip`.

**Option A — new version tag**

```bat
git tag v0.1.1
git push origin v0.1.1
```

**Option B — Actions UI**

1. Open the repo → **Actions** → enable workflows if asked
2. Select workflow **Release** → **Run workflow**
3. Enter a tag like `v0.1.1` → Run
4. When it finishes, open **Releases** — Setup + Portable exes are attached

Local one-click build on a Windows PC (optional, for testing):

```bat
build_windows.bat
```

Output: `dist\Aula-Control-Portable.exe` and, if [Inno Setup](https://jrsoftware.org/isinfo.php) is installed, `dist\Aula-Control-Setup.exe`.

---

## For developers (source only)

Normal users should ignore this section.

```bat
pip install -r requirements.txt
python main.py
```

Tests: `pytest -q`

---

## Protocol

The app talks to the keyboard over its vendor HID channel. The packet layout and command IDs come from public reverse-engineering of AULA's Windows driver (see community write-ups for the F75). Demo mode keeps everything in memory and never opens a device.

---

## License

MIT. Not affiliated with, endorsed by, or supported by AULA. "AULA" is used only to name the hardware this app works with.

Made with the help of AI.
