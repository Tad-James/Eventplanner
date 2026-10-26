const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = process.argv[2], OUT = process.argv[3];
const server = http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(ROOT,u);
  if (u.endsWith('/')) f = path.join(f,'index.html');
  if (!fs.existsSync(f)||fs.statSync(f).isDirectory()) { res.statusCode=404; f=path.join(ROOT,'404.html'); }
  const ext = path.extname(f); const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain'};
  res.setHeader('Content-Type',types[ext]||'application/octet-stream'); res.end(fs.readFileSync(f));
}).listen(4173);
const pages = []; (function walk(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) { if (e.isDirectory()) walk(path.join(d,e.name)); else if (e.name==='index.html') pages.push('/'+path.relative(ROOT,d).replace(/\\/g,'/')+(path.relative(ROOT,d)?'/':'')); } })(ROOT);
const sizes = [[320,640],[360,740],[641,900],[700,900],[900,800],[1100,800],[1366,768],[390,844],[430,932],[600,900],[768,1024],[820,1180],[1024,768],[1280,800],[1440,900],[1920,1080]];
(async()=>{
  const browser = await chromium.launch(); const issues=[]; const shots = process.argv[4]==='shots';
  for (const [w,h] of sizes) {
    const ctx = await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,hasTouch:w<900,isMobile:w<900});
    for (const p of pages) {
      const page = await ctx.newPage(); const errs=[];
      page.on('console',m=>{ if(['error','warning'].includes(m.type())) errs.push('console '+m.type()+': '+m.text()); });
      page.on('pageerror',e=>errs.push('pageerror: '+e.message));
      page.on('requestfailed',r=>errs.push('requestfailed: '+r.url()));
      page.on('response',r=>{ if(r.status()>=400 && !r.url().endsWith('/favicon.ico')) errs.push('http '+r.status()+' '+r.url()); });
      await page.goto('http://localhost:4173'+p,{waitUntil:'networkidle'});
      const r = await page.evaluate(()=>{
        const out={}; const de=document.documentElement; out.sw=de.scrollWidth; out.cw=de.clientWidth;
        out.over=[...document.querySelectorAll('body *')].filter(e=>{const b=e.getBoundingClientRect(); return b.width>0&&(b.right>de.clientWidth+1||b.left<-1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('[hidden]')}).slice(0,5).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().left)+'..'+Math.round(e.getBoundingClientRect().right));
        out.small=[...new Set([...document.querySelectorAll('body *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<11&&!e.closest('[aria-hidden=true]')).map(e=>e.tagName+'.'+e.className+'='+getComputedStyle(e).fontSize))].slice(0,8);
        out.tap=[...document.querySelectorAll('a,button')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&(b.height<40||b.width<40)&&getComputedStyle(e).display!=='inline'&&!e.classList.contains('skip')}).slice(0,6).map(e=>(e.className||e.tagName)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));
        out.imgs=[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src);
        out.noalt=[...document.images].filter(i=>!i.hasAttribute('alt')).length;
        out.h1=document.querySelectorAll('h1').length;
        return out; });
      if (r.sw>r.cw) issues.push(`${w} ${p}: horizontal scroll ${r.sw}>${r.cw}`);
      if (r.over.length) issues.push(`${w} ${p}: overflowing ${r.over.join(' | ')}`);
      if (r.small.length) issues.push(`${w} ${p}: small text ${r.small.join(' | ')}`);
      if (r.tap.length && (w<900)) issues.push(`${w} ${p}: small tap ${r.tap.join(' | ')}`);
      if (r.imgs.length) issues.push(`${w} ${p}: broken imgs ${r.imgs}`);
      if (r.h1!==1) issues.push(`${w} ${p}: h1 count ${r.h1}`);
      errs.forEach(e=>issues.push(`${w} ${p}: ${e}`));
      if (shots && [360,768,1440].includes(w) && ['/','/contact/','/services/','/events/','/about/'].includes(p)) await page.screenshot({path:`${OUT}/${w}-${p.replace(/\//g,'_')||'_'}.png`,fullPage:true});
      await page.close();
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  const g={}; issues.forEach(i=>{const m=i.match(/^(\d+) (\S+): (.*)$/); const key=m[3].replace(/\d+x\d+/g,'NxN').slice(0,110); (g[key]=g[key]||{n:0,ex:i}).n++;}); const uniq=Object.entries(g); console.log(uniq.length?uniq.map(([k,v])=>v.n+'x  '+v.ex).join('\n'):'NO ISSUES'); console.log('pages',pages.length,'issues',uniq.length);
})();
