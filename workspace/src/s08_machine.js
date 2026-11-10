/* ===== SECTION 8: MACHINE STATE ===== */
var EDGES = {
  normal: ['reach', 'jackpot'],
  reach: ['normal', 'kakuhen', 'jitan', 'jackpot'],
  jackpot: ['normal', 'kakuhen', 'jitan'],
  kakuhen: ['reach', 'jackpot'],
  jitan: ['reach', 'jackpot', 'normal']
};

/* Decide one spin from one draw. ctx: {mode, hid, kenri}. Pure. */
function evalSpin(cab, out, ctx) {
  var o = cab.odds, u = out.u, n = cab.lcd.symbols.length;
  var rate = ctx.mode === 'kakuhen' ? o.kaku : (ctx.mode === 'jitan' ? o.jitan : o.base);
  if (ctx.hid) rate = o.kaku;
  var usedKenri = false;
  if (ctx.kenri && o.kenriRate) { rate = Math.max(rate, o.kenriRate); usedKenri = true; }
  var hit = u[0] < rate, reach = 0, syms;
  if (o.reach > 0) {
    if (hit) reach = 1 + (u[2] < o.superHit ? 1 : 0);
    else if (u[1] < o.reach) reach = 1 + (u[2] < o.superRate ? 1 : 0);
  }
  var a = Math.floor(u[4] * n) % n, b = (a + 1 + Math.floor(u[3] * (n - 1))) % n, c;
  /* A slip is the near miss every hall knows: the last reel settles on the winning
     symbol, holds, then creeps one place past it. A hitch is the same move on a win. */
  var slip = false, hitch = false;
  if (hit) {
    syms = [a, a, a];
    hitch = reach === 2 && u[7] < 0.65;
  } else if (reach) {
    slip = u[3] < 0.45;
    if (slip) b = (a + 1) % n;
    syms = [a, b, a];
  } else {
    c = (b + 1 + Math.floor(u[7] * (n - 1))) % n;
    if (c === a) c = (c + 1) % n;
    syms = [a, b, c];
  }
  return {hit: hit, reach: reach, syms: syms, slip: slip, hitch: hitch,
    usedKenri: usedKenri, rounds: 0, next: 'normal', duelWin: false};
}

/* Fast forward past plays so each seat has a believable data counter on day one. */
function preplay(cab, rec) {
  var st = new OutcomeStream(rec.seed, 0), rules = rulesFor(cab);
  var mode = 'normal', jl = 0, hid = 0;
  for (var i = 0; i < cab.pre; i++) {
    var out = st.next(), res = evalSpin(cab, out, {mode: mode, hid: hid > 0, kenri: false});
    rules.route(cab, out, res);
    rec.spins++; rec.since++;
    if (res.hit) {
      rec.history.unshift({s: rec.since, r: res.rounds});
      if (rec.history.length > 12) rec.history.length = 12;
      rec.since = 0; hid = 0;
      if (res.next === 'kakuhen') mode = 'kakuhen';
      else if (res.next === 'jitan') { mode = 'jitan'; jl = PHYS.JITAN_SPINS; }
      else if (res.next === 'hidden') { mode = 'normal'; hid = 100; }
      else mode = 'normal';
    } else {
      if (mode === 'jitan') { jl--; if (jl <= 0) { jl = 0; mode = 'normal'; } }
      if (hid > 0) hid--;
    }
  }
  rec.cursor = st.cursor; rec.mode = mode; rec.jl = jl; rec.hid = hid;
}

function spinPlan(m, res) {
  var th = m.cab.lcd.theme, fast = m.base !== 'normal', a, b, rd, hold;
  if (th === 'drum' || th === 'seg') { a = 0.7; b = 1.2; rd = res.reach ? 1.2 : 0.3; hold = 0.5; }
  else {
    a = fast ? 0.5 : 0.8; b = a + (fast ? 0.35 : 0.5);
    if (res.reach === 0) rd = fast ? 0.3 : 0.5;
    else if (res.reach === 2) rd = fast ? 3.0 : 4.8;
    else rd = fast ? 1.6 : 2.6;
    hold = fast ? 0.4 : 0.6;
  }
  /* a slip or a hitch needs room for the pause, so a plain reach is stretched a little */
  if ((res.slip || res.hitch) && th === 'reel') rd += fast ? 0.5 : 0.9;
  return {a: a, b: b, end: b + rd, hold: hold, dur: b + rd + hold, pause: !!(res.slip || res.hitch)};
}

