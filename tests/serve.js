// Static server mimicking Vercel: trailing slash, brotli, headers from vercel.json, 404.html
const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=process.argv[2],PORT=+process.argv[3]||4180;
const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'..','vercel.json')));
const T={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 for(const r of cfg.redirects||[]){if(u===r.source){res.writeHead(r.permanent?308:307,{Location:r.destination});return res.end();}}
 let f=path.join(ROOT,u);if(u.endsWith('/'))f=path.join(f,'index.html');
 let st=200; if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){ if(!path.extname(u)&&fs.existsSync(path.join(ROOT,u,'index.html'))){res.writeHead(308,{Location:u+'/'});return res.end();} st=404;f=path.join(ROOT,'404.html'); }
 const h={'Content-Type':T[path.extname(f)]||'application/octet-stream'};
 for(const rule of cfg.headers||[]){const re=new RegExp('^'+rule.source.replace(/\(\.\*\)/g,'.*').replace(/\\\\\./g,'\\.')+'$');const m=u.match(new RegExp('^'+rule.source.replace('/(.*)','/.*').replace('(.*)','.*').replace('\\\\.','\\.')+'$'));if(m)for(const k of rule.headers)h[k.key]=k.value;}
 if(!h['Cache-Control'])h['Cache-Control']='public, max-age=0, must-revalidate';
 let body=fs.readFileSync(f);const comp=/\.(html|css|js|xml|txt|json|svg|webmanifest)$/.test(f);
 if(comp&&/br/.test(req.headers['accept-encoding']||'')){body=zlib.brotliCompressSync(body);h['Content-Encoding']='br';}
 h.Vary='Accept-Encoding';res.writeHead(st,h);res.end(body);}).listen(PORT,()=>console.log('up',PORT));
