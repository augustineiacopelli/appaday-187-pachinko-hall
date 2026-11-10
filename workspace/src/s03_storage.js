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
  var s = {version: APP.version, bank: 500, settings: {sound: true, reduced: reducedDefault()}, cabs: {}};
  for (var i = 0; i < CABS.length; i++) s.cabs[CABS[i].id] = freshRecord(CABS[i]);
  return s;
}
function intOr(v, d, lo, hi) {
  v = Number(v);
  if (!isFinite(v)) return d;
  v = Math.floor(v);
  return v < lo ? lo : (v > hi ? hi : v);
}
function sanitizeState(o) {
  var d = defaultState();
  if (!o || typeof o !== 'object' || o.version !== APP.version) return d;
  var s = {version: APP.version, bank: intOr(o.bank, d.bank, 0, 99999999), settings: {sound: true, reduced: d.settings.reduced}, cabs: {}};
  if (o.settings && typeof o.settings === 'object') {
    if (typeof o.settings.sound === 'boolean') s.settings.sound = o.settings.sound;
    if (typeof o.settings.reduced === 'boolean') s.settings.reduced = o.settings.reduced;
  }
  for (var i = 0; i < CABS.length; i++) {
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
