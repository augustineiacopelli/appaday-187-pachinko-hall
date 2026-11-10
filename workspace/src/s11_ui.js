/* ===== SECTION 11: UI ===== */
var STATE = null, APPX = null, VIEW = null, WORLD = null, MACH = null, CAB = null;
var UI = {screen: 'hall', overlay: null, dirty: false, acc: 0, hudT: 0, resetT: 0, resetArmed: false, liveT: 0};

function $(id) { return document.getElementById(id); }
function pad3(n) { n = String(Math.min(n, 999)); while (n.length < 3) n = '0' + n; return n; }
function markDirty() { UI.dirty = true; }
function flushSave() {
  if (!STATE) return;
  if (MACH) MACH.persist();
  saveState(STATE); UI.dirty = false;
}
function announce(msg) { var l = $('live'); if (l) l.textContent = msg; }

/* ---- hall ---- */
var FAMILY_TAG = {tulip: 'TULIP', wing: 'WING', digi: 'DIGI'};
function familyLabel(cab) {
  if (cab.variant === 'senpuku') return 'DIGI HIDDEN';
  if (cab.variant === 'battle') return 'DIGI DUEL';
  if (cab.variant === 'kenri') return 'DIGI GATES';
  return FAMILY_TAG[cab.family];
}
function seatHtml(cab, rec) {
  var pal = PALETTES[cab.palette], i, chips = '', stars = '';
  for (i = 0; i < Math.min(6, rec.history.length); i++) chips += '<span class="chip">' + rec.history[i].s + '<em>' + rec.history[i].r + 'R</em></span>';
  if (!chips) chips = '<span class="chip none">no hits logged</span>';
  for (i = 0; i < 5; i++) stars += '<i' + (i < cab.difficulty ? ' class="on"' : '') + '></i>';
  var lamp = '';
  if (rec.mode === 'kakuhen') lamp = '<span class="lamp hot">HOT</span>';
  else if (rec.mode === 'jitan') lamp = '<span class="lamp fast">FAST ' + rec.jl + '</span>';
  return '<article class="seat" style="--pal:' + hex6(pal.glow) + ';--pal2:' + hex6(pal.plate) + '">' +
    '<div class="seat-head"><span class="era">' + cab.era + '</span><h2>' + cab.name + '</h2><span class="fam">' + familyLabel(cab) + '</span></div>' +
    '<div class="counter" aria-label="Data counter">' +
      '<div class="led-wrap"><span class="led-lbl">SINCE HIT</span><b class="led">' + pad3(rec.since) + '</b></div>' +
      '<div class="cnt-side"><span class="cnt-line">SPINS <b>' + rec.spins + '</b></span>' + lamp + '</div>' +
    '</div>' +
    '<div class="chips" aria-label="Recent hits, spins before each hit and rounds">' + chips + '</div>' +
    '<p class="tip">' + cab.tip + '</p>' +
    '<div class="seat-foot"><span class="diff" role="img" aria-label="Difficulty ' + cab.difficulty + ' of 5">' + stars + '</span>' +
    '<button class="btn sit" data-sit="' + cab.id + '">Sit down</button></div></article>';
}
function renderSeatCards() {
  var h = '';
  for (var i = 0; i < CABS.length; i++) h += seatHtml(CABS[i], STATE.cabs[CABS[i].id]);
  $('seat-grid').innerHTML = h;
  $('bank-hall').textContent = STATE.bank;
}
function setScreen(name) {
  UI.screen = name;
  $('hall').classList.toggle('active', name === 'hall');
  $('cabinet').classList.toggle('active', name === 'cabinet');
  if (APPX) { if (name === 'cabinet') APPX.ticker.start(); else APPX.ticker.stop(); }
}
function showHall() {
  releaseAll();
  setScreen('hall');
  renderSeatCards();
}

