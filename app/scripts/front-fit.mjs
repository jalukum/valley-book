// v6.8.2 headless check: the front page (#/) fits the screen exactly, with no vertical scroll, at three iPhone sizes
// with their safe-area insets simulated (--sat/--sab). Writes shots/<PREFIX>-front-<h>.png. Exit code 1 if anything overflows.
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8090/';
const OUT = new URL('../../shots/', import.meta.url).pathname;
const PREFIX = process.env.PREFIX || 'v682';
const SIZES = [[375, 667, 20, 0], [390, 844, 47, 34], [430, 932, 59, 34]]; // SE, 14/15, Pro Max (status bar, home indicator)
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, h, sat, sab] of SIZES) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE + '#/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => { localStorage.setItem('sdv:ui', JSON.stringify({ onboarded: true, tourSeen: true })); });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: `:root, html { --sat: ${sat}px !important; --sab: ${sab}px !important; }` });
  await page.waitForSelector('.bubble.b4');
  await new Promise((r) => setTimeout(r, 900));
  const m = await page.evaluate(() => {
    const app = document.querySelector('.app'), main = document.querySelector('.main');
    const last = [...document.querySelectorAll('.bubble')].reduce((b, e) => Math.max(b, e.getBoundingClientRect().bottom), 0);
    const top = Math.min(...[...document.querySelectorAll('.entry-h > *')].map((e) => e.getBoundingClientRect().top));
    return { appScroll: app.scrollHeight, appClient: app.clientHeight, mainScroll: main.scrollHeight, mainClient: main.clientHeight, docScroll: document.documentElement.scrollHeight, vh: innerHeight, lastBubble: Math.round(last), firstTop: Math.round(top), overflowY: getComputedStyle(app).overflowY };
  });
  const ok = m.appScroll <= m.appClient && m.docScroll <= m.vh && m.lastBubble <= h - sab && m.firstTop >= sat;
  if (!ok) bad++;
  console.log(`${w}x${h} sat ${sat} sab ${sab}: ${ok ? 'OK' : 'OVERFLOW'} ${JSON.stringify(m)}`);
  await page.screenshot({ path: `${OUT}${PREFIX}-front-${h}.png` });
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
