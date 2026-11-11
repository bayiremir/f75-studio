"""Live F75 keyboard picture drawn on a Tk canvas."""

from __future__ import annotations

import tkinter as tk
from typing import Callable

from aula_control.protocol.effects import COLOUR_RGB
from aula_control.protocol.layout import KEYS, LAYOUT_H, LAYOUT_W, Key


class KeyboardPreview(tk.Canvas):
    def __init__(self, master, on_key: Callable[[Key], None] | None = None, **kw):
        kw.setdefault("highlightthickness", 0)
        kw.setdefault("bd", 0)
        super().__init__(master, **kw)
        self.on_key = on_key
        self.colors: dict[int, tuple[int, int, int]] = {k.index: (40, 44, 52) for k in KEYS}
        self.selected: int | None = None
        self.asleep = False
        self.mode = "live"  # live | picture
        self.bind("<Configure>", lambda _e: self.redraw())
        self.bind("<Button-1>", self._click)

    def set_colors(self, mapping: dict[int, tuple[int, int, int]]) -> None:
        self.colors.update(mapping)
        self.redraw()

    def fill_all(self, rgb: tuple[int, int, int]) -> None:
        for k in KEYS:
            self.colors[k.index] = rgb
        self.redraw()

    def set_effect_preview(self, colour_id: int, brightness: int = 5) -> None:
        base = COLOUR_RGB.get(colour_id, (200, 200, 200))
        factor = 0.35 + 0.065 * brightness
        rgb = tuple(max(0, min(255, int(c * factor))) for c in base)
        self.fill_all(rgb)  # type: ignore[arg-type]

    def redraw(self) -> None:
        self.delete("all")
        w = max(self.winfo_width(), 40)
        h = max(self.winfo_height(), 40)
        scale = min(w / LAYOUT_W, h / LAYOUT_H)
        ox = (w - LAYOUT_W * scale) / 2
        oy = (h - LAYOUT_H * scale) / 2
        # Board
        self.create_rectangle(ox + 10 * scale, oy + 10 * scale, ox + (LAYOUT_W - 10) * scale,
                              oy + (LAYOUT_H - 10) * scale, fill="#1a1d24", outline="#2a2f3a", width=2)
        for key in KEYS:
            if key.x2 <= key.x1:
                continue
            x1 = ox + key.x1 * scale
            y1 = oy + key.y1 * scale
            x2 = ox + key.x2 * scale
            y2 = oy + key.y2 * scale
            if self.mode == "picture" or self.asleep:
                fill = "#2a2f3a"
            else:
                r, g, b = self.colors.get(key.index, (40, 44, 52))
                fill = f"#{r:02x}{g:02x}{b:02x}"
            outline = "#6ea8fe" if key.index == self.selected else "#3a4150"
            self.create_rectangle(x1, y1, x2, y2, fill=fill, outline=outline, width=1, tags=(f"k{key.index}",))
            if (x2 - x1) > 18:
                self.create_text((x1 + x2) / 2, (y1 + y2) / 2, text=key.label, fill="#e8eaed",
                                 font=("Segoe UI", max(7, int(8 * scale))), tags=(f"k{key.index}",))

    def _click(self, event) -> None:
        if not self.on_key:
            return
        items = self.find_overlapping(event.x, event.y, event.x, event.y)
        for item in items:
            for tag in self.gettags(item):
                if tag.startswith("k"):
                    idx = int(tag[1:])
                    key = next((k for k in KEYS if k.index == idx), None)
                    if key:
                        self.selected = idx
                        self.redraw()
                        self.on_key(key)
                    return
