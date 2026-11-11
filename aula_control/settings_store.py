from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class AppSettings:
    theme: str = "dark"  # dark | light
    start_with_windows: bool = False
    minimize_to_tray: bool = True
    check_updates: bool = True
    last_device: str = "auto"  # auto | demo | path
    low_battery_alert: int = 20
    remaps: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "AppSettings":
        known = {f.name for f in cls.__dataclass_fields__.values()}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in data.items() if k in known})


def config_dir() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    path = base / "AulaControl"
    path.mkdir(parents=True, exist_ok=True)
    return path


def settings_path() -> Path:
    return config_dir() / "settings.json"


def load_settings() -> AppSettings:
    path = settings_path()
    if not path.exists():
        return AppSettings()
    try:
        return AppSettings.from_dict(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, TypeError):
        return AppSettings()


def save_settings(settings: AppSettings) -> None:
    settings_path().write_text(json.dumps(settings.to_dict(), indent=2), encoding="utf-8")


def set_start_with_windows(enabled: bool) -> str | None:
    """Create or remove a Startup shortcut. Returns an error message or None."""
    if sys.platform != "win32":
        return "Start with Windows is only available on Windows."
    try:
        import winreg
        from pathlib import Path as P

        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                exe = sys.executable
                # Prefer the frozen exe when packaged
                if getattr(sys, "frozen", False):
                    exe = sys.executable
                winreg.SetValueEx(key, "AulaControl", 0, winreg.REG_SZ, f'"{exe}" --tray')
            else:
                try:
                    winreg.DeleteValue(key, "AulaControl")
                except FileNotFoundError:
                    pass
        return None
    except OSError as exc:
        return str(exc)
