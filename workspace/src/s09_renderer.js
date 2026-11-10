/* ===== SECTION 9: RENDERER ===== */
var Tex = {ball: null, pin: null, glow: null};

function mkCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function bakeTextures() {
  if (Tex.ball) return;
  /* chrome ball: radial gradient, the highlight rides as a separate sprite */
  var c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(26, 24, 3, 32, 32, 31);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#dfe5ee'); gr.addColorStop(0.7, '#8a95a6'); gr.addColorStop(1, '#2a313c');
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.stroke();
  Tex.ball = PIXI.Texture.from(c);
  /* brass pin with a specular dot */
  c = mkCanvas(32, 32); g = c.getContext('2d');
  gr = g.createRadialGradient(13, 12, 1, 16, 16, 15);
  gr.addColorStop(0, '#fff4c8'); gr.addColorStop(0.5, '#d9a63c'); gr.addColorStop(1, '#6b4a12');
  g.fillStyle = gr; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(11, 10, 3, 0, Math.PI * 2); g.fill();
  Tex.pin = PIXI.Texture.from(c);
  /* soft glow disc */
  c = mkCanvas(64, 64); g = c.getContext('2d');
  gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  Tex.glow = PIXI.Texture.from(c);
}

function setFill(t, c) {
  if (t._fc !== c) { t._fc = c; t.style.fill = c; }
}
function mixColor(a, b, t) {
  var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
}

/* ---- LCD symbols, drawn as vectors ---- */
var SYM_COL = {seven: 0xff3b4a, bell: 0xffc533, cherry: 0xff4d6a, star: 0xffe14d, diamond: 0x4de0ff, clover: 0x4dff9a, crown: 0xffb830, moon: 0xdfe8ff};
var SEG_ON = {
  0: [1, 1, 1, 0, 1, 1, 1], 1: [0, 0, 1, 0, 0, 1, 0], 2: [1, 0, 1, 1, 1, 0, 1], 3: [1, 0, 1, 1, 0, 1, 1], 4: [0, 1, 1, 1, 0, 1, 0],
  5: [1, 1, 0, 1, 0, 1, 1], 6: [1, 1, 0, 1, 1, 1, 1], 7: [1, 0, 1, 0, 0, 1, 0], 8: [1, 1, 1, 1, 1, 1, 1], 9: [1, 1, 1, 1, 0, 1, 1]
};
function drawDigit(g, x, y, s, col, d) {
  var on = SEG_ON[d], w = s * 0.5, h = s * 0.5, t = s * 0.12, x0 = x - w / 2, y0 = y - h;
  var rects = [[x0 + t, y0, w - 2 * t, t], [x0, y0 + t, t, h - t], [x0 + w - t, y0 + t, t, h - t], [x0 + t, y0 + h - t / 2, w - 2 * t, t],
               [x0, y0 + h + t / 2, t, h - t], [x0 + w - t, y0 + h + t / 2, t, h - t], [x0 + t, y0 + 2 * h - t, w - 2 * t, t]];
  for (var i = 0; i < 7; i++) g.rect(rects[i][0], rects[i][1], rects[i][2], rects[i][3]).fill({color: col, alpha: on[i] ? 1 : 0.1});
}
function starPts(x, y, r) {
  var p = [];
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2) ? r * 0.45 : r;
    p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  return p;
}
function drawSymbol(g, id, x, y, s, bg, mono) {
  var c = mono || SYM_COL[id] || 0xffffff;
  if (id.charAt(0) === 'd' && id.length === 2) { drawDigit(g, x, y, s, c, +id.charAt(1)); return; }
  switch (id) {
    case 'seven':
      g.poly([x - s * 0.42, y - s * 0.46, x + s * 0.42, y - s * 0.46, x + s * 0.42, y - s * 0.32, x - s * 0.04, y + s * 0.5, x - s * 0.3, y + s * 0.5, x + s * 0.14, y - s * 0.22, x - s * 0.42, y - s * 0.22]).fill(c);
      break;
    case 'bell':
      g.moveTo(x - s * 0.36, y + s * 0.3).quadraticCurveTo(x - s * 0.36, y - s * 0.5, x, y - s * 0.5).quadraticCurveTo(x + s * 0.36, y - s * 0.5, x + s * 0.36, y + s * 0.3).lineTo(x + s * 0.48, y + s * 0.38).lineTo(x - s * 0.48, y + s * 0.38).closePath().fill(c);
      g.circle(x, y + s * 0.5, s * 0.1).fill(c);
      break;
    case 'cherry':
      g.circle(x - s * 0.22, y + s * 0.28, s * 0.22).fill(c); g.circle(x + s * 0.24, y + s * 0.22, s * 0.22).fill(c);
      g.moveTo(x - s * 0.22, y + s * 0.08).lineTo(x + s * 0.04, y - s * 0.46).lineTo(x + s * 0.24, y + s * 0.02).stroke({width: Math.max(1.5, s * 0.07), color: mono || 0x4dc46a});
      break;
    case 'star': g.poly(starPts(x, y, s * 0.52)).fill(c); break;
    case 'diamond': g.poly([x, y - s * 0.52, x + s * 0.38, y, x, y + s * 0.52, x - s * 0.38, y]).fill(c); break;
    case 'clover':
      g.circle(x, y - s * 0.2, s * 0.2).fill(c); g.circle(x - s * 0.2, y + s * 0.08, s * 0.2).fill(c); g.circle(x + s * 0.2, y + s * 0.08, s * 0.2).fill(c);
      g.moveTo(x, y + s * 0.05).lineTo(x - s * 0.06, y + s * 0.5).stroke({width: Math.max(1.5, s * 0.07), color: c});
      break;
    case 'crown':
      g.poly([x - s * 0.5, y + s * 0.4, x - s * 0.5, y - s * 0.3, x - s * 0.24, y + s * 0.02, x, y - s * 0.46, x + s * 0.24, y + s * 0.02, x + s * 0.5, y - s * 0.3, x + s * 0.5, y + s * 0.4]).fill(c);
      break;
    case 'moon':
      g.circle(x, y, s * 0.42).fill(c); g.circle(x + s * 0.2, y - s * 0.1, s * 0.36).fill(bg);
      break;
    default: g.circle(x, y, s * 0.3).fill(c);
  }
}

