/* ===== SECTION 4: AUDIO ===== */
var Sfx = {
  ctx: null, master: null, budget: 5, on: function () { return true; },
  unlock: function () {
    if (this.ctx) { try { if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {} return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  frame: function () { this.budget = 5; },
  tone: function (freq, dur, type, vol, slide, delay) {
    if (!this.ctx || !this.on()) return;
    try {
      var t0 = this.ctx.currentTime + (delay || 0);
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  },
  noise: function (dur, vol) {
    if (!this.ctx || !this.on()) return;
    try {
      var n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = this.ctx.createBufferSource(), g = this.ctx.createGain();
      s.buffer = buf; g.gain.value = vol;
      s.connect(g); g.connect(this.master); s.start();
    } catch (e) {}
  },
  launch: function () { this.noise(0.05, 0.10); this.tone(180, 0.07, 'square', 0.05, 0.6); },
  pin: function (spd) {
    if (this.budget <= 0) return;
    this.budget--;
    this.tone(1500 + Math.random() * 900, 0.03, 'triangle', clamp(spd / 3000, 0.01, 0.05));
  },
  pocket: function () { this.tone(880, 0.16, 'sine', 0.12); this.tone(1320, 0.2, 'sine', 0.08, 1, 0.04); },
  reach: function () { this.tone(330, 0.5, 'sawtooth', 0.07, 2.2); this.tone(495, 0.5, 'sawtooth', 0.05, 2.2, 0.05); },
  stinger: function () {
    var n = [523, 659, 784, 1047, 784, 1047, 1319];
    for (var i = 0; i < n.length; i++) this.tone(n[i], 0.22, 'square', 0.07, 1, i * 0.09);
  },
  cascade: function () {
    for (var i = 0; i < 7; i++) this.tone(660 + i * 70, 0.1, 'sine', 0.08, 1, i * 0.05);
  },
  thud: function () { this.tone(110, 0.18, 'sine', 0.12, 0.5); }
};
