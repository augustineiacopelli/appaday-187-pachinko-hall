const puppeteer=require('puppeteer-core');
const fs=require('fs'),path=require('path');
const FILE='file://'+path.resolve(__dirname,'..','..','index.html');
const PIXI=fs.readFileSync(path.join(__dirname,'node_modules/pixi.js/dist/pixi.min.js'));
async function newPage(browser,w,h,opts){
  opts=opts||{};
  const page=await browser.newPage();
  await page.setViewport({width:w,height:h,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text()); });
  await page.setRequestInterception(true);
  page.on('request',r=>{ const u=r.url();
    if(u.includes('pixi.min.js')){ if(opts.noPixi) r.abort(); else r.respond({status:200,contentType:'application/javascript',body:PIXI}); }
    else if(u.startsWith('file://')) r.continue();
    else r.abort(); });
  if(opts.throwStorage) await page.evaluateOnNewDocument(()=>{ Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}}); });
  return {page,errs};
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
  const mode=process.argv[2]||'smoke';
  if(mode==='smoke'){
    const {page,errs}=await newPage(browser,375,667);
    await page.goto(FILE); await page.waitForSelector('html.ready',{timeout:15000});
    await page.screenshot({path:'/tmp/hall.png'});
    for(const id of ['retro-bell','hanemono','digi','senpuku','battle','kenrimono']){
      await page.evaluate(i=>showCabinet(i),id);
      await page.evaluate(()=>{IN.stageHeld=true; setPower(0.15);});
      await new Promise(r=>setTimeout(r,id==='digi'?9000:6000));
      await page.screenshot({path:'/tmp/cab_'+id+'.png'});
      await page.evaluate(()=>{IN.stageHeld=false; leaveCabinet();});
    }
    console.log('errors:',errs.length?errs.join('\n'):'none');
  }

  if(mode==='audit'){
    for(const [w,h] of [[375,667],[320,568],[414,896]]){
      const {page,errs}=await newPage(browser,w,h);
      await page.goto(FILE); await page.waitForSelector('html.ready',{timeout:15000});
      const small=async(label)=>{ const r=await page.evaluate(()=>{ const out=[]; document.querySelectorAll('button,a,[role=slider]').forEach(e=>{ const b=e.getBoundingClientRect(); const cs=getComputedStyle(e); if(b.width===0||b.height===0||cs.visibility==='hidden'||e.closest('[hidden]')) return; if(b.width<44||b.height<44) out.push((e.id||e.className||e.tagName)+' '+Math.round(b.width)+'x'+Math.round(b.height)); }); return out; }); console.log(w+'x'+h,label,'small targets:',r.length?r.join(' | '):'none'); };
      await small('hall');
      const hs=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      console.log(w,'horizontal overflow',hs);
      await page.evaluate(()=>showCabinet('digi')); await new Promise(r=>setTimeout(r,800));
      await small('cabinet');
      await page.screenshot({path:'/tmp/aud_'+w+'.png'});
      const ov=await page.evaluate(()=>{const a=document.getElementById('pixi-host').getBoundingClientRect(),c=document.getElementById('controls').getBoundingClientRect();return [Math.round(a.bottom),Math.round(c.top),Math.round(c.bottom),innerHeight]});
      console.log(w,'host bottom/controls top/bottom/vh',ov.join(' '));
      console.log(errs.filter(e=>!/ERR_FAILED/.test(e)).join('\n')||'no page errors');
      await page.close();
    }
  }
  if(mode==='nostorage'){
    const {page,errs}=await newPage(browser,375,667,{throwStorage:true});
    await page.goto(FILE); await page.waitForSelector('html.ready',{timeout:15000});
    await page.evaluate(()=>showCabinet('hanemono')); await page.evaluate(()=>{IN.stageHeld=true;}); await new Promise(r=>setTimeout(r,2500));
    console.log('balls bank',await page.evaluate(()=>STATE.bank));
    console.log(errs.filter(e=>!/ERR_FAILED/.test(e)).join('\n')||'no page errors');
  }
  if(mode==='nopixi'){
    const {page,errs}=await newPage(browser,375,667,{noPixi:true});
    await page.goto(FILE); await new Promise(r=>setTimeout(r,2500));
    console.log('cdn-error visible',await page.evaluate(()=>{const e=document.getElementById('cdn-error');const cs=getComputedStyle(e);return !e.hidden&&cs.display!=='none'&&e.getBoundingClientRect().height>0}));
    await page.screenshot({path:'/tmp/nopixi.png'});
  }
  if(mode==='jackpot'){
    const {page,errs}=await newPage(browser,375,667);
    await page.goto(FILE); await page.waitForSelector('html.ready',{timeout:15000});
    for(const id of ['digi','battle','kenrimono','retro-bell']){
      await page.evaluate(i=>showCabinet(i),id);
      const ok=await page.evaluate(()=>{ try{ const st=new OutcomeStream(12345,0); for(let i=0;i<200000;i++){ const out=st.next(); const res=evalSpin(CAB,out,{mode:'normal',hid:false,kenri:false}); if(res.hit){ MACH.rules.route(CAB,out,res); MACH.beginJackpot(res); return 'hit '+res.rounds; } } return 'none'; }catch(e){ return String(e);} });
      await page.evaluate(()=>{IN.stageHeld=true; setPower(0.35);});
      await new Promise(r=>setTimeout(r,id==='battle'?9500:5500));
      await page.screenshot({path:'/tmp/jp_'+id+'.png'});
      console.log(id,'beginJackpot',ok,await page.evaluate(()=>MACH.mode));
      await page.evaluate(()=>{IN.stageHeld=false; leaveCabinet();});
    }
    console.log(errs.filter(e=>!/ERR_FAILED/.test(e)).join('\n')||'no page errors');
  }
  await browser.close();
})();
