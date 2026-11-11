"""2.4 GHz / Bluetooth vendor HID framing (report 0x13, 20 bytes)."""

from __future__ import annotations

REPORT_ID = 0x13
PAYLOAD = 14


def checksum(data: bytes | bytearray) -> int:
    return sum(data) & 0xFF


def build_write(cmd: int, sub: int, payload: bytes, index: int, total: int) -> bytes:
    length = len(payload)
    if length > PAYLOAD:
        raise ValueError("payload too long for one packet")
    buf = bytearray(20)
    buf[0] = REPORT_ID
    buf[1] = cmd & 0xFF
    buf[2] = total & 0xFF
    buf[3] = index & 0xFF
    buf[4] = ((sub & 0x0F) << 4) | (length & 0x0F)
    buf[5 : 5 + length] = payload
    buf[19] = checksum(buf[:19])
    return bytes(buf)


def build_read_request(cmd: int, sub: int = 0) -> bytes:
    # Read requests use command | 0x40 on the wireless link.
    return build_write(cmd | 0x40, sub, b"", 0, 1)


def split_payload(data: bytes) -> list[bytes]:
    if not data:
        return [b""]
    return [data[i : i + PAYLOAD] for i in range(0, len(data), PAYLOAD)]


def write_packets(cmd: int, sub: int, data: bytes) -> list[bytes]:
    chunks = split_payload(data)
    total = len(chunks)
    return [build_write(cmd, sub, chunk, i, total) for i, chunk in enumerate(chunks)]


def parse_reply(packet: bytes) -> tuple[int, int, int, int, bytes] | None:
    if len(packet) < 20 or packet[0] not in (REPORT_ID, 0xFF):
        return None
    cmd = packet[1]
    total = packet[2] & 0x7F
    index = packet[3]
    length = packet[4] & 0x0F
    sub = (packet[4] >> 4) & 0x0F
    payload = bytes(packet[5 : 5 + length])
    return cmd, total, index, sub, payload


def reassemble(packets: list[bytes]) -> bytes:
    parts: dict[int, bytes] = {}
    expected = None
    for pkt in packets:
        parsed = parse_reply(pkt)
        if not parsed:
            continue
        _cmd, total, index, _sub, payload = parsed
        expected = total
        parts[index] = payload
    if expected is None:
        return b""
    return b"".join(parts.get(i, b"") for i in range(expected))
