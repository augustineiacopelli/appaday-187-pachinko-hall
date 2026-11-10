/* ===== SECTION 12: BOOT ===== */
function showFatal(title, body) {
  var e = $('cdn-error');
  if (e) {
    e.querySelector('h2').textContent = title;
    e.querySelector('p').textContent = body;
    e.classList.add('open');
  }
  document.body.classList.add('nopixi');
}
async function boot() {
  if (typeof PIXI === 'undefined') {
    showFatal('The renderer did not load', 'PixiJS could not be fetched from the network. Check your connection and reload the page.');
    return;
  }
  STATE = loadState();
  Sfx.on = function () { return !!(STATE && STATE.settings.sound); };
  bindUi();
  bindInput();
  renderSeatCards();
  setScreen('hall');
  var app = new PIXI.Application();
  /* v8 initializes asynchronously, so the application is awaited here and never at top level */
  await app.init({
    width: 320, height: 480, background: 0x05080e, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true
  });
  APPX = app;
  var host = $('pixi-host');
  app.canvas.style.display = 'block';
  app.canvas.style.touchAction = 'none';
  host.appendChild(app.canvas);
  bakeTextures();
  app.ticker.add(frame);
  app.ticker.stop();
  if (document.fonts && document.fonts.ready) {
    await Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })]);
  }
  document.documentElement.classList.add('ready');
}
document.addEventListener('DOMContentLoaded', function () {
  boot().catch(function (err) {
    if (window.console) console.error(err);
    showFatal('The renderer could not start', 'This browser could not start WebGL graphics. Try another browser or reload the page.');
  });
});
