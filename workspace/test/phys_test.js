const {load}=require('./load.js');
const ctx=load(['s01_constants.js','s02_random.js','s05_physics.js','s06_cabinets.js'],
`
function runCase(cab, stream, power, nBalls, openAll){
  var w=new World(cab); var rng=mulberry32(12345+Math.floor(power*1000));
  if(openAll){ w.movers.forEach(function(m){ if(m.kind==='ease'){m.target=1;m.t=1;m.fn(1,m.segs);} }); }
  var res={start:0,pocket:0,catchN:0,gate:0,out:0,stuck:0,escaped:0,pen:0,minPen:99,segPen:0,done:0,maxSpd:0,tunnel:0};
  w.onSensor=function(s,b){ if(s.kind==='start')res.start++; else if(s.kind==='pocket')res.pocket++; else if(s.kind==='catch')res.catchN++; else if(s.kind==='gate')res.gate++; else if(s.kind==='out')res.done++; };
  var launched=0, cd=0, t=0, R=PHYS.BALL_R+PHYS.PIN_R;
  var statics=cab.segs;
  while(true){
    cd-=PHYS.DT;
    if(cd<=0 && launched<nBalls){ if(w.launch(stream,power,rng)){launched++; cd=PHYS.LAUNCH_CD;} }
    w.step(PHYS.DT); t+=PHYS.DT;
    for(var i=0;i<w.balls.length;i++){ var b=w.balls[i]; if(!b.on||b.rail>0) continue;
      var sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy); if(sp>res.maxSpd) res.maxSpd=sp;
      var cx=(b.x/32)|0, cy=(b.y/32)|0; if(cx>=0&&cy>=0&&cx<w.cols&&cy<w.rows){ var l=w.grid[cy*w.cols+cx]; for(var k=0;k<l.length;k++){ var p=l[k]; var d=Math.hypot(b.x-w.px[p],b.y-w.py[p])-R; if(d<res.minPen)res.minPen=d; if(d<-0.8)res.pen++; } }
      for(var j=0;j<statics.length;j++){ var dd=segDist(b.x,b.y,statics[j])-PHYS.BALL_R; if(dd<-0.8)res.segPen++; }
      if(b.x<PHYS.WALL_L-1||b.x>PHYS.WALL_R+1||b.y<PHYS.TOP-1) res.tunnel++;
    }
    if(launched>=nBalls && w.active()===0) break;
    if(t>200) break;
  }
  res.stuck=w.stats.stuck; res.escaped=w.stats.escaped; res.launched=launched;
  return res;
}
`);
const N=+process.argv[2]||40;
const mode=process.argv[3]||'sweep';
const t0=Date.now();
let bad=0;
for(const cab of ctx.CABS){
  if(mode==='max'){
    for(const st of ['L','R']){ const r=ctx.runCase(cab,st,1.0,N,false); console.log(cab.id,st,'max',JSON.stringify(r)); if(r.pen||r.segPen||r.tunnel||r.escaped)bad++; }
  } else {
    for(const st of ['L','R']){
      let line=cab.id+' '+st+' start%:';
      let tot={start:0,pocket:0,catchN:0,out:0,stuck:0,n:0,pen:0};
      for(let p=0;p<=1.001;p+=0.1){ const r=ctx.runCase(cab,st,p,N,false); line+=' '+(100*r.start/r.launched).toFixed(0); tot.start+=r.start;tot.pocket+=r.pocket;tot.catchN+=r.catchN;tot.out+=r.out;tot.stuck+=r.stuck;tot.n+=r.launched;tot.pen+=r.pen+r.segPen+r.tunnel+r.escaped; }
      console.log(line,'| avg start',(100*tot.start/tot.n).toFixed(1),'pocket',(100*tot.pocket/tot.n).toFixed(1),'stuck',tot.stuck,'viol',tot.pen);
      if(tot.pen)bad++;
    }
  }
}
console.log('violations cases:',bad,'time',((Date.now()-t0)/1000).toFixed(1),'s');
