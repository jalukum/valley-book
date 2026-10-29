// Screenshots of every main screen at 393 and 375 px, plus console/overflow/broken-image/offline checks.
// Usage: serve dist on 127.0.0.1:8090, then `node scripts/screenshots.mjs [filter]`.
import puppeteer from 'puppeteer-core';
import { readFile, mkdir } from 'node:fs/promises';
const BASE = process.env.BASE || 'http://127.0.0.1:8090/';
const OUT = new URL('../../shots/', import.meta.url).pathname;
const only = process.argv[2];
await mkdir(OUT, { recursive: true });
const core = JSON.parse(await readFile(new URL('../src/generated/core.json', import.meta.url)));

// A demo farm with some progress so screens look realistic.
function demo() {
  const checked = {};
  let k = 0;
  for (const r of core.rooms) for (const b of r.bundles) { const n = k < 13 ? b.items.length : k < 20 ? 1 : 0; if (n) checked['std:' + b.key] = b.items.slice(0, n).map((_, i) => i); k++; }
  const take = (arr, n) => Object.fromEntries(arr.slice(0, n).map((x) => [x, 1]));
  const hearts = {}; core.npcs.forEach((n, i) => { hearts[n.id] = [10, 4, 8, 2, 6, 0, 10, 3][i % 8]; });
  const gifts = {}; core.npcs.slice(0, 9).forEach((n, i) => { gifts[n.id] = (i % 3); });
  return {
    id: 'demo1', name: 'Sunflower Farm', created: 1, date: { season: 2, day: 13, year: 2 }, weather: 'sun', time: 690,
    flags: { cc: 'auto', bus: 'auto', bridge: true },
    cc: { mode: 'standard', route: 'cc', checked, remix: {}, joja: {} },
    done: {
      museum: take(core.museum.items.map((i) => i.qid), 41), fish: take(core.fish.filter((f) => f.collection).map((f) => f.qid).filter((_, i) => i % 2 === 0), 30),
      shipping: take(core.shipping.map((s) => s.qid), 92), cooking: take(core.recipes.cooking.map((r) => r.id), 23), crafting: take(core.recipes.crafting.map((r) => r.id), 61),
      walnuts: Object.fromEntries(core.walnuts.slice(0, 25).map((w) => [w.id, w.count])), achievements: take(core.achievements.map((a) => a.name), 14),
      slayer: take(core.slayer.map((s) => s.id), 5), notes: take(core.notes.map((n) => n.kind + n.id), 9), powers: take(core.powers.map((p) => p.id), 6), island: take(core.island.map((i) => i.id), 3),
      orders: take(core.orders.map((o) => o.id), 7),
    },
    hearts, gifts, giftWeek: '2-2-1', spouse: null,
    perf: { stardrops: { [core.perfection.stardrops[0].id]: 1, [core.perfection.stardrops[2].id]: 1 }, obelisks: { 'Earth Obelisk': 1 }, goldClock: 0, skills: { Farming: 10, Mining: 8, Foraging: 7, Fishing: 6, Combat: 5 }, waivers: 0 },
  };
}
const base = demo();
const fresh = (id, name, date, weather, extra = {}) => ({ ...base, id, name, date, weather, time: 600, done: {}, hearts: {}, gifts: {}, cc: { ...base.cc, checked: {} },
  perf: { stardrops: {}, obelisks: {}, goldClock: 0, skills: {}, waivers: 0 }, flags: { cc: 'auto', bus: 'auto', bridge: false }, ...extra });
