// v6.8.3 cross-device layout sweep: 6 screens x 7 phone sizes, with each phone's safe-area insets simulated.
// Logs overflow/clipping findings, saves viewport shots to /tmp/devshots and a contact sheet to shots/<PREFIX>-devices-sheet.png.
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
const BASE = process.env.BASE || 'http://127.0.0.1:8090/';
const DIR = '/tmp/devshots/';
const SIZES = [[320, 568, 20, 0, 'iPhone 5/SE1'], [360, 640, 0, 0, 'Android small'], [360, 780, 0, 0, 'Android tall'], [412, 915, 0, 0, 'Pixel-like'], [375, 667, 20, 0, 'iPhone SE'], [390, 844, 47, 34, 'iPhone 14/15'], [430, 932, 59, 34, 'iPhone Pro Max']];
const PAGES = [['front', '#/'], ['today', '#/today'], ['villagers', '#/villagers'], ['maps', '#/maps'], ['villager', '#/villager/Emily'], ['more', '#/more']];
await mkdir(DIR, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let issues = 0;
for (const [w, h, sat, sab, label] of SIZES) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(BASE + '#/'); await p.evaluate(() => localStorage.setItem('sdv:ui', JSON.stringify({ onboarded: true, tourSeen: true })));
  for (const [name, hash] of PAGES) {
    await p.goto(BASE + hash); await p.reload({ waitUntil: 'networkidle0' });
    await p.addStyleTag({ content: `:root, html { --sat: ${sat}px !important; --sab: ${sab}px !important; }` });
    await new Promise((r) => setTimeout(r, 900));
    const m = await p.evaluate((sat, sab) => {
      const vw = innerWidth, vh = innerHeight, app = document.querySelector('.app'), out = [];
      const clipped = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (o.overflowX !== 'visible' && a !== app) return true; } return false; };
      for (const e of document.querySelectorAll('.main *')) {
        const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).position === 'absolute' && e.closest('.meadow, .entry-ground, .sky')) continue;
        if ((r.right > vw + 1 || r.left < -1) && !clipped(e) && !e.closest('.meadow, .entry-ground, .topbar')) out.push(`x-overflow ${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
        if (/^(B|SPAN|SMALL|H1|H2|H3|P|A|BUTTON)$/.test(e.tagName) && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'hidden' && getComputedStyle(e).textOverflow !== 'ellipsis') out.push(`text-cut ${e.tagName.toLowerCase()}.${e.className} "${e.textContent.slice(0, 20)}"`);
      }
      const tb = document.querySelector('.topbar'), tt = document.querySelector('.tb-title');
      if (tt && tt.scrollWidth > tt.clientWidth + 2) out.push('title plaque text overflows');
      const res = { appScroll: app.scrollHeight, appClient: app.clientHeight, docW: document.documentElement.scrollWidth, topbarH: tb ? Math.round(tb.getBoundingClientRect().height - sat) : null };
      if (document.documentElement.scrollWidth > vw) out.push('document scrolls sideways ' + document.documentElement.scrollWidth);
      if (location.hash === '#/') {
        const bs = [...document.querySelectorAll('.bubble')].map((e) => e.getBoundingClientRect());
        const last = Math.max(...bs.map((r) => r.bottom)), first = Math.min(...[...document.querySelectorAll('.entry-h > *')].map((e) => e.getBoundingClientRect().top));
        res.lastBubble = Math.round(last); res.firstTop = Math.round(first);
        if (app.scrollHeight > app.clientHeight) out.push(`front scrolls ${app.scrollHeight}/${app.clientHeight}`);
        if (last > vh - sab) out.push(`front button clipped: bottom ${Math.round(last)} > ${vh - sab}`);
        if (first < sat) out.push('front header under status bar');
        const sub = document.querySelector('.bubble small, .bubble .b-sub, .bubble p'); res.subs = sub ? getComputedStyle(sub).display : 'n/a';
      }
      const tab = document.querySelector('.tabbar'); if (tab) res.tabbarBottom = Math.round(tab.getBoundingClientRect().bottom);
      return { res, out: [...new Set(out)].slice(0, 8) };
    }, sat, sab);
    if (m.out.length) issues++;
    console.log(`${w}x${h} ${name}: ${m.out.length ? 'ISSUES ' + m.out.join(' | ') : 'ok'} ${JSON.stringify(m.res)}`);
    await p.screenshot({ path: `${DIR}${w}x${h}-${name}.png` });
  }
  await p.close();
}
await b.close();
console.log('pages with issues:', issues);
