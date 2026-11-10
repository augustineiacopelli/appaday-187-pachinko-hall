/* ===== SECTION 1: CONSTANTS ===== */
'use strict';
var APP = {id: 187, slug: 'pachinko-hall', title: 'Pachinko Hall', key: 'appaday.187.state', version: 1};
var ACCENT = '#276EB7';
var ACCENT_N = 0x276EB7;
var PHYS = {
  DT: 1 / 240, SUBSTEPS: 4, MAX_BALLS: 28,
  GRAV: 1500, DRAG: 0.10, BALL_R: 5.2, PIN_R: 2.6,
  W: 480, H: 770, WALL_L: 22, WALL_R: 458, TOP: 26, OUT_Y: 654,
  LAUNCH_CD: 0.30, STUCK_T: 0.7, HOLD_MAX: 4, JITAN_SPINS: 100
};
PHYS.SUB_DT = PHYS.DT / PHYS.SUBSTEPS;
/* per substep travel stays under 0.8 of the pin radius, so a ball cannot skip across a pin */
PHYS.VMAX = 0.8 * PHYS.PIN_R / PHYS.SUB_DT;
var MAX_BALLS = PHYS.MAX_BALLS;

/* rail paths and launch tuning for the two streams (world units) */
var STREAMS = {
  L: {ex: 64, ey: 46, T: 0.30, vmin: 260, vmax: 820, path: [[11, 760], [11, 40], [30, 12], [64, 8], [64, 46]]},
  R: {ex: 290, ey: 46, T: 0.44, vmin: 300, vmax: 620, path: [[11, 760], [11, 40], [30, 12], [100, 8], [260, 8], [290, 12], [290, 46]]}
};

var PALETTES = {
  retro:   {plate: 0x7a1f26, plate2: 0x5d171d, frame: 0x2a1a12, trim: 0xe0b050, glow: 0xffd27a, lcdBg: 0xf3e7c9, lcdFg: 0x2a1a12, hot: 0xffe08a},
  hane:    {plate: 0x0f5a5c, plate2: 0x0b4345, frame: 0x1b1b1f, trim: 0xff9a3c, glow: 0xffc27a, lcdBg: 0x061a18, lcdFg: 0xff5a3c, hot: 0xffb347},
  digi:    {plate: 0x2a1e5c, plate2: 0x1c1442, frame: 0x0e0b20, trim: 0x7fe8ff, glow: 0x59d8ff, lcdBg: 0x07051a, lcdFg: 0xe9f6ff, hot: 0xff6bd6},
  senpuku: {plate: 0x0f3d2e, plate2: 0x0a2a20, frame: 0x08130f, trim: 0xd9b862, glow: 0x7affc1, lcdBg: 0x04120d, lcdFg: 0xe6f5d6, hot: 0xd9ff8a},
  battle:  {plate: 0x5c1224, plate2: 0x3d0b18, frame: 0x14090d, trim: 0xb9c2d0, glow: 0xff5a6e, lcdBg: 0x12060a, lcdFg: 0xffe3e6, hot: 0xff9d5c},
  kenri:   {plate: 0x13284f, plate2: 0x0c1a36, frame: 0x090f1d, trim: 0xc8d3e8, glow: 0x6aa9ff, lcdBg: 0x050b18, lcdFg: 0xdbe8ff, hot: 0xffd166}
};

function hex6(n) {
  var s = (n >>> 0).toString(16);
  while (s.length < 6) s = '0' + s;
  return '#' + s;
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
