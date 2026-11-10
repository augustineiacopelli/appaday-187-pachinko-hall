/* ===== SECTION 10: INPUT ===== */
var IN = {stream: 'L', power: 0.35, dialHeld: false, stageHeld: false, keyHeld: false, cd: 0, pid: null};
var DIAL = {R: 27};

function polarXY(cx, cy, r, deg) {
  var a = deg * Math.PI / 180;
  return {x: cx + r * Math.sin(a), y: cy - r * Math.cos(a)};
}
function arcPath(cx, cy, r, a0, a1) {
  var p0 = polarXY(cx, cy, r, a0), p1 = polarXY(cx, cy, r, a1);
  return 'M' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2);
}
function renderDial() {
  var th = -135 + 270 * IN.power, pt = polarXY(0, 0, DIAL.R, th);
  var thumb = document.getElementById('dial-thumb');
  thumb.style.transform = 'translate(' + pt.x.toFixed(1) + 'px,' + pt.y.toFixed(1) + 'px)';
  document.getElementById('dial-val').setAttribute('d', IN.power > 0.004 ? arcPath(50, 50, 40, -135, th) : '');
  document.getElementById('dial-read').textContent = String(Math.round(IN.power * 100));
  var d = document.getElementById('dial');
  d.setAttribute('aria-valuenow', String(Math.round(IN.power * 100)));
  if (typeof VIEW !== 'undefined' && VIEW) VIEW.aim.power = IN.power;
}
function setPower(p) { IN.power = clamp(p, 0, 1); renderDial(); }
function setStream(s) {
  IN.stream = s;
  var bs = document.querySelectorAll('#stream button');
  for (var i = 0; i < bs.length; i++) {
    var on = bs[i].getAttribute('data-stream') === s;
    bs[i].classList.toggle('on', on);
    bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  document.getElementById('aim').classList.toggle('on', s === 'R');
  if (VIEW) VIEW.aim.stream = s;
}
function powerFromEvent(e) {
  var r = document.getElementById('dial').getBoundingClientRect();
  var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return IN.power;
  var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
  if (ang < -135) return 0;
  if (ang > 135) return 1;
  return (ang + 135) / 270;
}
function launching() { return IN.dialHeld || IN.stageHeld || IN.keyHeld; }
function releaseAll() { IN.dialHeld = false; IN.stageHeld = false; IN.keyHeld = false; }
function tryLaunch() {
  if (!WORLD || !MACH) return;
  if (STATE.bank <= 0) { syncHud(true); return; }
  if (WORLD.active() >= MAX_BALLS) return;
  var b = WORLD.launch(IN.stream, IN.power, jitterStream);
  if (b) {
    STATE.bank--; IN.cd = PHYS.LAUNCH_CD;
    Sfx.launch(); markDirty();
  }
}
function bindInput() {
  var dial = document.getElementById('dial'), host = document.getElementById('pixi-host');
  document.addEventListener('pointerdown', function () { Sfx.unlock(); }, {passive: true});
  dial.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    IN.dialHeld = true; IN.pid = e.pointerId;
    try { dial.setPointerCapture(e.pointerId); } catch (x) {}
    setPower(powerFromEvent(e));
  }, {passive: false});
  dial.addEventListener('pointermove', function (e) {
    if (!IN.dialHeld || e.pointerId !== IN.pid) return;
    e.preventDefault();
    setPower(powerFromEvent(e));
  }, {passive: false});
  var endDial = function (e) { if (e.pointerId === IN.pid) { IN.dialHeld = false; IN.pid = null; } };
  dial.addEventListener('pointerup', endDial, {passive: true});
  dial.addEventListener('pointercancel', endDial, {passive: true});
  host.addEventListener('pointerdown', function (e) {
    e.preventDefault(); IN.stageHeld = true;
    try { host.setPointerCapture(e.pointerId); } catch (x) {}
  }, {passive: false});
  var endStage = function () { IN.stageHeld = false; };
  host.addEventListener('pointerup', endStage, {passive: true});
  host.addEventListener('pointercancel', endStage, {passive: true});
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });
  var sb = document.querySelectorAll('#stream button');
  for (var i = 0; i < sb.length; i++) {
    sb[i].addEventListener('click', function (e) { setStream(e.currentTarget.getAttribute('data-stream')); });
  }
  document.getElementById('aim').addEventListener('click', function () { setStream('R'); });
  dial.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setPower(IN.power - 0.04); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setPower(IN.power + 0.04); }
  });
  document.addEventListener('keydown', function (e) {
    if (UI.screen !== 'cabinet' || UI.overlay) return;
    var tag = e.target && e.target.tagName;
    if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); IN.keyHeld = true; Sfx.unlock(); }
    else if (e.key === 'l' || e.key === 'L') setStream('L');
    else if (e.key === 'r' || e.key === 'R') setStream('R');
    else if (e.key === 'ArrowLeft' && tag !== 'DIV') setPower(IN.power - 0.04);
    else if (e.key === 'ArrowRight' && tag !== 'DIV') setPower(IN.power + 0.04);
  });
  document.addEventListener('keyup', function (e) { if (e.key === ' ') IN.keyHeld = false; });
  document.getElementById('dial-track').setAttribute('d', arcPath(50, 50, 40, -135, 135));
  renderDial();
  setStream('L');
}