/* ---- the cabinet view ---- */
function RView(app, cab, world, machine, settings) {
  this.app = app; this.cab = cab; this.world = world; this.m = machine; this.settings = settings;
  this.pal = PALETTES[cab.palette];
  this.t = 0; this.w = 100; this.h = 100; this.sparkBudget = 0;
  this.aim = {stream: 'L', power: 0.5, show: true};
  this.root = new PIXI.Container();
  app.stage.addChild(this.root);
  var L = this.L = {};
  var names = ['plastics', 'pins', 'features', 'balls', 'glow', 'lcd', 'fx', 'ui'];
  for (var i = 0; i < names.length; i++) { L[names[i]] = new PIXI.Container(); this.root.addChild(L[names[i]]); }
  this.baseX = this.root.x; this.baseY = this.root.y; this.scale = 1;
  this.buildPlastics(); this.buildPins(); this.buildFeatures(); this.buildBalls(); this.buildGlow();
  this.buildLcd(); this.buildFx(); this.buildTray(); this.buildUi();
  this.applyEffects();
}
RView.prototype.applyEffects = function () {
  var red = !!this.settings.reduced;
  this.L.glow.filters = red ? [] : [new PIXI.BlurFilter({strength: 4, quality: 2})];
  this.L.glow.alpha = red ? 0.5 : 1;
};
RView.prototype.buildPlastics = function () {
  var P = PHYS, pal = this.pal, cab = this.cab, g = new PIXI.Graphics(), i;
  g.roundRect(-16, -16, P.W + 32, P.H + 32, 22).fill(pal.frame);
  g.roundRect(-6, -6, P.W + 12, P.H + 12, 14).fill(mixColor(pal.frame, pal.plate2, 0.5));
  g.rect(0, 0, P.W, P.H).fill(pal.plate2);
  g.poly([P.WALL_L, 64, 60, P.TOP, 420, P.TOP, P.WALL_R, 64, P.WALL_R, P.OUT_Y, P.WALL_L, P.OUT_Y]).fill(pal.plate);
  /* quiet decoration per cabinet */
  var tr = pal.trim, gl = pal.glow;
  if (cab.id === 'retro-bell') {
    for (i = 1; i <= 3; i++) g.circle(240, 400, 60 + i * 44).stroke({width: 3, color: tr, alpha: 0.08});
    for (i = 0; i < 9; i++) g.rect(40 + i * 50, 120, 14, 480).fill({color: tr, alpha: 0.035});
  } else if (cab.id === 'hanemono') {
    for (i = -6; i < 14; i++) g.moveTo(i * 60, 80).lineTo(i * 60 + 300, 620).stroke({width: 10, color: tr, alpha: 0.05});
  } else if (cab.id === 'digi') {
    for (i = 0; i < 12; i++) g.moveTo(26, 320 + i * 26).lineTo(392, 320 + i * 26).stroke({width: 1.5, color: gl, alpha: 0.10});
  } else if (cab.id === 'senpuku') {
    for (i = 1; i <= 4; i++) g.circle(240, 232, 80 + i * 36).stroke({width: 2, color: gl, alpha: 0.10});
  } else if (cab.id === 'battle') {
    g.moveTo(40, 120).lineTo(380, 620).stroke({width: 14, color: gl, alpha: 0.06});
    g.moveTo(380, 120).lineTo(40, 620).stroke({width: 14, color: gl, alpha: 0.06});
  } else {
    for (i = 0; i < 9; i++) g.moveTo(26 + i * 46, 100).lineTo(26 + i * 46, 640).stroke({width: 1, color: gl, alpha: 0.09});
    for (i = 0; i < 12; i++) g.moveTo(26, 120 + i * 46).lineTo(392, 120 + i * 46).stroke({width: 1, color: gl, alpha: 0.09});
  }
  /* tray under the field */
  g.rect(0, P.OUT_Y, P.W, P.H - P.OUT_Y).fill(0x0a0d13);
  g.moveTo(0, P.OUT_Y).lineTo(P.W, P.OUT_Y).stroke({width: 3, color: tr, alpha: 0.9});
  g.rect(0, P.OUT_Y + 3, P.W, 14).fill({color: 0x000000, alpha: 0.35});
  /* launch rails */
  var st = ['L', 'R'];
  for (var s = 0; s < 2; s++) {
    var p = STREAMS[st[s]].path;
    g.moveTo(p[0][0], p[0][1]);
    for (i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    g.stroke({width: 13, color: 0x11161f, alpha: 1, cap: 'round', join: 'round'});
  }
  for (s = 0; s < 2; s++) {
    var q = STREAMS[st[s]].path;
    g.moveTo(q[0][0], q[0][1]);
    for (i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]);
    g.stroke({width: 3, color: 0x4b586d, alpha: 0.9, cap: 'round', join: 'round'});
  }
  /* guides and walls */
  for (i = 0; i < cab.segs.length; i++) {
    var sg = cab.segs[i];
    g.moveTo(sg[0], sg[1]).lineTo(sg[2], sg[3]).stroke({width: 3.2, color: mixColor(tr, 0x000000, 0.45), alpha: 1, cap: 'round'});
  }
  for (i = 0; i < cab.segs.length; i++) {
    var sh = cab.segs[i];
    g.moveTo(sh[0], sh[1]).lineTo(sh[2], sh[3]).stroke({width: 1.6, color: tr, alpha: 1, cap: 'round'});
  }
  /* window for the LCD or drum panel */
  var r = cab.lcd.rect;
  g.roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 10).fill(0x05070b);
  g.roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 10).stroke({width: 2, color: tr, alpha: 0.9});
  /* start pocket and side pocket cups */
  var cups = [cab.start].concat(cab.pockets || []);
  for (i = 0; i < cups.length; i++) g.roundRect(cups[i].x - cups[i].w / 2 - 2, cups[i].y - cups[i].h / 2 - 2, cups[i].w + 4, cups[i].h + 4, 3).fill(0x05070b);
  this.L.plastics.addChild(g);
  var lbl = new PIXI.Text({text: 'PLAY BALLS ONLY', style: {fontFamily: 'Chakra Petch, Arial, sans-serif', fontSize: 15, fontWeight: '700', fill: tr, letterSpacing: 3}});
  lbl.anchor.set(0.5); lbl.alpha = 0.55; lbl.x = 240; lbl.y = P.OUT_Y + 60;
  this.L.plastics.addChild(lbl);
  var nm = new PIXI.Text({text: cab.name.toUpperCase(), style: {fontFamily: 'Chakra Petch, Arial, sans-serif', fontSize: 12, fontWeight: '700', fill: pal.glow, letterSpacing: 2}});
  nm.anchor.set(0.5); nm.alpha = 0.7; nm.x = 50; nm.y = P.OUT_Y + 24; nm.scale.set(0.82);
  this.L.plastics.addChild(nm);
};
RView.prototype.buildPins = function () {
  var w = this.world, pal = this.pal;
  for (var i = 0; i < w.px.length; i++) {
    var s = new PIXI.Sprite(Tex.pin);
    s.anchor.set(0.5); s.x = w.px[i]; s.y = w.py[i];
    var k = (PHYS.PIN_R * 2 * 1.18) / 32;
    s.scale.set(w.pn[i] ? k * 1.25 : k);
    if (w.pn[i]) s.tint = pal.hot;
    this.L.pins.addChild(s);
  }
  var ring = new PIXI.Graphics();
  for (var j = 0; j < w.px.length; j++) if (w.pn[j]) ring.circle(w.px[j], w.py[j], 6).stroke({width: 1, color: pal.hot, alpha: 0.7});
  this.L.pins.addChild(ring);
};
RView.prototype.buildFeatures = function () {
  var cab = this.cab, w = this.world, i;
  this.fg = new PIXI.Graphics();          /* redrawn each frame */
  this.L.features.addChild(this.fg);
  this.gateT = [];
  var gates = (cab.feat && cab.feat.gates) || [];
  for (i = 0; i < gates.length; i++) {
    var t = new PIXI.Text({text: String(i + 1), style: {fontFamily: 'Chakra Petch, Arial, sans-serif', fontSize: 13, fontWeight: '700', fill: 0xffffff}});
    t.anchor.set(0.5); t.x = gates[i].x; t.y = gates[i].y - 14;
    this.L.features.addChild(t); this.gateT.push(t);
  }
};
RView.prototype.updateFeatures = function () {
  var cab = this.cab, w = this.world, m = this.m, pal = this.pal, g = this.fg, i, k, mv;
  g.clear();
  var tl = (cab.feat && cab.feat.tulips) || [];
  for (i = 0; i < tl.length; i++) {
    mv = w.feats.tulip[i];
    g.roundRect(tl[i].x - 12, tl[i].y - 2, 24, 15, 4).fill(0x0a0d13);
    for (k = 0; k < 2; k++) {
      var s = mv.segs[k];
      g.moveTo(s.x1, s.y1).lineTo(s.x2, s.y2).stroke({width: 4, color: mixColor(pal.trim, pal.hot, mv.t), cap: 'round'});
    }
    g.circle(tl[i].x, tl[i].y + 6, 2.6).fill(mixColor(0x2b2f3a, pal.hot, mv.t));
  }
  if (w.feats.wing) {
    mv = w.feats.wing;
    g.roundRect(218, 560, 44, 30, 4).fill(0x0a0d13);
    for (k = 0; k < 2; k++) {
      var sw = mv.segs[k];
      g.moveTo(sw.x1, sw.y1).lineTo(sw.x2, sw.y2).stroke({width: 5, color: mixColor(pal.trim, pal.hot, mv.t), cap: 'round'});
    }
  }
  if (w.feats.attacker) {
    mv = w.feats.attacker;
    var a = cab.feat.attacker;
    g.rect(400, 598, 56, 32).fill(0x0a0d13);
    g.rect(a.sensor.x - a.sensor.w / 2, a.sensor.y - a.sensor.h / 2, a.sensor.w, a.sensor.h).fill({color: pal.hot, alpha: 0.12 + 0.3 * mv.t});
    var sl = mv.segs[0];
    g.moveTo(sl.x1, sl.y1).lineTo(sl.x2, sl.y2).stroke({width: 5, color: mixColor(pal.trim, pal.hot, mv.t), cap: 'round'});
    g.circle(428, 640, 3).fill(mixColor(0x2b2f3a, pal.hot, mv.t));
  }
  for (i = 0; i < w.feats.fans.length; i++) {
    mv = w.feats.fans[i];
    g.circle(mv.def.x, mv.def.y, 4).fill(pal.trim);
    for (k = 0; k < 2; k++) {
      var sf = mv.segs[k];
      g.moveTo(sf.x1, sf.y1).lineTo(sf.x2, sf.y2).stroke({width: 3.5, color: pal.glow, alpha: 0.95, cap: 'round'});
    }
  }
  var gates = (cab.feat && cab.feat.gates) || [];
  for (i = 0; i < gates.length; i++) {
    var lit = m.kenri || i < m.kstep;
    var col = lit ? pal.hot : 0x4a5468;
    g.roundRect(gates[i].x - gates[i].w / 2, gates[i].y - 4, gates[i].w, 8, 3).fill({color: col, alpha: lit ? 0.9 : 0.55});
    g.roundRect(gates[i].x - gates[i].w / 2, gates[i].y - 4, gates[i].w, 8, 3).stroke({width: 1.5, color: col});
    setFill(this.gateT[i], lit ? 0xffffff : 0x9aa5ba);
  }
  /* start pocket lamp ring */
  var st = cab.start, fl = this.startFlash > 0 ? this.startFlash : 0;
  g.circle(st.x, st.y - 4, 24).stroke({width: 2, color: mixColor(pal.trim, pal.hot, Math.min(1, fl)), alpha: 0.5 + 0.4 * Math.min(1, fl)});
};
RView.prototype.buildBalls = function () {
  this.bs = [];
  var k = (PHYS.BALL_R * 2 * 1.04) / 64;
  for (var i = 0; i < MAX_BALLS; i++) {
    var s = new PIXI.Sprite(Tex.ball);
    s.anchor.set(0.5); s.scale.set(k); s.visible = false;
    var h = new PIXI.Sprite(Tex.glow);
    h.anchor.set(0.5); h.x = -14; h.y = -16; h.scale.set(0.34); h.alpha = 0.9;
    s.addChild(h);
    this.L.balls.addChild(s); this.bs.push(s);
  }
};
RView.prototype.buildGlow = function () {
  var pal = this.pal, cab = this.cab, r = cab.lcd.rect;
  this.glowLcd = new PIXI.Sprite(Tex.glow);
  this.glowLcd.anchor.set(0.5); this.glowLcd.blendMode = 'add'; this.glowLcd.tint = pal.glow;
  this.glowLcd.x = r.x + r.w / 2; this.glowLcd.y = r.y + r.h / 2; this.glowLcd.width = r.w + 70; this.glowLcd.height = r.h + 70; this.glowLcd.alpha = 0.25;
  this.L.glow.addChild(this.glowLcd);
  this.glowStart = new PIXI.Sprite(Tex.glow);
  this.glowStart.anchor.set(0.5); this.glowStart.blendMode = 'add'; this.glowStart.tint = pal.hot;
  this.glowStart.x = cab.start.x; this.glowStart.y = cab.start.y - 6; this.glowStart.width = 90; this.glowStart.height = 70; this.glowStart.alpha = 0;
  this.L.glow.addChild(this.glowStart);
  this.glowAtk = null;
  if (cab.feat && cab.feat.attacker) {
    var a = cab.feat.attacker.sensor;
    this.glowAtk = new PIXI.Sprite(Tex.glow);
    this.glowAtk.anchor.set(0.5); this.glowAtk.blendMode = 'add'; this.glowAtk.tint = pal.hot;
    this.glowAtk.x = a.x; this.glowAtk.y = a.y - 10; this.glowAtk.width = 130; this.glowAtk.height = 90; this.glowAtk.alpha = 0;
    this.L.glow.addChild(this.glowAtk);
  }
  this.glowFlash = new PIXI.Sprite(Tex.glow);
  this.glowFlash.anchor.set(0.5); this.glowFlash.blendMode = 'add'; this.glowFlash.tint = pal.hot;
  this.glowFlash.x = PHYS.W / 2; this.glowFlash.y = 330; this.glowFlash.width = 700; this.glowFlash.height = 860; this.glowFlash.alpha = 0;
  this.L.glow.addChild(this.glowFlash);
};
RView.prototype.buildLcd = function () {
  var cab = this.cab, pal = this.pal, r = cab.lcd.rect, th = cab.lcd.theme, i;
  var c = this.lcd = new PIXI.Container();
  c.x = r.x; c.y = r.y; this.L.lcd.addChild(c);
  this.lcdBg = new PIXI.Graphics(); c.addChild(this.lcdBg);
  this.auraG = new PIXI.Graphics(); c.addChild(this.auraG);
  this.compact = (th === 'drum' || th === 'seg');
  this.rw = this.compact ? (r.w - 16) / 3 : (r.w - 24) / 3;
  this.rh = this.compact ? r.h - 8 : 66;
  this.ry = this.compact ? 4 : 26;
  this.reelG = []; this.reelKey = ['', '', ''];
  for (i = 0; i < 3; i++) {
    var rg = new PIXI.Graphics();
    rg.x = this.compact ? 4 + i * (this.rw + 4) : 6 + i * (this.rw + 6); rg.y = this.ry;
    c.addChild(rg); this.reelG.push(rg);
  }
  var fs = {fontFamily: 'Chakra Petch, Arial, sans-serif', fontWeight: '700', fill: pal.lcdFg};
  this.tTop = new PIXI.Text({text: '', style: Object.assign({fontSize: 14, letterSpacing: 2}, fs)});
  this.tTop.anchor.set(0.5); this.tTop.x = r.w / 2; this.tTop.y = 13;
  this.tBot = new PIXI.Text({text: '', style: Object.assign({fontSize: 11, letterSpacing: 1}, fs)});
  this.tBot.anchor.set(0.5); this.tBot.x = r.w / 2; this.tBot.y = r.h - 12;
  this.tDuel = new PIXI.Text({text: '', style: Object.assign({fontSize: 20, letterSpacing: 3}, fs)});
  this.tDuel.anchor.set(0.5); this.tDuel.x = r.w / 2; this.tDuel.y = this.ry + 34; this.tDuel.visible = false;
  this.duelG = new PIXI.Graphics(); this.holdG = new PIXI.Graphics(); this.gateG = new PIXI.Graphics();
  c.addChild(this.duelG, this.holdG, this.gateG);
  if (!this.compact) c.addChild(this.tTop, this.tBot);
  c.addChild(this.tDuel);
  this.cutBg = new PIXI.Graphics(); this.cutBg.visible = false;
  this.cutBg.rect(0, this.ry + this.rh / 2 - 17, r.w, 34).fill({color: 0x05070b, alpha: 0.88});
  this.cutBg.rect(0, this.ry + this.rh / 2 - 17, r.w, 2).fill(REACH_TINT[2]);
  this.cutBg.rect(0, this.ry + this.rh / 2 + 15, r.w, 2).fill(REACH_TINT[2]);
  c.addChild(this.cutBg);
  this.tCut = new PIXI.Text({text: '', style: Object.assign({fontSize: 24, letterSpacing: 4, stroke: {color: 0x000000, width: 4}}, fs)});
  this.tCut.anchor.set(0.5); this.tCut.x = r.w / 2; this.tCut.y = this.ry + this.rh / 2; this.tCut.visible = false;
  c.addChild(this.tCut);
  this.cutT = 0; this.cutKey = ''; this.auraLvl = -1; this.auraPaused = false;
  this.holdKey = '';
  /* hold lamps sit just under the panel on the compact themes */
  if (this.compact) { this.holdG.y = r.h + 11; }
  var bg = this.lcdBg;
  bg.roundRect(0, 0, r.w, r.h, 8).fill(pal.lcdBg);
  if (!this.compact) {
    bg.roundRect(0, 0, r.w, 22, 8).fill({color: pal.glow, alpha: 0.08});
    for (i = 0; i < 12; i++) bg.moveTo(0, 22 + i * 10).lineTo(r.w, 22 + i * 10).stroke({width: 1, color: pal.glow, alpha: 0.05});
  }
  this.lcdFlash = 0;
};
RView.prototype.drawReel = function (i, symIdx, mode, glow) {
  var key = symIdx + '|' + mode + '|' + (glow ? 1 : 0);
  if (this.reelKey[i] === key) return;
  this.reelKey[i] = key;
  var g = this.reelG[i], pal = this.pal, id = this.cab.lcd.symbols[symIdx];
  var cream = this.cab.lcd.theme === 'drum';
  g.clear();
  g.roundRect(0, 0, this.rw, this.rh, 5).fill(cream ? 0xfffaf0 : 0x0c1220);
  if (mode === 'spin') g.rect(0, this.rh * 0.35, this.rw, this.rh * 0.3).fill({color: 0xffffff, alpha: 0.06});
  var s = Math.min(this.rw, this.rh) * (this.compact ? 0.9 : 0.62);
  var bgc = cream ? 0xfffaf0 : 0x0c1220;
  drawSymbol(g, id, this.rw / 2, this.rh / 2, s, bgc, cream ? ({seven: 0xb3121f, bell: 0xc98a00, cherry: 0xb3122a, star: 0xc9a100, diamond: 0x0a7fa0, clover: 0x1c8a4a})[id] : (this.cab.lcd.theme === 'seg' ? pal.lcdFg : 0));
  g.roundRect(0, 0, this.rw, this.rh, 5).stroke({width: glow ? 3 : 1.5, color: glow ? pal.hot : pal.trim, alpha: glow ? 1 : 0.7});
};
/* How far the last reel has travelled, in symbols, at progress p through the reach.
   Without a pause it simply decelerates. With one it eases to a single symbol short of
   the target, stands dead still long enough to hurt, then creeps the last place. */
