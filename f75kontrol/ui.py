import queue
import tkinter as tk
from tkinter import messagebox, ttk

from . import hid_scan
from .actions import validate
from .config import ACTION_TYPES, Config, Remap, Shortcut, config_path, load_config, save_config
from .engine import Engine

ACTION_LABELS = list(ACTION_TYPES.values())
LABEL_TO_ACTION = {v: k for k, v in ACTION_TYPES.items()}
PAYLOAD_HINTS = {
    "metin_yaz": "Yazılacak metin, ör: Merhaba!",
    "tus_gonder": "Gönderilecek tuşlar, ör: ctrl+shift+esc  veya  play/pause media",
    "program_ac": "Program yolu, ör: C:\\Program Files\\Spotify\\Spotify.exe",
    "url_ac": "Adres, ör: https://youtube.com",
    "komut": "cmd komutu, ör: shutdown /s /t 60",
}


class ShortcutDialog(tk.Toplevel):
    def __init__(self, parent, keyboard, shortcut: Shortcut | None = None):
        super().__init__(parent)
        self.title("Kısayol düzenle" if shortcut else "Yeni kısayol")
        self.resizable(False, False)
        self.transient(parent)
        self.keyboard = keyboard
        self.result: Shortcut | None = None
        self._orig = shortcut

        self.name = tk.StringVar(value=shortcut.name if shortcut else "")
        self.hotkey = tk.StringVar(value=shortcut.hotkey if shortcut else "")
        self.action = tk.StringVar(value=ACTION_TYPES[shortcut.action] if shortcut else ACTION_LABELS[0])
        self.payload = tk.StringVar(value=shortcut.payload if shortcut else "")
        self.hint = tk.StringVar()

        f = ttk.Frame(self, padding=16)
        f.grid(sticky="nsew")
        ttk.Label(f, text="Ad").grid(row=0, column=0, sticky="w", pady=4)
        ttk.Entry(f, textvariable=self.name, width=40).grid(row=0, column=1, columnspan=2, sticky="ew")

        ttk.Label(f, text="Kısayol").grid(row=1, column=0, sticky="w", pady=4)
        ttk.Entry(f, textvariable=self.hotkey, width=28).grid(row=1, column=1, sticky="ew")
        self.rec_btn = ttk.Button(f, text="Kaydet (bas)", command=self._record)
        self.rec_btn.grid(row=1, column=2, padx=(6, 0))

        ttk.Label(f, text="Eylem").grid(row=2, column=0, sticky="w", pady=4)
        cb = ttk.Combobox(f, textvariable=self.action, values=ACTION_LABELS, state="readonly")
        cb.grid(row=2, column=1, columnspan=2, sticky="ew")
        cb.bind("<<ComboboxSelected>>", lambda _e: self._update_hint())

        ttk.Label(f, text="İçerik").grid(row=3, column=0, sticky="w", pady=4)
        ttk.Entry(f, textvariable=self.payload, width=40).grid(row=3, column=1, columnspan=2, sticky="ew")
        ttk.Label(f, textvariable=self.hint, foreground="#666", wraplength=360).grid(
            row=4, column=1, columnspan=2, sticky="w"
        )

        btns = ttk.Frame(f)
        btns.grid(row=5, column=0, columnspan=3, sticky="e", pady=(12, 0))
        ttk.Button(btns, text="Vazgeç", command=self.destroy).pack(side="right")
        ttk.Button(btns, text="Tamam", command=self._ok).pack(side="right", padx=6)

        self._update_hint()
        self.grab_set()

    def _update_hint(self):
        self.hint.set(PAYLOAD_HINTS[LABEL_TO_ACTION[self.action.get()]])

    def _record(self):
        if self.keyboard is None:
            messagebox.showwarning("Kayıt yok", "'keyboard' paketi yüklü değil.", parent=self)
            return
        self.rec_btn.config(text="Basın...", state="disabled")
        self.update()
        try:
            combo = self.keyboard.read_hotkey(suppress=False)
            self.hotkey.set(combo)
        finally:
            self.rec_btn.config(text="Kaydet (bas)", state="normal")

    def _ok(self):
        sc = Shortcut(
            hotkey=self.hotkey.get().strip().lower(),
            action=LABEL_TO_ACTION[self.action.get()],
            payload=self.payload.get().strip(),
            name=self.name.get().strip(),
            enabled=self._orig.enabled if self._orig else True,
        )
        if self._orig:
            sc.id = self._orig.id
        if err := validate(sc):
            messagebox.showerror("Hatalı kısayol", err, parent=self)
            return
        self.result = sc
        self.destroy()


