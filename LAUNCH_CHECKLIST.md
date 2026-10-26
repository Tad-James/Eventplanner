# Launch checklist

Things the site cannot decide for you. Tick these off before pointing the live domain at Vercel.

## Must confirm
- [ ] **Domain**: canonical URLs, `sitemap.xml`, `robots.txt` and `security.txt` use `SITE_URL` (default `https://www.bgeventmanagement.in`). If different, run `SITE_URL=https://your-domain python3 build.py` and commit.
- [ ] **Legal text**: `/privacy/`, `/terms/` and `/accessibility/` are sensible plain-language drafts for an Indian event business. Have a lawyer review them, in particular the governing-law clause (courts at Madurai) and the DPDP Act wording.
- [ ] **Photos and reviews**: confirm BG. holds permission to show the client photographs and the named reviews (Karthick Army, Siva Rani, Ajith). Anyone can ask for removal (the privacy notice promises prompt action).
- [ ] **Business identity**: if BG. is GST-registered or has a Udyam/legal entity name you want displayed, add it to the footer (not invented here).
- [ ] **Contact details**: +91 97915 14367 receives WhatsApp; bg.eventaura@gmail.com is monitored (it is also the `security.txt` contact).

## Vercel project
- [ ] Framework Preset **Other**; leave build/install commands empty (`vercel.json` already sets `outputDirectory: dist`).
- [ ] Production Deployment Protection / Vercel Authentication set so the public can view the production domain.
- [ ] Do not enable Vercel Web Analytics / Speed Insights unless you also update the CSP in `build.py` and the privacy notice.
- [ ] After DNS is live: submit `/sitemap.xml` in Google Search Console and claim the Google Business Profile.
- [ ] Optional: add the domain to the HSTS preload list once HTTPS is stable on every subdomain.

## Re-check after each change
`python3 build.py` regenerates pages, sitemap and the Content-Security-Policy header in `vercel.json` (it hashes the JSON-LD block). Commit `dist/` and `vercel.json` together.
