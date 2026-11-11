"""Open and talk to AULA F75 devices over HID."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Protocol

from . import packet
from .effects import EFFECT_PER_KEY
from .layout import MATRIX_LEN

# Known AULA F75 identities
WIRELESS = (0x3554, 0xFA09)  # 2.4 GHz dongle
BLUETOOTH = (0x3554, 0xFA08)
WIRED = (0x258A, 0x010C)

KNOWN = {WIRELESS: "2.4G dongle", BLUETOOTH: "Bluetooth", WIRED: "USB-C cable"}


class Transport(Protocol):
    def write(self, data: bytes) -> None: ...
    def read(self, size: int = 64, timeout_ms: int = 200) -> bytes: ...
    def close(self) -> None: ...
    def set_feature(self, data: bytes) -> None: ...
    def get_feature(self, report_id: int, size: int) -> bytes: ...


@dataclass
class DeviceInfo:
    vendor_id: int
    product_id: int
    path: str
    product: str
    manufacturer: str
    kind: str  # "wireless" | "wired" | "bluetooth" | "demo"
    interface: int = -1

    @property
    def label(self) -> str:
        if self.kind == "demo":
            return "Demo keyboard"
        name = KNOWN.get((self.vendor_id, self.product_id), self.product or "AULA device")
        return f"{name} ({self.vendor_id:04X}:{self.product_id:04X})"


class DemoTransport:
    """In-memory keyboard used when no hardware is present."""

    def __init__(self):
        self.led = bytearray(128)
        self.led[10] = 1
        self.led[0x3A] = 5
        self.led[0x3B] = (2 << 4) | 0
        self.led[126], self.led[127] = 0x5A, 0xA5
        self.colors = bytearray(MATRIX_LEN * 3)
        self.keymap = bytearray(MATRIX_LEN * 4)
        self.battery = 76
        self.charging = False
        self._last_feature = b""

    def write(self, data: bytes) -> None:
        if len(data) < 5 or data[0] != 0x13:
            return
        cmd = data[1]
        if cmd & 0x40:
            return  # read handled in read()
        length = data[4] & 0x0F
        payload = data[5 : 5 + length]
        if cmd == 0x04:
            self._patch(self.led, data)
        elif cmd == 0x02:
            self._patch(self.colors, data)
        elif cmd == 0x01:
            self._patch(self.keymap, data)
        self._echo = bytes(data)

    def _patch(self, buf: bytearray, data: bytes) -> None:
        index = data[3]
        length = data[4] & 0x0F
        start = index * 14
        buf[start : start + length] = data[5 : 5 + length]

    def read(self, size: int = 64, timeout_ms: int = 200) -> bytes:
        echo = getattr(self, "_echo", None)
        if echo:
            self._echo = None
            return echo
        return b""

    def set_feature(self, data: bytes) -> None:
        self._last_feature = bytes(data)

    def get_feature(self, report_id: int, size: int) -> bytes:
        out = bytearray(size)
        out[0] = report_id
        if self._last_feature and len(self._last_feature) > 1:
            cmd = self._last_feature[1] & 0x7F
            if cmd == 0x04:
                out[1] = 0x84
                out[6] = 128
                out[8:136] = self.led
            elif cmd == 0x06:
                out[1] = 0x86
                out[6] = 0x80
                out[7] = 0x01
                out[8 : 8 + len(self.colors)] = self.colors
        return bytes(out)

    def close(self) -> None:
        pass


class HidTransport:
    def __init__(self, device):
        self._dev = device

    def write(self, data: bytes) -> None:
        self._dev.write(data)

    def read(self, size: int = 64, timeout_ms: int = 200) -> bytes:
        self._dev.set_nonblocking(False)
        try:
            return bytes(self._dev.read(size, timeout_ms) or b"")
        except Exception:
            return b""

    def set_feature(self, data: bytes) -> None:
        self._dev.send_feature_report(data)

    def get_feature(self, report_id: int, size: int) -> bytes:
        return bytes(self._dev.get_feature_report(report_id, size) or b"")

    def close(self) -> None:
        try:
            self._dev.close()
        except Exception:
            pass


class Keyboard:
    def __init__(self, info: DeviceInfo, transport: Transport):
        self.info = info
        self.transport = transport
        self.demo = info.kind == "demo"

    def close(self) -> None:
        self.transport.close()

    # ---- wireless (2.4G / BT) ----
    def _wireless_write(self, cmd: int, sub: int, data: bytes, delay_ms: float = 15) -> None:
        for pkt in packet.write_packets(cmd, sub, data):
            self.transport.write(pkt)
            if cmd not in (0x06, 0x88) and not (cmd & 0x80):
                self._wait_ack(cmd, pkt[3])
            time.sleep(delay_ms / 1000.0)

    def _wait_ack(self, cmd: int, index: int, tries: int = 8) -> None:
        if self.demo:
            self.transport.read()
            return
        for _ in range(tries):
            reply = self.transport.read(64, 80)
            if not reply:
                continue
            parsed = packet.parse_reply(reply)
            if not parsed:
                continue
            rcmd, _total, rindex, _sub, _payload = parsed
            if reply[0] == 0xFF:
                raise RuntimeError("keyboard reported an error")
            if (rcmd & 0x7F) == (cmd & 0x7F) and rindex == index:
                return
        # Soft-fail: some hosts drop acks; settings often still apply.

    def _wireless_read(
        self,
        cmd: int,
        sub: int,
        expected: int,
        *,
        attempts: int = 4,
        window_s: float = 0.6,
    ) -> bytes:
        if self.demo:
            if cmd == 0x04:
                return bytes(self.transport.led)  # type: ignore[attr-defined]
            if cmd == 0x02:
                return bytes(self.transport.colors)  # type: ignore[attr-defined]
            if cmd == 0x01:
                return bytes(self.transport.keymap)  # type: ignore[attr-defined]
            if cmd == 0x0A:
                return bytes([self.transport.battery, 0])  # type: ignore[attr-defined]
            return b"\x00" * expected
        collected: list[bytes] = []
        for attempt in range(max(1, attempts)):
            self.transport.write(packet.build_read_request(cmd, sub))
            deadline = time.time() + window_s
            while time.time() < deadline:
                reply = self.transport.read(64, 50)
                if not reply:
                    continue
                parsed = packet.parse_reply(reply)
                if not parsed:
                    continue
                rcmd, total, index, _sub, payload = parsed
                if (rcmd & 0x7F) != (cmd & 0x7F):
                    continue
                collected.append(reply)
                indexes = {packet.parse_reply(p)[2] for p in collected if packet.parse_reply(p)}
                if len(indexes) >= total:
                    data = packet.reassemble(collected)
                    if len(data) >= expected:
                        return data[:expected]
            time.sleep(0.02 + attempt * 0.01)
        return packet.reassemble(collected)[:expected]

    # ---- wired feature reports ----
    def _wired_write(self, cmd: int, sub: int, data: bytes) -> None:
        # Feature report 0x06, 520 bytes
        buf = bytearray(520)
        buf[0] = 0x06
        buf[1] = cmd
        buf[2] = sub
        buf[4] = 1
        buf[5] = 0
        buf[6] = len(data) & 0xFF
        buf[7] = (len(data) >> 8) & 0xFF
        buf[8 : 8 + len(data)] = data
        for _ in range(3):
            try:
                self.transport.set_feature(bytes(buf))
                time.sleep(0.02)
                return
            except Exception:
                time.sleep(0.07)
        raise RuntimeError("wired write failed")

    def _wired_read(self, cmd: int, sub: int, expected: int) -> bytes:
        if self.demo:
            return self._wireless_read(cmd, sub, expected)
        req = bytearray(520)
        req[0] = 0x06
        req[1] = cmd | 0x80
        req[2] = sub
        req[4] = 1
        self.transport.set_feature(bytes(req))
        time.sleep(0.02)
        raw = self.transport.get_feature(0x06, 520)
        return bytes(raw[8 : 8 + expected])

    def _is_wired(self) -> bool:
        return self.info.kind == "wired"

    def read_led_block(self) -> bytearray:
        if self._is_wired():
            data = self._wired_read(0x04, 0, 128)
        else:
            data = self._wireless_read(0x04, 0, 128)
        block = bytearray(data + b"\x00" * (128 - len(data)))
        return block[:128]

    def write_led_block(self, block: bytes | bytearray) -> None:
        data = bytearray(block)
        if len(data) != 128:
            raise ValueError("LED block must be 128 bytes")
        data[126], data[127] = 0x5A, 0xA5
        if self._is_wired():
            self._wired_write(0x04, 0, bytes(data))
        else:
            self._wireless_write(0x04, 0, bytes(data))

    def set_effect(self, effect_id: int, brightness: int = 5, speed: int = 2, colour: int = 0) -> None:
        block = self.read_led_block()
        block[9] = 1 if effect_id == EFFECT_PER_KEY else 0
        block[10] = effect_id & 0xFF
        block[0x38] = 0xFF
        block[0x39] = 0xFF
        # Slot settings for effects 1-10 live at 0x3a + 2*(i-1) for i in 1..10
        slot = effect_id if 1 <= effect_id <= 10 else 1
        off = 0x3A + 2 * (slot - 1)
        block[off] = max(0, min(9, brightness))
        block[off + 1] = ((max(0, min(4, speed)) & 0x0F) << 4) | (colour & 0x0F)
        self.write_led_block(block)

    def read_per_key(self) -> list[tuple[int, int, int]]:
        cmd_w, cmd_r = (0x06, 0x06) if self._is_wired() else (0x02, 0x02)
        if self._is_wired():
            raw = self._wired_read(cmd_r, 0, MATRIX_LEN * 3)
        else:
            raw = self._wireless_read(cmd_r, 0, MATRIX_LEN * 3)
        colors = []
        for i in range(MATRIX_LEN):
            r = raw[i] if i < len(raw) else 0
            g = raw[MATRIX_LEN + i] if MATRIX_LEN + i < len(raw) else 0
            b = raw[2 * MATRIX_LEN + i] if 2 * MATRIX_LEN + i < len(raw) else 0
            colors.append((r, g, b))
        return colors

    def write_per_key(self, colors: list[tuple[int, int, int]]) -> None:
        raw = bytearray(MATRIX_LEN * 3)
        for i, (r, g, b) in enumerate(colors[:MATRIX_LEN]):
            raw[i] = r & 0xFF
            raw[MATRIX_LEN + i] = g & 0xFF
            raw[2 * MATRIX_LEN + i] = b & 0xFF
        if self._is_wired():
            self._wired_write(0x06, 0, bytes(raw))
        else:
            self._wireless_write(0x02, 0, bytes(raw))
        # Switch to per-key effect so colours show
        self.set_effect(EFFECT_PER_KEY, brightness=9)

    def read_keymap(self, layer: int = 0) -> bytes:
        if self._is_wired():
            return self._wired_read(0x03, layer, MATRIX_LEN * 4)
        return self._wireless_read(0x01, layer, MATRIX_LEN * 4)

    def write_keymap(self, layer: int, data: bytes) -> None:
        if len(data) < MATRIX_LEN * 4:
            data = data + b"\x00" * (MATRIX_LEN * 4 - len(data))
        data = data[: MATRIX_LEN * 4]
        if self._is_wired():
            self._wired_write(0x03, layer, data)
        else:
            self._wireless_write(0x01, layer, data)

    def read_battery(self) -> tuple[int | None, bool]:
        """Return (percent or None, charging). Wired cable often has no level."""
        if self.info.kind == "wired" and not self.demo:
            return None, True
        if self.demo:
            t = self.transport
            return int(t.battery), bool(t.charging)  # type: ignore[attr-defined]
        try:
            # Keep this short — it is polled from the UI and must not hang.
            raw = self._wireless_read(0x0A, 0, 2, attempts=2, window_s=0.35)
            if not raw:
                return None, False
            return int(raw[0]), False
        except Exception:
            return None, False


def _enumerate_devices() -> list[DeviceInfo]:
    """Blocking HID scan. Prefer find_devices() which applies a timeout."""
    devices: list[DeviceInfo] = []
    try:
        import hid  # type: ignore
    except ImportError:
        return devices
    try:
        entries = hid.enumerate()
    except Exception:
        return devices
    seen: set[str] = set()
    for e in entries:
        vid, pid = e.get("vendor_id", 0), e.get("product_id", 0)
        if (vid, pid) not in KNOWN:
            continue
        path = e.get("path") or b""
        path_s = path.decode(errors="replace") if isinstance(path, bytes) else str(path)
        if path_s in seen:
            continue
        usage_page = e.get("usage_page", 0)
        interface = e.get("interface_number", -1)
        # Prefer vendor interfaces for the wired bridge
        if (vid, pid) == WIRED and usage_page not in (0xFF00, 0xFF02) and interface not in (1, 2):
            continue
        kind = "wired" if (vid, pid) == WIRED else "bluetooth" if (vid, pid) == BLUETOOTH else "wireless"
        seen.add(path_s)
        devices.append(
            DeviceInfo(
                vendor_id=vid,
                product_id=pid,
                path=path_s,
                # String descriptors can be slow/empty on Windows — never block on them.
                product=e.get("product_string") or "",
                manufacturer=e.get("manufacturer_string") or "",
                kind=kind,
                interface=interface,
            )
        )
    return devices


def find_devices(timeout_s: float = 4.0) -> list[DeviceInfo]:
    """Scan for AULA devices without hanging the caller forever.

    hidapi's enumerate() can stall on Windows when a device ignores string
    descriptor requests. Run it in a daemon thread and give up after timeout_s.
    """
    box: list[list[DeviceInfo]] = []
    err: list[BaseException] = []

    def worker() -> None:
        try:
            box.append(_enumerate_devices())
        except BaseException as exc:  # noqa: BLE001
            err.append(exc)

    thread = threading.Thread(target=worker, name="aula-hid-enumerate", daemon=True)
    thread.start()
    thread.join(timeout=max(0.5, timeout_s))
    if thread.is_alive():
        # Thread is daemon — abandoned; UI continues with an empty list / demo.
        return []
    if err:
        return []
    return box[0] if box else []


def open_device(info: DeviceInfo | None = None, timeout_s: float = 5.0) -> Keyboard:
    if info is None or info.kind == "demo":
        demo = DeviceInfo(0, 0, "demo", "Demo keyboard", "Aula Control", "demo")
        return Keyboard(demo, DemoTransport())

    box: list[Keyboard] = []
    err: list[BaseException] = []

    def worker() -> None:
        try:
            import hid  # type: ignore

            dev = hid.device()
            path = info.path.encode() if isinstance(info.path, str) else info.path
            try:
                dev.open_path(path)
            except Exception:
                dev.open(info.vendor_id, info.product_id)
            box.append(Keyboard(info, HidTransport(dev)))
        except BaseException as exc:  # noqa: BLE001
            err.append(exc)

    thread = threading.Thread(target=worker, name="aula-hid-open", daemon=True)
    thread.start()
    thread.join(timeout=max(0.5, timeout_s))
    if thread.is_alive():
        raise TimeoutError("Opening the keyboard timed out. Close the official AULA software and try again.")
    if err:
        raise err[0]
    if not box:
        raise RuntimeError("Could not open the keyboard.")
    return box[0]


def close_device(kb: Keyboard | None) -> None:
    if kb:
        kb.close()


def demo_info() -> DeviceInfo:
    return DeviceInfo(0, 0, "demo", "Demo keyboard", "Aula Control", "demo")
