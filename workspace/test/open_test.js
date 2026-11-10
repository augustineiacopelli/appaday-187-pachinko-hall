const {load}=require('./load.js');
const fs=require('fs');
const src=fs.readFileSync('phys_test.js','utf8');
const m=src.match(/`\n([\s\S]*?)`\);/);
const ctx=load(['s01_constants.js','s02_random.js','s05_physics.js','s06_cabinets.js'],m[1]);
const N=+process.argv[2]||40;
for(const cab of ctx.CABS){
  for(const st of ['L','R']){
    let line=cab.id+' '+st+' catch%/start% (open):';
    let tc=0,ts=0,n=0;
    for(let p=0;p<=1.001;p+=0.1){ const r=ctx.runCase(cab,st,p,N,true); line+=' '+(100*r.catchN/r.launched).toFixed(0)+'/'+(100*r.start/r.launched).toFixed(0); tc+=r.catchN; ts+=r.start; n+=r.launched; }
    console.log(line,'| avg catch',(100*tc/n).toFixed(1),'start',(100*ts/n).toFixed(1));
  }
}
