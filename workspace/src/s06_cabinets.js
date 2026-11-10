/* ===== SECTION 6: CABINETS ===== */
var OUTY = PHYS.OUT_Y;

function wallSegs() {
  return [[22, 64, 22, OUTY], [22, 64, 60, 26], [60, 26, 420, 26], [420, 26, 458, 64], [458, 64, 458, OUTY]];
}
/* a pocket: two side walls with funnel bevels sloping into the mouth */
function pocketSegs(cx, top, depth, gap, bev) {
  var h = gap / 2;
  return [[cx - h, top, cx - h, top + depth], [cx + h, top, cx + h, top + depth],
          [cx - h - bev, top - bev * 0.9, cx - h, top], [cx + h + bev, top - bev * 0.9, cx + h, top]];
}
function blockedPin(x, y, keep, segs, clear) {
  var i;
  for (i = 0; i < keep.length; i++) {
    var k = keep[i];
    if (x >= k[0] && x <= k[2] && y >= k[1] && y <= k[3]) return true;
  }
  for (i = 0; i < segs.length; i++) if (segDist(x, y, segs[i]) < clear) return true;
  return false;
}
function gridPins(o) {
  var pins = [], r = 0, rng = mulberry32(o.seed || 1);
  for (var y = o.y0; y <= o.y1; y += o.sy, r++) {
    var off = (r % 2) ? o.sx / 2 : 0;
    for (var x = o.x0 + off; x <= o.x1; x += o.sx) {
      if (blockedPin(x, y, o.keep, o.segs, 15)) continue;
      pins.push([x + (rng() - 0.5) * 2 * o.jit, y + (rng() - 0.5) * 2 * o.jit]);
    }
  }
  return pins;
}
function armPins(x0, y0, x1, y1, gap) {
  var n = Math.max(1, Math.round(vlen(x1 - x0, y1 - y0) / gap)), out = [];
  for (var i = 0; i <= n; i++) out.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
  return out;
}
function mirrorPins(a) {
  var out = [];
  for (var i = 0; i < a.length; i++) out.push([PHYS.W - a[i][0], a[i][1]]);
  return out;
}
function channelPins() {
  var out = [];
  for (var i = 0, y = 212; y <= 520; y += 34, i++) {
    if (i % 2) out.push([428, y], [452, y]); else out.push([416, y], [440, y]);
  }
  return out;
}

/* ---- shared digi layout ---- */
function digiSegs() {
  return wallSegs().concat([
    [126, 186, 240, 152], [240, 152, 354, 186], [126, 186, 126, 300], [354, 186, 354, 300], [126, 300, 354, 300],
    [396, 172, 396, 592], [396, 168, 384, 182]
  ]).concat(pocketSegs(240, 584, 24, 28, 16), pocketSegs(118, 596, 22, 26, 14), pocketSegs(334, 596, 22, 26, 14));
}
function digiKeep(extra) {
  return [[112, 138, 370, 314], [160, 455, 320, 600], [86, 560, 152, 622], [300, 560, 366, 622], [378, 120, 462, 700]].concat(extra || []);
}
function digiPins(cab) {
  var g = cab.geo, segs = cab.segs;
  var pins = gridPins({x0: 38, x1: 372, y0: 124, y1: 548, sx: 26, sy: 24, jit: 1.1, seed: g.seed, keep: g.keep, segs: segs});
  var armL = armPins(g.arm[0], g.arm[1], 214, 556, 13);
  return pins.concat(armL, mirrorPins(armL), channelPins());
}
function digiFeat(extra) {
  var f = {attacker: {px: 398, py: 590, e0: [436, 600], e1: [398, 538], sensor: {x: 429, y: 616, w: 54, h: 20}}};
  for (var k in extra) f[k] = extra[k];
  return f;
}
function digiBase() {
  return {
    family: 'digi', variant: null,
    segs: digiSegs(), start: {x: 240, y: 604, w: 22, h: 14},
    pockets: [{x: 118, y: 608, w: 18, h: 14, pay: 1}, {x: 334, y: 608, w: 18, h: 14, pay: 1}],
    pins: digiPins,
    lcd: {theme: 'reel', rect: {x: 134, y: 166, w: 212, h: 130}, symbols: ['seven', 'bell', 'cherry', 'star', 'diamond', 'clover', 'crown', 'moon']}
  };
}
function mergeCab(base, over) {
  for (var k in over) base[k] = over[k];
  return base;
}

