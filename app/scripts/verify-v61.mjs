import puppeteer from 'puppeteer-core';
const B = 'http://127.0.0.1:8090/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage(); await page.setViewport({ width: 375, height: 812 });
await page.goto(B, { waitUntil: 'networkidle0' });
const prof = { activeId: 'a', profiles: [] };
await page.evaluate(() => localStorage.clear());
await page.goto(B + '#/', { waitUntil: 'networkidle0' });
// use the app's own first-run Skip so the profile is valid
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Skip/.test(b.textContent))?.click());
await page.evaluate(() => { const u = JSON.parse(localStorage.getItem('sdv:ui') || '{}'); u.tourDone = true; u.onboarded = true; localStorage.setItem('sdv:ui', JSON.stringify(u)); });
const out = [];
for (const r of ['today', 'progress', 'villagers', 'search', 'more']) {
  await page.goto(B + '#/' + r, { waitUntil: 'networkidle0' });
  const t0 = Date.now(); let first = null, n = 0, xs = new Set(), tints = new Set();
  while (Date.now() - t0 < 7000) {
    const info = await page.evaluate(() => [...document.querySelectorAll('.popcorn .pop')].map((e) => ({ x: e.style.left, c: e.className, pe: getComputedStyle(e.parentElement).pointerEvents, z: getComputedStyle(e.parentElement).zIndex, w: e.getBoundingClientRect().width })));
    if (info.length && first === null) { first = Date.now() - t0; n = info.length; info.forEach((i) => { xs.add(i.x); tints.add(i.c); }); out.push(`${r}: first pop at ${(first / 1000).toFixed(1)}s, ${n} Junimo(s), x=${[...xs]}, ${[...tints]}, pointer-events=${info[0].pe}, z=${info[0].z}, width=${info[0].w}px`); }
    if (first !== null) break;
    await new Promise((s) => setTimeout(s, 150));
  }
  if (first === null) out.push(`${r}: NO POP within 7s`);
}
// reduced motion
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto(B + '#/progress', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' });
await new Promise((s) => setTimeout(s, 7000));
out.push('reduced motion pops: ' + await page.evaluate(() => document.querySelectorAll('.popcorn .pop').length));
await page.emulateMediaFeatures([]);
// farm pill icon follows map type
const pill = async () => page.evaluate(() => document.querySelector('.farm-pill .fp-ic img')?.getAttribute('src'));
await page.goto(B + '#/', { waitUntil: 'networkidle0' }); out.push('pill before: ' + await pill());
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('sdv:profiles')); s.profiles[0].farmType = 'beach'; localStorage.setItem('sdv:profiles', JSON.stringify(s)); });
await page.reload({ waitUntil: 'networkidle0' }); out.push('pill after beach: ' + await pill());
await page.goto(B + '#/profiles', { waitUntil: 'networkidle0' });
await page.click('.farm-act .btn:not(.danger)'); await page.click('.farm-opt:nth-child(3)');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Save').click());
await page.goto(B + '#/today', { waitUntil: 'networkidle0' }); out.push('Today pill after Edit→Forest (no reload): ' + await pill());
console.log(out.join('\n')); await browser.close();