class App(tk.Tk):
    def __init__(self, keyboard=None, keyboard_error: str | None = None):
        super().__init__()
        self.title("F75 Kontrol")
        self.geometry("820x520")
        self.minsize(640, 420)
        self.keyboard = keyboard
        self.config_data: Config = load_config()
        self.events: queue.Queue[str] = queue.Queue()
        self.engine = Engine(keyboard, on_event=self.events.put) if keyboard else None

        style = ttk.Style(self)
        if "vista" in style.theme_names():
            style.theme_use("vista")
        style.configure("Treeview", rowheight=26)

        top = ttk.Frame(self, padding=(12, 10))
        top.pack(fill="x")
        ttk.Label(top, text="F75 Kontrol", font=("Segoe UI", 14, "bold")).pack(side="left")
        self.toggle_btn = ttk.Button(top, text="Etkinleştir", command=self.toggle_engine)
        self.toggle_btn.pack(side="right")
        self.status = tk.StringVar(value="Durum: kapalı")
        ttk.Label(top, textvariable=self.status).pack(side="right", padx=10)

        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True, padx=12)
        nb.add(self._build_shortcuts(nb), text="Kısayollar & Makrolar")
        nb.add(self._build_remaps(nb), text="Tuş Atama")
        nb.add(self._build_device(nb), text="Klavye (HID)")

        self.log = tk.Listbox(self, height=4)
        self.log.pack(fill="x", padx=12, pady=10)

        self.refresh_shortcuts()
        self.refresh_remaps()
        if keyboard_error:
            self.toggle_btn.state(["disabled"])
            self.add_log(keyboard_error)
        else:
            self.add_log(f"Ayar dosyası: {config_path()}")
        self.after(150, self._drain_events)
        self.protocol("WM_DELETE_WINDOW", self._close)

    # ---------- shortcuts ----------
    def _build_shortcuts(self, parent):
        f = ttk.Frame(parent, padding=8)
        cols = ("on", "name", "hotkey", "action", "payload")
        self.sc_tree = ttk.Treeview(f, columns=cols, show="headings", selectmode="browse")
        for col, text, w in [
            ("on", "Açık", 50), ("name", "Ad", 140), ("hotkey", "Kısayol", 130),
            ("action", "Eylem", 170), ("payload", "İçerik", 260),
        ]:
            self.sc_tree.heading(col, text=text)
            self.sc_tree.column(col, width=w, anchor="w")
        self.sc_tree.pack(side="left", fill="both", expand=True)
        self.sc_tree.bind("<Double-1>", lambda _e: self.edit_shortcut())

        side = ttk.Frame(f, padding=(8, 0))
        side.pack(side="right", fill="y")
        for text, cmd in [
            ("Ekle", self.add_shortcut), ("Düzenle", self.edit_shortcut),
            ("Aç / Kapat", self.toggle_shortcut), ("Sil", self.delete_shortcut),
        ]:
            ttk.Button(side, text=text, command=cmd, width=14).pack(pady=3)
        return f

    def refresh_shortcuts(self):
        self.sc_tree.delete(*self.sc_tree.get_children())
        for sc in self.config_data.shortcuts:
            self.sc_tree.insert("", "end", iid=sc.id, values=(
                "✔" if sc.enabled else "–", sc.name, sc.hotkey, ACTION_TYPES[sc.action], sc.payload,
            ))
        if not self.config_data.shortcuts:
            self.sc_tree.insert("", "end", iid="__empty", values=("", "Henüz kısayol yok — 'Ekle' ile başlayın", "", "", ""))

    def _selected_shortcut(self) -> Shortcut | None:
        sel = self.sc_tree.selection()
        return next((s for s in self.config_data.shortcuts if sel and s.id == sel[0]), None)

    def add_shortcut(self):
        dlg = ShortcutDialog(self, self.keyboard)
        self.wait_window(dlg)
        if dlg.result:
            self.config_data.shortcuts.append(dlg.result)
            self._changed()

    def edit_shortcut(self):
        sc = self._selected_shortcut()
        if not sc:
            return
        dlg = ShortcutDialog(self, self.keyboard, sc)
        self.wait_window(dlg)
        if dlg.result:
            idx = self.config_data.shortcuts.index(sc)
            self.config_data.shortcuts[idx] = dlg.result
            self._changed()

    def toggle_shortcut(self):
        if sc := self._selected_shortcut():
            sc.enabled = not sc.enabled
            self._changed()

    def delete_shortcut(self):
        sc = self._selected_shortcut()
        if sc and messagebox.askyesno("Sil", f"'{sc.name or sc.hotkey}' silinsin mi?"):
            self.config_data.shortcuts.remove(sc)
            self._changed()

    # ---------- remaps ----------
    def _build_remaps(self, parent):
        f = ttk.Frame(parent, padding=8)
        form = ttk.Frame(f)
        form.pack(fill="x", pady=(0, 8))
        self.rm_src = tk.StringVar()
        self.rm_dst = tk.StringVar()
        ttk.Label(form, text="Basılan tuş").pack(side="left")
        ttk.Entry(form, textvariable=self.rm_src, width=14).pack(side="left", padx=4)
        ttk.Label(form, text="→ Gönderilen tuş").pack(side="left")
        ttk.Entry(form, textvariable=self.rm_dst, width=14).pack(side="left", padx=4)
        ttk.Button(form, text="Ekle", command=self.add_remap).pack(side="left", padx=4)
        ttk.Label(f, text="Örnek tuş adları: caps lock, esc, f13, right ctrl, page up, home, volume up",
                  foreground="#666").pack(anchor="w")

        body = ttk.Frame(f)
        body.pack(fill="both", expand=True, pady=6)
        self.rm_tree = ttk.Treeview(body, columns=("on", "src", "dst"), show="headings", selectmode="browse")
        for col, text in [("on", "Açık"), ("src", "Basılan"), ("dst", "Gönderilen")]:
            self.rm_tree.heading(col, text=text)
        self.rm_tree.column("on", width=50)
        self.rm_tree.pack(side="left", fill="both", expand=True)
        side = ttk.Frame(body, padding=(8, 0))
        side.pack(side="right", fill="y")
        ttk.Button(side, text="Aç / Kapat", command=self.toggle_remap, width=14).pack(pady=3)
        ttk.Button(side, text="Sil", command=self.delete_remap, width=14).pack(pady=3)
        return f

    def refresh_remaps(self):
        self.rm_tree.delete(*self.rm_tree.get_children())
        for rm in self.config_data.remaps:
            self.rm_tree.insert("", "end", iid=rm.id, values=("✔" if rm.enabled else "–", rm.source, rm.target))

    def _selected_remap(self) -> Remap | None:
        sel = self.rm_tree.selection()
        return next((r for r in self.config_data.remaps if sel and r.id == sel[0]), None)

    def add_remap(self):
        src, dst = self.rm_src.get().strip().lower(), self.rm_dst.get().strip().lower()
        if not src or not dst:
            messagebox.showerror("Eksik bilgi", "Her iki tuşu da yazın.")
            return
        self.config_data.remaps.append(Remap(src, dst))
        self.rm_src.set("")
        self.rm_dst.set("")
        self._changed()

    def toggle_remap(self):
        if rm := self._selected_remap():
            rm.enabled = not rm.enabled
            self._changed()

    def delete_remap(self):
        if rm := self._selected_remap():
            self.config_data.remaps.remove(rm)
            self._changed()

    # ---------- device ----------
    def _build_device(self, parent):
        f = ttk.Frame(parent, padding=8)
        bar = ttk.Frame(f)
        bar.pack(fill="x")
        ttk.Button(bar, text="Cihazları tara", command=self.scan_devices).pack(side="left")
        self.only_aula = tk.BooleanVar(value=True)
        ttk.Checkbutton(bar, text="Sadece AULA olabilecekler", variable=self.only_aula,
                        command=self.scan_devices).pack(side="left", padx=10)
        self.dev_info = tk.StringVar(value="Klavyenizi bulmak için 'Cihazları tara'ya basın.")
        ttk.Label(f, textvariable=self.dev_info, foreground="#666", wraplength=740).pack(anchor="w", pady=6)

        cols = ("vid", "pid", "maker", "product", "page", "iface", "note")
        self.dev_tree = ttk.Treeview(f, columns=cols, show="headings")
        for col, text, w in [
            ("vid", "VID", 70), ("pid", "PID", 70), ("maker", "Üretici", 120), ("product", "Ürün", 160),
            ("page", "Usage Page", 90), ("iface", "Arayüz", 60), ("note", "Not", 200),
        ]:
            self.dev_tree.heading(col, text=text)
            self.dev_tree.column(col, width=w, anchor="w")
        self.dev_tree.pack(fill="both", expand=True)
        return f

    def scan_devices(self):
        devices, err = hid_scan.scan()
        self.dev_tree.delete(*self.dev_tree.get_children())
        if err:
            self.dev_info.set(err)
            return
        shown = [d for d in devices if d.likely_aula or not self.only_aula.get()]
        for i, d in enumerate(shown):
            note = "Üretici arayüzü (RGB/ayar komutları)" if d.is_vendor_interface else ""
            self.dev_tree.insert("", "end", iid=str(i), values=(
                f"{d.vendor_id:04X}", f"{d.product_id:04X}", d.manufacturer, d.product,
                f"{d.usage_page:04X}", d.interface, note,
            ))
        if shown:
            self.dev_info.set(f"{len(shown)} HID arayüzü bulundu. 'Üretici arayüzü' olanlar, AULA yazılımının "
                              "ışık ve ayar komutlarını gönderdiği kanallardır.")
        else:
            self.dev_info.set("AULA cihazı bulunamadı. Klavye kabloyla bağlı mı? Filtreyi kapatıp tüm cihazlara bakın.")

    # ---------- engine ----------
    def toggle_engine(self):
        if not self.engine:
            return
        if self.engine.running:
            self.engine.stop()
            self.status.set("Durum: kapalı")
            self.toggle_btn.config(text="Etkinleştir")
            self.add_log("Kısayollar devre dışı.")
        else:
            self._start_engine()

    def _start_engine(self):
        errors = self.engine.start(self.config_data)
        for e in errors:
            self.add_log(e)
        active = sum(s.enabled for s in self.config_data.shortcuts) + sum(r.enabled for r in self.config_data.remaps)
        self.status.set(f"Durum: açık ({active - len(errors)} kural)")
        self.toggle_btn.config(text="Durdur")

    def _changed(self):
        save_config(self.config_data)
        self.refresh_shortcuts()
        self.refresh_remaps()
        if self.engine and self.engine.running:
            self._start_engine()

    def add_log(self, msg: str):
        self.log.insert("end", msg)
        self.log.see("end")

    def _drain_events(self):
        while not self.events.empty():
            self.add_log(self.events.get_nowait())
        self.after(150, self._drain_events)

    def _close(self):
        if self.engine:
            self.engine.stop()
        self.destroy()
