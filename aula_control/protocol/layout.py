"""AULA F75 key matrix. Indices match the LED and keymap tables (0-125)."""

from dataclasses import dataclass

MATRIX_LEN = 126


@dataclass(frozen=True)
class Key:
    index: int
    name: str
    label: str
    # Normalized rect in the official layout coordinate space (~640×290)
    x1: float
    y1: float
    x2: float
    y2: float


KEYS: list[Key] = [
    Key(0, "esc", "Esc", 30, 30, 55, 57),
    Key(12, "f1", "F1", 107, 30, 132, 57),
    Key(18, "f2", "F2", 144, 30, 169, 57),
    Key(24, "f3", "F3", 183, 30, 208, 57),
    Key(30, "f4", "F4", 222, 30, 247, 57),
    Key(36, "f5", "F5", 269, 30, 294, 57),
    Key(42, "f6", "F6", 305, 30, 330, 57),
    Key(48, "f7", "F7", 343, 30, 368, 57),
    Key(54, "f8", "F8", 388, 30, 413, 57),
    Key(60, "f9", "F9", 439, 30, 464, 57),
    Key(66, "f10", "F10", 477, 30, 502, 57),
    Key(72, "f11", "F11", 516, 30, 541, 57),
    Key(78, "f12", "F12", 555, 30, 580, 57),
    Key(1, "grave", "`", 31, 81, 56, 108),
    Key(7, "1", "1", 70, 81, 95, 108),
    Key(13, "2", "2", 108, 81, 133, 108),
    Key(19, "3", "3", 147, 81, 172, 108),
    Key(25, "4", "4", 184, 81, 209, 108),
    Key(31, "5", "5", 223, 81, 248, 108),
    Key(37, "6", "6", 262, 81, 287, 108),
    Key(43, "7", "7", 300, 81, 325, 108),
    Key(49, "8", "8", 338, 81, 363, 108),
    Key(55, "9", "9", 377, 81, 402, 108),
    Key(61, "0", "0", 416, 81, 441, 108),
    Key(67, "minus", "-", 453, 81, 478, 108),
    Key(73, "equal", "=", 491, 81, 516, 108),
    Key(79, "backspace", "Bksp", 531, 81, 591, 108),
    Key(85, "delete", "Del", 604, 81, 629, 108),
    Key(2, "tab", "Tab", 34, 120, 78, 147),
    Key(8, "q", "Q", 89, 119, 114, 146),
    Key(14, "w", "W", 127, 119, 152, 146),
    Key(20, "e", "E", 165, 119, 190, 146),
    Key(26, "r", "R", 204, 119, 229, 146),
    Key(32, "t", "T", 242, 119, 267, 146),
    Key(38, "y", "Y", 280, 119, 305, 146),
    Key(44, "u", "U", 318, 119, 343, 146),
    Key(50, "i", "I", 356, 119, 381, 146),
    Key(56, "o", "O", 395, 119, 420, 146),
    Key(62, "p", "P", 433, 119, 458, 146),
    Key(68, "lbracket", "[", 471, 119, 496, 146),
    Key(74, "rbracket", "]", 509, 119, 534, 146),
    Key(80, "backslash", "\\", 549, 119, 593, 146),
    Key(86, "pgup", "PgUp", 605, 120, 630, 147),
    Key(3, "capslock", "Caps", 33, 158, 85, 185),
    Key(9, "a", "A", 98, 158, 123, 185),
    Key(15, "s", "S", 136, 158, 161, 185),
    Key(21, "d", "D", 174, 158, 199, 185),
    Key(27, "f", "F", 213, 158, 238, 185),
    Key(33, "g", "G", 252, 158, 277, 185),
    Key(39, "h", "H", 290, 158, 315, 185),
    Key(45, "j", "J", 327, 158, 352, 185),
    Key(51, "k", "K", 366, 158, 391, 185),
    Key(57, "l", "L", 405, 158, 430, 185),
    Key(63, "semicolon", ";", 443, 158, 468, 185),
    Key(69, "quote", "'", 481, 158, 506, 185),
    Key(81, "enter", "Enter", 521, 158, 591, 185),
    Key(87, "pgdn", "PgDn", 604, 159, 629, 186),
    Key(4, "lshift", "Shift", 33, 195, 105, 222),
    Key(10, "z", "Z", 116, 195, 141, 222),
    Key(16, "x", "X", 155, 195, 180, 222),
    Key(22, "c", "C", 193, 195, 218, 222),
    Key(28, "v", "V", 232, 195, 257, 222),
    Key(34, "b", "B", 270, 195, 295, 222),
    Key(40, "n", "N", 309, 195, 334, 222),
    Key(46, "m", "M", 347, 195, 372, 222),
    Key(52, "comma", ",", 384, 195, 409, 222),
    Key(58, "period", ".", 424, 195, 449, 222),
    Key(64, "slash", "/", 463, 195, 488, 222),
    Key(70, "rshift", "Shift", 502, 195, 558, 222),
    Key(82, "up", "↑", 567, 195, 592, 222),
    Key(88, "end", "End", 605, 195, 630, 222),
    Key(5, "lctrl", "Ctrl", 34, 234, 69, 261),
    Key(11, "lwin", "Win", 79, 234, 114, 261),
    Key(17, "lalt", "Alt", 122, 234, 157, 261),
    Key(35, "space", "Space", 174, 234, 400, 261),
    Key(53, "ralt", "Alt", 414, 234, 449, 261),
    Key(59, "fn", "Fn", 463, 234, 497, 261),
    Key(77, "left", "←", 529, 234, 554, 261),
    Key(83, "down", "↓", 568, 234, 593, 261),
    Key(89, "right", "→", 605, 234, 630, 261),
]

BY_INDEX = {k.index: k for k in KEYS}
BY_NAME = {k.name: k for k in KEYS}
LAYOUT_W, LAYOUT_H = 640.0, 290.0

# USB HID usage for simple remaps (type 0 keymap entries)
HID = {
    **{chr(ord("a") + i): 0x04 + i for i in range(26)},
    **{str(i): 0x1E + i - 1 for i in range(1, 10)},
    "0": 0x27,
    "enter": 0x28,
    "esc": 0x29,
    "backspace": 0x2A,
    "tab": 0x2B,
    "space": 0x2C,
    "minus": 0x2D,
    "equal": 0x2E,
    "lbracket": 0x2F,
    "rbracket": 0x30,
    "backslash": 0x31,
    "semicolon": 0x33,
    "quote": 0x34,
    "grave": 0x35,
    "comma": 0x36,
    "period": 0x37,
    "slash": 0x38,
    "capslock": 0x39,
    **{f"f{i}": 0x3A + i - 1 for i in range(1, 13)},
    "delete": 0x4C,
    "end": 0x4D,
    "pgdn": 0x4E,
    "pgup": 0x4B,
    "right": 0x4F,
    "left": 0x50,
    "down": 0x51,
    "up": 0x52,
}

MODIFIERS = {
    "lctrl": 0x01,
    "lshift": 0x02,
    "lalt": 0x04,
    "lwin": 0x08,
    "rctrl": 0x10,
    "rshift": 0x20,
    "ralt": 0x40,
    "rwin": 0x80,
}
