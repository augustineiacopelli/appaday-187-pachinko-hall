/* ===== SECTION 1: CONSTANTS ===== */
'use strict';
var APP = {id: 187, slug: 'pachinko-hall', title: 'Pachinko Hall', key: 'appaday.187.state', version: 2};
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
/* the upper tray, kept inside the band that stays visible when a short screen crops the board */
var TRAY = {x: 96, y: 660, w: 326, h: 36};

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
  kenri:   {plate: 0x13284f, plate2: 0x0c1a36, frame: 0x090f1d, trim: 0xc8d3e8, glow: 0x6aa9ff, lcdBg: 0x050b18, lcdFg: 0xdbe8ff, hot: 0xffd166},
  smart:   {plate: 0x15171c, plate2: 0x0d0f13, frame: 0x050608, trim: 0xe8eef7, glow: 0x00e5d0, lcdBg: 0x000a0c, lcdFg: 0xd8fffb, hot: 0x00ffd5}
};

/* ---- the parlour economy ----
   Balls are rented, never bought: they belong to the hall. A good run means you stop
   renting and play off the tray. On the way out the counter tallies the tray and the
   three shop system turns the surplus into cash without the hall ever paying it. */
var ECON = {
  startYen: 10000,
  rates: [4, 1],              /* yen per ball, the two island rates */
  bill: 1000,                 /* one note at a time, as the card reader takes it */
  lend: 3000,                 /* the hall stakes you when the wallet is empty */
  specialBalls: 400,          /* balls per special prize at the 4 yen rate */
  specialYen: 1500,           /* what the window off the premises pays for one */
  trayCap: 99999
};
/* 400 balls cost 1600 yen to rent and come back as 1500. That gap is the whole business. */
ECON.exchangeYen = function (balls, rate) {
  return Math.floor(balls / ECON.specialBalls) * Math.round(ECON.specialYen * rate / 4);
};

/* general prizes: the shelf behind the counter, taken home rather than cashed */
var PRIZES = [
  {id: 'caramel', name: 'Box of caramels', cost: 50, icon: 'box'},
  {id: 'pen', name: 'Ballpoint pen', cost: 90, icon: 'pen'},
  {id: 'lighter', name: 'Cigarette lighter', cost: 150, icon: 'flame'},
  {id: 'senbei', name: 'Tin of rice crackers', cost: 260, icon: 'disc'},
  {id: 'ramen', name: 'Case of instant ramen', cost: 420, icon: 'bowl'},
  {id: 'bear', name: 'Plush bear', cost: 700, icon: 'bear'},
  {id: 'clock', name: 'Wall clock', cost: 1200, icon: 'clock'},
  {id: 'kettle', name: 'Electric kettle', cost: 2000, icon: 'kettle'},
  {id: 'cooker', name: 'Rice cooker', cost: 3500, icon: 'cooker'},
  {id: 'handheld', name: 'Handheld console', cost: 6000, icon: 'console'},
  {id: 'tv', name: 'Flat screen television', cost: 12000, icon: 'tv'},
  {id: 'bar', name: 'Cased gold bar', cost: 25000, icon: 'bar'}
];

/* commemorative plaques: the wall by the door */
var PLAQUES = [
  {id: 'firstspin', name: 'First Handle', note: 'Spin a machine for the first time.'},
  {id: 'firsthit', name: 'First Blood', note: 'Land your first jackpot.'},
  {id: 'kakuhen', name: 'Probability Change', note: 'Reach kakuhen.'},
  {id: 'streak', name: 'On a Run', note: 'Three jackpots without leaving the seat.'},
  {id: 'slip', name: 'One Off', note: 'Survive a reach that lands one symbol short.'},
  {id: 'gates', name: 'Gatekeeper', note: 'Complete the Kenrimono chain.'},
  {id: 'duel', name: 'Duelist', note: 'Win a Battle Duel.'},
  {id: 'hidden', name: 'Hidden Truth', note: 'Hit while Senpuku is secretly running hot.'},
  {id: 'patience', name: 'Long Sit', note: 'Pass 250 spins on one machine without a hit.'},
  {id: 'tour', name: 'Grand Tour', note: 'Play every cabinet in the hall.'},
  {id: 'heavy', name: 'Heavy Tray', note: 'Hold 2,000 balls at once.'},
  {id: 'cashout', name: 'Around the Corner', note: 'Take a special prize to the window.'},
  {id: 'collector', name: 'Shelf Raider', note: 'Claim six different prizes.'},
  {id: 'whale', name: 'Cased in Gold', note: 'Claim the top prize on the shelf.'}
];

function hex6(n) {
  var s = (n >>> 0).toString(16);
  while (s.length < 6) s = '0' + s;
  return '#' + s;
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
