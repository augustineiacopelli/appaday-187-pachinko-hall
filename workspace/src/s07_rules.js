/* ===== SECTION 7: RULES ===== */
/* Pure routing: what a hit turns into. Used by the live machine and by the hall preplay. */
function routeDefault(cab, out, res) {
  var kr = cab.odds.kakuRate;
  res.rounds = cab.payout.rounds;
  res.next = kr > 0 ? (out.u[5] < kr ? 'kakuhen' : 'jitan') : 'normal';
}
function routeSenpuku(cab, out, res) {
  var s = cab.senpuku;
  if (out.u[6] < s.p2R) {
    res.rounds = 2;
    res.next = out.u[5] < s.pHidden ? 'hidden' : 'normal';
  } else {
    res.rounds = cab.payout.rounds;
    res.next = out.u[5] < cab.odds.kakuRate ? 'kakuhen' : 'jitan';
  }
}
function routeBattle(cab, out, res) {
  res.rounds = cab.payout.rounds;
  res.duelWin = out.u[5] < cab.duel.win;
  res.next = res.duelWin ? 'kakuhen' : 'jitan';
}
function kenriGate(m, s) {
  if (m.kenri) return;
  if (s.idx === m.kstep) {
    m.kstep++;
    m.emit('gate', {idx: s.idx, step: m.kstep, ok: true});
    if (m.kstep >= 3) { m.kstep = 0; m.kenri = true; m.emit('kenri'); }
  } else {
    m.kstep = (s.idx === 0) ? 1 : 0;
    m.emit('gate', {idx: s.idx, step: m.kstep, ok: false});
  }
  m.persist();
}

var Core = {
  startPocket: function (m, s) {
    m.pay(m.cab.payout.startPay, s.x, s.y, 'start');
    if (m.queue.length < PHYS.HOLD_MAX) {
      m.queue.push(m.stream.next());
      m.rec.cursor = m.stream.cursor;
      m.emit('hold', m.queue.length);
      return true;
    }
    m.emit('full');
    return false;
  },
  resolveSpin: function (m, spin) {
    var rec = m.rec, res = spin.res;
    rec.spins++; rec.since++;
    m.lastSyms = res.syms;
    if (res.hit) {
      rec.history.unshift({s: rec.since, r: res.rounds});
      if (rec.history.length > 12) rec.history.length = 12;
      rec.since = 0; m.hid = 0; m.kenri = false; m.kstep = 0;
      m.beginJackpot(res);
    } else {
      if (m.base === 'jitan') { m.jl--; if (m.jl <= 0) { m.jl = 0; m.base = 'normal'; } }
      if (m.hid > 0) m.hid--;
      if (res.usedKenri) m.kenri = false;
      m.go(m.base);
      m.emit('miss', res);
    }
  },
  roundBall: function (m, s) {
    var jp = m.jp, po = m.cab.payout;
    if (jp && jp.stage === 'open' && jp.balls < po.balls) {
      jp.balls++; jp.paid += po.perBall;
      m.pay(po.perBall, s.x, s.y, 'round');
      m.emit('catch', jp.balls);
    } else {
      m.pay(1, s.x, s.y, 'catch');
    }
  }
};

var tulipRules = {
  startIsCatch: false, hooks: {}, route: routeDefault,
  tick: function (m, dt) {
    var open = m.jpOpen || m.tulipT > 0, f = m.world.feats.tulip;
    if (m.tulipT > 0) m.tulipT -= dt;
    for (var i = 0; i < f.length; i++) f[i].target = open ? 1 : 0;
  },
  onStartPocket: function (m, s) { Core.startPocket(m, s); m.tulipT = 2; },
  onSpinResolve: function (m, spin) { Core.resolveSpin(m, spin); },
  onJackpotStart: function (m, res) { m.tulipT = 0; },
  onRoundBall: function (m, s) { Core.roundBall(m, s); },
  onJackpotEnd: function (m) { return true; }
};

var wingRules = {
  startIsCatch: true, hooks: {}, route: routeDefault,
  tick: function (m, dt) {
    var w = m.world.feats.wing;
    if (!w) return;
    w.target = m.jpOpen ? 1 : ((m.time % 2.6) < 1.0 ? 1 : 0);
  },
  onStartPocket: function (m, s) { Core.startPocket(m, s); },
  onSpinResolve: function (m, spin) { Core.resolveSpin(m, spin); },
  onJackpotStart: function (m, res) {},
  onRoundBall: function (m, s) { Core.roundBall(m, s); },
  onJackpotEnd: function (m) { return true; }
};

var digiRules = {
  startIsCatch: false, hooks: {}, route: routeDefault,
  tick: function (m, dt) {
    var a = m.world.feats.attacker;
    if (a) a.target = m.jpOpen ? 1 : 0;
  },
  onStartPocket: function (m, s) { Core.startPocket(m, s); },
  onSpinResolve: function (m, spin) { Core.resolveSpin(m, spin); },
  onJackpotStart: function (m, res) {},
  onRoundBall: function (m, s) { Core.roundBall(m, s); },
  onJackpotEnd: function (m) {
    if (this.hooks.duel && !m.jp.dueled) {
      m.jp.dueled = true; m.jp.stage = 'duel'; m.jp.t = 0;
      m.emit('duel', m.jp.res.duelWin);
      return false;
    }
    return true;
  },
  onGate: function (m, s) { if (this.hooks.onGate) this.hooks.onGate(m, s); }
};
/* variants extend digiRules through hooks only */
function extendDigi(hooks) {
  var o = {};
  for (var k in digiRules) o[k] = digiRules[k];
  o.hooks = hooks;
  if (hooks.route) o.route = hooks.route;
  return o;
}
var senpukuRules = extendDigi({route: routeSenpuku});
var battleRules = extendDigi({route: routeBattle, duel: true});
var kenriRules = extendDigi({onGate: kenriGate});

function rulesFor(cab) {
  if (cab.family === 'tulip') return tulipRules;
  if (cab.family === 'wing') return wingRules;
  if (cab.variant === 'senpuku') return senpukuRules;
  if (cab.variant === 'battle') return battleRules;
  if (cab.variant === 'kenri') return kenriRules;
  return digiRules;
}
