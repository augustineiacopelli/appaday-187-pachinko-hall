const {load}=require('./load.js');
const ctx=load(['s01_constants.js','s02_random.js','s05_physics.js','s06_cabinets.js'],'');
const cab=ctx.cabById('kenrimono');
const cnt=[0,0,0]; let n=0, seq=[];
for(let p=0;p<=1.001;p+=0.1){
  const w=new ctx.World(cab); const rng=ctx.mulberry32(7+Math.floor(p*100));
  w.onSensor=function(s,b){ if(s.kind==='gate'){cnt[s.idx]++; seq.push(s.idx);} };
  let launched=0,cd=0;
  while(!(launched>=150&&w.active()===0)){ cd-=ctx.PHYS.DT; if(cd<=0&&launched<150){ if(w.launch('L',p,rng)){launched++;cd=ctx.PHYS.LAUNCH_CD;} } w.step(ctx.PHYS.DT); }
  n+=launched;
}
console.log('gate hits per 100 balls:',cnt.map(c=>(100*c/n).toFixed(1)).join(' / '));
// chain completion simulation using observed order
let st=0,done=0; for(const i of seq){ if(i===st){st++; if(st===3){done++;st=0;}} else st=(i===0)?1:0; }
console.log('chains completed in',n,'balls:',done);
