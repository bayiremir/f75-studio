import threading
from typing import Callable

from .actions import run_action, validate
from .config import Config


class Engine:
    """Registers global hotkeys and key remaps with the `keyboard` library."""

    def __init__(self, keyboard, on_event: Callable[[str], None] = print):
        self.keyboard = keyboard
        self.on_event = on_event
        self._handles: list = []
        self.running = False

    def start(self, config: Config) -> list[str]:
        self.stop()
        errors: list[str] = []
        for sc in config.shortcuts:
            if not sc.enabled:
                continue
            if err := validate(sc):
                errors.append(f"{sc.name or sc.hotkey}: {err}")
                continue
            try:
                handle = self.keyboard.add_hotkey(
                    sc.hotkey, self._trigger, args=(sc,), suppress=True, trigger_on_release=True
                )
                self._handles.append(("hotkey", handle))
            except (ValueError, KeyError) as exc:
                errors.append(f"{sc.hotkey}: geçersiz kısayol ({exc})")
        for rm in config.remaps:
            if not rm.enabled:
                continue
            try:
                handle = self.keyboard.remap_key(rm.source, rm.target)
                self._handles.append(("remap", handle))
            except (ValueError, KeyError) as exc:
                errors.append(f"{rm.source} → {rm.target}: geçersiz tuş ({exc})")
        self.running = True
        return errors

    def stop(self) -> None:
        for kind, handle in self._handles:
            try:
                if kind == "hotkey":
                    self.keyboard.remove_hotkey(handle)
                else:
                    self.keyboard.unremap_key(handle)
            except (KeyError, ValueError):
                pass
        self._handles.clear()
        self.running = False

    def _trigger(self, sc) -> None:
        # The keyboard hook thread must return quickly, so actions run elsewhere.
        def work():
            try:
                run_action(sc, self.keyboard)
                self.on_event(f"Çalıştı: {sc.name or sc.hotkey}")
            except Exception as exc:  # noqa: BLE001 - report any failure to the UI
                self.on_event(f"Hata ({sc.name or sc.hotkey}): {exc}")

        threading.Thread(target=work, daemon=True).start()
