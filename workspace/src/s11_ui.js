/* ===== SECTION 11: UI ===== */
var STATE = null, APPX = null, VIEW = null, WORLD = null, MACH = null, CAB = null;
var UI = {screen: 'hall', overlay: null, dirty: false, acc: 0, hudT: 0, resetT: 0, resetArmed: false,
  liveT: 0, hits: 0, toastT: 0, cnt: null};

function $(id) { return document.getElementById(id); }
function pad3(n) { n = String(Math.min(n, 999)); while (n.length < 3) n = '0' + n; return n; }
function grp(n) {
  n = String(Math.max(0, Math.floor(n)));
  for (var i = n.length - 3; i > 0; i -= 3) n = n.slice(0, i) + ',' + n.slice(i);
  return n;
}
function yen(n) { return String.fromCharCode(165) + grp(n); }
function markDirty() { UI.dirty = true; }
function flushSave() {
  if (!STATE) return;
  if (MACH) MACH.persist();
  saveState(STATE); UI.dirty = false;
}
function announce(msg) { var l = $('live'); if (l) l.textContent = msg; }

/* ---- plaques ---- */
function plaqueById(id) {
  for (var i = 0; i < PLAQUES.length; i++) if (PLAQUES[i].id === id) return PLAQUES[i];
  return null;
}
function award(id) {
  if (!STATE || STATE.plaques.indexOf(id) >= 0) return false;
  var p = plaqueById(id);
  if (!p) return false;
  STATE.plaques.push(id); markDirty();
  var t = $('toast');
  t.innerHTML = '<span class="t-lbl">PLAQUE EARNED</span><b>' + p.name + '</b><span class="t-note">' + p.note + '</span>';
  t.classList.add('show');
  UI.toastT = 3.4;
  Sfx.stinger();
  announce('Plaque earned. ' + p.name + '.');
  return true;
}
function checkStanding() {
  if (!STATE) return;
  if (STATE.tray >= 2000) award('heavy');
  if (STATE.prizes.length >= 6) award('collector');
  if (STATE.prizes.indexOf('bar') >= 0) award('whale');
  if (STATE.seen.length >= CABS.length) award('tour');
}
function tickToast(dt) {
  if (UI.toastT <= 0) return;
  UI.toastT -= dt;
  if (UI.toastT <= 0) $('toast').classList.remove('show');
}

/* ---- the economy ---- */
function perBill() { return Math.floor(ECON.bill / STATE.rate); }
function rent() {
  if (STATE.wallet < ECON.bill) return false;
  STATE.wallet -= ECON.bill;
  STATE.tray += perBill();
  STATE.spent += ECON.bill;
  markDirty();
  Sfx.pocket();
  announce('Rented ' + perBill() + ' balls for ' + yen(ECON.bill) + '.');
  return true;
}
function stakeMe() {
  STATE.wallet += ECON.lend; markDirty();
  announce('The hall stakes you ' + yen(ECON.lend) + '.');
}
function specialsIn(balls) { return Math.floor(balls / ECON.specialBalls); }
function specialValue() { return Math.round(ECON.specialYen * STATE.rate / 4); }

