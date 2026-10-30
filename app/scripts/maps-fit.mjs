// v6.8.4 Maps fit check: Villagers > Maps at 5 phone sizes with simulated safe areas. The page must not scroll, the time slider card must end
// above the tab bar, the map frame must stay a tall portrait frame, and pinch, the dropdown and the date sheet must still work.
// Shots: shots/v684-maps-<w>x<h>.png
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8090/';
const SIZES = [[320, 568, 20, 0], [375, 667, 20, 0], [390, 844, 47, 34], [430, 932, 59, 34], [412, 915, 0, 0]];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, h, sat, sab] of SIZES) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(BASE + '#/'); await p.evaluate(() => localStorage.setItem('sdv:ui', JSON.stringify({ onboarded: true, tourSeen: true })));
  await p.goto(BASE + '#/maps'); await p.reload({ waitUntil: 'networkidle0' });
  await p.addStyleTag({ content: `:root, html { --sat: ${sat}px !important; --sab: ${sab}px !important; }` });
  await new Promise((r) => setTimeout(r, 1200));
  const m = await p.evaluate(() => {
    const app = document.querySelector('.app'), q = (s) => document.querySelector(s)?.getBoundingClientRect();
    app.scrollTop = 500; const st = app.scrollTop; app.scrollTop = 0;
    const vp = q('.map-vp'), tr = q('.time-row'), tb = q('.tabbar'), tabs = q('.map-tabs'), bar = q('.map-bar'), top = q('.topbar');
    return { fit: app.classList.contains('fit'), scroll: app.scrollHeight - app.clientHeight, canScroll: st, topbarBottom: Math.round(top.bottom), tabsTop: Math.round(tabs.top), barBottom: Math.round(bar.bottom),
      map: [Math.round(vp.width), Math.round(vp.height)], mapTop: Math.round(vp.top), sliderBottom: Math.round(tr.bottom), tabbarTop: Math.round(tb.top), hint: !!document.querySelector('.maps > .hint') };
  });
  const ok = m.fit && m.scroll <= 0 && m.canScroll === 0 && m.sliderBottom <= m.tabbarTop && (h >= 800 ? m.map[1] > m.map[0] : m.map[1] >= 120) && m.tabsTop >= m.topbarBottom;
  // in-map pinch still zooms the map (CDP touches), page stays at scale 1
  const c = { x: w / 2, y: m.mapTop + m.map[1] / 2 };
  const mat = () => p.evaluate(() => getComputedStyle(document.querySelector('.map-layer')).transform);
  const before = await mat();
  const cdp = await p.createCDPSession();
  const tp = (d) => [{ x: c.x - d, y: c.y, id: 1 }, { x: c.x + d, y: c.y, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(20) });
  for (let d = 25; d <= 80; d += 5) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(d) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await new Promise((r) => setTimeout(r, 400));
  const after = await mat(); const scale = await p.evaluate(() => visualViewport.scale);
  await p.screenshot({ path: `../shots/v684-maps-${w}x${h}.png` });
  // dropdown opens fully above the tab bar and closes
  await p.click('.who-btn'); await new Promise((r) => setTimeout(r, 400));
  const dd = await p.evaluate(() => { const r = document.querySelector('.who-dd')?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) } : null; });
  if (w === 390) await p.screenshot({ path: `../shots/v684-maps-dropdown-${w}x${h}.png` });
  await p.keyboard.press('Escape'); await new Promise((r) => setTimeout(r, 400));
  // date sheet opens
  await p.click('.day-pill'); await new Promise((r) => setTimeout(r, 500));
  const sheet = await p.evaluate(() => { const r = document.querySelector('.sheet')?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null; });
  if (w === 390) await p.screenshot({ path: `../shots/v684-maps-datesheet-${w}x${h}.png` });
  const ok2 = before !== after && scale === 1 && dd && dd.bottom <= m.tabbarTop && dd.h > 120 && sheet && sheet.bottom <= h + 1;
  if (!ok || !ok2) bad++;
  console.log(`${w}x${h} sat${sat}/sab${sab}`, JSON.stringify({ ...m, pinch: before !== after, pageScale: scale, dd, sheet }), ok && ok2 ? 'OK' : 'FAIL');
  await p.close();
}
console.log('failures:', bad);
await b.close();
