# Browser regression tests

Playwright scripts (Chromium). Install once: `npm i -D playwright` (or use a global install and set `NODE_PATH`).

```sh
node tests/serve.js dist 4182 &              # serves dist/ with the headers/redirects from vercel.json
node tests/sticky-menu.js x http://localhost:4182   # mobile menu + sticky header at 10 viewports x 4 scroll positions
node tests/behaviour.js http://localhost:4182       # focus order, anchors, bfcache, rotation, float button, tiny widths
node tests/layout-audit.js dist /tmp/shots          # overflow, tiny text/tap targets, console/CSP errors at 14 widths
```

`sticky-menu.js` guards a real regression: `overflow-x: clip` on `html`/`body` combined with an `overflow: hidden` scroll lock detached the sticky header and made the menu open at the top of the page. Do not add overflow rules to `html`/`body` or lock body scroll for the menu.