const setup = (o) => ({ mine: 0, skullDepth: 0, tools: { pickaxe: 0, axe: 0, hoe: 0, can: 0 }, rod: 'auto', house: 0, backpack: 12, island: 'auto', skull: 'auto', greenhouse: 'auto', keys: {}, raccoon: 0, raccoonDone: 0, ...o });
// Mid-game Year 2: most of the CC done, Mines bottomed out, bus running.
const mid = { ...base, setup: setup({ mine: 120, skullDepth: 20, tools: { pickaxe: 2, axe: 2, hoe: 1, can: 2 }, rod: 'fiberglass', house: 1, backpack: 36, keys: { skullKey: true, rustyKey: true }, raccoon: 2, raccoonDone: 3 }) };
const y1s1 = fresh('y1s1', 'Parsnip Farm', { season: 0, day: 1, year: 1 }, 'sun', { setup: setup({}) });
const y1su12 = fresh('y1su12', 'Riverland Farm', { season: 1, day: 12, year: 1 }, 'rain', {
  setup: setup({ mine: 35, tools: { pickaxe: 1, axe: 0, hoe: 0, can: 1 }, rod: 'bamboo', backpack: 24 }),
  perf: { stardrops: {}, obelisks: {}, goldClock: 0, skills: { Farming: 4, Mining: 3, Foraging: 3, Fishing: 3, Combat: 2 }, waivers: 0 },
  hearts: Object.fromEntries(core.npcs.slice(0, 12).map((n, i) => [n.id, [2, 3, 4, 1][i % 4]])),
  done: { quests: { 'introductions': 1, 'how-to-win-friends': 1, 'getting-started': 1, 'advancement': 1, 'archaeology': 1, 'rat-problem': 1, 'smelting': 1 } },
  cc: { ...base.cc, checked: Object.fromEntries(core.rooms[0].bundles.slice(0, 2).map((b) => ['std:' + b.key, b.items.map((_, i) => i)])) },
});
const y1w5 = fresh('y1w5', 'Frosty Farm', { season: 3, day: 5, year: 1 }, 'snow', { setup: setup({ mine: 80, tools: { pickaxe: 2, axe: 1, hoe: 1, can: 1 }, rod: 'fiberglass', backpack: 24 }), perf: { stardrops: {}, obelisks: {}, goldClock: 0, skills: { Farming: 6, Mining: 6, Foraging: 5, Fishing: 5, Combat: 4 }, waivers: 0 } });
const y1su14 = { ...y1su12, id: 'y1su14', date: { season: 1, day: 14, year: 1 } };
const f10 = { ...mid, date: { season: 2, day: 10, year: 2 } };
const STORES = {
  y1su12sun: JSON.stringify({ activeId: 'y1su12', profiles: [{ ...y1su12, weather: 'sun' }] }),
  f10storm: JSON.stringify({ activeId: 'demo1', profiles: [{ ...f10, weather: 'storm' }, y1su12] }),
  y1su14green: JSON.stringify({ activeId: 'y1su14', profiles: [{ ...y1su14, weather: 'green' }] }),
  y1w5: JSON.stringify({ activeId: 'y1w5', profiles: [y1w5] }),
  y1su14: JSON.stringify({ activeId: 'y1su14', profiles: [y1su14] }),
  f10: JSON.stringify({ activeId: 'demo1', profiles: [f10, y1su12] }),
  mid: JSON.stringify({ activeId: 'demo1', profiles: [mid, y1su12] }),
  y1s1: JSON.stringify({ activeId: 'y1s1', profiles: [y1s1] }),
  y1su12: JSON.stringify({ activeId: 'y1su12', profiles: [y1su12] }),
};
const UI_DONE = JSON.stringify({ onboarded: true, tourSeen: true });
const STORE = STORES.mid;
const TOUR = JSON.stringify({ onboarded: true, tourSeen: false, tourOpen: true });