/* ---- cabinet ---- */
function machineEvent(type, d) {
  if (type === 'persist') { markDirty(); return; }
  var v = VIEW;
  if (type === 'pay') {
    STATE.bank += d.n; markDirty();
    if (v && d.x) { v.popup(d.x, d.y, d.n, d.why === 'round' ? v.pal.hot : 0xffffff); }
    if (d.why === 'start' || d.why === 'round' || d.why === 'catch') Sfx.pocket();
  } else if (type === 'sensor') {
    if (v && (d.kind === 'start' || d.kind === 'pocket' || d.kind === 'catch')) {
      v.burst(d.x, d.y, v.pal.hot, d.kind === 'start' ? 10 : 6, 150);
      if (d.kind === 'start') v.startFlash = 1;
    }
  } else if (type === 'reach') {
    Sfx.reach(); announce(d === 2 ? 'Super reach' : 'Reach');
  } else if (type === 'jackpot') {
    Sfx.stinger(); if (v) { v.showBanner('JACKPOT'); v.flashAmt = 1; }
    announce('Jackpot. ' + d.rounds + ' rounds.');
  } else if (type === 'round') {
    Sfx.cascade();
    if (v) v.showBanner('ROUND ' + d);
    announce('Round ' + d + (CAB.payout.aim === 'right' ? '. Shoot right.' : '.'));
  } else if (type === 'duel') {
    Sfx.thud(); announce('Duel');
  } else if (type === 'jackpotEnd') {
    var t = d === 'kakuhen' ? 'KAKUHEN' : (d === 'jitan' ? 'JITAN' : '');
    if (t && v) { v.showBanner(t); v.flashAmt = 0.7; }
    announce(d === 'kakuhen' ? 'Kakuhen. High odds.' : (d === 'jitan' ? 'Jitan. Fast spins.' : 'Jackpot over.'));
    flushSave();
  } else if (type === 'kenri') {
    Sfx.stinger(); if (v) { v.showBanner('KENRI'); v.flashAmt = 0.6; }
    announce('Kenri earned. The next spin is likely a hit.');
  } else if (type === 'gate') {
    if (!d.ok) Sfx.thud();
  }
}
function showCabinet(id) {
  var cab = cabById(id);
  if (!cab || !APPX) return;
  CAB = cab;
  WORLD = new World(cab);
  MACH = createMachine(cab, STATE.cabs[id], WORLD);
  MACH.listener = machineEvent;
  WORLD.onPin = function (x, y, spd) { Sfx.pin(spd); if (VIEW) VIEW.pinSpark(x, y, spd); };
  if (VIEW) { VIEW.destroy(); VIEW = null; }
  VIEW = new RView(APPX, cab, WORLD, MACH, STATE.settings);
  VIEW.aim.stream = IN.stream; VIEW.aim.power = IN.power;
  $('hud-name').textContent = cab.name;
  $('cabinet').style.setProperty('--pal', hex6(PALETTES[cab.palette].glow));
  UI.acc = 0; UI.hudT = 0; IN.cd = 0;
  setScreen('cabinet');
  resizeStage();
  syncHud(true);
  announce(cab.name + '. ' + cab.tip);
}
function leaveCabinet() {
  releaseAll();
  if (MACH) { MACH.flush(); MACH.listener = null; }
  flushSave();
  if (WORLD) WORLD.clear();
  showHall();
}
function resizeStage() {
  if (!APPX || !VIEW) return;
  var host = $('pixi-host'), w = host.clientWidth, h = host.clientHeight;
  if (w < 10 || h < 10) return;
  APPX.renderer.resize(w, h);
  VIEW.layout(w, h);
}
function syncHud(force) {
  if (!MACH) return;
  $('hud-bank').textContent = STATE.bank;
  var lb = MACH.label(), pill = $('hud-mode');
  if (pill.textContent !== lb.text) pill.textContent = lb.text;
  pill.className = 'pill ' + lb.cls;
  $('hud-spins').textContent = MACH.rec.spins;
  $('hud-since').textContent = MACH.rec.since;
  var dem = MACH.aimDemand() && IN.stream !== 'R';
  $('aim').classList.toggle('demand', dem);
  var out = STATE.bank <= 0 && WORLD.active() === 0 && !MACH.spin;
  $('refill').hidden = !(STATE.bank <= 0 && WORLD.active() === 0);
}
function frame(tk) {
  if (UI.screen !== 'cabinet' || !MACH || !VIEW) return;
  var dt = Math.min(tk.deltaMS / 1000, 0.1);
  Sfx.frame();
  IN.cd -= dt;
  if (launching() && IN.cd <= 0 && !UI.overlay) tryLaunch();
  UI.acc += dt;
  var n = 0;
  while (UI.acc >= PHYS.DT && n < 8) { WORLD.step(PHYS.DT); UI.acc -= PHYS.DT; n++; }
  if (n >= 8) UI.acc = 0;
  MACH.update(dt);
  VIEW.update(dt);
  UI.hudT -= dt;
  if (UI.hudT <= 0) { syncHud(); UI.hudT = 0.12; }
}

