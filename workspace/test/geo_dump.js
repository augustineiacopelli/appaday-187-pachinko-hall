const {load}=require('./load.js');
const ctx=load(['s01_constants.js','s02_random.js','s05_physics.js','s06_cabinets.js'],
 'var __out=CABS.map(function(c){var w=new World(c);return {id:c.id,pins:w.px.map(function(x,i){return [x,w.py[i],w.pn[i]]}),segs:w.segs.map(function(s){return [s.x1,s.y1,s.x2,s.y2]}),sensors:w.sensors.map(function(s){return [s.kind,s.x,s.y,s.w,s.h,s.sub||""]}),tulip:w.feats.tulip.map(function(m){m.target=1;m.t=1;m.fn(1,m.segs);return m.segs.map(function(s){return [s.x1,s.y1,s.x2,s.y2]})})}});');
require('fs').writeFileSync('/tmp/geo.json',JSON.stringify(ctx.__out));
console.log(ctx.__out.map(c=>c.id+' pins '+c.pins.length+' segs '+c.segs.length).join('\n'));
