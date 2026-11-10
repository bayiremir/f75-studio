import os
import shlex
import subprocess
import sys
import webbrowser

from .config import ACTION_TYPES, Shortcut


def validate(shortcut: Shortcut) -> str | None:
    """Return a Turkish error message, or None when the shortcut is valid."""
    if not shortcut.hotkey.strip():
        return "Kısayol tuşu boş olamaz."
    if shortcut.action not in ACTION_TYPES:
        return f"Bilinmeyen eylem türü: {shortcut.action}"
    if not shortcut.payload.strip():
        return "Eylem içeriği boş olamaz."
    if shortcut.action == "url_ac" and not shortcut.payload.startswith(("http://", "https://")):
        return "Web adresi http:// veya https:// ile başlamalı."
    return None


def run_action(shortcut: Shortcut, keyboard) -> None:
    action, payload = shortcut.action, shortcut.payload
    if action == "metin_yaz":
        keyboard.write(payload, delay=0.005)
    elif action == "tus_gonder":
        keyboard.send(payload)
    elif action == "url_ac":
        webbrowser.open(payload)
    elif action == "program_ac":
        if sys.platform == "win32":
            os.startfile(payload)  # type: ignore[attr-defined]
        else:
            subprocess.Popen(shlex.split(payload))
    elif action == "komut":
        subprocess.Popen(payload, shell=True)
    else:
        raise ValueError(f"Bilinmeyen eylem türü: {action}")
