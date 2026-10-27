// Renders real pages normally, then with Chromium Auto Dark Mode forced on while the device is in
// dark mode, and fails if any pixel differs. Usage: node tests/force-dark.js http://localhost:4200
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs'), os = require('os'), path = require('path');
const BASE = process.argv[2]; const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fd-'));
const pages = ['/', '/services/', '/events/', '/contact/', '/privacy/', '/404/x'];
const sizes = [[390, 844, true], [1280, 800, false]];
const modes = { 'feature': ['--enable-features=WebContentsForceDark'], 'blink-setting': ['--blink-settings=forceDarkModeEnabled=true'] };
const diff = (a, b) => JSON.parse(execFileSync('python3', ['-I', '-W', 'ignore', '-c', `import sys,json
from PIL import Image, ImageChops
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
d=ImageChops.difference(a,b); bbox=d.getbbox(); px=sum(1 for p in d.getdata() if max(p)>6)
print(json.dumps({'bbox':bbox,'diff':px,'total':a.width*a.height,'bg':list(b.getpixel((3,a.height//2)))}))`, a, b]));
async function shoot(args, scheme, [w, h, mobile], url, file) {
  const b = await chromium.launch({ args, channel: 'chromium' });
  const p = await (await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' })).newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(150); await p.screenshot({ path: file }); await b.close();
}
(async () => {
  let checks = 0; const fails = [];
  for (const sz of sizes) for (const u of pages) {
    const ref = path.join(tmp, 'ref.png'); await shoot([], 'light', sz, BASE + u, ref);
    for (const [name, args] of Object.entries(modes)) {
      const f = path.join(tmp, name + '.png'); await shoot(args, 'dark', sz, BASE + u, f);
      const d = diff(ref, f); checks++;
      if (d.diff > 0) fails.push(`${sz[0]}px ${u} [${name}]: ${d.diff}/${d.total} pixels differ (bg now rgb(${d.bg}))`);
    }
  }
  console.log('checks', checks, 'fails', fails.length); console.log(fails.join('\n'));
  process.exit(fails.length ? 1 : 0);
})();
