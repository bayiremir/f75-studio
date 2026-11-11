// AULA F75 key layout. Rects come from the official driver's KB.ini (679x284 canvas),
// `led` is the matrix index used by the per-key table and the real-time frames
// (led = column * 6 + row). On hardware 53 = right Alt and 59 = Fn.

export interface KeyDef {
  id: string;
  label: string;
  led: number;
  rect: [number, number, number, number];
}

export interface Key extends KeyDef {
  /** 0..1 across the key area */
  x: number;
  y: number;
  /** physical centre in canvas units */
  cx: number;
  cy: number;
  w: number;
  h: number;
  row: number;
  /** 0..1 distance from the board centre (max ~1 at the corners) */
  dist: number;
  /** angle around the board centre, -PI..PI */
  angle: number;
  index: number;
}

export const CANVAS_W = 679;
export const CANVAS_H = 284;
export const LED_COUNT = 126;

const DEFS: KeyDef[] = [
  { id: 'esc', label: 'Esc', led: 0, rect: [30, 30, 55, 57] },
  { id: 'f1', label: 'F1', led: 12, rect: [107, 30, 132, 57] },
  { id: 'f2', label: 'F2', led: 18, rect: [144, 30, 169, 57] },
  { id: 'f3', label: 'F3', led: 24, rect: [183, 30, 208, 57] },
  { id: 'f4', label: 'F4', led: 30, rect: [222, 30, 247, 57] },
  { id: 'f5', label: 'F5', led: 36, rect: [269, 30, 294, 57] },
  { id: 'f6', label: 'F6', led: 42, rect: [305, 30, 330, 57] },
  { id: 'f7', label: 'F7', led: 48, rect: [343, 30, 368, 57] },
  { id: 'f8', label: 'F8', led: 54, rect: [388, 30, 413, 57] },
  { id: 'f9', label: 'F9', led: 60, rect: [439, 30, 464, 57] },
  { id: 'f10', label: 'F10', led: 66, rect: [477, 30, 502, 57] },
  { id: 'f11', label: 'F11', led: 72, rect: [516, 30, 541, 57] },
  { id: 'f12', label: 'F12', led: 78, rect: [555, 30, 580, 57] },
  { id: 'grave', label: '`', led: 1, rect: [31, 81, 56, 108] },
  { id: '1', label: '1', led: 7, rect: [70, 81, 95, 108] },
  { id: '2', label: '2', led: 13, rect: [108, 81, 133, 108] },
  { id: '3', label: '3', led: 19, rect: [147, 81, 172, 108] },
  { id: '4', label: '4', led: 25, rect: [184, 81, 209, 108] },
  { id: '5', label: '5', led: 31, rect: [223, 81, 248, 108] },
  { id: '6', label: '6', led: 37, rect: [262, 81, 287, 108] },
  { id: '7', label: '7', led: 43, rect: [300, 81, 325, 108] },
  { id: '8', label: '8', led: 49, rect: [338, 81, 363, 108] },
  { id: '9', label: '9', led: 55, rect: [377, 81, 402, 108] },
  { id: '0', label: '0', led: 61, rect: [416, 81, 441, 108] },
  { id: 'minus', label: '-', led: 67, rect: [453, 81, 478, 108] },
  { id: 'equal', label: '=', led: 73, rect: [491, 81, 516, 108] },
  { id: 'backspace', label: 'Backspace', led: 79, rect: [531, 81, 591, 108] },
  { id: 'delete', label: 'Del', led: 85, rect: [604, 81, 629, 108] },
  { id: 'tab', label: 'Tab', led: 2, rect: [34, 120, 78, 147] },
  { id: 'q', label: 'Q', led: 8, rect: [89, 119, 114, 146] },
  { id: 'w', label: 'W', led: 14, rect: [127, 119, 152, 146] },
  { id: 'e', label: 'E', led: 20, rect: [165, 119, 190, 146] },
  { id: 'r', label: 'R', led: 26, rect: [204, 119, 229, 146] },
  { id: 't', label: 'T', led: 32, rect: [242, 119, 267, 146] },
  { id: 'y', label: 'Y', led: 38, rect: [280, 119, 305, 146] },
  { id: 'u', label: 'U', led: 44, rect: [318, 119, 343, 146] },
  { id: 'i', label: 'I', led: 50, rect: [356, 119, 381, 146] },
  { id: 'o', label: 'O', led: 56, rect: [395, 119, 420, 146] },
  { id: 'p', label: 'P', led: 62, rect: [433, 119, 458, 146] },
  { id: 'lbracket', label: '[', led: 68, rect: [471, 119, 496, 146] },
  { id: 'rbracket', label: ']', led: 74, rect: [509, 119, 534, 146] },
  { id: 'backslash', label: '\\', led: 80, rect: [549, 119, 593, 146] },
  { id: 'pgup', label: 'PgUp', led: 86, rect: [605, 120, 630, 147] },
  { id: 'capslock', label: 'Caps', led: 3, rect: [33, 158, 85, 185] },
  { id: 'a', label: 'A', led: 9, rect: [98, 158, 123, 185] },
  { id: 's', label: 'S', led: 15, rect: [136, 158, 161, 185] },
  { id: 'd', label: 'D', led: 21, rect: [174, 158, 199, 185] },
  { id: 'f', label: 'F', led: 27, rect: [213, 158, 238, 185] },
  { id: 'g', label: 'G', led: 33, rect: [252, 158, 277, 185] },
  { id: 'h', label: 'H', led: 39, rect: [290, 158, 315, 185] },
  { id: 'j', label: 'J', led: 45, rect: [327, 158, 352, 185] },
  { id: 'k', label: 'K', led: 51, rect: [366, 158, 391, 185] },
  { id: 'l', label: 'L', led: 57, rect: [405, 158, 430, 185] },
  { id: 'semicolon', label: ';', led: 63, rect: [443, 158, 468, 185] },
  { id: 'quote', label: "'", led: 69, rect: [481, 158, 506, 185] },
  { id: 'enter', label: 'Enter', led: 81, rect: [521, 158, 591, 185] },
  { id: 'pgdn', label: 'PgDn', led: 87, rect: [604, 159, 629, 186] },
  { id: 'lshift', label: 'Shift', led: 4, rect: [33, 195, 105, 222] },
  { id: 'z', label: 'Z', led: 10, rect: [116, 195, 141, 222] },
  { id: 'x', label: 'X', led: 16, rect: [155, 195, 180, 222] },
  { id: 'c', label: 'C', led: 22, rect: [193, 195, 218, 222] },
  { id: 'v', label: 'V', led: 28, rect: [232, 195, 257, 222] },
  { id: 'b', label: 'B', led: 34, rect: [270, 195, 295, 222] },
  { id: 'n', label: 'N', led: 40, rect: [309, 195, 334, 222] },
  { id: 'm', label: 'M', led: 46, rect: [347, 195, 372, 222] },
  { id: 'comma', label: ',', led: 52, rect: [384, 195, 409, 222] },
  { id: 'period', label: '.', led: 58, rect: [424, 195, 449, 222] },
  { id: 'slash', label: '/', led: 64, rect: [463, 195, 488, 222] },
  { id: 'rshift', label: 'Shift', led: 70, rect: [502, 195, 558, 222] },
  { id: 'up', label: '↑', led: 82, rect: [567, 195, 592, 222] },
  { id: 'end', label: 'End', led: 88, rect: [605, 195, 630, 222] },
  { id: 'lctrl', label: 'Ctrl', led: 5, rect: [34, 234, 69, 261] },
  { id: 'lwin', label: 'Win', led: 11, rect: [79, 234, 114, 261] },
  { id: 'lalt', label: 'Alt', led: 17, rect: [122, 234, 157, 261] },
  { id: 'space', label: '', led: 35, rect: [174, 234, 400, 261] },
  { id: 'ralt', label: 'Alt', led: 53, rect: [414, 234, 449, 261] },
  { id: 'fn', label: 'Fn', led: 59, rect: [463, 234, 497, 261] },
  { id: 'left', label: '←', led: 77, rect: [529, 234, 554, 261] },
  { id: 'down', label: '↓', led: 83, rect: [568, 234, 593, 261] },
  { id: 'right', label: '→', led: 89, rect: [605, 234, 630, 261] },
];

