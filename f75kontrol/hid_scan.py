from dataclasses import dataclass

# Vendor IDs seen on AULA boards (Sino Wealth / generic controllers). Name matching covers the rest.
KNOWN_VENDOR_IDS = {0x258A, 0x0C45}
NAME_HINTS = ("aula", "f75")


@dataclass
class HidDevice:
    vendor_id: int
    product_id: int
    manufacturer: str
    product: str
    usage_page: int
    usage: int
    interface: int
    path: str

    @property
    def likely_aula(self) -> bool:
        text = f"{self.manufacturer} {self.product}".lower()
        return any(h in text for h in NAME_HINTS) or self.vendor_id in KNOWN_VENDOR_IDS

    @property
    def is_vendor_interface(self) -> bool:
        """Usage pages 0xFF00+ are vendor-defined; RGB/config commands normally go there."""
        return self.usage_page >= 0xFF00


def scan() -> tuple[list[HidDevice], str | None]:
    try:
        import hid  # type: ignore
    except ImportError:
        return [], "'hidapi' paketi kurulu değil. Kurmak için: pip install hidapi"
    try:
        raw = hid.enumerate()
    except Exception as exc:  # noqa: BLE001
        return [], f"HID cihazları okunamadı: {exc}"
    devices = [
        HidDevice(
            vendor_id=d.get("vendor_id", 0),
            product_id=d.get("product_id", 0),
            manufacturer=d.get("manufacturer_string") or "",
            product=d.get("product_string") or "",
            usage_page=d.get("usage_page", 0),
            usage=d.get("usage", 0),
            interface=d.get("interface_number", -1),
            path=(d.get("path") or b"").decode(errors="replace") if isinstance(d.get("path"), bytes) else str(d.get("path", "")),
        )
        for d in raw
    ]
    devices.sort(key=lambda d: (not d.likely_aula, d.vendor_id, d.product_id, d.interface))
    return devices, None