function reelTravel(p, span, pause) {
  if (!pause) return span * (1 - Math.pow(1 - p, 3));
  var A = 0.72, B = 0.88, s1 = span - 1;
  if (p <= A) return s1 * (1 - Math.pow(1 - p / A, 3));
  if (p <= B) return s1;
  var k = (p - B) / (1 - B);
  return s1 + (1 - Math.pow(1 - k, 2));
}
var REACH_TINT = [0, 0x6ad8ff, 0xff4d5e];
RView.prototype.updateLcd = function (dt) {
  var m = this.m, cab = this.cab, pal = this.pal, r = cab.lcd.rect, n = cab.lcd.symbols.length, t = this.t, i;
  var sp = m.spin, jp = m.jp, syms = m.lastSyms, top = '', bot = '', flash = false;
  var duel = jp && jp.stage === 'duel';
  if (jp) {
    syms = jp.res.syms; flash = Math.floor(t * 6) % 2 === 0;
    for (i = 0; i < 3; i++) this.drawReel(i, syms[i], 'stop', flash);
    top = jp.stage === 'intro' ? 'JACKPOT' : (duel ? 'DUEL' : 'ROUND ' + jp.round + ' OF ' + jp.rounds);
    bot = jp.stage === 'open' ? 'BALLS ' + jp.balls + ' OF ' + cab.payout.balls : (jp.stage === 'intro' ? 'GET READY' : 'PAYOUT ' + jp.paid);
  } else if (sp) {
    var pl = sp.plan, st = sp.t, res = sp.res;
    var stopAt = [pl.a, pl.end, pl.b];
    var live = res.reach && st >= pl.b && st < pl.end;
    for (i = 0; i < 3; i++) {
      var stopped = st >= stopAt[i];
      if (stopped) { this.drawReel(i, res.syms[i], 'stop', res.hit && st >= pl.end); continue; }
      if (i === 1 && res.reach && st >= pl.b) {
        /* the last reel: decelerate toward its symbol, with the pause if this spin has one */
        var p0 = Math.floor(pl.b * 18 + 3) % n, T = res.syms[1];
        var turns = res.reach === 2 ? 2 : 1;
        var span = turns * n + (((T - p0) % n + n) % n);
        var prog = clamp((st - pl.b) / Math.max(0.001, pl.end - pl.b), 0, 1);
        var trav = reelTravel(prog, span, pl.pause);
        this.drawReel(1, (p0 + Math.floor(trav)) % n, 'reach', Math.floor(t * (res.reach === 2 ? 14 : 8)) % 2 === 0);
      } else {
        this.drawReel(i, Math.floor(st * 18 + i * 3) % n, 'spin', false);
      }
    }
    if (live) { top = res.reach === 2 ? 'SUPER REACH' : 'REACH'; flash = true; }
    else if (st >= pl.end) top = res.hit ? 'HIT' : 'MISS';
    bot = 'SPINNING';
  } else {
    for (i = 0; i < 3; i++) this.drawReel(i, syms[i], 'stop', false);
    top = m.base === 'kakuhen' ? 'KAKUHEN' : (m.base === 'jitan' ? 'JITAN' : 'READY');
    bot = m.kenri ? 'KENRI READY' : 'INSERT BALLS';
  }
  if (!this.compact) {
    this.tTop.text = top; this.tBot.text = bot;
    this.tTop.alpha = flash ? 0.5 + 0.5 * Math.sin(t * 18) : 1;
    setFill(this.tTop, (jp || (sp && sp.res.reach && flash)) ? pal.hot : pal.lcdFg);
  }
  /* hold lamps */
  var hk = m.queue.length + (m.spin ? 10 : 0) + (m.kenri ? 100 : 0) + (m.kstep * 1000);
  if (hk !== this.holdKey) {
    this.holdKey = hk;
    var hg = this.holdG; hg.clear();
    for (i = 0; i < PHYS.HOLD_MAX; i++) hg.circle(r.w / 2 - 36 + i * 24, this.compact ? 0 : r.h - 28, 5).fill({color: i < m.queue.length ? pal.hot : 0x2a3140, alpha: i < m.queue.length ? 1 : 0.8});
    var gg = this.gateG; gg.clear();
    if (cab.variant === 'kenri') {
      for (i = 0; i < 3; i++) gg.circle(r.w - 44 + i * 16, r.h - 28, 5).fill(m.kenri || i < m.kstep ? pal.hot : 0x2a3140);
    }
  }
  /* duel scene (battle) */
  var dg = this.duelG;
  dg.clear(); this.tDuel.visible = false;
  if (duel) {
    var p = clamp(jp.t / 2.3, 0, 1), win = jp.res.duelWin;
    var hero = win ? 1 - 0.3 * p : 1 - p, boss = win ? 1 - p : 1 - 0.3 * p;
    dg.rect(4, this.ry, r.w - 8, this.rh).fill({color: 0x05070b, alpha: 0.9});
    dg.roundRect(16, this.ry + 12, r.w - 32, 10, 4).fill(0x2a3140);
    dg.roundRect(16, this.ry + 12, (r.w - 32) * Math.max(0, hero), 10, 4).fill(0x4de08a);
    dg.roundRect(16, this.ry + 44, r.w - 32, 10, 4).fill(0x2a3140);
    dg.roundRect(16, this.ry + 44, (r.w - 32) * Math.max(0, boss), 10, 4).fill(0xff4d5e);
    this.tDuel.visible = true;
    this.tDuel.y = this.ry + 34 + Math.sin(t * 20) * (p < 1 ? 1.5 : 0);
    this.tDuel.text = p < 1 ? 'VS' : (win ? 'WIN' : 'LOSE');
    setFill(this.tDuel, p < 1 ? pal.lcdFg : (win ? 0x4de08a : 0xff4d5e));
  }
  /* reach aura: white to cyan to red, and the rarer the colour the better the spin */
  var lvl = 0, paused = false, prg = 0;
  if (sp && sp.res.reach && sp.t >= sp.plan.b && sp.t < sp.plan.end) {
    lvl = sp.res.reach;
    prg = clamp((sp.t - sp.plan.b) / Math.max(0.001, sp.plan.end - sp.plan.b), 0, 1);
    paused = sp.plan.pause && prg > 0.72 && prg < 0.88;
  }
  var ag = this.auraG;
  if (lvl !== this.auraLvl || paused !== this.auraPaused) {
    this.auraLvl = lvl; this.auraPaused = paused;
    ag.clear();
    if (lvl) {
      var tint = paused ? 0xffffff : REACH_TINT[lvl];
      ag.roundRect(2, 2, r.w - 4, r.h - 4, 8).stroke({width: paused ? 5 : 3, color: tint, alpha: 0.95});
      ag.roundRect(6, 6, r.w - 12, r.h - 12, 6).stroke({width: 1, color: tint, alpha: 0.4});
    }
  }
  ag.alpha = lvl ? (paused ? 1 : 0.45 + 0.4 * Math.sin(t * (lvl === 2 ? 16 : 9))) : 0;
  /* the cut in that announces a super reach, and the shake that rides with it */
  var ck = lvl === 2 ? (sp.plan.b + '|' + sp.res.syms.join(',')) : '';
  if (ck && ck !== this.cutKey) { this.cutKey = ck; this.cutT = 0.9; Sfx.stinger(); }
  if (!ck) this.cutKey = '';
  if (this.cutT > 0) {
    this.cutT -= dt;
    this.tCut.visible = true; this.cutBg.visible = true;
    this.cutBg.alpha = clamp(this.cutT * 2.2, 0, 1);
    this.tCut.text = 'CHANCE';
    this.tCut.alpha = clamp(this.cutT * 2.2, 0, 1);
    this.tCut.scale.set(1 + (1 - clamp(this.cutT / 0.9, 0, 1)) * 0.5);
    setFill(this.tCut, REACH_TINT[2]);
  } else { this.tCut.visible = false; this.cutBg.visible = false; }
  if (!this.settings.reduced) {
    if (paused) this.shake = Math.max(this.shake, 1.6);
    else if (lvl === 2 && prg > 0.5) this.shake = Math.max(this.shake, 0.7);
  }
  var base = 0.22 + (jp ? 0.25 + 0.15 * Math.sin(t * 10) : 0) + (lvl ? 0.1 + 0.08 * lvl : 0);
  this.glowLcd.alpha = base;
  if (lvl) this.glowLcd.tint = REACH_TINT[lvl]; else this.glowLcd.tint = pal.glow;
};
RView.prototype.buildFx = function () {
  this.parts = [];
  for (var i = 0; i < 90; i++) {
    var s = new PIXI.Sprite(Tex.glow);
    s.anchor.set(0.5); s.blendMode = 'add'; s.visible = false;
    this.L.fx.addChild(s);
    this.parts.push({s: s, vx: 0, vy: 0, life: 0, max: 1, on: false});
  }
  this.pops = [];
  for (var j = 0; j < 10; j++) {
    var tx = new PIXI.Text({text: '', style: {fontFamily: 'Chakra Petch, Arial, sans-serif', fontSize: 15, fontWeight: '700', fill: 0xffffff, stroke: {color: 0x000000, width: 3}}});
    tx.anchor.set(0.5); tx.visible = false;
    this.L.fx.addChild(tx);
    this.pops.push({t: tx, life: 0, on: false});
  }
  this.startFlash = 0; this.shake = 0; this.flashAmt = 0;
  /* the shower: balls arcing out of the machine and into the tray */
  this.cas = [];
  if (!this.cab.ballless) {
    for (var c = 0; c < 36; c++) {
      var cs = new PIXI.Sprite(Tex.ball);
      cs.anchor.set(0.5); cs.visible = false;
      this.L.fx.addChild(cs);
      this.cas.push({s: cs, x0: 0, y0: 0, x1: 0, vy: 0, life: 0, max: 1, on: false});
    }
  }
};
RView.prototype.buildTray = function () {
  this.trayG = new PIXI.Graphics();
  this.pileG = new PIXI.Graphics();
  this.L.features.addChild(this.trayG, this.pileG);
  this.trayCount = 0; this.pileKey = -1; this.pileBump = 0;
  var pal = this.pal, g = this.trayG;
  if (this.cab.ballless) {
    /* a smart cabinet has no tray at all, only a counter where one used to be */
    g.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 8).fill({color: 0x0a0c10, alpha: 0.92});
    g.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 8).stroke({width: 2, color: pal.trim, alpha: 0.5});
    this.tCredit = new PIXI.Text({text: '0', style: {fontFamily: 'Orbitron, Chakra Petch, Arial, sans-serif', fontSize: 24, fontWeight: '800', fill: pal.hot, letterSpacing: 3}});
    this.tCredit.anchor.set(0.5); this.tCredit.x = TRAY.x + TRAY.w / 2; this.tCredit.y = TRAY.y + TRAY.h / 2 + 1;
    this.L.features.addChild(this.tCredit);
    this.tCreditLbl = new PIXI.Text({text: 'HELD BALLS', style: {fontFamily: 'Chakra Petch, Arial, sans-serif', fontSize: 9, fontWeight: '700', fill: pal.trim, letterSpacing: 3}});
    this.tCreditLbl.anchor.set(0.5); this.tCreditLbl.x = TRAY.x + 58; this.tCreditLbl.y = TRAY.y + 9;
    this.L.features.addChild(this.tCreditLbl);
    return;
  }
  g.roundRect(TRAY.x - 4, TRAY.y - 4, TRAY.w + 8, TRAY.h + 8, 10).fill(pal.frame);
  g.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 7).fill(0x05070b);
  g.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 7).stroke({width: 2, color: pal.trim, alpha: 0.55});
  g.moveTo(TRAY.x + 10, TRAY.y + TRAY.h).lineTo(TRAY.x + TRAY.w - 10, TRAY.y + TRAY.h).stroke({width: 2, color: pal.glow, alpha: 0.2});
};
/* The pile is drawn as rows of balls so a full tray reads as metal, not as a bar. */
RView.prototype.updatePile = function (dt) {
  if (this.cab.ballless) {
    if (this.tCredit && this.pileKey !== this.trayCount) {
      this.pileKey = this.trayCount;
      this.tCredit.text = String(this.trayCount);
    }
    if (this.tCredit) this.tCredit.alpha = 0.75 + 0.25 * Math.sin(this.t * 3);
    return;
  }
  if (this.pileBump > 0) this.pileBump -= dt * 2;
  var fill = clamp(this.trayCount / 2400, 0, 1);
  var rows = Math.round(fill * 4 * 10) / 10, key = Math.round(rows * 10);
  if (key === this.pileKey) return;
  this.pileKey = key;
  var g = this.pileG, pal = this.pal, r, i, full = Math.floor(rows), part = rows - full;
  g.clear();
  for (r = 0; r < 4; r++) {
    var amt = r < full ? 1 : (r === full ? part : 0);
    if (amt <= 0) break;
    var y = TRAY.y + TRAY.h - 7 - r * 8.5, cols = Math.floor((TRAY.w - 14) / 10);
    for (i = 0; i < Math.round(cols * amt); i++) {
      g.circle(TRAY.x + 10 + i * 10 + (r % 2) * 4, y, 4.4).fill({color: 0xc8d2e0, alpha: 0.95});
      g.circle(TRAY.x + 8.6 + i * 10 + (r % 2) * 4, y - 1.4, 1.5).fill({color: 0xffffff, alpha: 0.7});
    }
  }
};
RView.prototype.cascade = function (x, y, n) {
  if (this.cab.ballless || this.settings.reduced) return;
  var want = Math.min(n, 6), k = 0;
  for (var i = 0; i < this.cas.length && k < want; i++) {
    var p = this.cas[i];
    if (p.on) continue;
    p.on = true; p.life = 0; p.max = 0.45 + Math.random() * 0.25;
    p.x0 = x; p.y0 = y;
    p.x1 = TRAY.x + 14 + Math.random() * (TRAY.w - 28);
    p.s.visible = true; p.s.x = x; p.s.y = y; p.s.scale.set(1);
    k++;
  }
};
RView.prototype.updateCascade = function (dt) {
  var landed = 0;
  for (var i = 0; i < this.cas.length; i++) {
    var p = this.cas[i];
    if (!p.on) continue;
    p.life += dt;
    var u = p.life / p.max;
    if (u >= 1) { p.on = false; p.s.visible = false; landed++; continue; }
    /* a flat arc out of the machine, then a drop into the tray */
    p.s.x = lerp(p.x0, p.x1, u);
    p.s.y = lerp(p.y0, TRAY.y + 6, u * u) - Math.sin(u * Math.PI) * 26;
    p.s.alpha = u > 0.85 ? (1 - u) / 0.15 : 1;
  }
  if (landed) { this.pileBump = 1; Sfx.pin(400); }
};
RView.prototype.burst = function (x, y, color, n, spd) {
  if (this.settings.reduced) n = Math.ceil(n / 3);
  for (var i = 0, k = 0; i < this.parts.length && k < n; i++) {
    var p = this.parts[i];
    if (p.on) continue;
    var a = Math.random() * Math.PI * 2, v = spd * (0.35 + Math.random() * 0.65);
    p.on = true; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - spd * 0.3; p.life = 0; p.max = 0.45 + Math.random() * 0.4;
    p.s.visible = true; p.s.x = x; p.s.y = y; p.s.tint = color; p.s.scale.set(0.2 + Math.random() * 0.2);
    k++;
  }
};
RView.prototype.popup = function (x, y, n, color) {
  for (var i = 0; i < this.pops.length; i++) {
    var p = this.pops[i];
    if (p.on) continue;
    p.on = true; p.life = 0; p.t.visible = true; p.t.text = '+' + n; p.t.x = x; p.t.y = y - 6; p.t.style.fill = color || 0xffffff; p.t.alpha = 1;
    return;
  }
};
RView.prototype.pinSpark = function (x, y, spd) {
  if (this.settings.reduced || this.sparkBudget <= 0) return;
  this.sparkBudget--;
  this.burst(x, y, this.pal.trim, 2, 70 + spd * 0.04);
};
RView.prototype.updateFx = function (dt) {
  var i, p, g = 900;
  for (i = 0; i < this.parts.length; i++) {
    p = this.parts[i];
    if (!p.on) continue;
    p.life += dt;
    if (p.life >= p.max) { p.on = false; p.s.visible = false; continue; }
    p.vy += g * dt * 0.5; p.s.x += p.vx * dt; p.s.y += p.vy * dt;
    p.s.alpha = 1 - p.life / p.max;
  }
  for (i = 0; i < this.pops.length; i++) {
    p = this.pops[i];
    if (!p.on) continue;
    p.life += dt;
    if (p.life > 0.9) { p.on = false; p.t.visible = false; continue; }
    p.t.y -= 38 * dt; p.t.alpha = 1 - p.life / 0.9;
  }
  if (this.startFlash > 0) this.startFlash -= dt * 2.2;
  this.glowStart.alpha = clamp(this.startFlash, 0, 1) * 0.9;
  if (this.flashAmt > 0) this.flashAmt -= dt * 1.6;
  this.glowFlash.alpha = clamp(this.flashAmt, 0, 1) * 0.35;
  if (this.glowAtk) {
    var a = this.world.feats.attacker.t;
    this.glowAtk.alpha = a * (0.45 + 0.25 * Math.sin(this.t * 9));
  }
};
RView.prototype.buildUi = function () {
  this.aimG = new PIXI.Graphics();
  this.L.ui.addChild(this.aimG);
  this.arrow = new PIXI.Graphics();
  this.L.ui.addChild(this.arrow);
  this.banner = new PIXI.Text({text: '', style: {fontFamily: 'Chakra Petch, Arial, sans-serif', fontSize: 30, fontWeight: '700', fill: this.pal.hot, letterSpacing: 3, stroke: {color: 0x000000, width: 5}}});
  this.banner.anchor.set(0.5); this.banner.x = PHYS.W / 2; this.banner.y = 360; this.banner.alpha = 0;
  this.L.ui.addChild(this.banner);
  this.bannerT = 0;
};
RView.prototype.showBanner = function (text) { this.banner.text = text; this.bannerT = 1.8; };
RView.prototype.updateUi = function (dt) {
  var g = this.aimG, a = this.aim;
  g.clear();
  if (a.show) {
    var x = entryX(a.stream, a.power), pulse = 0.55 + 0.35 * Math.sin(this.t * 6);
    g.poly([x - 6, 104, x + 6, 104, x, 116]).fill({color: this.pal.hot, alpha: pulse});
    g.moveTo(x, 90).lineTo(x, 102).stroke({width: 2, color: this.pal.hot, alpha: pulse * 0.7});
  }
  var ar = this.arrow;
  ar.clear();
  if (this.m.aimDemand() && this.aim.stream !== 'R') {
    var s = 0.5 + 0.5 * Math.sin(this.t * 8);
    ar.poly([406, 120 + s * 8, 450, 120 + s * 8, 428, 146 + s * 8]).fill({color: this.pal.hot, alpha: 0.9});
  }
  if (this.bannerT > 0) {
    this.bannerT -= dt;
    this.banner.alpha = clamp(this.bannerT * 1.5, 0, 1);
    this.banner.scale.set(1 + 0.08 * Math.sin(this.t * 10));
  } else this.banner.alpha = 0;
};
RView.prototype.layout = function (w, h) {
  this.w = w; this.h = h;
  var sw = w / (PHYS.W + 36), sf = h / (PHYS.H + 36), s;
  if (sf >= sw) {
    s = sw;
    this.root.y = Math.max(8, Math.round((h - PHYS.H * s) / 2));
  } else {
    /* short stage: the tray is decorative, so crop it and keep the pins large */
    var vis = PHYS.OUT_Y + 44;
    s = Math.min(sw, (h - 10) / (vis + 18));
    this.root.y = Math.round(6 + 16 * s);
  }
  this.root.scale.set(s);
  this.root.x = Math.round((w - PHYS.W * s) / 2);
  this.scale = s;
  this.baseX = this.root.x; this.baseY = this.root.y;
};
RView.prototype.update = function (dt) {
  this.t += dt;
  this.sparkBudget = 3;
  var i, w = this.world;
  for (i = 0; i < this.bs.length; i++) {
    var b = w.balls[i], sp = this.bs[i];
    if (b.on) { sp.visible = true; sp.x = b.x; sp.y = b.y; } else sp.visible = false;
  }
  this.updateFeatures();
  this.updateLcd(dt);
  this.updateFx(dt);
  this.updateCascade(dt);
  this.updatePile(dt);
  this.updateUi(dt);
  /* screen shake, applied to the board root and nothing else */
  if (this.shake > 0) {
    this.shake = Math.max(0, this.shake - dt * 3.2);
    var k = this.shake * this.scale * 2.2;
    this.root.x = this.baseX + (Math.random() - 0.5) * k;
    this.root.y = this.baseY + (Math.random() - 0.5) * k;
  } else if (this.root.x !== this.baseX || this.root.y !== this.baseY) {
    this.root.x = this.baseX; this.root.y = this.baseY;
  }
};
RView.prototype.destroy = function () {
  if (this.root.parent) this.root.parent.removeChild(this.root);
  this.root.destroy({children: true});
};
