import time

from aula_control.protocol import packet
from aula_control.protocol import device as device_mod
from aula_control.protocol.device import DemoTransport, demo_info, find_devices, open_device
from aula_control.protocol.effects import EFFECT_PER_KEY


def test_checksum_and_write_packet():
    pkt = packet.build_write(0x04, 0, b"\x01\x02", 0, 1)
    assert len(pkt) == 20
    assert pkt[0] == 0x13
    assert pkt[1] == 0x04
    assert pkt[19] == packet.checksum(pkt[:19])


def test_split_and_reassemble():
    data = bytes(range(40))
    packets = packet.write_packets(0x02, 0, data)
    assert len(packets) == 3
    # Simulate acks as replies with same framing
    assert packet.reassemble(packets) == data


def test_demo_led_and_perkey_roundtrip():
    kb = open_device(demo_info())
    kb.set_effect(2, brightness=7, speed=3, colour=1)
    block = kb.read_led_block()
    assert block[10] == 2
    assert block[126] == 0x5A
    colors = [(i % 256, 40, 80) for i in range(126)]
    kb.write_per_key(colors)
    assert kb.read_led_block()[10] == EFFECT_PER_KEY
    got = kb.read_per_key()
    assert got[0] == (0, 40, 80)
    assert got[10] == (10, 40, 80)
    level, _ = kb.read_battery()
    assert level == 76
    kb.close()


def test_demo_transport_acks():
    t = DemoTransport()
    pkt = packet.build_write(0x04, 0, b"\xff", 0, 1)
    t.write(pkt)
    assert t.read() == pkt


def test_find_devices_timeout_does_not_hang(monkeypatch):
    def stuck():
        time.sleep(30)
        return []

    monkeypatch.setattr(device_mod, "_enumerate_devices", stuck)
    started = time.time()
    assert find_devices(timeout_s=0.6) == []
    assert time.time() - started < 3.0


def test_open_demo_is_instant():
    kb = open_device(demo_info())
    assert kb.demo
    assert kb.read_battery()[0] == 76
    kb.close()