var CABS = [];

/* 1. retro-bell: tulips and a bell pocket, drums instead of a screen */
(function () {
  var tulips = [{x: 100, y: 300}, {x: 380, y: 300}, {x: 240, y: 380}, {x: 110, y: 470}, {x: 370, y: 470}];
  var segs = wallSegs().concat([[170, 160, 240, 140], [240, 140, 310, 160], [170, 160, 170, 212], [310, 160, 310, 212], [170, 212, 310, 212]],
    pocketSegs(240, 584, 24, 28, 16), pocketSegs(88, 596, 22, 26, 14), pocketSegs(392, 596, 22, 26, 14));
  var keep = [[150, 134, 330, 226], [170, 470, 310, 600], [60, 560, 118, 622], [362, 560, 424, 622]];
  for (var i = 0; i < tulips.length; i++) keep.push([tulips[i].x - 30, tulips[i].y - 30, tulips[i].x + 30, tulips[i].y + 22]);
  CABS.push({
    id: 'retro-bell', name: 'Retro Bell', era: '1962', family: 'tulip', variant: null, seed: 0x1A2B3C41, pre: 77,
    palette: 'retro', phys: {rest: 0.56, wallRest: 0.36, fric: 0.12, grav: 1},
    geo: {seed: 11, keep: keep, arm: [198, 504]}, segs: segs, nudge: [{x: 214, y: 556, dx: 2, dy: 0}, {x: 266, y: 556, dx: -2, dy: 0}],
    pins: function (cab) {
      var g = cab.geo, p = gridPins({x0: 36, x1: 444, y0: 124, y1: 548, sx: 28, sy: 26, jit: 1.2, seed: g.seed, keep: g.keep, segs: cab.segs});
      var a = armPins(g.arm[0], g.arm[1], 214, 556, 13);
      return p.concat(a, mirrorPins(a));
    },
    start: {x: 240, y: 604, w: 22, h: 14},
    pockets: [{x: 88, y: 608, w: 18, h: 14, pay: 1}, {x: 392, y: 608, w: 18, h: 14, pay: 1}],
    feat: {tulips: tulips},
    odds: {base: 0.012, kaku: 0.012, jitan: 0.012, reach: 0, superRate: 0, superHit: 0, kakuRate: 0},
    lcd: {theme: 'drum', rect: {x: 178, y: 164, w: 124, h: 44}, symbols: ['bell', 'cherry', 'star', 'seven', 'diamond', 'clover']},
    payout: {rounds: 3, balls: 8, perBall: 10, roundTime: 18, aim: 'any', startPay: 2, tulipPay: 1},
    difficulty: 1,
    tip: 'A ball in the bell pocket opens every tulip for two seconds. Shoot soft and keep them open.',
    blurb: 'Pure mechanics from 1962. The bell pocket opens the tulips, and a jackpot holds all five wide.'
  });
})();

