const { chromium } = require('playwright');
const ROOT=process.argv[2]; const BASE=process.argv[3]||'http://localhost:4182';
async function rawTap(p,sel){const bb=await p.$eval(sel,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});await p.touchscreen.tap(bb.x,bb.y);}
(async()=>{
 const b=await chromium.launch(); const fails=[]; let checks=0;
 const devs=[[320,568],[360,740],[390,844],[430,932],[375,667],[600,900],[640,360],[667,375],[740,360],[844,390]];
 const pages=['/','/services/','/events/','/about/','/contact/','/privacy/','/services/social-events/','/events/traditional-stage/'];
 for(const [w,h] of devs){
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  for(const u of pages){
   const p=await ctx.newPage(); await p.goto(BASE+u,{waitUntil:'networkidle'});
   const toggleVisible=await p.$eval('.menu-toggle',e=>getComputedStyle(e).display!=='none');
   if(!toggleVisible){await p.close();continue;}
   const total=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
   for(const frac of [0,0.25,0.6,1]){
    const y=Math.round(total*frac); await p.evaluate(y=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,y)},y); await p.waitForTimeout(80);
    const before=await p.evaluate(()=>scrollY);
    const hdr=await p.$eval('.header',e=>Math.round(e.getBoundingClientRect().top));
    checks++; if(hdr!==0) fails.push(`${w}x${h} ${u} y=${y}: header not stuck (top=${hdr}) before opening`);
    await rawTap(p,'.menu-toggle'); await p.waitForTimeout(120);
    const r=await p.evaluate(()=>{const n=document.querySelector('#navigation'),hd=document.querySelector('.header').getBoundingClientRect(),nb=n.getBoundingClientRect();
      const last=n.querySelector('.nav-contact').getBoundingClientRect();
      const mid=document.elementFromPoint(innerWidth/2,nb.top+10);
      return {open:n.classList.contains('open'),hdrTop:Math.round(hd.top),navTop:Math.round(nb.top),navBottom:Math.round(nb.bottom),hdrBottom:Math.round(hd.bottom),vh:innerHeight,sy:scrollY,lastBottom:Math.round(last.bottom),hit:!!(mid&&n.contains(mid)),navScrollable:n.scrollHeight>n.clientHeight+1}});
    checks++;
    if(!r.open) fails.push(`${w}x${h} ${u} y=${y}: menu did not open`);
    if(r.hdrTop!==0) fails.push(`${w}x${h} ${u} y=${y}: header moved to top=${r.hdrTop} after opening (scrollY ${before}->${r.sy})`);
    if(Math.abs(r.sy-before)>2) fails.push(`${w}x${h} ${u} y=${y}: scroll jumped ${before}->${r.sy}`);
    if(Math.abs(r.navTop-r.hdrBottom)>1) fails.push(`${w}x${h} ${u} y=${y}: menu not attached under header (nav ${r.navTop} vs header ${r.hdrBottom})`);
    if(!r.hit) fails.push(`${w}x${h} ${u} y=${y}: menu not hit-testable at its top`);
    if(r.navBottom>r.vh+1 && !r.navScrollable) fails.push(`${w}x${h} ${u} y=${y}: menu taller than viewport and not scrollable (${r.navBottom}>${r.vh})`);
    await p.evaluate(()=>scrollBy(0,Math.min(400,document.documentElement.scrollHeight-innerHeight-scrollY))); await p.waitForTimeout(80);
    const r2=await p.evaluate(()=>{const n=document.querySelector('#navigation').getBoundingClientRect(),h=document.querySelector('.header').getBoundingClientRect();return{h:Math.round(h.top),hb:Math.round(h.bottom),nt:Math.round(n.top),vis:n.top>=0&&n.top<innerHeight}});
    checks++; if(r2.h!==0||Math.abs(r2.nt-r2.hb)>1||!r2.vis) fails.push(`${w}x${h} ${u} y=${y}: menu detached after scrolling while open (header ${r2.h}, nav ${r2.nt} vs ${r2.hb})`);
    await rawTap(p,'.menu-toggle'); await p.waitForTimeout(80);
    const closed=await p.$eval('#navigation',n=>!n.classList.contains('open')); checks++; if(!closed) fails.push(`${w}x${h} ${u}: menu did not close on second tap`);
   }
   await p.close();
  }
  await ctx.close();
 }

 for(const [w,h] of [[641,900],[700,900],[768,1024],[820,1180],[900,800],[1024,768],[1280,800],[1440,900],[1920,1080]]){
  const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
  for(const u of ['/','/events/','/contact/']){ await p.goto(BASE+u,{waitUntil:'networkidle'}); await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,document.documentElement.scrollHeight*0.5)}); await p.waitForTimeout(60);
   const r=await p.evaluate(()=>{const hd=document.querySelector('.header').getBoundingClientRect();const links=[...document.querySelectorAll('#navigation a')].map(a=>a.getBoundingClientRect());return{top:Math.round(hd.top),toggle:getComputedStyle(document.querySelector('.menu-toggle')).display,all:links.every(l=>l.width>0&&l.top>=hd.top&&l.bottom<=hd.bottom+1&&l.right<=innerWidth)}});
   checks++; if(r.top!==0||r.toggle!=='none'||!r.all) fails.push(`${w}x${h} ${u}: inline nav problem ${JSON.stringify(r)}`);}
  await ctx.close();}
 await b.close(); console.log('checks',checks,'fails',fails.length); console.log([...new Set(fails)].slice(0,25).join('\n'));
})();