const MIN_X = 30, MAX_X = 630, MIN_Y = 30, MAX_Y = 262;
const ROW_Y = [43, 94, 133, 172, 209, 248];

export const KEYS: Key[] = DEFS.map((d, index) => {
  const [x1, y1, x2, y2] = d.rect;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const x = (cx - MIN_X) / (MAX_X - MIN_X);
  const y = (cy - MIN_Y) / (MAX_Y - MIN_Y);
  let row = 0;
  let best = Infinity;
  ROW_Y.forEach((ry, i) => {
    const dd = Math.abs(ry - cy);
    if (dd < best) { best = dd; row = i; }
  });
  // aspect-correct distance from the centre (board is ~2.6x wider than tall)
  const dx = (x - 0.5) * 2;
  const dy = ((y - 0.5) * 2) / 2.6;
  return {
    ...d, cx, cy, w: x2 - x1, h: y2 - y1, x, y, row, index,
    dist: Math.min(1, Math.hypot(dx, dy) / Math.hypot(1, 1 / 2.6)),
    angle: Math.atan2(dy, dx),
  };
});

export const KEY_BY_ID = new Map(KEYS.map((k) => [k.id, k]));
export const KEY_BY_LED = new Map(KEYS.map((k) => [k.led, k]));
export const ROWS = 6;
export const KNOB = { cx: 655, cy: 43, r: 15 };
/** Aspect ratio of the key area, used to convert x/y distances into physical ones. */
export const ASPECT = (MAX_X - MIN_X) / (MAX_Y - MIN_Y);

/** Physical distance between two points given in normalized x/y (units of board height). */
export function pdist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot((x1 - x2) * ASPECT, y1 - y2);
}

/** Keys on the outer ring of the board, in clockwise order (for perimeter effects). */
export const PERIMETER: Key[] = (() => {
  const top = KEYS.filter((k) => k.row === 0).sort((a, b) => a.cx - b.cx);
  const bottom = KEYS.filter((k) => k.row === 5).sort((a, b) => b.cx - a.cx);
  const right = KEYS.filter((k) => k.row > 0 && k.row < 5 && k.x > 0.95).sort((a, b) => a.cy - b.cy);
  const left = KEYS.filter((k) => k.row > 0 && k.row < 5 && k.x < 0.05).sort((a, b) => b.cy - a.cy);
  return [...top, ...right, ...bottom, ...left];
})();

/** Grid used by cellular effects: columns of ~one key width. */
export const GRID_COLS = 16;
export function gridCell(k: Key): [number, number] {
  return [Math.min(GRID_COLS - 1, Math.floor(k.x * GRID_COLS)), k.row];
}
