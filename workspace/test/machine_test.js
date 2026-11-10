const {load}=require('./load.js');
const ctx=load(['s01_constants.js','s02_random.js','s03_storage.js','s04_audio.js','s05_physics.js','s06_cabinets.js','s07_rules.js','s08_machine.js'],'');
const MIN=+process.argv[2]||10;
function play(cab, minutes, seedOff){
  const rec=ctx.freshRecord(cab); const w=new ctx.World(cab); const m=ctx.createMachine(cab,rec,w);
  let bank=500, refills=0, jackpots=0, badGo=0, maxBank=500, minBank=500, launches=0;
  const hitsLog=[]; const modes={};
  const og=m.go.bind(m); m.go=function(to){ const r=og(to); if(!r) badGo++; return r; };
  m.listener=function(t,d){ if(t==='pay') bank+=d.n; if(t==='jackpot'){jackpots++;} };
  const rng=ctx.mulberry32(99+seedOff); let cd=0;
  const steps=Math.floor(minutes*60/ctx.PHYS.DT);
  let power=cab.id==='hanemono'||cab.id==='retro-bell'?0.3:0.12;
  for(let i=0;i<steps;i++){
    cd-=ctx.PHYS.DT;
    if(cd<=0){
      if(bank<=0 && w.active()===0){ bank+=200; refills++; }
      if(bank>0){
        const right=m.aimDemand();
        if(w.launch(right?'R':'L', right?0.5:power, rng)){ bank--; launches++; cd=ctx.PHYS.LAUNCH_CD; }
      }
    }
    w.step(ctx.PHYS.DT); m.update(ctx.PHYS.DT);
    modes[m.mode]=(modes[m.mode]||0)+1;
    if(bank>maxBank)maxBank=bank; if(bank<minBank)minBank=bank;
  }
  return {id:cab.id, spins:rec.spins, since:rec.since, hist:rec.history.slice(0,4).map(h=>h.s+'/'+h.r+'R').join(','), jackpots, bank, refills, badGo, launches, spinsPerBall:(m.rec.spins/launches).toFixed(3), maxBank, minBank, modes:JSON.stringify(modes), stuck:w.stats.stuck, esc:w.stats.escaped, sensors:JSON.stringify(w.stats.sensors), paid:m.paid, ret:(m.paid/launches).toFixed(2)};
}
let i=0; for(const cab of ctx.CABS){ const r=play(cab,MIN,i++); console.log(JSON.stringify(r)); }
