from __future__ import annotations

import threading
import tkinter as tk
from tkinter import colorchooser, messagebox, ttk
from typing import Callable

from aula_control import __version__
from aula_control.protocol.device import Keyboard, demo_info, find_devices, open_device
from aula_control.protocol.effects import COLOURS, EFFECTS, EFFECT_PER_KEY
from aula_control.protocol.layout import BY_NAME, HID, KEYS, MODIFIERS, Key
from aula_control.settings_store import load_settings, save_settings, set_start_with_windows
from aula_control.ui.preview import KeyboardPreview

DARK = {
    "bg": "#0f1115",
    "panel": "#171a21",
    "card": "#1c212b",
    "text": "#e8eaed",
    "muted": "#9aa3b2",
    "accent": "#5b8cff",
    "accent2": "#3dd68c",
    "danger": "#ff6b6b",
    "border": "#2a3140",
}
LIGHT = {
    "bg": "#f3f5f8",
    "panel": "#ffffff",
    "card": "#ffffff",
    "text": "#1a1d24",
    "muted": "#5c6575",
    "accent": "#3b6fe8",
    "accent2": "#1fa968",
    "danger": "#d94848",
    "border": "#d5dae3",
}


class AulaControlApp(tk.Tk):
    def __init__(self, start_tray: bool = False):
        super().__init__()
        self.title(f"Aula Control {__version__}")
        self.geometry("1080x700")
        self.minsize(900, 600)
        self.settings = load_settings()
        self.theme = DARK if self.settings.theme != "light" else LIGHT
        self.configure(bg=self.theme["bg"])
        self.keyboard: Keyboard | None = None
        self.devices = []
        self._busy = False
        self._scanning = False
        self._connecting = False
        self._battery_busy = False
        self._closed = False
        self._paint = (255, 80, 80)
        self._per_key = {k.index: (30, 34, 42) for k in KEYS}
        self._status = tk.StringVar(value="Looking for a keyboard…")
        self._battery = tk.StringVar(value="Battery: —")
        self._build()
        # Never call HID on the UI thread — Windows hidapi can freeze the window.
        self.after(80, self.refresh_devices)
        self.after(2500, self._poll_battery)
        self.protocol("WM_DELETE_WINDOW", self._on_close)
        if start_tray:
            self.after(300, self.withdraw)

    # ---------- chrome ----------
    def _build(self):
        t = self.theme
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TFrame", background=t["bg"])
        style.configure("Card.TFrame", background=t["card"])
        style.configure("TLabel", background=t["bg"], foreground=t["text"], font=("Segoe UI", 10))
        style.configure("Muted.TLabel", background=t["bg"], foreground=t["muted"], font=("Segoe UI", 9))
        style.configure("Title.TLabel", background=t["bg"], foreground=t["text"], font=("Segoe UI Semibold", 16))
        style.configure("Header.TLabel", background=t["bg"], foreground=t["text"], font=("Segoe UI Semibold", 12))
        style.configure("TButton", font=("Segoe UI", 10), padding=6)
        style.configure("Accent.TButton", font=("Segoe UI Semibold", 10))
        style.configure("TNotebook", background=t["bg"], borderwidth=0)
        style.configure("TNotebook.Tab", background=t["panel"], foreground=t["muted"], padding=(14, 8), font=("Segoe UI", 10))
        style.map("TNotebook.Tab", background=[("selected", t["card"])], foreground=[("selected", t["text"])])
        style.configure("TRadiobutton", background=t["bg"], foreground=t["text"])
        style.configure("TCheckbutton", background=t["bg"], foreground=t["text"])
        style.configure("Horizontal.TScale", background=t["bg"])
        style.configure("TCombobox", padding=4)

        top = ttk.Frame(self, padding=(16, 12))
        top.pack(fill="x")
        ttk.Label(top, text="Aula Control", style="Title.TLabel").pack(side="left")
        ttk.Label(top, text="Unofficial F75 app", style="Muted.TLabel").pack(side="left", padx=(10, 0), pady=(6, 0))
        ttk.Button(top, text="Refresh", command=self.refresh_devices).pack(side="right")
        self.device_var = tk.StringVar()
        self.device_box = ttk.Combobox(top, textvariable=self.device_var, width=42, state="readonly")
        self.device_box.pack(side="right", padx=8)
        self.device_box.bind("<<ComboboxSelected>>", lambda _e: self.connect_selected())

        status = ttk.Frame(self, padding=(16, 0))
        status.pack(fill="x")
        ttk.Label(status, textvariable=self._status, style="Muted.TLabel").pack(side="left")
        ttk.Label(status, textvariable=self._battery, style="Muted.TLabel").pack(side="right")

        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=16, pady=12)
        self.nb.add(self._page_home(), text="Start")
        self.nb.add(self._page_lighting(), text="Lighting")
        self.nb.add(self._page_perkey(), text="Per-key")
        self.nb.add(self._page_keys(), text="Keys")
        self.nb.add(self._page_battery(), text="Battery")
        self.nb.add(self._page_settings(), text="Settings")

        foot = ttk.Frame(self, padding=(16, 0, 16, 10))
        foot.pack(fill="x")
        ttk.Label(foot, text="Not affiliated with AULA · Made with the help of AI · Use at your own risk",
                  style="Muted.TLabel").pack(side="left")

    def _card(self, parent) -> ttk.Frame:
        f = ttk.Frame(parent, style="Card.TFrame", padding=14)
        return f

    # ---------- pages ----------
    def _page_home(self) -> ttk.Frame:
        page = ttk.Frame(self, padding=8)
        left = self._card(page)
        left.pack(side="left", fill="both", expand=True, padx=(0, 8))
        ttk.Label(left, text="Welcome", style="Header.TLabel").pack(anchor="w")
        ttk.Label(
            left,
            text="I made this app for myself because AULA's official software is bad and its UI is terrible. "
            "I'm sharing it for anyone who wants to try it. It's free, and you use it on your own.\n\n"
            "Tested only on the AULA F75. Other models are untested. Not affiliated with AULA.",
            style="Muted.TLabel",
            wraplength=420,
            justify="left",
        ).pack(anchor="w", pady=(8, 12))
        ttk.Button(left, text="Use Demo keyboard", command=self.use_demo).pack(anchor="w")
        ttk.Button(left, text="Open Lighting", command=lambda: self.nb.select(1)).pack(anchor="w", pady=6)

        right = self._card(page)
        right.pack(side="left", fill="both", expand=True)
        ttk.Label(right, text="Connected devices", style="Header.TLabel").pack(anchor="w")
        self.home_list = tk.Listbox(right, height=12, bg=self.theme["panel"], fg=self.theme["text"],
                                    selectbackground=self.theme["accent"], relief="flat", font=("Segoe UI", 10))
        self.home_list.pack(fill="both", expand=True, pady=8)
        return page

    def _page_lighting(self) -> ttk.Frame:
        page = ttk.Frame(self, padding=8)
        controls = self._card(page)
        controls.pack(side="left", fill="y", padx=(0, 8))
        ttk.Label(controls, text="Lighting", style="Header.TLabel").pack(anchor="w")

        self.effect_var = tk.StringVar(value=EFFECTS[0][1])
        ttk.Label(controls, text="Effect", style="Muted.TLabel").pack(anchor="w", pady=(10, 2))
        self.effect_box = ttk.Combobox(controls, textvariable=self.effect_var,
                                       values=[n for _, n in EFFECTS], state="readonly", width=28)
        self.effect_box.pack(anchor="w")
        self.effect_box.bind("<<ComboboxSelected>>", lambda _e: self._preview_effect())

        self.colour_var = tk.StringVar(value=COLOURS[0][0])
        ttk.Label(controls, text="Colour", style="Muted.TLabel").pack(anchor="w", pady=(10, 2))
        ttk.Combobox(controls, textvariable=self.colour_var, values=[n for n, _ in COLOURS],
                     state="readonly", width=28).pack(anchor="w")

        self.bright = tk.IntVar(value=5)
        ttk.Label(controls, text="Brightness", style="Muted.TLabel").pack(anchor="w", pady=(10, 2))
        ttk.Scale(controls, from_=0, to=9, variable=self.bright, command=lambda _v: self._preview_effect()).pack(fill="x")

        self.speed = tk.IntVar(value=2)
        ttk.Label(controls, text="Speed", style="Muted.TLabel").pack(anchor="w", pady=(10, 2))
        ttk.Scale(controls, from_=0, to=4, variable=self.speed).pack(fill="x")

        ttk.Button(controls, text="Apply to keyboard", style="Accent.TButton",
                   command=self.apply_lighting).pack(anchor="w", pady=(16, 4))
        self.apply_msg = tk.StringVar(value="")
        ttk.Label(controls, textvariable=self.apply_msg, style="Muted.TLabel", wraplength=220).pack(anchor="w")

        right = self._card(page)
        right.pack(side="left", fill="both", expand=True)
        bar = ttk.Frame(right)
        bar.pack(fill="x")
        ttk.Label(bar, text="Live preview", style="Header.TLabel").pack(side="left")
        self.preview_mode = tk.StringVar(value="live")
        ttk.Radiobutton(bar, text="Live", value="live", variable=self.preview_mode,
                        command=self._set_preview_mode).pack(side="right")
        ttk.Radiobutton(bar, text="Picture", value="picture", variable=self.preview_mode,
                        command=self._set_preview_mode).pack(side="right", padx=8)
        self.preview = KeyboardPreview(right, background=self.theme["panel"], height=320)
        self.preview.pack(fill="both", expand=True, pady=8)
        self._preview_effect()
        return page

    def _page_perkey(self) -> ttk.Frame:
        page = ttk.Frame(self, padding=8)
        left = self._card(page)
        left.pack(side="left", fill="y", padx=(0, 8))
        ttk.Label(left, text="Per-key RGB", style="Header.TLabel").pack(anchor="w")
        ttk.Label(left, text="Click a key on the board, then pick a colour.",
                  style="Muted.TLabel", wraplength=220).pack(anchor="w", pady=6)
        ttk.Button(left, text="Pick colour…", command=self._pick_colour).pack(anchor="w")
        self.swatch = tk.Canvas(left, width=48, height=28, bg="#ff5050", highlightthickness=1,
                                highlightbackground=self.theme["border"])
        self.swatch.pack(anchor="w", pady=8)
        ttk.Button(left, text="Fill all", command=self._fill_all).pack(anchor="w")
        ttk.Button(left, text="Clear all", command=self._clear_all).pack(anchor="w", pady=4)
        for name, colours in [
            ("WASD blue", {n: (60, 140, 255) for n in ("w", "a", "s", "d")}),
            ("Rainbow rows", None),
        ]:
            ttk.Button(left, text=name, command=lambda c=colours, n=name: self._preset(n, c)).pack(anchor="w", pady=2)
        ttk.Button(left, text="Apply to keyboard", style="Accent.TButton",
                   command=self.apply_perkey).pack(anchor="w", pady=(16, 4))

        right = self._card(page)
        right.pack(side="left", fill="both", expand=True)
        self.perkey_preview = KeyboardPreview(right, on_key=self._paint_key, background=self.theme["panel"])
        self.perkey_preview.pack(fill="both", expand=True)
        self.perkey_preview.set_colors(self._per_key)
        return page

    def _page_keys(self) -> ttk.Frame:
        page = ttk.Frame(self, padding=8)
        card = self._card(page)
        card.pack(fill="both", expand=True)
        ttk.Label(card, text="Key assignment (experimental)", style="Header.TLabel").pack(anchor="w")
        ttk.Label(
            card,
            text="Change what a key sends on the keyboard itself. Nothing is written until you press Apply. "
            "Close the official AULA driver first.",
            style="Muted.TLabel",
            wraplength=900,
        ).pack(anchor="w", pady=6)

        form = ttk.Frame(card)
        form.pack(anchor="w", pady=8)
        self.src_key = tk.StringVar(value="capslock")
        self.dst_key = tk.StringVar(value="esc")
        ttk.Label(form, text="Key").grid(row=0, column=0, sticky="w")
        ttk.Combobox(form, textvariable=self.src_key, values=[k.name for k in KEYS], width=16, state="readonly").grid(
            row=0, column=1, padx=6
        )
        ttk.Label(form, text="becomes").grid(row=0, column=2)
        ttk.Combobox(form, textvariable=self.dst_key,
                     values=[k for k in HID] + list(MODIFIERS), width=16).grid(row=0, column=3, padx=6)
        ttk.Button(form, text="Queue change", command=self._queue_remap).grid(row=0, column=4, padx=6)

        self.remap_list = tk.Listbox(card, height=8, bg=self.theme["panel"], fg=self.theme["text"],
                                     relief="flat", font=("Consolas", 10))
        self.remap_list.pack(fill="x", pady=8)
        btns = ttk.Frame(card)
        btns.pack(anchor="w")
        ttk.Button(btns, text="Remove selected", command=self._remove_remap).pack(side="left")
        ttk.Button(btns, text="Apply to keyboard", style="Accent.TButton", command=self.apply_remaps).pack(side="left", padx=8)
        self._pending_remaps: list[tuple[str, str]] = []
        return page

    def _page_battery(self) -> ttk.Frame:
        page = ttk.Frame(self, padding=8)
        card = self._card(page)
        card.pack(fill="both", expand=True)
        ttk.Label(card, text="Battery", style="Header.TLabel").pack(anchor="w")
        self.battery_big = tk.StringVar(value="—")
        ttk.Label(card, textvariable=self.battery_big, font=("Segoe UI Semibold", 42)).pack(anchor="w", pady=8)
        ttk.Label(
            card,
            text="Level is read over the 2.4G dongle (and Bluetooth when available). "
            "The USB-C cable alone usually reports no level while charging.",
            style="Muted.TLabel",
            wraplength=700,
        ).pack(anchor="w")
        self.battery_note = tk.StringVar(value="")
        ttk.Label(card, textvariable=self.battery_note, style="Muted.TLabel").pack(anchor="w", pady=8)
        ttk.Button(card, text="Refresh now", command=self._poll_battery).pack(anchor="w")
        return page

    def _page_settings(self) -> ttk.Frame:
        page = ttk.Frame(self, padding=8)
        card = self._card(page)
        card.pack(fill="both", expand=True)
        ttk.Label(card, text="Settings", style="Header.TLabel").pack(anchor="w")

        self.theme_var = tk.StringVar(value=self.settings.theme)
        ttk.Label(card, text="Theme", style="Muted.TLabel").pack(anchor="w", pady=(12, 2))
        row = ttk.Frame(card)
        row.pack(anchor="w")
        ttk.Radiobutton(row, text="Dark", value="dark", variable=self.theme_var, command=self._save_settings).pack(side="left")
        ttk.Radiobutton(row, text="Light", value="light", variable=self.theme_var, command=self._save_settings).pack(side="left", padx=8)

        self.start_win = tk.BooleanVar(value=self.settings.start_with_windows)
        ttk.Checkbutton(card, text="Start with Windows", variable=self.start_win,
                        command=self._toggle_startup).pack(anchor="w", pady=(12, 2))
        self.tray_var = tk.BooleanVar(value=self.settings.minimize_to_tray)
        ttk.Checkbutton(card, text="Close hides to tray (when tray is available)",
                        variable=self.tray_var, command=self._save_settings).pack(anchor="w")

        ttk.Label(card, text=f"Version {__version__}", style="Muted.TLabel").pack(anchor="w", pady=(20, 4))
        ttk.Label(card, text="Get updates from the GitHub Releases page.", style="Muted.TLabel").pack(anchor="w")
        return page

    # ---------- device ----------
    def _ui(self, fn: Callable[[], None]) -> None:
        """Marshal a callback back onto the Tk thread if the window is alive."""
        if self._closed:
            return
        try:
            self.after(0, fn)
        except tk.TclError:
            pass

    def refresh_devices(self):
        if self._scanning or self._closed:
            return
        self._scanning = True
        self._status.set("Looking for a keyboard…")

        def work():
            try:
                devices = find_devices(timeout_s=4.0)
            except Exception:  # noqa: BLE001
                devices = []
            self._ui(lambda: self._on_devices_found(devices))

        threading.Thread(target=work, name="aula-scan", daemon=True).start()

    def _on_devices_found(self, devices):
        self._scanning = False
        if self._closed:
            return
        self.devices = devices
        labels = [d.label for d in self.devices] + ["Demo keyboard"]
        self.device_box["values"] = labels
        self.home_list.delete(0, "end")
        for d in self.devices:
            self.home_list.insert("end", d.label)
        self.home_list.insert("end", "Demo keyboard (simulated)")
        if self.devices:
            self.device_var.set(labels[0])
            self.connect_selected()
        else:
            self.device_var.set("Demo keyboard")
            self._status.set("No keyboard found — using demo. Plug in the 2.4G dongle / USB-C and hit Refresh.")
            if not self.keyboard:
                self.use_demo()

    def connect_selected(self):
        label = self.device_var.get()
        if label == "Demo keyboard" or not self.devices:
            self.use_demo()
            return
        info = next((d for d in self.devices if d.label == label), None)
        if not info:
            return
        self._connect(info)

    def use_demo(self):
        self.device_var.set("Demo keyboard")
        self._connect(demo_info())

    def _connect(self, info):
        if self._connecting or self._closed:
            return
        self._connecting = True
        self._status.set(f"Opening {info.label}…")

        def work():
            old = self.keyboard
            self.keyboard = None
            try:
                if old:
                    try:
                        old.close()
                    except Exception:  # noqa: BLE001
                        pass
                kb = open_device(info, timeout_s=5.0)
            except Exception as exc:  # noqa: BLE001
                self._ui(lambda: self._on_connect_fail(exc))
                return
            self._ui(lambda: self._on_connected(kb))

        threading.Thread(target=work, name="aula-connect", daemon=True).start()

    def _on_connected(self, kb: Keyboard):
        self._connecting = False
        if self._closed:
            try:
                kb.close()
            except Exception:  # noqa: BLE001
                pass
            return
        self.keyboard = kb
        self._status.set(f"Connected: {kb.info.label}")
        self._preview_effect()
        self._poll_battery(force=True)

    def _on_connect_fail(self, exc: BaseException):
        self._connecting = False
        if self._closed:
            return
        self._status.set(f"Could not open device: {exc}")
        # Fall back to demo so the UI stays usable.
        if not self.keyboard or self.keyboard.info.kind != "demo":
            try:
                self.keyboard = open_device(demo_info())
                self.device_var.set("Demo keyboard")
                self._status.set(f"Could not open device ({exc}). Using demo keyboard.")
            except Exception:  # noqa: BLE001
                pass
        messagebox.showerror("Connection", str(exc))

    # ---------- lighting ----------
    def _effect_id(self) -> int:
        name = self.effect_var.get()
        return next(i for i, n in EFFECTS if n == name)

    def _colour_id(self) -> int:
        name = self.colour_var.get()
        return next(i for n, i in COLOURS if n == name)

    def _preview_effect(self):
        if not hasattr(self, "preview"):
            return
        eid = self._effect_id()
        if eid == EFFECT_PER_KEY:
            self.preview.set_colors(self._per_key)
        elif eid == 0:
            self.preview.fill_all((20, 22, 28))
        else:
            self.preview.set_effect_preview(self._colour_id(), int(self.bright.get()))

    def _set_preview_mode(self):
        self.preview.mode = self.preview_mode.get()
        self.preview.redraw()

    def apply_lighting(self):
        if not self.keyboard:
            return
        self.apply_msg.set("Sending…")
        eid, bright, speed, colour = self._effect_id(), int(self.bright.get()), int(self.speed.get()), self._colour_id()

        def work():
            try:
                self.keyboard.set_effect(eid, bright, speed, colour)
                self.after(0, lambda: self.apply_msg.set("Applied."))
            except Exception as exc:  # noqa: BLE001
                self.after(0, lambda: self.apply_msg.set(f"Failed: {exc}"))

        threading.Thread(target=work, daemon=True).start()
        self._preview_effect()

    # ---------- per-key ----------
    def _pick_colour(self):
        rgb, _ = colorchooser.askcolor(color="#%02x%02x%02x" % self._paint)
        if rgb:
            self._paint = tuple(int(c) for c in rgb)
            self.swatch.configure(bg="#%02x%02x%02x" % self._paint)

    def _paint_key(self, key: Key):
        self._per_key[key.index] = self._paint
        self.perkey_preview.set_colors({key.index: self._paint})

    def _fill_all(self):
        for k in KEYS:
            self._per_key[k.index] = self._paint
        self.perkey_preview.set_colors(self._per_key)

    def _clear_all(self):
        for k in KEYS:
            self._per_key[k.index] = (20, 22, 28)
        self.perkey_preview.set_colors(self._per_key)

    def _preset(self, name: str, mapping: dict | None):
        if name.startswith("Rainbow"):
            palette = [(255, 80, 80), (255, 160, 60), (240, 220, 70), (80, 200, 100), (70, 140, 255), (180, 90, 255)]
            rows = {}
            for k in KEYS:
                row = 0 if k.y1 < 70 else 1 if k.y1 < 110 else 2 if k.y1 < 150 else 3 if k.y1 < 190 else 4
                rows[k.index] = palette[row % len(palette)]
            self._per_key.update(rows)
        elif mapping:
            for n, rgb in mapping.items():
                if n in BY_NAME:
                    self._per_key[BY_NAME[n].index] = rgb
        self.perkey_preview.set_colors(self._per_key)

    def apply_perkey(self):
        if not self.keyboard:
            return
        colors = [self._per_key.get(i, (0, 0, 0)) for i in range(126)]

        def work():
            try:
                self.keyboard.write_per_key(colors)
                self.after(0, lambda: self._status.set("Per-key colours applied."))
            except Exception as exc:  # noqa: BLE001
                self.after(0, lambda: messagebox.showerror("Per-key", str(exc)))

        threading.Thread(target=work, daemon=True).start()

    # ---------- keys ----------
    def _queue_remap(self):
        src, dst = self.src_key.get(), self.dst_key.get()
        self._pending_remaps = [(s, d) for s, d in self._pending_remaps if s != src]
        self._pending_remaps.append((src, dst))
        self._refresh_remap_list()

    def _remove_remap(self):
        sel = self.remap_list.curselection()
        if not sel:
            return
        del self._pending_remaps[sel[0]]
        self._refresh_remap_list()

    def _refresh_remap_list(self):
        self.remap_list.delete(0, "end")
        for s, d in self._pending_remaps:
            self.remap_list.insert("end", f"{s:12} → {d}")

    def apply_remaps(self):
        if not self.keyboard:
            return
        if not self._pending_remaps:
            messagebox.showinfo("Keys", "No changes queued.")
            return

        def work():
            try:
                raw = bytearray(self.keyboard.read_keymap(0))
                if len(raw) < 126 * 4:
                    raw.extend(b"\x00" * (126 * 4 - len(raw)))
                for src, dst in self._pending_remaps:
                    key = BY_NAME[src]
                    off = key.index * 4
                    if dst in MODIFIERS:
                        # Modifier-only: type 0, modifier bit, usage 0
                        raw[off : off + 4] = bytes([0x00, MODIFIERS[dst], 0x00, 0x00])
                    elif dst in HID:
                        raw[off : off + 4] = bytes([0x00, 0x00, 0x00, HID[dst]])
                    else:
                        raise KeyError(dst)
                self.keyboard.write_keymap(0, bytes(raw))
                self.after(0, lambda: self._status.set("Keymap applied."))
            except Exception as exc:  # noqa: BLE001
                self.after(0, lambda: messagebox.showerror("Keys", str(exc)))

        threading.Thread(target=work, daemon=True).start()

    # ---------- battery / settings ----------
    def _poll_battery(self, force: bool = False):
        if self._closed:
            return
        kb = self.keyboard
        if kb and (force or not self._battery_busy):
            self._battery_busy = True

            def work(keyboard=kb):
                try:
                    level, charging = keyboard.read_battery()
                except Exception:  # noqa: BLE001
                    level, charging = None, False
                    failed = True
                else:
                    failed = False
                self._ui(lambda: self._on_battery(level, charging, failed))

            threading.Thread(target=work, name="aula-battery", daemon=True).start()
        if not force:
            self.after(15000, self._poll_battery)

    def _on_battery(self, level: int | None, charging: bool, failed: bool):
        self._battery_busy = False
        if self._closed:
            return
        if failed:
            return
        if level is None:
            self._battery.set("Battery: n/a (cable)")
            self.battery_big.set("n/a")
            self.battery_note.set("This connection does not report a battery level.")
        else:
            tag = " · charging" if charging else ""
            self._battery.set(f"Battery: {level}%{tag}")
            self.battery_big.set(f"{level}%")
            self.battery_note.set("Charging over cable." if charging else "Read from the keyboard.")
            if level <= self.settings.low_battery_alert and not charging and hasattr(self, "preview"):
                self.preview.fill_all((180, 30, 30))

    def _save_settings(self):
        self.settings.theme = self.theme_var.get()
        self.settings.minimize_to_tray = self.tray_var.get()
        self.settings.start_with_windows = self.start_win.get()
        save_settings(self.settings)

    def _toggle_startup(self):
        self._save_settings()
        err = set_start_with_windows(self.start_win.get())
        if err:
            messagebox.showwarning("Startup", err)

    def _on_close(self):
        self._closed = True
        kb = self.keyboard
        self.keyboard = None

        def work():
            if kb:
                try:
                    kb.close()
                except Exception:  # noqa: BLE001
                    pass

        threading.Thread(target=work, name="aula-close", daemon=True).start()
        try:
            self.destroy()
        except tk.TclError:
            pass


def run_app(start_tray: bool = False) -> None:
    app = AulaControlApp(start_tray=start_tray)
    app.mainloop()