/* 2. hanemono: clapping wings over a single start pocket, seven segment digits */
(function () {
  var segs = wallSegs().concat([[170, 160, 240, 140], [240, 140, 310, 160], [170, 160, 170, 212], [310, 160, 310, 212], [170, 212, 310, 212],
    [216, 556, 216, 592], [264, 556, 264, 592]], pocketSegs(100, 596, 22, 26, 14), pocketSegs(380, 596, 22, 26, 14));
  var keep = [[150, 134, 330, 226], [140, 410, 340, 600], [74, 560, 132, 622], [348, 560, 408, 622]];
  CABS.push({
    id: 'hanemono', name: 'Hanemono', era: '1981', family: 'wing', variant: null, seed: 0x2B3C4D52, pre: 133,
    palette: 'hane', phys: {rest: 0.52, wallRest: 0.34, fric: 0.13, grav: 1},
    geo: {seed: 23, keep: keep, arm: [168, 452]}, segs: segs, nudge: [{x: 190, y: 502, dx: 3, dy: 0}, {x: 290, y: 502, dx: 2, dy: 0}],
    pins: function (cab) {
      var g = cab.geo, p = gridPins({x0: 36, x1: 444, y0: 124, y1: 548, sx: 27, sy: 25, jit: 1.2, seed: g.seed, keep: g.keep, segs: cab.segs});
      var a = armPins(g.arm[0], g.arm[1], 190, 502, 13);
      return p.concat(a, mirrorPins(a));
    },
    start: {x: 240, y: 576, w: 40, h: 14},
    pockets: [{x: 100, y: 608, w: 18, h: 14, pay: 1}, {x: 380, y: 608, w: 18, h: 14, pay: 1}],
    feat: {wings: {x: 240, y: 556, dx: 24, len: 44, closed: 30, open: -62}},
    odds: {base: 0.012, kaku: 0.012, jitan: 0.012, reach: 0.10, superRate: 0, superHit: 0, kakuRate: 0},
    lcd: {theme: 'seg', rect: {x: 178, y: 164, w: 124, h: 44}, symbols: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']},
    payout: {rounds: 3, balls: 8, perBall: 12, roundTime: 14, aim: 'any', startPay: 3, tulipPay: 1},
    difficulty: 2,
    tip: 'The wings clap on a steady beat. Time shots so balls land just as they swing open.',
    blurb: 'A winged start pocket and a seven segment readout. A jackpot latches the wings open.'
  });
})();

/* 3. digi: the full reference implementation */
(function () {
  var c = mergeCab(digiBase(), {
    id: 'digi', name: 'Digi Reels', era: '1991', seed: 0x3C4D5E63, pre: 212,
    palette: 'digi', phys: {rest: 0.46, wallRest: 0.34, fric: 0.14, grav: 1},
    geo: {seed: 31, keep: digiKeep(), arm: [170, 468]}, nudge: [{x: 214, y: 556, dx: 1, dy: 0}, {x: 266, y: 556, dx: -1, dy: 0}],
    feat: digiFeat({}),
    odds: {base: 0.0145, kaku: 0.10, jitan: 0.0145, reach: 0.20, superRate: 0.30, superHit: 0.6, kakuRate: 0.5},
    payout: {rounds: 5, balls: 8, perBall: 6, roundTime: 16, aim: 'right', startPay: 4, tulipPay: 8},
    difficulty: 3,
    tip: 'After a hit the HOT lamp means high odds. During rounds the attacker only takes right shots.',
    blurb: 'The modern layout: LCD reels, reach, super reach, kakuhen and jitan, and a right side attacker.'
  });
  CABS.push(c);
})();

/* 4. senpuku: hidden favorable mode behind short two round hits */
(function () {
  var c = mergeCab(digiBase(), {
    id: 'senpuku', name: 'Senpuku', era: '2004', variant: 'senpuku', seed: 0x4D5E6F74, pre: 160,
    palette: 'senpuku', phys: {rest: 0.44, wallRest: 0.34, fric: 0.14, grav: 1},
    geo: {seed: 47, keep: digiKeep(), arm: [176, 468]}, nudge: [{x: 214, y: 556, dx: 2, dy: 0}, {x: 266, y: 556, dx: -3, dy: 0}],
    feat: digiFeat({}),
    odds: {base: 0.013, kaku: 0.09, jitan: 0.013, reach: 0.22, superRate: 0.3, superHit: 0.6, kakuRate: 0.30},
    senpuku: {p2R: 0.65, pHidden: 0.5},
    payout: {rounds: 10, balls: 7, perBall: 8, roundTime: 14, aim: 'right', startPay: 4, tulipPay: 8},
    difficulty: 4,
    tip: 'A short 2R hit can hide a favorable mode. Look for 2R near the top of the history and stay put.',
    blurb: 'Two round hits look like duds, but half of them secretly switch on high odds for 100 spins.'
  });
  c.lcd.symbols = ['seven', 'star', 'clover', 'moon', 'diamond', 'crown'];
  CABS.push(c);
})();

/* 5. battle: duel decides kakuhen or jitan, windmills punish strong left shots */
(function () {
  var fans = [{x: 78, y: 420, len: 17, spd: 2.4}, {x: 330, y: 420, len: 17, spd: -2.1}];
  var c = mergeCab(digiBase(), {
    id: 'battle', name: 'Battle Duel', era: '2012', variant: 'battle', seed: 0x5E6F7085, pre: 61,
    palette: 'battle', phys: {rest: 0.50, wallRest: 0.34, fric: 0.14, grav: 1},
    geo: {seed: 59, keep: digiKeep([[44, 386, 112, 454], [296, 386, 364, 454]]), arm: [172, 468]}, nudge: [{x: 214, y: 556, dx: -1, dy: 0}, {x: 266, y: 556, dx: -2, dy: 0}],
    feat: digiFeat({fans: fans}),
    odds: {base: 0.014, kaku: 0.10, jitan: 0.014, reach: 0.25, superRate: 0.4, superHit: 0.6, kakuRate: 0.5},
    duel: {win: 0.5},
    payout: {rounds: 4, balls: 10, perBall: 6, roundTime: 15, aim: 'right', startPay: 4, tulipPay: 8},
    difficulty: 4,
    tip: 'The duel after the rounds decides what comes next. Win for kakuhen, lose for jitan.',
    blurb: 'Reach turns into a duel on the LCD. Two windmills keep the field lively.'
  });
  c.lcd.symbols = ['seven', 'crown', 'star', 'diamond', 'moon', 'clover'];
  CABS.push(c);
})();

/* 6. kenrimono: ordered gates earn the right to a jackpot */
(function () {
  var gates = [{x: 74, y: 400, w: 22}, {x: 368, y: 392, w: 22}, {x: 116, y: 506, w: 22}];
  var gk = [];
  for (var i = 0; i < gates.length; i++) gk.push([gates[i].x - 26, gates[i].y - 14, gates[i].x + 26, gates[i].y + 14]);
  var c = mergeCab(digiBase(), {
    id: 'kenrimono', name: 'Kenrimono', era: '2019', variant: 'kenri', seed: 0x6F708196, pre: 304,
    palette: 'kenri', phys: {rest: 0.42, wallRest: 0.34, fric: 0.15, grav: 1},
    geo: {seed: 71, keep: digiKeep(gk), arm: [172, 468]}, nudge: [{x: 214, y: 556, dx: 1, dy: 0}, {x: 266, y: 556, dx: -1, dy: 0}],
    feat: digiFeat({gates: gates}),
    odds: {base: 0.0075, kaku: 0.05, jitan: 0.0075, reach: 0.18, superRate: 0.3, superHit: 0.6, kakuRate: 0.4, kenriRate: 0.6},
    payout: {rounds: 4, balls: 10, perBall: 10, roundTime: 16, aim: 'right', startPay: 4, tulipPay: 8},
    difficulty: 5,
    tip: 'Pass the gate lamps in order, 1 then 2 then 3. A wrong gate resets the chain. The right wins the next spin.',
    blurb: 'Completing the gate chain earns the right to a jackpot on the very next spin.'
  });
  c.lcd.symbols = ['seven', 'crown', 'diamond', 'star', 'moon', 'bell'];
  CABS.push(c);
})();

/* 7. smart: the 2023 ball-less cabinet. Balls still rattle inside, but nothing is paid
   out into a tray; the unit just counts. Rarer hits, far longer rushes. */
(function () {
  var c = mergeCab(digiBase(), {
    id: 'smart', name: 'Smart Rush', era: '2023', variant: 'smart', seed: 0x7A8B9CA7, pre: 418,
    palette: 'smart', phys: {rest: 0.40, wallRest: 0.32, fric: 0.16, grav: 1},
    geo: {seed: 89, keep: digiKeep(), arm: [180, 472]}, nudge: [{x: 214, y: 556, dx: 1, dy: 0}, {x: 266, y: 556, dx: -2, dy: 0}],
    feat: digiFeat({}),
    odds: {base: 0.0065, kaku: 0.055, jitan: 0.0065, reach: 0.26, superRate: 0.38, superHit: 0.7, kakuRate: 0.78},
    payout: {rounds: 7, balls: 8, perBall: 9, roundTime: 15, aim: 'right', startPay: 3, tulipPay: 8},
    ballless: true,
    difficulty: 5,
    tip: 'Hits are rare and the rush is long. Nothing drops into a tray; the unit just counts.',
    blurb: 'The 2023 cabinet that never pays a ball into your hands. Hard to start, and a rush that keeps going.'
  });
  c.lcd.symbols = ['seven', 'star', 'crown', 'diamond', 'moon', 'bell', 'clover'];
  CABS.push(c);
})();

function cabById(id) {
  for (var i = 0; i < CABS.length; i++) if (CABS[i].id === id) return CABS[i];
  return null;
}
