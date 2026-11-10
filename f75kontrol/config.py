import json
import os
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

ACTION_TYPES = {
    "metin_yaz": "Metin yaz",
    "tus_gonder": "Tuş kombinasyonu gönder",
    "program_ac": "Program / dosya aç",
    "url_ac": "Web adresi aç",
    "komut": "Komut çalıştır (cmd)",
}


@dataclass
class Shortcut:
    hotkey: str
    action: str
    payload: str
    name: str = ""
    enabled: bool = True
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])


@dataclass
class Remap:
    source: str
    target: str
    enabled: bool = True
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])


@dataclass
class Config:
    shortcuts: list[Shortcut] = field(default_factory=list)
    remaps: list[Remap] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "shortcuts": [asdict(s) for s in self.shortcuts],
            "remaps": [asdict(r) for r in self.remaps],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Config":
        return cls(
            shortcuts=[Shortcut(**s) for s in data.get("shortcuts", [])],
            remaps=[Remap(**r) for r in data.get("remaps", [])],
        )


def default_config() -> Config:
    return Config(
        shortcuts=[
            Shortcut("ctrl+alt+n", "program_ac", "notepad.exe", "Not Defteri"),
            Shortcut("ctrl+alt+g", "url_ac", "https://www.google.com", "Google"),
            Shortcut("ctrl+alt+m", "metin_yaz", "Merhaba, nasılsın?", "Hızlı mesaj", enabled=False),
        ],
        remaps=[Remap("caps lock", "esc", enabled=False)],
    )


def config_path() -> Path:
    base = os.environ.get("APPDATA") or str(Path.home() / ".config")
    return Path(base) / "F75Kontrol" / "config.json"


def load_config(path: Path | None = None) -> Config:
    path = path or config_path()
    if not path.exists():
        return default_config()
    try:
        return Config.from_dict(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, TypeError, KeyError):
        broken = path.with_suffix(".bozuk.json")
        path.replace(broken)
        return default_config()


def save_config(config: Config, path: Path | None = None) -> Path:
    path = path or config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(config.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)
    return path