/* ---- hall ---- */
var FAMILY_TAG = {tulip: 'TULIP', wing: 'WING', digi: 'DIGI'};
function familyLabel(cab) {
  if (cab.variant === 'senpuku') return 'DIGI HIDDEN';
  if (cab.variant === 'battle') return 'DIGI DUEL';
  if (cab.variant === 'kenri') return 'DIGI GATES';
  if (cab.variant === 'smart') return 'SMART';
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
  syncHall();
}
function syncHall() {
  $('wallet-hall').textContent = yen(STATE.wallet);
  $('tray-hall').textContent = grp(STATE.tray);
  $('rate-btn').textContent = STATE.rate + ' YEN';
  $('rate-btn').setAttribute('aria-label', 'Island rate, ' + STATE.rate + ' yen per ball. Tap to switch.');
  var n = specialsIn(STATE.tray);
  $('counter-btn').textContent = n > 0 ? 'Counter (' + n + ')' : 'Counter';
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
    STATE.tray += d.n; markDirty();
    if (v && d.x) { v.popup(d.x, d.y, d.n, d.why === 'round' ? v.pal.hot : 0xffffff); v.cascade(d.x, d.y, d.n); }
    if (d.why === 'start' || d.why === 'round' || d.why === 'catch') Sfx.pocket();
  } else if (type === 'sensor') {
    if (d.kind === 'start') award('firstspin');
    if (v && (d.kind === 'start' || d.kind === 'pocket' || d.kind === 'catch')) {
      v.burst(d.x, d.y, v.pal.hot, d.kind === 'start' ? 10 : 6, 150);
      if (d.kind === 'start') v.startFlash = 1;
    }
  } else if (type === 'reach') {
    Sfx.reach(); announce(d === 2 ? 'Super reach' : 'Reach');
  } else if (type === 'jackpot') {
    Sfx.stinger(); if (v) { v.showBanner('JACKPOT'); v.flashAmt = 1; v.shake = 2; }
    award('firsthit');
    UI.hits++; if (UI.hits >= 3) award('streak');
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
    if (d === 'kakuhen') { award('kakuhen'); if (CAB.variant === 'battle') award('duel'); }
    if (d === 'hidden') award('hidden');
    announce(d === 'kakuhen' ? 'Kakuhen. High odds.' : (d === 'jitan' ? 'Jitan. Fast spins.' : 'Jackpot over.'));
    flushSave();
  } else if (type === 'kenri') {
    Sfx.stinger(); if (v) { v.showBanner('KENRI'); v.flashAmt = 0.6; }
    award('gates');
    announce('Kenri earned. The next spin is likely a hit.');
  } else if (type === 'gate') {
    if (!d.ok) Sfx.thud();
  }
}
function showCabinet(id) {
  var cab = cabById(id);
  if (!cab || !APPX) return;
  CAB = cab;
  if (STATE.seen.indexOf(id) < 0) { STATE.seen.push(id); markDirty(); }
  UI.hits = 0;
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
  checkStanding();
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
  $('hud-bank').textContent = grp(STATE.tray);
  if (VIEW) VIEW.trayCount = STATE.tray;
  var lb = MACH.label(), pill = $('hud-mode');
  if (pill.textContent !== lb.text) pill.textContent = lb.text;
  pill.className = 'pill ' + lb.cls;
  $('hud-spins').textContent = MACH.rec.spins;
  $('hud-since').textContent = MACH.rec.since;
  /* the attacker only takes right stream shots, so the RIGHT button itself warns */
  var dem = MACH.aimDemand() && IN.stream !== 'R', rb = $('stream').querySelector('[data-stream="R"]');
  rb.classList.toggle('demand', dem);
  rb.setAttribute('aria-label', dem ? 'Right stream, needed now for the attacker' : 'Right stream');
  if (MACH.rec.since >= 250) award('patience');
  if (STATE.tray >= 2000) award('heavy');
  var dry = STATE.tray <= 0 && WORLD.active() === 0;
  $('rent-wrap').hidden = !dry;
  if (dry) {
    var can = STATE.wallet >= ECON.bill;
    $('rent-btn').textContent = can ? ('Insert ' + yen(ECON.bill) + ' for ' + perBill() + ' balls') : ('Wallet empty. Take ' + yen(ECON.lend));
    $('rent-note').textContent = can ? ('Wallet ' + yen(STATE.wallet) + ' at ' + STATE.rate + ' yen a ball') : 'The hall will stake you.';
  }
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
  tickToast(dt);
  var sp = MACH.spin;
  if (sp && sp.res.slip && sp.t >= sp.plan.end) award('slip');
  UI.hudT -= dt;
  if (UI.hudT <= 0) { syncHud(); UI.hudT = 0.12; }
}

/* ---- overlays ---- */
var OVERLAYS = ['settings-modal', 'help-sheet', 'counter-sheet', 'case-sheet'];
function openOverlay(id) {
  releaseAll();
  closeOverlays(true);
  $(id).classList.add('open');
  UI.overlay = id;
  var f = $(id).querySelector('button');
  if (f) f.focus();
}
function closeOverlays(keep) {
  for (var i = 0; i < OVERLAYS.length; i++) $(OVERLAYS[i]).classList.toggle('open', false);
  if (!keep) UI.overlay = null;
  if (UI.cnt) { clearInterval(UI.cnt); UI.cnt = null; }
}

