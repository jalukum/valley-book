// v7.1 headless check: no page scrolls sideways at 320x568, 375x667, 390x844 and 430x932, and the front page (#/),
// the Day guide (#/today) and Maps fit with no vertical scroll — on a normal, a lucky and an unlucky day, with and without the Cart.
// Usage: node scripts/overflow-check.mjs   (BASE defaults to http://127.0.0.1:8090/). Exit code 1 if anything overflows.
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8090/';
const SIZES = [[320, 568], [375, 667], [390, 844], [430, 932]];
const ROUTES = ['', 'today', 'today/fish', 'today/forage', 'today/crops', 'today/bundles', 'today/gifts', 'today/cart', 'progress', 'more', 'setup',
  'quests', 'events', 'raccoon', 'road', 'search', 'bundles', 'bundles?filter=today', 'bundles/room/0', 'bundles/room/5', 'bundles/needed', 'bundles/joja',
  'villagers', 'villager/Abigail', 'maps', 'calendar', 'collections', 'museum', 'fish', 'fish?bite', 'shipping', 'cooking', 'crafting', 'goals',
  'perfection', 'walnuts', 'orders', 'achievements', 'slayer', 'notes', 'powers', 'island', 'item/(O)145', 'item/(O)24', 'item/(O)74', 'profiles', 'about'];
const FIT = ['', 'today', 'maps'];
const seed = (luck, day = 9) => ({ id: 'shot', name: 'Shot', date: { season: 0, day, year: 1 }, time: 600, weather: 'sun',
  stars: ['item:(O)145', 'villager:Abigail', 'bundle:Pantry/0', 'item:(O)24'], ...(luck == null ? {} : { luck: { day: 'y1-0-' + day, v: luck } }) });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, h] of SIZES) {
  for (const [luck, day] of [[null, 9], [2, 9], [-2, 9], [null, 12], [2, 12], [-2, 12]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto(BASE + '#/about', { waitUntil: 'networkidle0' });
    await page.evaluate((p) => {
      localStorage.setItem('sdv:ui', JSON.stringify({ onboarded: true, tourSeen: true }));
      localStorage.setItem('sdv:profiles', JSON.stringify({ activeId: 'shot', profiles: [p] }));
      localStorage.setItem('sdv:seenVersion', '9.9');
    }, seed(luck, day));
    const routes = luck == null && day === 9 ? ROUTES : FIT;
    for (const r of routes) {
      await page.goto(BASE + '#/' + r, { waitUntil: 'networkidle0' });
      await page.reload({ waitUntil: 'networkidle0' });
      await new Promise((res) => setTimeout(res, 500));
      const m = await page.evaluate((W) => {
        const skip = (e) => e.closest('.map-layer,.map-wrap,[aria-hidden="true"],[hidden]');
        const app = document.querySelector('.app');
        const scrollers = [...document.querySelectorAll('.app *')].filter((e) => !skip(e) && /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1).map((e) => e.className);
        const wide = [...document.querySelectorAll('.app *')].filter((e) => { if (skip(e)) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.right > W + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed'; })
          .filter((e) => { let a = e.parentElement; while (a && a !== app) { const s = getComputedStyle(a); if (/hidden|clip/.test(s.overflowX)) { const pb = a.getBoundingClientRect(); if (pb.right <= W + 1 && pb.left >= -1) return false; } a = a.parentElement; } return true; })
          .map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]).slice(0, 4);
        return { v: app.scrollHeight - app.clientHeight, docW: document.documentElement.scrollWidth - W, appW: app.scrollWidth - app.clientWidth, scrollers, wide };
      }, w);
      const sideways = m.docW > 0 || m.appW > 0 || m.scrollers.length || m.wide.length;
      const tall = FIT.includes(r) && m.v > 0;
      if (sideways || tall) { bad++; console.log(`FAIL ${w}x${h} luck=${luck} day=${day} #/${r} ${JSON.stringify(m)}`); }
    }
    await page.close();
  }
  console.log(`${w}x${h} checked`);
}
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'All pages: no sideways scroll; front page, Day guide and Maps fit.');
process.exit(bad ? 1 : 0);