function Machine(cab, rec, world) {
  this.cab = cab; this.rec = rec; this.world = world;
  this.rules = rulesFor(cab);
  this.stream = new OutcomeStream(rec.seed, rec.cursor);
  this.mode = rec.mode || 'normal'; this.base = this.mode;
  this.queue = []; this.spin = null; this.jp = null; this.jpOpen = false;
  this.jl = rec.jl | 0; this.hid = rec.hid | 0; this.kenri = !!rec.kn; this.kstep = rec.ks | 0;
  this.tulipT = 0; this.time = 0; this.paid = 0;
  this.lastSyms = [0, 1, 2]; this.listener = null;
  world.onSensor = this.onSensor.bind(this);
}
Machine.prototype.emit = function (type, data) { if (this.listener) this.listener(type, data); };
Machine.prototype.pay = function (n, x, y, why) {
  if (n <= 0) return;
  this.paid += n;
  this.emit('pay', {n: n, x: x, y: y, why: why});
};
Machine.prototype.go = function (to) {
  if (this.mode === to) return true;
  if (EDGES[this.mode].indexOf(to) < 0) return false;
  this.mode = to;
  return true;
};
Machine.prototype.persist = function () {
  var r = this.rec;
  r.cursor = this.stream.cursor; r.mode = this.base; r.jl = this.jl; r.hid = this.hid;
  r.kn = this.kenri ? 1 : 0; r.ks = this.kstep;
  this.emit('persist');
};
Machine.prototype.onSensor = function (s, b) {
  switch (s.kind) {
    case 'start':
      if (this.mode === 'jackpot' && this.rules.startIsCatch) this.rules.onRoundBall(this, s);
      else this.rules.onStartPocket(this, s);
      break;
    case 'pocket': this.pay(s.pay, s.x, s.y, 'pocket'); break;
    case 'catch':
      if (this.mode === 'jackpot') this.rules.onRoundBall(this, s);
      else this.pay(s.pay, s.x, s.y, 'catch');
      break;
    case 'gate': this.rules.onGate && this.rules.onGate(this, s); break;
    default: break;
  }
  this.emit('sensor', s);
};
Machine.prototype.startSpin = function () {
  if (this.spin || this.mode === 'jackpot' || !this.queue.length) return false;
  var out = this.queue.shift();
  var res = evalSpin(this.cab, out, {mode: this.base, hid: this.hid > 0, kenri: this.kenri});
  this.rules.route(this.cab, out, res);
  this.spin = {res: res, t: 0, plan: spinPlan(this, res), reached: false};
  this.emit('spinStart', res);
  return true;
};
Machine.prototype.advanceSpin = function (dt) {
  var sp = this.spin;
  sp.t += dt;
  if (!sp.reached && sp.res.reach && sp.t >= sp.plan.b) {
    sp.reached = true;
    this.go('reach');
    this.emit('reach', sp.res.reach);
  }
  if (sp.t >= sp.plan.dur) {
    this.spin = null;
    this.rules.onSpinResolve(this, sp);
    this.persist();
  }
};
Machine.prototype.beginJackpot = function (res) {
  this.go('jackpot');
  this.jp = {stage: 'intro', t: 0, round: 0, rounds: res.rounds, balls: 0, paid: 0, timer: 0, res: res, dueled: false};
  this.jpOpen = false;
  this.emit('jackpot', res);
  this.rules.onJackpotStart(this, res);
};
Machine.prototype.openRound = function () {
  var jp = this.jp;
  jp.round++; jp.balls = 0; jp.timer = this.cab.payout.roundTime; jp.stage = 'open'; jp.t = 0;
  this.jpOpen = true;
  this.emit('round', jp.round);
};
Machine.prototype.closeRound = function () {
  var jp = this.jp;
  this.jpOpen = false; jp.stage = 'gap'; jp.t = 0;
  this.emit('roundEnd', jp.round);
};
Machine.prototype.updateJackpot = function (dt) {
  var jp = this.jp, po = this.cab.payout;
  if (!jp) return;
  jp.t += dt;
  switch (jp.stage) {
    case 'intro': if (jp.t > 1.6) this.openRound(); break;
    case 'open':
      jp.timer -= dt;
      if (jp.balls >= po.balls || jp.timer <= 0) this.closeRound();
      break;
    case 'gap':
      if (jp.t > 0.9) {
        if (jp.round < jp.rounds) this.openRound(); else { jp.stage = 'end'; jp.t = 0; }
      }
      break;
    case 'duel': if (jp.t > 2.8) { jp.stage = 'end'; jp.t = 0; } break;
    case 'end': if (this.rules.onJackpotEnd(this)) this.finishJackpot(); break;
    default: break;
  }
};
Machine.prototype.finishJackpot = function () {
  var next = this.jp ? this.jp.res.next : 'normal';
  this.jpOpen = false; this.jp = null;
  if (next === 'kakuhen') { this.base = 'kakuhen'; }
  else if (next === 'jitan') { this.base = 'jitan'; this.jl = PHYS.JITAN_SPINS; }
  else if (next === 'hidden') { this.base = 'normal'; this.hid = 100; }
  else { this.base = 'normal'; }
  this.go(this.base);
  this.persist();
  this.emit('jackpotEnd', next);
};
Machine.prototype.update = function (dt) {
  this.time += dt;
  this.rules.tick(this, dt);
  if (this.mode === 'jackpot') { this.updateJackpot(dt); return; }
  if (!this.spin) this.startSpin();
  if (this.spin) this.advanceSpin(dt);
};
/* Leaving the seat: settle whatever is pending so no draw is thrown away. */
Machine.prototype.flush = function () {
  var guard = 0, po = this.cab.payout;
  if (this.mode === 'jackpot' && this.jp) {
    var left = Math.max(0, this.jp.rounds - this.jp.round) + (this.jp.stage === 'open' ? 1 : 0);
    this.pay(Math.floor(left * po.balls * po.perBall * 0.6), 0, 0, 'auto');
    this.finishJackpot();
  }
  if (this.spin) {
    var sp = this.spin; this.spin = null;
    this.rules.onSpinResolve(this, sp);
  }
  while ((this.queue.length || this.mode === 'jackpot') && guard++ < 16) {
    if (this.mode === 'jackpot') {
      this.pay(Math.floor(this.jp.rounds * po.balls * po.perBall * 0.6), 0, 0, 'auto');
      this.finishJackpot();
      continue;
    }
    var out = this.queue.shift();
    var res = evalSpin(this.cab, out, {mode: this.base, hid: this.hid > 0, kenri: this.kenri});
    this.rules.route(this.cab, out, res);
    this.rules.onSpinResolve(this, {res: res, t: 0, plan: null, reached: false});
  }
  this.go(this.base);
  this.persist();
};
Machine.prototype.label = function () {
  if (this.mode === 'jackpot' && this.jp) {
    if (this.jp.stage === 'duel') return {text: 'DUEL', cls: 'jp'};
    if (this.jp.stage === 'intro') return {text: 'JACKPOT', cls: 'jp'};
    return {text: 'ROUND ' + Math.max(1, this.jp.round) + ' OF ' + this.jp.rounds, cls: 'jp'};
  }
  if (this.mode === 'reach') return {text: (this.spin && this.spin.res.reach === 2) ? 'SUPER REACH' : 'REACH', cls: 'reach'};
  if (this.mode === 'kakuhen') return {text: 'KAKUHEN', cls: 'kaku'};
  if (this.mode === 'jitan') return {text: 'JITAN ' + this.jl, cls: 'jitan'};
  return {text: 'NORMAL', cls: 'normal'};
};
Machine.prototype.aimDemand = function () {
  return this.mode === 'jackpot' && !!this.jp && this.jp.stage === 'open' && this.cab.payout.aim === 'right';
};
function createMachine(cab, rec, world) { return new Machine(cab, rec, world); }