/* ---- overlays ---- */
function openOverlay(id) {
  releaseAll();
  closeOverlays(true);
  $(id).classList.add('open');
  UI.overlay = id;
  var f = $(id).querySelector('button');
  if (f) f.focus();
}
function closeOverlays(keep) {
  var ids = ['settings-modal', 'help-sheet'];
  for (var i = 0; i < ids.length; i++) $(ids[i]).classList.toggle('open', false);
  if (!keep) UI.overlay = null;
}
function oneIn(x) { return x > 0 ? '1 in ' + Math.round(1 / x) : 'none'; }
function buildHelp() {
  var c = CAB || CABS[0], o = c.odds, p = c.payout, h = '';
  h += '<h2 id="help-title">' + c.name + ' <small>' + c.era + '</small></h2>';
  h += '<p>' + c.blurb + '</p>';
  h += '<h3>Playing</h3><p>Hold the dial, or press and hold the stage, to keep firing. Turn the dial to set launch power, and pick the left or right stream. ' +
       'The marker above the pins shows where your shot lands. Each shot costs one ball and the start pocket pays ' + p.startPay + '.</p>';
  h += '<h3>Odds per spin</h3><p>Base ' + oneIn(o.base) + '.';
  if (o.kaku !== o.base) h += ' Kakuhen ' + oneIn(o.kaku) + ', lasting until the next hit.';
  if (c.odds.kakuRate > 0 && c.variant !== 'battle') h += ' After a hit, ' + Math.round(o.kakuRate * 100) + ' percent go to kakuhen and the rest to jitan.';
  if (c.odds.kakuRate > 0) h += ' Jitan gives ' + PHYS.JITAN_SPINS + ' fast spins at base odds.';
  if (o.reach > 0) h += ' About ' + Math.round(o.reach * 100) + ' percent of misses reach, and some are super reach.';
  h += '</p>';
  h += '<h3>Jackpot</h3><p>' + p.rounds + ' rounds of up to ' + p.balls + ' balls, ' + p.perBall + ' each.' +
       (p.aim === 'right' ? ' The attacker only catches right stream shots, so flip the stream when the AIM lamp pulses.' : ' Any stream works while the feature is open.') + '</p>';
  if (c.variant === 'senpuku') h += '<h3>Hidden mode</h3><p>About ' + Math.round(c.senpuku.p2R * 100) + ' percent of hits are a short 2R. Roughly half of those secretly switch on high odds for ' + 100 + ' spins. The machine looks normal, so read the history.</p>';
  if (c.variant === 'battle') h += '<h3>Duel</h3><p>After the rounds the LCD runs a duel. Win and you get kakuhen. Lose and you get jitan.</p>';
  if (c.variant === 'kenri') h += '<h3>Gates</h3><p>Pass the three gates in order, 1 then 2 then 3. A wrong gate resets the chain, and gate 1 starts it again. Completing it gives the right to a very likely hit on the next spin.</p>';
  if (c.family === 'tulip') h += '<h3>Tulips</h3><p>A ball in the bell pocket opens every tulip for two seconds. A jackpot holds them open.</p>';
  if (c.family === 'wing') h += '<h3>Wings</h3><p>The wings clap on a steady beat. A jackpot latches them open and every ball in the pocket pays.</p>';
  h += '<h3>Reading tip</h3><p>' + c.tip + '</p>';
  h += '<p class="fine">Leaving the seat settles any spins still waiting. Play balls only, no money.</p>';
  h += '<button class="btn" id="help-close">Got it</button>';
  $('help-body').innerHTML = h;
  $('help-close').addEventListener('click', function () { closeOverlays(); });
}
function syncSettingsUi() {
  $('set-sound').textContent = 'Sound: ' + (STATE.settings.sound ? 'On' : 'Off');
  $('set-sound').setAttribute('aria-pressed', STATE.settings.sound ? 'true' : 'false');
  $('set-reduced').textContent = 'Reduced effects: ' + (STATE.settings.reduced ? 'On' : 'Off');
  $('set-reduced').setAttribute('aria-pressed', STATE.settings.reduced ? 'true' : 'false');
  $('set-reset').textContent = UI.resetArmed ? 'Tap again to confirm' : 'Reset balls and histories';
  $('set-reset').classList.toggle('armed', UI.resetArmed);
}
function doReset() {
  var keep = STATE.settings;
  STATE = defaultState();
  STATE.settings = keep;
  saveState(STATE);
  UI.resetArmed = false;
  syncSettingsUi();
  closeOverlays();
  if (UI.screen === 'cabinet') { if (WORLD) WORLD.clear(); MACH = null; showHall(); }
  else renderSeatCards();
  announce('Balls and histories reset.');
}
function bindUi() {
  $('seat-grid').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-sit]') : null;
    if (b) { Sfx.unlock(); showCabinet(b.getAttribute('data-sit')); }
  });
  $('btn-back').addEventListener('click', leaveCabinet);
  $('gear-hall').addEventListener('click', function () { syncSettingsUi(); openOverlay('settings-modal'); });
  $('btn-gear').addEventListener('click', function () { syncSettingsUi(); openOverlay('settings-modal'); });
  $('btn-help').addEventListener('click', function () { buildHelp(); openOverlay('help-sheet'); });
  $('set-close').addEventListener('click', function () { closeOverlays(); flushSave(); });
  $('set-sound').addEventListener('click', function () { STATE.settings.sound = !STATE.settings.sound; syncSettingsUi(); markDirty(); });
  $('set-reduced').addEventListener('click', function () {
    STATE.settings.reduced = !STATE.settings.reduced; syncSettingsUi(); markDirty();
    if (VIEW) VIEW.applyEffects();
  });
  $('set-reset').addEventListener('click', function () {
    if (!UI.resetArmed) {
      UI.resetArmed = true; syncSettingsUi();
      clearTimeout(UI.resetT);
      UI.resetT = setTimeout(function () { UI.resetArmed = false; syncSettingsUi(); }, 4000);
    } else { clearTimeout(UI.resetT); doReset(); }
  });
  $('refill').addEventListener('click', function () {
    STATE.bank += 200; markDirty(); syncHud(true); announce('The hall lends you 200 balls.');
  });
  var ov = ['settings-modal', 'help-sheet'];
  for (var i = 0; i < ov.length; i++) {
    $(ov[i]).addEventListener('click', function (e) { if (e.target === e.currentTarget) { closeOverlays(); } });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && UI.overlay) closeOverlays(); });
  window.addEventListener('resize', resizeStage);
  window.addEventListener('orientationchange', function () { setTimeout(resizeStage, 250); });
  if (window.ResizeObserver) new ResizeObserver(function () { resizeStage(); }).observe($('pixi-host'));
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushSave(); });
  window.addEventListener('pagehide', flushSave);
  setInterval(function () { if (UI.dirty) flushSave(); }, 1500);
}
