const { chromium } = require('playwright'); const BASE=process.argv[2]; const fails=[]; let checks=0;
const ok=(c,m)=>{checks++; if(!c) fails.push(m);};
async function rawTap(p,sel){const bb=await p.$eval(sel,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});await p.touchscreen.tap(bb.x,bb.y);}
const pages=['/','/services/','/events/','/about/','/contact/','/reviews/','/privacy/','/terms/','/accessibility/','/services/social-events/','/events/traditional-stage/','/nope/'];
(async()=>{
 const b=await chromium.launch();
 // 1. sticky header on every viewport incl. desktop; no horizontal scroll while scrolled
 for(const [w,h,mob] of [[320,568,1],[390,844,1],[667,375,1],[768,1024,1],[1024,768,0],[1440,900,0]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:!!mob,isMobile:!!mob}); const p=await ctx.newPage();
  for(const u of pages){ await p.goto(BASE+u,{waitUntil:'networkidle'});
   const tot=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
   for(const f of [0.3,0.7,1]){ await p.evaluate(y=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,y)},Math.round(tot*f)); await p.waitForTimeout(40);
    const r=await p.evaluate(()=>({top:Math.round(document.querySelector('.header').getBoundingClientRect().top),sx:scrollX,over:document.documentElement.scrollWidth>document.documentElement.clientWidth}));
    ok(r.top===0,`${w}x${h} ${u} @${f}: header top=${r.top}`); ok(!r.over&&r.sx===0,`${w}x${h} ${u} @${f}: horizontal scroll`);}
   // 3. float button vs footer content at page bottom
   await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight)); await p.waitForTimeout(60);
   const ov=await p.evaluate(()=>{const f=document.querySelector('.float-contact'); if(!f||getComputedStyle(f).display==='none')return[];const fr=f.getBoundingClientRect();
     return [...document.querySelectorAll('footer a,footer span,footer p')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.left<fr.right&&r.right>fr.left&&r.top<fr.bottom&&r.bottom>fr.top&&e.textContent.trim()}).map(e=>e.textContent.trim().slice(0,30))});
   ok(!ov.length,`${w}x${h} ${u}: float button overlaps footer: ${ov}`);
  }
  await ctx.close();
 }
 // 2. mobile menu functional flows when scrolled
 {const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}); const p=await ctx.newPage();
  await p.goto(BASE+'/',{waitUntil:'networkidle'}); await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,2500)});
  await rawTap(p,'.menu-toggle'); await p.waitForTimeout(100);
  // tap outside closes (tap on page content below the menu)
  const nb=await p.$eval('#navigation',n=>n.getBoundingClientRect().bottom); const spot=await p.evaluate(nb=>{for(let y=Math.ceil(nb)+20;y<innerHeight-20;y+=12){for(let x=10;x<innerWidth-10;x+=20){const e=document.elementFromPoint(x,y);if(e&&!e.closest('a,button,nav'))return{x,y}}}return null},nb); await p.touchscreen.tap(spot.x,spot.y); await p.waitForTimeout(100);
  ok(await p.$eval('#navigation',n=>!n.classList.contains('open')),'tap outside closes menu'); ok(await p.evaluate(()=>scrollY)===2500,'scroll position unchanged by menu open/close');
  // link in menu navigates
  await rawTap(p,'.menu-toggle'); await p.waitForTimeout(80); const bb=await p.$eval('#navigation a[href="/about/"]',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}); await p.touchscreen.tap(bb.x,bb.y); await p.waitForURL('**/about/'); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>scrollY)===0,'new page starts at top'); ok(await p.$eval('#navigation',n=>!n.classList.contains('open')),'menu closed on new page');
  // back (bfcache) must not restore an open menu
  await p.goBack(); await p.waitForTimeout(300); ok(await p.$eval('#navigation',n=>!n.classList.contains('open')),'menu closed after back navigation'); ok(await p.$eval('.menu-toggle',e=>e.getAttribute('aria-expanded')==='false'),'aria-expanded reset after back');
  // rotate while open
  await rawTap(p,'.menu-toggle'); await p.setViewportSize({width:844,height:390}); await p.waitForTimeout(150);
  ok(await p.$eval('#navigation',n=>getComputedStyle(n).position!=='absolute'||!n.classList.contains('open')||n.getBoundingClientRect().bottom<=400||n.scrollHeight>n.clientHeight),'rotation with menu open stays usable');
  await ctx.close();}
 // 4. anchor lands below sticky header; 9. keyboard focus not hidden under header
 {const ctx=await b.newContext({viewport:{width:768,height:1024},hasTouch:true,isMobile:true}); const p=await ctx.newPage(); await p.goto(BASE+'/',{waitUntil:'networkidle'});
  await p.click('.hero-discover'); await p.waitForTimeout(900); const r=await p.evaluate(()=>({t:document.querySelector('#selected').getBoundingClientRect().top,h:document.querySelector('.header').getBoundingClientRect().bottom}));
  ok(r.t>=r.h-1,`anchor target hidden under header (target ${r.t} < header ${r.h})`); await ctx.close();}
 for(const [w,h] of [[390,844],[1280,800]]){const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage(); await p.goto(BASE+'/',{waitUntil:'networkidle'});
  let hidden=[]; await p.emulateMedia({reducedMotion:'reduce'}); for(let i=0;i<60;i++){await p.keyboard.press('Tab'); await p.waitForTimeout(60); const r=await p.evaluate(()=>{const e=document.activeElement; if(!e||e===document.body)return null; const b=e.getBoundingClientRect(),hd=document.querySelector('.header').getBoundingClientRect(); return {n:(e.textContent||e.className).trim().slice(0,24),obscured:b.top<hd.bottom-1&&!e.closest('.header'),off:b.bottom>innerHeight+1||b.top<-1}}); if(r&&(r.obscured||r.off)&&!/Skip/.test(r.n)) hidden.push(r.n)}
  ok(!hidden.length,`${w}: keyboard focus hidden: ${[...new Set(hidden)].slice(0,5)}`); await ctx.close();}
 // 5. hover effects don't stick on touch: after tap, button transform none
 {const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}); const p=await ctx.newPage(); await p.goto(BASE+'/services/',{waitUntil:'networkidle'}); await p.evaluate(()=>scrollTo(0,document.body.scrollHeight-900));
  const t=await p.evaluate(()=>{const a=document.querySelector('.closing .button, .text-link'); return getComputedStyle(a).transform}); ok(t==='none','baseline transform none'); await ctx.close();}
 // 6/7. text containers don't clip at tiny widths
 for(const w of [280,320]){const ctx=await b.newContext({viewport:{width:w,height:640},hasTouch:true,isMobile:true}); const p=await ctx.newPage();
  for(const u of ['/','/contact/','/services/','/events/','/about/']){await p.goto(BASE+u,{waitUntil:'networkidle'});
   const r=await p.evaluate(()=>[...document.querySelectorAll('a.button,.button .btn-label,.text-link,.filters button,h1,h2,.float-contact,nav a')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&(e.scrollWidth>e.clientWidth+1)}).map(e=>e.className+':'+e.textContent.trim().slice(0,20)));
   const sx=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
   ok(!r.length,`${w} ${u}: clipped text ${r}`); ok(!sx,`${w} ${u}: horizontal scroll`);} await ctx.close();}
 await b.close(); console.log('checks',checks,'fails',fails.length); console.log([...new Set(fails)].slice(0,30).join('\n'));
})();
