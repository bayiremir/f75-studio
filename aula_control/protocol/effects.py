"""Firmware effect IDs verified on the AULA F75 (wireless)."""

EFFECT_OFF = 0
EFFECT_PER_KEY = 32

# (firmware id, display name) — hardware-verified set for the F75
EFFECTS: list[tuple[int, str]] = [
    (1, "Fixed on"),
    (2, "Respire"),
    (3, "Rainbow"),
    (4, "Flash away"),
    (5, "Raindrops"),
    (6, "Rainbow wheel"),
    (7, "Ripples shining"),
    (8, "Stars twinkle"),
    (10, "Retro snake"),
    (11, "Neon stream"),
    (12, "Reaction"),
    (13, "Sine wave"),
    (15, "Rotating windmill"),
    (16, "Colorful waterfall"),
    (17, "Blossoming"),
    (EFFECT_PER_KEY, "Per-key (custom)"),
    (EFFECT_OFF, "Off"),
]

COLOURS = [
    ("Red", 0),
    ("Green", 1),
    ("Blue", 2),
    ("Yellow", 3),
    ("Magenta", 4),
    ("Cyan", 5),
    ("White", 6),
    ("Random", 7),
]

COLOUR_RGB = {
    0: (255, 60, 60),
    1: (60, 220, 80),
    2: (60, 120, 255),
    3: (255, 220, 60),
    4: (220, 60, 220),
    5: (60, 220, 220),
    6: (240, 240, 240),
    7: (180, 120, 255),
}
