/* ===== SECTION 5: PHYSICS ===== */
/* vector helpers */
function vlen(x, y) { return Math.sqrt(x * x + y * y); }
function segDist(px, py, s) {
  var ax = s[0], ay = s[1], bx = s[2] - ax, by = s[3] - ay, l2 = bx * bx + by * by;
  var t = l2 > 0 ? ((px - ax) * bx + (py - ay) * by) / l2 : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return vlen(px - (ax + bx * t), py - (ay + by * t));
}
function railLen(path) {
  var L = 0;
  for (var i = 1; i < path.length; i++) L += vlen(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return L;
}
function railPoint(stream, f, out) {
  var st = STREAMS[stream], p = st.path;
  if (!st.len) st.len = railLen(p);
  var d = clamp(f, 0, 1) * st.len;
  for (var i = 1; i < p.length; i++) {
    var sl = vlen(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (d <= sl || i === p.length - 1) {
      var t = sl > 0 ? Math.min(1, d / sl) : 1;
      out.x = lerp(p[i - 1][0], p[i][0], t); out.y = lerp(p[i - 1][1], p[i][1], t);
      return out;
    }
    d -= sl;
  }
  return out;
}
/* where a launch crosses the top pin row, for the aim marker only */
function entryX(stream, power) {
  var st = STREAMS[stream], v = lerp(st.vmin, st.vmax, clamp(power, 0, 1));
  var g = PHYS.GRAV * 0.5, vy = 40, dy = 120 - st.ey;
  var t = (-vy + Math.sqrt(vy * vy + 4 * g * dy)) / (2 * g);
  return clamp(st.ex + v * t, PHYS.WALL_L + 8, PHYS.WALL_R - 8);
}

/* ball pool */
function Ball(i) {
  this.id = i; this.on = false; this.rail = 0; this.rt = 0; this.stream = 'L';
  this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.evx = 0; this.evy = 0;
  this.still = 0; this.age = 0; this.gm = 0; this.nud = 0;
}
function BallPool(n) {
  this.list = [];
  for (var i = 0; i < n; i++) this.list.push(new Ball(i));
}
BallPool.prototype.get = function () {
  for (var i = 0; i < this.list.length; i++) if (!this.list[i].on) return this.list[i];
  return null;
};
BallPool.prototype.count = function () {
  var n = 0;
  for (var i = 0; i < this.list.length; i++) if (this.list[i].on) n++;
  return n;
};

/* movers: segments whose ends follow a parameter, built from the cabinet feature set */
function tulipFn(x, y) {
  return function (t, s) {
    s[0].x1 = lerp(x - 14, x - 20, t); s[0].y1 = lerp(y, y - 14, t);
    s[0].x2 = lerp(x - 2, x - 6, t); s[0].y2 = lerp(y - 12, y, t);
    s[1].x1 = 2 * x - s[0].x1; s[1].y1 = s[0].y1; s[1].x2 = 2 * x - s[0].x2; s[1].y2 = s[0].y2;
  };
}
function wingFn(cx, py, dx, L, closedDeg, openDeg) {
  return function (t, s) {
    var th = lerp(closedDeg, openDeg, t) * Math.PI / 180;
    var tipx = cx - dx + L * Math.sin(th), tipy = py - L * Math.cos(th);
    s[0].x1 = cx - dx; s[0].y1 = py; s[0].x2 = tipx; s[0].y2 = tipy;
    s[1].x1 = cx + dx; s[1].y1 = py; s[1].x2 = 2 * cx - tipx; s[1].y2 = tipy;
  };
}
function lidFn(a) {
  return function (t, s) {
    s[0].x1 = a.px; s[0].y1 = a.py;
    s[0].x2 = lerp(a.e0[0], a.e1[0], t); s[0].y2 = lerp(a.e0[1], a.e1[1], t);
  };
}
function fanFn(f) {
  return function (t, s) {
    var c = Math.cos(t) * f.len, d = Math.sin(t) * f.len;
    s[0].x1 = f.x - c; s[0].y1 = f.y - d; s[0].x2 = f.x + c; s[0].y2 = f.y + d;
    s[1].x1 = f.x - d; s[1].y1 = f.y + c; s[1].x2 = f.x + d; s[1].y2 = f.y - c;
  };
}
function mkSeg(a, e) { return {x1: a[0], y1: a[1], x2: a[2], y2: a[3], e: e}; }

function World(cab) {
  this.cab = cab;
  this.rest = cab.phys.rest; this.wallRest = cab.phys.wallRest; this.fric = cab.phys.fric; this.gscale = cab.phys.grav || 1;
  this.px = []; this.py = []; this.pn = [];
  this.segs = []; this.movers = []; this.sensors = []; this.feats = {tulip: [], wing: null, attacker: null, fans: []};
  this.pool = new BallPool(MAX_BALLS);
  this.balls = this.pool.list;
  this.time = 0;
  this.stats = {launched: 0, out: 0, stuck: 0, escaped: 0, sensors: {}};
  this.onSensor = null; this.onPin = null;
  this.cell = 32; this.cols = Math.ceil(PHYS.W / this.cell); this.rows = Math.ceil(PHYS.H / this.cell);
  this.grid = [];
  this.build();
}
World.prototype.addSensor = function (o) {
  o.hw = o.w / 2; o.hh = o.h / 2;
  if (o.on === undefined) o.on = true;
  this.sensors.push(o);
  return o;
};
World.prototype.build = function () {
  var cab = this.cab, i, j, pins = cab.pins(cab);
  for (i = 0; i < pins.length; i++) { this.px.push(pins[i][0]); this.py.push(pins[i][1]); this.pn.push(0); }
  var nud = cab.nudge || [];
  for (i = 0; i < nud.length; i++) {
    var best = -1, bd = 9;
    for (j = 0; j < this.px.length; j++) {
      var d = vlen(this.px[j] - nud[i].x, this.py[j] - nud[i].y);
      if (d < bd) { bd = d; best = j; }
    }
    if (best >= 0) { this.px[best] += nud[i].dx; this.py[best] += nud[i].dy; this.pn[best] = 1; }
  }
  for (i = 0; i < cab.segs.length; i++) this.segs.push(mkSeg(cab.segs[i], this.wallRest));
  var st = cab.start;
  this.addSensor({kind: 'start', x: st.x, y: st.y, w: st.w, h: st.h, pay: cab.payout.startPay});
  var pk = cab.pockets || [];
  for (i = 0; i < pk.length; i++) this.addSensor({kind: 'pocket', x: pk[i].x, y: pk[i].y, w: pk[i].w, h: pk[i].h, pay: pk[i].pay});
  var f = cab.feat || {}, mv;
  var tl = f.tulips || [];
  for (i = 0; i < tl.length; i++) {
    var sa = mkSeg([0, 0, 0, 0], this.wallRest), sb = mkSeg([0, 0, 0, 0], this.wallRest);
    this.segs.push(sa, sb);
    mv = {name: 'tulip' + i, t: 0, target: 0, rate: 3.4, segs: [sa, sb], fn: tulipFn(tl[i].x, tl[i].y), kind: 'ease'};
    mv.fn(0, mv.segs);
    this.movers.push(mv); this.feats.tulip.push(mv);
    this.addSensor({kind: 'catch', sub: 'tulip', x: tl[i].x, y: tl[i].y + 6, w: 12, h: 12, pay: cab.payout.tulipPay, on: false, mover: mv, thr: 0.8});
  }
  if (f.wings) {
    var w = f.wings, wa = mkSeg([0, 0, 0, 0], this.wallRest), wb = mkSeg([0, 0, 0, 0], this.wallRest);
    this.segs.push(wa, wb);
    mv = {name: 'wing', t: 0, target: 0, rate: 5.5, segs: [wa, wb], fn: wingFn(w.x, w.y, w.dx, w.len, w.closed, w.open), kind: 'ease'};
    mv.fn(0, mv.segs);
    this.movers.push(mv); this.feats.wing = mv;
  }
  if (f.attacker) {
    var a = f.attacker, la = mkSeg([0, 0, 0, 0], this.wallRest);
    this.segs.push(la);
    mv = {name: 'attacker', t: 0, target: 0, rate: 4.0, segs: [la], fn: lidFn(a), kind: 'ease'};
    mv.fn(0, mv.segs);
    this.movers.push(mv); this.feats.attacker = mv;
    this.addSensor({kind: 'catch', sub: 'attacker', x: a.sensor.x, y: a.sensor.y, w: a.sensor.w, h: a.sensor.h, pay: cab.payout.tulipPay, on: false, mover: mv, thr: 0.85});
  }
  var fn = f.fans || [];
  for (i = 0; i < fn.length; i++) {
    var fa = mkSeg([0, 0, 0, 0], this.wallRest), fb = mkSeg([0, 0, 0, 0], this.wallRest);
    this.segs.push(fa, fb);
    mv = {name: 'fan' + i, t: i * 0.9, spd: fn[i].spd, segs: [fa, fb], fn: fanFn(fn[i]), kind: 'spin', def: fn[i]};
    mv.fn(mv.t, mv.segs);
    this.movers.push(mv); this.feats.fans.push(mv);
  }
  var gt = f.gates || [];
  for (i = 0; i < gt.length; i++) this.addSensor({kind: 'gate', idx: i, x: gt[i].x, y: gt[i].y, w: gt[i].w, h: 12});
  /* uniform grid broadphase, built once */
  var reach = PHYS.PIN_R + PHYS.BALL_R + 1.2, cs = this.cell;
  for (i = 0; i < this.cols * this.rows; i++) this.grid.push([]);
  for (i = 0; i < this.px.length; i++) {
    var x0 = Math.floor((this.px[i] - reach) / cs), x1 = Math.floor((this.px[i] + reach) / cs);
    var y0 = Math.floor((this.py[i] - reach) / cs), y1 = Math.floor((this.py[i] + reach) / cs);
    for (var cy = y0; cy <= y1; cy++) for (var cx = x0; cx <= x1; cx++) {
      if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) this.grid[cy * this.cols + cx].push(i);
    }
  }
};
World.prototype.updateMovers = function (dt) {
  for (var i = 0; i < this.movers.length; i++) {
    var m = this.movers[i];
    if (m.kind === 'spin') { m.t += m.spd * dt; m.fn(m.t, m.segs); continue; }
    var d = m.target - m.t;
    if (d !== 0) {
      var st = m.rate * dt;
      m.t = Math.abs(d) <= st ? m.target : m.t + (d > 0 ? st : -st);
      m.fn(m.t, m.segs);
    }
  }
  for (var k = 0; k < this.sensors.length; k++) {
    var s = this.sensors[k];
    if (s.mover) s.on = s.mover.t >= s.thr;
  }
};
World.prototype.free = function () { return this.pool.get(); };
World.prototype.active = function () { return this.pool.count(); };
World.prototype.clear = function () {
  for (var i = 0; i < this.balls.length; i++) this.balls[i].on = false;
};
World.prototype.launch = function (stream, power, jit) {
  var b = this.free();
  if (!b) return null;
  var st = STREAMS[stream], v = lerp(st.vmin, st.vmax, clamp(power, 0, 1));
  v *= 1 + (jit() - 0.5) * 0.05;
  b.on = true; b.rail = st.T; b.rt = 0; b.stream = stream;
  b.evx = v; b.evy = 40 + (jit() - 0.5) * 40;
  b.x = st.path[0][0]; b.y = st.path[0][1]; b.vx = 0; b.vy = 0;
  b.still = 0; b.age = 0; b.gm = 0; b.nud = 0;
  this.stats.launched++;
  return b;
};
World.prototype.bounce = function (b, nx, ny, e, src) {
  var vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    if (-vn < 40) e = 0;
    var j = -(1 + e) * vn;
    b.vx += j * nx; b.vy += j * ny;
    var tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
    var ft = this.fric * j, dv = Math.abs(vt) < ft ? Math.abs(vt) : ft;
    if (vt > 0) dv = -dv;
    b.vx += dv * tx; b.vy += dv * ty;
    if (this.onPin && -vn > 160) this.onPin(b.x - nx * PHYS.BALL_R, b.y - ny * PHYS.BALL_R, -vn, src);
  }
};
World.prototype.collide = function (b) {
  var R = PHYS.BALL_R, rr = R + PHYS.PIN_R, rr2 = rr * rr, i, dx, dy, d2, d, pen;
  var cx = (b.x / this.cell) | 0, cy = (b.y / this.cell) | 0;
  if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) {
    var list = this.grid[cy * this.cols + cx];
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      dx = b.x - this.px[p]; dy = b.y - this.py[p]; d2 = dx * dx + dy * dy;
      if (d2 < rr2) {
        d = Math.sqrt(d2) || 0.0001; pen = rr - d;
        var nx = dx / d, ny = dy / d;
        b.x += nx * pen; b.y += ny * pen;
        this.bounce(b, nx, ny, this.rest, 0);
      }
    }
  }
  for (i = 0; i < this.segs.length; i++) {
    var s = this.segs[i], x1 = s.x1, y1 = s.y1, x2 = s.x2, y2 = s.y2;
    if (b.x + R < (x1 < x2 ? x1 : x2) || b.x - R > (x1 > x2 ? x1 : x2) || b.y + R < (y1 < y2 ? y1 : y2) || b.y - R > (y1 > y2 ? y1 : y2)) continue;
    var ex = x2 - x1, ey = y2 - y1, l2 = ex * ex + ey * ey;
    var t = l2 > 0 ? ((b.x - x1) * ex + (b.y - y1) * ey) / l2 : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    dx = b.x - (x1 + ex * t); dy = b.y - (y1 + ey * t); d2 = dx * dx + dy * dy;
    if (d2 < R * R) {
      d = Math.sqrt(d2);
      var qx, qy;
      if (d < 0.0001) { var l = Math.sqrt(l2) || 1; qx = -ey / l; qy = ex / l; d = 0; } else { qx = dx / d; qy = dy / d; }
      b.x += qx * (R - d); b.y += qy * (R - d);
      this.bounce(b, qx, qy, s.e, 1);
    }
  }
};
World.prototype.fire = function (s, b) {
  var key = s.kind + (s.sub ? ':' + s.sub : '');
  this.stats.sensors[key] = (this.stats.sensors[key] || 0) + 1;
  if (this.onSensor) this.onSensor(s, b);
};
World.prototype.step = function (dt) {
  this.time += dt;
  this.updateMovers(dt);
  var sub = PHYS.SUB_DT, g = PHYS.GRAV * this.gscale, dr = 1 - PHYS.DRAG * sub, VM = PHYS.VMAX, VM2 = VM * VM;
  var out = {x: 0, y: 0};
  for (var i = 0; i < this.balls.length; i++) {
    var b = this.balls[i];
    if (!b.on) continue;
    if (b.rail > 0) {
      b.rt += dt;
      if (b.rt >= b.rail) {
        var st = STREAMS[b.stream];
        b.rail = 0; b.x = st.ex; b.y = st.ey; b.vx = b.evx; b.vy = b.evy; b.age = 0;
      } else {
        railPoint(b.stream, b.rt / b.rail, out); b.x = out.x; b.y = out.y;
        continue;
      }
    }
    b.age += dt;
    for (var k = 0; k < PHYS.SUBSTEPS; k++) {
      b.vy += g * sub; b.vx *= dr; b.vy *= dr;
      var sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > VM2) { var q = VM / Math.sqrt(sp2); b.vx *= q; b.vy *= q; }
      b.x += b.vx * sub; b.y += b.vy * sub;
      this.collide(b); this.collide(b);
    }
    if (b.x < 0 || b.x > PHYS.W || b.y < -30) { b.on = false; this.stats.escaped++; continue; }
    if (b.y > PHYS.OUT_Y) { b.on = false; this.stats.out++; this.fire({kind: 'out'}, b); continue; }
    for (var n = 0; n < this.sensors.length; n++) {
      var s = this.sensors[n];
      if (!s.on) continue;
      if (Math.abs(b.x - s.x) < s.hw && Math.abs(b.y - s.y) < s.hh) {
        if (s.kind === 'gate') {
          var bit = 1 << s.idx;
          if (!(b.gm & bit)) { b.gm |= bit; this.fire(s, b); }
        } else {
          b.on = false; this.fire(s, b); break;
        }
      }
    }
    if (!b.on) continue;
    var spd2 = b.vx * b.vx + b.vy * b.vy;
    if (spd2 < 100) b.still += dt; else b.still = 0;
    if (b.still > PHYS.STUCK_T) {
      b.vx += (((b.id * 37 + b.nud * 11) % 7) - 3) * 28; b.vy -= 70; b.still = 0; b.nud++;
      if (b.nud >= 5) { b.on = false; this.stats.stuck++; this.fire({kind: 'out'}, b); }
    } else if (b.age > 45) { b.on = false; this.stats.stuck++; this.fire({kind: 'out'}, b); }
  }
};
