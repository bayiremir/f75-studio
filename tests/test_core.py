from f75kontrol.actions import validate
from f75kontrol.config import Config, Remap, Shortcut, load_config, save_config
from f75kontrol.engine import Engine


class FakeKeyboard:
    def __init__(self):
        self.hotkeys, self.remaps, self.removed = {}, {}, []

    def add_hotkey(self, hotkey, cb, args=(), **_kw):
        if "??" in hotkey:
            raise ValueError("bad key")
        self.hotkeys[hotkey] = (cb, args)
        return hotkey

    def remove_hotkey(self, h):
        self.removed.append(h)
        del self.hotkeys[h]

    def remap_key(self, src, dst):
        self.remaps[src] = dst
        return src

    def unremap_key(self, h):
        del self.remaps[h]


def test_config_roundtrip(tmp_path):
    path = tmp_path / "c.json"
    cfg = Config([Shortcut("ctrl+alt+x", "metin_yaz", "Çğüşİö", "test")], [Remap("caps lock", "esc")])
    save_config(cfg, path)
    loaded = load_config(path)
    assert loaded.shortcuts[0].payload == "Çğüşİö"
    assert loaded.remaps[0].target == "esc"


def test_broken_config_falls_back(tmp_path):
    path = tmp_path / "c.json"
    path.write_text("{bozuk", encoding="utf-8")
    assert load_config(path).shortcuts
    assert (tmp_path / "c.bozuk.json").exists()


def test_validate():
    assert validate(Shortcut("", "metin_yaz", "a"))
    assert validate(Shortcut("f1", "url_ac", "google.com"))
    assert validate(Shortcut("f1", "url_ac", "https://google.com")) is None


def test_engine_registers_only_enabled_and_reports_errors():
    kb = FakeKeyboard()
    cfg = Config(
        [
            Shortcut("ctrl+1", "metin_yaz", "a"),
            Shortcut("ctrl+2", "metin_yaz", "b", enabled=False),
            Shortcut("??", "metin_yaz", "c"),
        ],
        [Remap("caps lock", "esc"), Remap("f1", "f2", enabled=False)],
    )
    eng = Engine(kb)
    errors = eng.start(cfg)
    assert list(kb.hotkeys) == ["ctrl+1"]
    assert kb.remaps == {"caps lock": "esc"}
    assert len(errors) == 1
    eng.stop()
    assert not kb.hotkeys and not kb.remaps and not eng.running
