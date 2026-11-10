const fs=require('fs'),vm=require('vm'),path=require('path');
const SRC=path.join(__dirname,'..','src');
function load(files, extra){
  const ctx={console, Math, Date, JSON, Array, Object, Number, String, isFinite, parseInt, parseFloat, setTimeout, clearTimeout, window:{}, document:undefined};
  ctx.window=ctx; vm.createContext(ctx);
  let code=files.map(f=>fs.readFileSync(path.join(SRC,f),'utf8')).join('\n;\n');
  if(extra) code+='\n;\n'+extra;
  vm.runInContext(code,ctx,{filename:'bundle.js'});
  return ctx;
}
module.exports={load};