// [name, hash, action?, {store, ui}?]
const expand = async (p) => { await p.click('.pc-more'); await sleep(600); };
const promote = async (p) => { await p.click('.pc-best .tick'); await sleep(600); };
const nexts = (n) => async (p) => { await p.click('.tour-nav .btn.primary'); await sleep(700); for (let i = 0; i < n; i++) { await p.click('.tour-nav .btn.primary'); await sleep(300); } await sleep(300); };
const night = async (p) => { await p.addStyleTag({ content: '.sky{--off:-140s !important}' }); await sleep(400); };
const dusk = async (p) => { await p.addStyleTag({ content: '.sky{--off:-106s !important}' }); await sleep(400); };
const setFarm = (t) => async (p) => { await p.evaluate((t) => { const s = JSON.parse(localStorage.getItem('sdv:profiles')); s.profiles.find((x) => x.id === s.activeId).farmType = t; localStorage.setItem('sdv:profiles', JSON.stringify(s)); }, t); await p.reload({ waitUntil: 'networkidle0' }); };
const SHOTS = [
  ['entry', '#/', null, { store: 'y1su12' }],
  ['entry-dusk', '#/', dusk, { store: 'y1su12' }],
  ['entry-night', '#/', night, { store: 'y1su12' }],
  ['entry-reduced-motion', '#/', null, { store: 'y1s1', reduce: true }],
  ['entry-winter', '#/', null, { store: 'y1w5' }],
  ['entry-spring', '#/', null, { store: 'y1s1' }],
  ['entry-summer', '#/', null, { store: 'y1su12sun' }],
  ['entry-fall', '#/', null, { store: 'f10' }],
  ['entry-winter-reduced-motion', '#/', null, { store: 'y1w5', reduce: true }],
  ['today-fall', '#/today', null, { store: 'f10' }],
  ['today-winter', '#/today', null, { store: 'y1w5' }],
  ['tour-welcome', '#/', null, { store: 'y1su12', ui: TOUR, tour: true }],
  ['tour-today-date', '#/', nexts(0), { store: 'y1su12', ui: TOUR, tour: true }],
  ['tour-today-plan', '#/', nexts(1), { store: 'y1su12sun', ui: TOUR, tour: true }],
  ['tour-today-plan-more', '#/', nexts(2), { store: 'y1su12sun', ui: TOUR, tour: true }],
  ['tour-tabs', '#/', nexts(3), { store: 'y1su12', ui: TOUR, tour: true }],
  ['tour-tile-fish', '#/', nexts(4), { store: 'y1su12', ui: TOUR, tour: true }],
  ['tour-tile-cart', '#/', nexts(11), { store: 'y1su12', ui: TOUR, tour: true }],
  ['tour-tile-orders-missing', '#/', nexts(12), { store: 'y1su12', ui: TOUR, tour: true }],
  ['tour-tile-orders', '#/', nexts(12), { store: 'f10', ui: TOUR, tour: true }],
  ['today-plan', '#/today', null, { store: 'y1su12sun' }],
  ['today-plan-expanded', '#/today', expand, { store: 'y1su12sun' }],
  ['today-plan-promoted', '#/today', promote, { store: 'y1su12sun' }],
  ['today-plan-rain', '#/today', null, { store: 'y1su12' }],
  ['today-plan-rain-expanded', '#/today', expand, { store: 'y1su12' }],
  ['today-y1-spring1', '#/today', null, { store: 'y1s1' }],
  ['today-y1-summer12-rain', '#/today', null, { store: 'y1su12' }],
  ['today-y1-summer12-sun', '#/today', null, { store: 'y1su12sun' }],
  ['today-y2-fall10', '#/today', null, { store: 'f10' }],
  ['today-y2-fall10-storm', '#/today', null, { store: 'f10storm' }],
  ['today-y1-winter5-snow', '#/today', null, { store: 'y1w5' }],
  ['today-y1-summer14-green', '#/today', null, { store: 'y1su14green' }],
  ['today-night', '#/today', night, { store: 'y1su12' }],
  ['today-energy-rain', '#/today', async (p) => { await p.click('.day-tabs .dt'); await sleep(300); }, { store: 'y1su12' }],
  ['today-energy-sun', '#/today', async (p) => { await p.click('.day-tabs .dt'); await sleep(300); }, { store: 'y1su12sun' }],
  ['today-birthday-rain', '#/today', async (p) => { const b = await p.$$('.day-tabs .dt'); await b[1].click(); await sleep(300); }, { store: 'y1su12' }],
  ['today-festival', '#/today', async (p) => { const b = await p.$$('.day-tabs .dt'); await b[2].click(); await sleep(300); }, { store: 'y1su12' }],
  ['tile-fish-rain', '#/today/fish', null, { store: 'y1su12' }],
  ['tile-fish-sun', '#/today/fish', null, { store: 'y1su12sun' }],
  ['tile-crops', '#/today/crops', null, { store: 'y1su12' }],
  ['tile-plan', '#/today/plan', null, { store: 'f10' }],
  ['tile-cart', '#/today/cart', null, { store: 'y1su12' }],
  ['tile-cart-expanded', '#/today/cart', async (p) => { const hs = await p.$$('.cg-h'); for (const h of hs.slice(0, 3)) { await h.click(); await sleep(120); } await sleep(400); }, { store: 'y1su12' }],
  ['today-orders-tile', '#/today', async (p) => { await p.evaluate(() => document.querySelector('a[href="#/orders"]')?.scrollIntoView({ block: 'center' })); }, { store: 'f10' }],
  ['today-popcorn', '#/today', async (p) => { await p.evaluate(() => window.__popcorn?.()); await sleep(800); }, { store: 'y1su12sun' }],
  ['search-popcorn', '#/search', async (p) => { await p.waitForSelector('.pop', { timeout: 7000 }); await sleep(1300); }, { store: 'y1su12' }],
  ['progress-popcorn', '#/progress', async (p) => { await p.waitForSelector('.pop', { timeout: 7000 }); await sleep(900); }, { store: 'y1su12' }],
  ['villagers-popcorn', '#/villagers', async (p) => { await p.evaluate(() => window.__popcorn?.()); await sleep(750); }, { store: 'y1su12' }],
  ['back-today-orders', '#/today', async (p) => { await p.click('a[href="#/orders"]'); await sleep(500); await p.click('.back'); await sleep(600); fit.push(`back from Orders (opened from Today) landed on ${await p.evaluate(() => location.hash)}`); }, { store: 'f10' }],
  ['back-deeplink-villager', '#/villager/Abigail', async (p) => { await p.click('.back'); await sleep(600); fit.push(`back from a fresh-open villager page landed on ${await p.evaluate(() => location.hash)}`); }],
  ['back-villager-from-calendar', '#/calendar', async (p) => { await p.click('a[href^="#/villager/"]'); await sleep(500); await p.click('.back'); await sleep(600); fit.push(`back from a villager opened on the Calendar landed on ${await p.evaluate(() => location.hash)}`); }],
  ['date-sheet-rain', '#/today', async (p) => { await p.click('.home-h .datechip'); await sleep(350); }, { store: 'y1su12' }],
  ['date-sheet-fixed', '#/today', async (p) => { await p.click('.home-h .datechip'); await sleep(350); }, { store: 'y1s1' }],
  ['date-sheet-winter', '#/today', async (p) => { await p.click('.home-h .datechip'); await sleep(350); }, { store: 'y1w5' }],
  ['onboarding', '#/', null, { store: 'y1s1', ui: '{}' }],
  ['onboarding-date', '#/', async (p) => { await p.click('.onb-nav .btn.primary'); await sleep(250); }, { store: 'y1s1', ui: '{}' }],
  ['onboarding-setup', '#/', async (p) => { await p.click('.onb-nav .btn.primary'); await sleep(150); await p.click('.onb-nav .btn.primary'); await sleep(250); }, { store: 'y1s1', ui: '{}' }],
  ['progress', '#/progress'], ['setup', '#/setup'], ['setup-y1', '#/setup', null, { store: 'y1s1' }], ['road', '#/road'], ['road-y1', '#/road', null, { store: 'y1s1' }],
  ['quests', '#/quests', null, { store: 'y1su12' }], ['events', '#/events', null, { store: 'y1su12' }], ['raccoon', '#/raccoon'], ['more', '#/more'],
  ['search', '#/search', async (p) => { await p.type('.search input', 'melon'); await sleep(250); }],
  ['bundles', '#/bundles'], ['room-pantry', '#/bundles/room/1'], ['room-remix', '#/bundles/room/0', async (p) => { await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('sdv:profiles')); s.profiles[0].cc.mode = 'remix'; localStorage.setItem('sdv:profiles', JSON.stringify(s)); }); await p.reload({ waitUntil: 'networkidle0' }); }], ['shopping-list', '#/bundles/needed'], ['joja', '#/bundles/joja'],
  ['villagers', '#/villagers'], ['where-now', '#/villagers?now', null, { store: 'y1su12' }], ['villager-abigail', '#/villager/Abigail'], ['villager-schedule', '#/villager/Abigail', async (p) => { await p.evaluate(() => document.querySelector('.timeline')?.closest('.panel')?.scrollIntoView()); }],
  ['calendar', '#/calendar'], ['item-pufferfish', '#/item/(O)128'], ['item-melon', '#/item/(O)254'],
  ['collections', '#/collections'], ['museum', '#/museum'], ['fish', '#/fish'], ['fish-season', '#/fish?season'], ['shipping', '#/shipping'], ['cooking', '#/cooking'], ['crafting', '#/crafting'],
  ['perfection', '#/perfection'], ['walnuts', '#/walnuts'], ['orders', '#/orders'], ['achievements', '#/achievements'], ['slayer', '#/slayer'], ['notes', '#/notes'], ['powers', '#/powers'], ['island', '#/island'],
  ['profiles', '#/profiles'], ['about', '#/about'],
  ['profiles-add', '#/profiles', async (p) => { await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add a farm')).click()); await sleep(350); }, { store: 'f10' }],
  ['profiles-add-date', '#/profiles', async (p) => { await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add a farm')).click()); await sleep(250); await p.type('.onb-f input', 'Fern Hollow'); await p.click('.farm-opt:nth-child(3)'); await p.click('.onb-nav .btn.primary'); await sleep(300); }, { store: 'f10' }],
  ['profiles-edit', '#/profiles', async (p) => { await p.click('.farm-act .btn:not(.danger)'); await sleep(350); }, { store: 'f10' }],
  ['profiles-delete', '#/profiles', async (p) => { await p.click('.farm-act .btn.danger'); await sleep(350); }, { store: 'f10' }],
  ['museum-rewards', '#/museum', async (p) => { await p.evaluate(() => [...document.querySelectorAll('.seg button, button')].find((b) => b.textContent.trim() === 'Rewards')?.click()); await sleep(400); }, { store: 'f10' }],
  ['notes-image', '#/notes', async (p) => { await p.evaluate(() => { const d = [...document.querySelectorAll('details.note-d')].find((x) => /See note/.test(x.textContent)); if (d) { d.open = true; d.scrollIntoView(); } }); await sleep(400); }, { store: 'f10' }],
  ['notes-image-big', '#/notes', async (p) => { await p.evaluate(() => { const d = [...document.querySelectorAll('details.note-d')].find((x) => /See note/.test(x.textContent)); if (d) { d.open = true; d.querySelector('.note-img')?.click(); } }); await sleep(600); }, { store: 'f10' }],
  ['digits', '#/progress', null, { store: 'f10' }],
  ['farm-forest-today', '#/today', async (p) => { await setFarm('forest')(p); await p.evaluate(() => document.querySelector('.pc-more')?.click()); await sleep(400); }, { store: 'y1su12sun' }],
  ['farm-beach-fish', '#/today/fish', setFarm('beach'), { store: 'y1su12sun' }],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const problems = [];
const fit = [];
async function settle(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); })));
  });
  await sleep(150);
}
async function audit(page, name) {
  return page.evaluate((name) => {
    const out = [];
    const W = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > W + 1) out.push(`${name}: page scrollWidth ${document.documentElement.scrollWidth} > ${W}`);
    const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
    if (broken.length) out.push(`${name}: ${broken.length} broken images e.g. ${broken.slice(0, 3).join(', ')}`);
    const scrollers = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && e !== document.body && e !== document.documentElement && !e.classList.contains('main')) return true; } return false; };
    const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1) && !scrollers(e) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 4).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' "' + (e.textContent || '').slice(0, 30) + '" in ' + e.parentElement?.className + ` (${Math.round(e.getBoundingClientRect().right)})`);
    if (wide.length) out.push(`${name}: elements outside viewport: ${wide.join(', ')}`);
    if (!document.querySelector('.screen')) out.push(`${name}: no .screen rendered`);
    return out;
  }, name);
}
const FROM = process.env.FROM; let started = false;
for (const [w, h] of [[393, 852], [375, 812]].filter(([w]) => !process.env.W || String(w) === process.env.W)) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${w}] console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${w}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${w}] request failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${w}] HTTP ${r.status()}: ${r.url()}`); });
  for (const [name, hash, act, opt = {}] of SHOTS) {
    if (only && !new RegExp(only).test(name)) continue;
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: opt.reduce ? 'reduce' : 'no-preference' }]);
    if (FROM && !started) { if (name !== FROM) continue; started = true; }
    await page.goto(BASE + hash, { waitUntil: 'networkidle0' }).catch(() => page.goto(BASE + hash, { waitUntil: 'load' }));
    await page.evaluate((s, u) => { localStorage.setItem('sdv:profiles', s); localStorage.setItem('sdv:ui', u); sessionStorage.clear(); }, STORES[opt.store || 'mid'], opt.ui ?? UI_DONE);
    await page.reload({ waitUntil: 'networkidle0' }).catch(() => page.reload({ waitUntil: 'load' }));
    await page.waitForFunction(() => document.querySelector('.screen') && !/Loading/.test(document.body.innerText), { timeout: 10000 }).catch(() => {});
    await settle(page);
    if (act) { await act(page); await settle(page); }
    problems.push(...(await audit(page, `[${w}] ${name}`)));
    const full = !['date-sheet', 'notes-image-big', 'digits', 'villager-schedule', 'villagers-popcorn', 'progress-popcorn', 'search-popcorn'].includes(name) && !/^back-/.test(name) && (/-expanded$/.test(name) || !/^(what|onboarding|tour|entry|today-|tile-)/.test(name));
    if (/^(today-|entry)/.test(name)) fit.push(`[${w}] ${name}: page height ${await page.evaluate(() => document.documentElement.scrollHeight)} / viewport ${h}` + (await page.evaluate(() => { const g = document.querySelector('.dtiles'), t = document.querySelector('.tabbar'); return g && t ? `, tiles end ${Math.round(g.getBoundingClientRect().bottom)} / tab bar top ${Math.round(t.getBoundingClientRect().top)}` : ''; })));
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    const path = `${OUT}${process.env.PREFIX || "v6"}-${w}-${name}.png`;
    if (full && H > h) {
      // Grow the viewport so the fixed tab bar sits at the bottom of the long capture.
      await page.setViewport({ width: w, height: Math.min(H, 3200), deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await sleep(200);
      await page.screenshot({ path });
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    } else await page.screenshot({ path });
  }
  await page.close();
}

// Offline: let the service worker install, then go offline and open screens that were never visited.
{
  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 1, isMobile: true });
  await page.goto(BASE + '#/', { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: 'networkidle0' });
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async () => { const ks = await caches.keys(); let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return n; });
  await page.setOfflineMode(true);
  const res = [];
  for (const hash of ['#/villager/Haley', '#/item/(O)74', '#/fish', '#/calendar']) {
    await page.goto(BASE + hash, { waitUntil: 'networkidle0' }).catch((e) => res.push('nav fail ' + hash + ' ' + e.message));
    await page.waitForFunction(() => document.querySelector('.screen') && !/Loading/.test(document.body.innerText), { timeout: 10000 }).catch(() => {});
    await settle(page);
    const r = await page.evaluate(() => ({ title: (document.querySelector('.tb-title h1') || document.querySelector('.screen h1, .screen h2'))?.textContent, imgs: document.images.length, broken: [...document.images].filter((i) => i.naturalWidth === 0).length }));
    await page.screenshot({ path: `/tmp/off-${hash.replace(/\W/g, '')}.png` });
    res.push(`${hash}: "${r.title}" ${r.imgs} imgs, ${r.broken} broken`);
    if (r.broken || !r.title) problems.push(`offline ${hash}: ${JSON.stringify(r)}`);
  }
  await page.screenshot({ path: `${OUT}v6-393-offline-calendar.png` });
  console.log(`offline: SW controlled=${controlled}, cached entries=${cached}\n  ` + res.join('\n  '));
  await page.close();
}
await browser.close();
const uniq = [...new Set(problems)];
console.log(uniq.length ? `PROBLEMS (${uniq.length}):\n` + uniq.join('\n') : 'No problems found.');
console.log('FIT:\n' + fit.join('\n'));