/* ---- the counter, the prize shelf and the window round the corner ---- */
function prizeById(id) {
  for (var i = 0; i < PRIZES.length; i++) if (PRIZES[i].id === id) return PRIZES[i];
  return null;
}
function prizeRow(p) {
  var have = STATE.prizes.indexOf(p.id) >= 0, can = STATE.tray >= p.cost;
  return '<button type="button" class="prz' + (have ? ' have' : '') + '" data-prize="' + p.id + '"' +
    (have || !can ? ' disabled' : '') + '>' +
    '<span class="prz-name">' + p.name + '</span>' +
    '<span class="prz-cost">' + (have ? 'ON THE SHELF' : grp(p.cost) + ' balls') + '</span></button>';
}
function counterStage(stage, data) {
  var el = $('cnt-body'), h = '', i;
  if (UI.cnt) { clearInterval(UI.cnt); UI.cnt = null; }
  if (stage === 'tally') {
    h = '<p class="cnt-lead">The tray goes into the counter.</p>' +
        '<div class="jet"><span class="lbl">COUNTED</span><b id="jet-num">0</b></div>';
    el.innerHTML = h;
    var target = STATE.tray, shown = 0, step = Math.max(1, Math.ceil(target / 36));
    UI.cnt = setInterval(function () {
      shown = Math.min(target, shown + step);
      var jn = $('jet-num');
      if (jn) jn.textContent = grp(shown);
      if (shown >= target) { clearInterval(UI.cnt); UI.cnt = null; setTimeout(function () { if (UI.overlay === 'counter-sheet') counterStage('shelf'); }, 420); }
    }, 34);
    return;
  }
  if (stage === 'shelf') {
    var sp = specialsIn(STATE.tray), val = sp * specialValue();
    h += '<div class="jet small"><span class="lbl">IN THE TRAY</span><b>' + grp(STATE.tray) + '</b></div>';
    h += '<h3>Special prize</h3>';
    if (sp > 0) {
      h += '<p>' + sp + ' gold sliver' + (sp === 1 ? '' : 's') + ' in a plastic case, ' + grp(ECON.specialBalls) + ' balls each. ' +
           'The hall cannot pay you cash, but the window round the corner buys them for ' + yen(val) + '.</p>';
      h += '<button type="button" class="btn" id="cnt-special">Take ' + sp + ' and walk round</button>';
    } else {
      h += '<p>You need ' + grp(ECON.specialBalls) + ' balls for one. You have ' + grp(STATE.tray) + '.</p>';
    }
    h += '<h3>The shelf</h3><div class="shelf">';
    for (i = 0; i < PRIZES.length; i++) h += prizeRow(PRIZES[i]);
    h += '</div>';
    h += '<h3>Member card</h3><p>Leftover balls can sit on the card until your next visit. Stored: ' + grp(STATE.stored) + '.</p>';
    h += '<div class="cnt-row">';
    if (STATE.tray > 0) h += '<button type="button" class="row-btn" id="cnt-store">Store ' + grp(STATE.tray) + ' on the card</button>';
    if (STATE.stored > 0) h += '<button type="button" class="row-btn" id="cnt-draw">Draw ' + grp(STATE.stored) + ' back out</button>';
    h += '</div>';
    h += '<button type="button" class="btn" id="cnt-close">Back to the floor</button>';
    el.innerHTML = h;
    return;
  }
  if (stage === 'walk') {
    h = '<div class="walk" aria-hidden="true"><span class="w-step on">Counter</span><span class="w-dash"></span>' +
        '<span class="w-step on">Prize desk</span><span class="w-dash"></span><span class="w-step on">The window</span></div>' +
        '<p class="cnt-lead">Three doors, three businesses, no gambling anywhere in sight.</p>' +
        '<div class="jet pay"><span class="lbl">PAID OUT</span><b>' + yen(data.yen) + '</b></div>' +
        '<p>' + data.n + ' special prize' + (data.n === 1 ? '' : 's') + ' handed over. ' +
        'They go back to the hall by van tomorrow and someone else wins them.</p>' +
        (STATE.tray > 0 || STATE.stored > 0 ? '<button type="button" class="row-btn" id="cnt-back">Back to the shelf (' + grp(STATE.tray) + ' balls left)</button>' : '') +
        '<button type="button" class="btn" id="cnt-close">Back to the floor</button>';
    el.innerHTML = h;
  }
}
function openCounter() {
  openOverlay('counter-sheet');
  counterStage('tally');
}
function doSpecial() {
  var n = specialsIn(STATE.tray);
  if (n <= 0) return;
  var got = n * specialValue();
  STATE.tray -= n * ECON.specialBalls;
  STATE.wallet += got;
  STATE.cashed += got;
  if (got > STATE.best) STATE.best = got;
  markDirty(); flushSave();
  award('cashout');
  Sfx.cascade();
  announce('Exchanged ' + n + ' special prizes for ' + yen(got) + '.');
  counterStage('walk', {n: n, yen: got});
}
function claimPrize(id) {
  var p = prizeById(id);
  if (!p || STATE.prizes.indexOf(id) >= 0 || STATE.tray < p.cost) return;
  STATE.tray -= p.cost;
  STATE.prizes.push(id);
  markDirty(); flushSave();
  Sfx.pocket();
  announce(p.name + ' claimed.');
  checkStanding();
  counterStage('shelf');
}
function buildCase() {
  var h = '', i, p, have;
  h += '<h2 id="case-title">The case by the door</h2>';
  h += '<div class="stat-row"><span>SPENT<b>' + yen(STATE.spent) + '</b></span><span>CASHED<b>' + yen(STATE.cashed) + '</b></span>' +
       '<span>NET<b class="' + (STATE.cashed - STATE.spent >= 0 ? 'up' : 'down') + '">' +
       (STATE.cashed - STATE.spent >= 0 ? '+' : '-') + yen(Math.abs(STATE.cashed - STATE.spent)) + '</b></span></div>';
  h += '<h3>Prizes taken home (' + STATE.prizes.length + ' of ' + PRIZES.length + ')</h3><div class="shelf show">';
  for (i = 0; i < PRIZES.length; i++) {
    p = PRIZES[i]; have = STATE.prizes.indexOf(p.id) >= 0;
    h += '<div class="prz' + (have ? ' have' : ' locked') + '"><span class="prz-name">' + (have ? p.name : 'Not yet claimed') +
         '</span><span class="prz-cost">' + grp(p.cost) + ' balls</span></div>';
  }
  h += '</div>';
  h += '<h3>Plaques (' + STATE.plaques.length + ' of ' + PLAQUES.length + ')</h3><div class="plaques">';
  for (i = 0; i < PLAQUES.length; i++) {
    p = PLAQUES[i]; have = STATE.plaques.indexOf(p.id) >= 0;
    h += '<div class="plq' + (have ? ' have' : '') + '"><b>' + (have ? p.name : 'Locked') + '</b><span>' + p.note + '</span></div>';
  }
  h += '</div>';
  h += '<button type="button" class="btn" id="case-close">Done</button>';
  $('case-body').innerHTML = h;
  $('case-close').addEventListener('click', function () { closeOverlays(); });
}
function oneIn(x) { return x > 0 ? '1 in ' + Math.round(1 / x) : 'none'; }
function buildHelp() {
  var c = CAB || CABS[0], o = c.odds, p = c.payout, h = '';
  h += '<h2 id="help-title">' + c.name + ' <small>' + c.era + '</small></h2>';
  h += '<p>' + c.blurb + '</p>';
  h += '<h3>Playing</h3><p>Hold the dial, or press and hold the stage, to keep firing. Turn the dial to set launch power, and pick the left or right stream. ' +
       'The marker above the pins shows where your shot lands. Each shot costs one ball from the tray and the start pocket pays ' + p.startPay + '.</p>';
  h += '<h3>Odds per spin</h3><p>Base ' + oneIn(o.base) + '.';
  if (o.kaku !== o.base) h += ' Kakuhen ' + oneIn(o.kaku) + ', lasting until the next hit.';
  if (c.odds.kakuRate > 0 && c.variant !== 'battle') h += ' After a hit, ' + Math.round(o.kakuRate * 100) + ' percent go to kakuhen and the rest to jitan.';
  if (c.odds.kakuRate > 0) h += ' Jitan gives ' + PHYS.JITAN_SPINS + ' fast spins at base odds.';
  if (o.reach > 0) h += ' About ' + Math.round(o.reach * 100) + ' percent of misses reach, and some are super reach.';
  h += '</p>';
  if (o.reach > 0) {
    h += '<h3>Reading the reach</h3><p>A cyan frame is an ordinary reach. A red frame and a CHANCE cut in mean super reach, which is rarer and far more often a hit. ' +
         'When the last reel stops dead on the matching symbol and holds, it has not decided yet: it either slips one place past you or slides home.</p>';
  }
  h += '<h3>Jackpot</h3><p>' + p.rounds + ' rounds of up to ' + p.balls + ' balls, ' + p.perBall + ' each.' +
       (p.aim === 'right' ? ' The attacker only catches right stream shots, so tap RIGHT while it pulses amber.' : ' Any stream works while the feature is open.') + '</p>';
  if (c.variant === 'senpuku') h += '<h3>Hidden mode</h3><p>About ' + Math.round(c.senpuku.p2R * 100) + ' percent of hits are a short 2R. Roughly half of those secretly switch on high odds for ' + 100 + ' spins. The machine looks normal, so read the history.</p>';
  if (c.variant === 'battle') h += '<h3>Duel</h3><p>After the rounds the LCD runs a duel. Win and you get kakuhen. Lose and you get jitan.</p>';
  if (c.variant === 'kenri') h += '<h3>Gates</h3><p>Pass the three gates in order, 1 then 2 then 3. A wrong gate resets the chain, and gate 1 starts it again. Completing it gives the right to a very likely hit on the next spin.</p>';
  if (c.variant === 'smart') h += '<h3>No tray</h3><p>A smart cabinet pays nothing into your hands. Balls still rattle inside, but the unit simply counts, which is why hits are rare and the rush runs long.</p>';
  if (c.family === 'tulip') h += '<h3>Tulips</h3><p>A ball in the bell pocket opens every tulip for two seconds. A jackpot holds them open.</p>';
  if (c.family === 'wing') h += '<h3>Wings</h3><p>The wings clap on a steady beat. A jackpot latches them open and every ball in the pocket pays.</p>';
  h += '<h3>The money</h3><p>Balls are rented, never bought, and they belong to the hall. At ' + STATE.rate + ' yen a ball a ' + yen(ECON.bill) +
       ' note buys ' + perBill() + '. Take the tray to the counter when you leave: ' + grp(ECON.specialBalls) + ' balls make one special prize worth ' + yen(specialValue()) +
       ' at the window round the corner, which is less than they cost to rent. That gap is the hall.</p>';
  h += '<h3>Reading tip</h3><p>' + c.tip + '</p>';
  h += '<p class="fine">Leaving the seat settles any spins still waiting. Play balls only, no real money.</p>';
  h += '<button class="btn" id="help-close">Got it</button>';
  $('help-body').innerHTML = h;
  $('help-close').addEventListener('click', function () { closeOverlays(); });
}
function syncSettingsUi() {
  $('set-sound').textContent = 'Sound: ' + (STATE.settings.sound ? 'On' : 'Off');
  $('set-sound').setAttribute('aria-pressed', STATE.settings.sound ? 'true' : 'false');
  $('set-reduced').textContent = 'Reduced effects: ' + (STATE.settings.reduced ? 'On' : 'Off');
  $('set-reduced').setAttribute('aria-pressed', STATE.settings.reduced ? 'true' : 'false');
  $('set-reset').textContent = UI.resetArmed ? 'Tap again to confirm' : 'Reset the whole visit';
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
  announce('Wallet, tray, prizes and histories reset.');
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
  $('rate-btn').addEventListener('click', function () {
    STATE.rate = STATE.rate === 4 ? 1 : 4; markDirty(); syncHall();
    announce('Island rate ' + STATE.rate + ' yen a ball.');
  });
  $('counter-btn').addEventListener('click', function () { Sfx.unlock(); openCounter(); });
  $('case-btn').addEventListener('click', function () { buildCase(); openOverlay('case-sheet'); });
  $('cnt-body').addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null;
    if (!t) return;
    if (t.id === 'cnt-close') { closeOverlays(); syncHall(); return; }
    if (t.id === 'cnt-special') { doSpecial(); syncHall(); return; }
    if (t.id === 'cnt-back') { counterStage('shelf'); return; }
    if (t.id === 'cnt-store') { STATE.stored += STATE.tray; STATE.tray = 0; markDirty(); flushSave(); counterStage('shelf'); syncHall(); return; }
    if (t.id === 'cnt-draw') { STATE.tray += STATE.stored; STATE.stored = 0; markDirty(); flushSave(); counterStage('shelf'); syncHall(); return; }
    var pid = t.getAttribute('data-prize');
    if (pid) { claimPrize(pid); syncHall(); }
  });
  $('rent-btn').addEventListener('click', function () {
    if (STATE.wallet >= ECON.bill) rent(); else stakeMe();
    syncHud(true); syncHall();
  });
  for (var i = 0; i < OVERLAYS.length; i++) {
    $(OVERLAYS[i]).addEventListener('click', function (e) { if (e.target === e.currentTarget) { closeOverlays(); syncHall(); } });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && UI.overlay) { closeOverlays(); syncHall(); } });
  window.addEventListener('resize', resizeStage);
  window.addEventListener('orientationchange', function () { setTimeout(resizeStage, 250); });
  if (window.ResizeObserver) new ResizeObserver(function () { resizeStage(); }).observe($('pixi-host'));
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushSave(); });
  window.addEventListener('pagehide', flushSave);
  setInterval(function () { if (UI.dirty) flushSave(); }, 1500);
  setInterval(function () { if (UI.screen === 'hall') tickToast(0.25); }, 250);
}
