// v7.1 headless check: no page scrolls sideways at 320x568, 375x667, 390x844 and 430x932, and the front page (#/),
// the Day guide (#/today) and Maps fit with no vertical scroll — on a normal, a lucky and an unlucky day, with and without the Cart.
// v7.2: also plays every tutorial at every size (started from More → Replay a tutorial, or by opening the tab the first time) and checks
// each step's card sits fully on screen, nothing scrolls sideways, and the must-fit screens still don't scroll.
// Usage: node scripts/overflow-check.mjs   (BASE defaults to http://127.0.0.1:8090/; ONLY=tours or ONLY=pages runs one half). Exit code 1 if anything overflows.
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
for (const [w, h] of process.env.ONLY === 'tours' ? [] : SIZES) {
  for (const [luck, day] of [[null, 9], [2, 9], [-2, 9], [null, 12], [2, 12], [-2, 12]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto(BASE + '#/about', { waitUntil: 'networkidle0' });
    await page.evaluate((p) => {
      localStorage.setItem('sdv:ui', JSON.stringify({ onboarded: true, tourSeen: true, tabTours: { progress: true, villagers: true, search: true, more: true } }));
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
// ---------- v7.2 tutorials ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const START = { day: 'Day guide', progress: 'Progress', villagers: 'Villagers & Maps', search: 'Search', more: null };
for (const [w, h] of process.env.ONLY === 'pages' ? [] : SIZES) {
  for (const [id, label] of Object.entries(START)) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto(BASE + '#/about', { waitUntil: 'networkidle0' });
    await page.evaluate((p, id) => {
      localStorage.setItem('sdv:ui', JSON.stringify({ onboarded: true, tourSeen: true, tabTours: id === 'more' ? {} : { progress: true, villagers: true, search: true, more: true } }));
      localStorage.setItem('sdv:profiles', JSON.stringify({ activeId: 'shot', profiles: [p] }));
      localStorage.setItem('sdv:seenVersion', '9.9');
    }, seed(2, 12), id);
    await page.goto(BASE + '#/more', { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    if (label) {
      await page.evaluate(() => { const b = document.querySelector('.replay-btn'); b.scrollIntoView({ block: 'center' }); b.click(); });
      await wait(300);
      await page.evaluate((label) => [...document.querySelectorAll('.replay-dd .dd-row')].find((x) => x.textContent.includes(label)).click(), label);
      await wait(900);
    }
    let n = 0;
    for (; n < 40; n++) {
      if (!(await page.$('.tour-pop'))) break;
      await wait(450);
      const m = await page.evaluate((W, H) => {
        const pop = document.querySelector('.tour-pop').getBoundingClientRect();
        const app = document.querySelector('.app');
        const route = location.hash.slice(2).split(/[/?]/)[0];
        return { title: document.querySelector('.tour-pop b').textContent, route, off: pop.top < 0 || pop.left < 0 || pop.bottom > H || pop.right > W,
          hole: !!document.querySelector('.tour-hole'), docW: document.documentElement.scrollWidth - W, appW: app.scrollWidth - app.clientWidth, v: app.scrollHeight - app.clientHeight };
      }, w, h);
      const fit = ['', 'today', 'maps'].includes(m.route);
      if (m.off || !m.hole || m.docW > 0 || m.appW > 0 || (fit && m.v > 0)) { bad++; console.log(`FAIL tour ${id} ${w}x${h} step ${n + 1} ${JSON.stringify(m)}`); }
      const btn = await page.$('.tour-nav .btn.primary');
      if (!btn) break;
      await btn.click();
      await wait(500);
    }
    if (n === 0) { bad++; console.log(`FAIL tour ${id} ${w}x${h} never opened`); }
    await page.close();
  }
  console.log(`${w}x${h} tours checked`);
}
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'All pages: no sideways scroll; front page, Day guide and Maps fit; every tutorial step fits on screen.');
process.exit(bad ? 1 : 0);
