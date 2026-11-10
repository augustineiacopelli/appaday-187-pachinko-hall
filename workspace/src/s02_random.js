/* ===== SECTION 2: RANDOMNESS ===== */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function mixSeed(seed, n) {
  var h = (seed ^ Math.imul(n + 1, 0x9E3779B1)) >>> 0;
  h = Math.imul(h ^ h >>> 16, 0x85EBCA6B) >>> 0;
  h = Math.imul(h ^ h >>> 13, 0xC2B2AE35) >>> 0;
  return (h ^ h >>> 16) >>> 0;
}
/* The nth draw depends only on (seed, n). Eight uniforms per draw:
   u0 hit roll, u1 reach roll, u2 reach size, u3 and u4 and u7 symbols, u5 route roll, u6 side roll. */
function OutcomeStream(seed, cursor) {
  this.seed = seed >>> 0;
  this.cursor = cursor | 0;
}
OutcomeStream.prototype.next = function () {
  var r = mulberry32(mixSeed(this.seed, this.cursor));
  var o = {n: this.cursor, u: []};
  for (var i = 0; i < 8; i++) o.u.push(r());
  this.cursor++;
  return o;
};
/* Launch variance only. Never persisted, never read by anything that decides an outcome. */
var jitterStream = mulberry32((Date.now() ^ 0x5bd1e995) >>> 0);
