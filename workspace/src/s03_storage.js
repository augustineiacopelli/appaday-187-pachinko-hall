/* ===== SECTION 3: STORAGE ===== */
function reducedDefault() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}
function freshRecord(cab) {
  var rec = {seed: cab.seed, cursor: 0, spins: 0, since: 0, history: [], mode: 'normal', hid: 0, jl: 0, kn: 0, ks: 0};
  preplay(cab, rec);
  return rec;
}
function defaultState() {
  var s = {
    version: APP.version,
    wallet: ECON.startYen - ECON.bill, tray: Math.floor(ECON.bill / 4), stored: 0, rate: 4,
    spent: ECON.bill, cashed: 0, best: 0,
    prizes: [], plaques: [], seen: [],
    settings: {sound: true, reduced: reducedDefault()}, cabs: {}
  };
  for (var i = 0; i < CABS.length; i++) s.cabs[CABS[i].id] = freshRecord(CABS[i]);
  return s;
}
function intOr(v, d, lo, hi) {
  v = Number(v);
  if (!isFinite(v)) return d;
  v = Math.floor(v);
  return v < lo ? lo : (v > hi ? hi : v);
}
/* keep only ids the build still knows about, and never more than the list holds */
function idList(raw, allowed) {
  var out = [], i, j;
  if (!Array.isArray(raw)) return out;
  for (i = 0; i < raw.length && out.length < allowed.length; i++) {
    for (j = 0; j < allowed.length; j++) {
      if (raw[i] === allowed[j] && out.indexOf(raw[i]) < 0) { out.push(raw[i]); break; }
    }
  }
  return out;
}
function sanitizeState(o) {
  var d = defaultState(), i;
  if (!o || typeof o !== 'object' || o.version !== APP.version) return d;
  var prizeIds = [], plaqueIds = [], cabIds = [];
  for (i = 0; i < PRIZES.length; i++) prizeIds.push(PRIZES[i].id);
  for (i = 0; i < PLAQUES.length; i++) plaqueIds.push(PLAQUES[i].id);
  for (i = 0; i < CABS.length; i++) cabIds.push(CABS[i].id);
  var s = {
    version: APP.version,
    wallet: intOr(o.wallet, d.wallet, 0, 99999999),
    tray: intOr(o.tray, d.tray, 0, ECON.trayCap),
    stored: intOr(o.stored, 0, 0, 99999999),
    rate: (Number(o.rate) === 1) ? 1 : 4,
    spent: intOr(o.spent, 0, 0, 99999999),
    cashed: intOr(o.cashed, 0, 0, 99999999),
    best: intOr(o.best, 0, 0, 99999999),
    prizes: idList(o.prizes, prizeIds),
    plaques: idList(o.plaques, plaqueIds),
    seen: idList(o.seen, cabIds),
    settings: {sound: true, reduced: d.settings.reduced}, cabs: {}
  };
  if (o.settings && typeof o.settings === 'object') {
    if (typeof o.settings.sound === 'boolean') s.settings.sound = o.settings.sound;
    if (typeof o.settings.reduced === 'boolean') s.settings.reduced = o.settings.reduced;
  }
  for (i = 0; i < CABS.length; i++) {
    var id = CABS[i].id, r = o.cabs && o.cabs[id], rec;
    if (!r || typeof r !== 'object') { s.cabs[id] = d.cabs[id]; continue; }
    rec = {
      seed: intOr(r.seed, CABS[i].seed, 0, 4294967295), cursor: intOr(r.cursor, 0, 0, 99999999),
      spins: intOr(r.spins, 0, 0, 99999999), since: intOr(r.since, 0, 0, 99999999), history: [],
      mode: (r.mode === 'kakuhen' || r.mode === 'jitan') ? r.mode : 'normal',
      hid: intOr(r.hid, 0, 0, 1000), jl: intOr(r.jl, 0, 0, 1000), kn: r.kn ? 1 : 0, ks: intOr(r.ks, 0, 0, 2)
    };
    if (Array.isArray(r.history)) {
      for (var k = 0; k < r.history.length && rec.history.length < 12; k++) {
        var h = r.history[k];
        if (h && typeof h === 'object') rec.history.push({s: intOr(h.s, 1, 1, 99999999), r: intOr(h.r, 1, 1, 99)});
      }
    }
    s.cabs[id] = rec;
  }
  return s;
}
function loadState() {
  try {
    var raw = window.localStorage.getItem(APP.key);
    if (!raw) return defaultState();
    return sanitizeState(JSON.parse(raw));
  } catch (e) {
    return defaultState();
  }
}
function saveState(s) {
  try { window.localStorage.setItem(APP.key, JSON.stringify(s)); return true; } catch (e) { return false; }
}
