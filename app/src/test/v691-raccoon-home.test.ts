import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { TOUR } from '../lib/tour';
import { RACCOON_HOME, WINDOW_BOX, homeTufts, nextPeekDelay, PEEK_MIN_MS, PEEK_MAX_MS, PEEK_SHOW_MS, homeFit, HOME_SCALE, HOME_BOTTOM, DEEP_SINK, meadowScatter, clearOfDoor } from '../lib/meadow';
const raw = (g: Record<string, unknown>) => Object.values(g)[0] as string;
const css = raw(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }));
const home = raw(import.meta.glob('../screens/Home.tsx', { query: '?raw', import: 'default', eager: true }));
const today = raw(import.meta.glob('../screens/Today.tsx', { query: '?raw', import: 'default', eager: true }));
const sources = JSON.parse(raw(import.meta.glob('../../../sprites/derived/SOURCES.json', { query: '?raw', import: 'default', eager: true })));

describe('v6.9.1 the real Giant Stump raccoon home on the meadow', () => {
  it('uses one unmodified stump sprite for every season (no crowns, no custom winter art)', () => {
    expect(core.ui['rhome:Stump']).toMatchObject({ w: RACCOON_HOME.w, h: RACCOON_HOME.h });
    expect(core.ui['rhome:Bars']).toMatchObject({ w: RACCOON_HOME.w, h: RACCOON_HOME.h });
    for (const k of Object.keys(core.ui)) expect(k.startsWith('rtree:'), k).toBe(false);
    expect(home).not.toMatch(/crown|season === 3 \? 'rhome/);
    expect(css).not.toMatch(/crown-sway/);                   // a stump doesn't sway
    expect(JSON.stringify(sources['Giant_Stump_Home.png'])).toMatch(/UNMODIFIED/);
  });
  it('v6.9.3 one 1.5x stump on every phone, foot sunk in the front grass, behind the trees, forage and Junimos', () => {
    for (const room of [148, 160, 217, 305, 400]) expect(homeFit(room, 2), `${room}`).toEqual({ scale: HOME_SCALE, bottom: HOME_BOTTOM }); // 375x667 … 430x932
    expect(HOME_SCALE).toBe(1.5);
    expect(homeFit(305, 3).scale).toBeCloseTo(4 / 3);                              // whole device px at dpr 3
    // the highest root tip (row 82) still sits inside the 44px front ground band, under the back-meadow line
    expect(HOME_BOTTOM + (RACCOON_HOME.h - 82) * HOME_SCALE).toBeLessThan(44 - 20);
    expect(HOME_BOTTOM).toBeGreaterThanOrEqual(-DEEP_SINK);
    const short = homeFit(120, 2);                                                 // very short: sink further, never reach a button
    expect(short.bottom).toBeGreaterThanOrEqual(-DEEP_SINK);
    for (const room of [120, 148, 160, 200, 217, 260, 305]) for (const dpr of [1, 2, 3]) {
      const f = homeFit(room, dpr);
      expect(Number.isInteger(Math.round(f.scale * dpr * 1e6) / 1e6), `${room}@${dpr}`).toBe(true); // whole device px per game px
      expect(f.scale).toBeGreaterThanOrEqual(1);
    }
    const i = home.indexOf('<RaccoonHome season={season} />');
    expect(i).toBeGreaterThan(home.indexOf("'m-ground entry-ground'"));
    expect(i).toBeLessThan(home.indexOf('{meadowTrees(season)'));
    expect(i).toBeLessThan(home.indexOf("t.layer === 'mid'"));
    expect(i).toBeLessThan(home.indexOf('MEADOW_JUNIMOS.map'));
    expect(css).toMatch(/\.m-rac \{[^}]*filter: saturate\(\.9\d\) brightness\(1\.0\d\);/); // a few % of tint, no blur
    expect(css).not.toMatch(/\.m-rac[^{]*\{[^}]*blur/);
    expect(home).toMatch(/window\.addEventListener\('resize', fit\)/);
  });
  it('is grounded: a shadow under the roots and grass tufts over its foot', () => {
    expect(core.ui['rhome:Shadow']).toBeTruthy();
    expect(home).toMatch(/top: px\(roots - sh\.h \/ 2\)/);
    expect(home.indexOf('rh-shadow')).toBeLessThan(home.indexOf("'rh-stump'"));
    expect(home.indexOf('homeTufts(season)')).toBeGreaterThan(home.indexOf("'rh-stump'"));
    for (const s of [0, 1, 2, 3]) for (const t of homeTufts(s)) expect(core.ui[t.k], t.k).toBeTruthy();
    expect(homeTufts(3).every((t) => t.k === 'tuft:winter')).toBe(true);
    for (const s of [0, 1, 2, 3]) for (const t of meadowScatter(s).filter(clearOfDoor)) if (t.layer !== 'back') expect(Math.abs(t.x - 50)).toBeGreaterThanOrEqual(7);
  });
  it('a kit peeks up behind the lit window’s bars every 6–15 s, paused when hidden, none under reduced motion', () => {
    expect(WINDOW_BOX).toEqual([26, 51, 10, 13]);
    expect(core.ui['rac:Kit'].w).toBeLessThanOrEqual(WINDOW_BOX[2]);
    expect(home.indexOf('rh-peek')).toBeLessThan(home.indexOf("'rh-bars'"));
    expect([nextPeekDelay(0), nextPeekDelay(1)]).toEqual([PEEK_MIN_MS, PEEK_MAX_MS]);
    expect([PEEK_MIN_MS, PEEK_MAX_MS]).toEqual([6000, 15000]);
    expect(PEEK_SHOW_MS).toBeGreaterThanOrEqual(1000);
    expect(home).toMatch(/if \(reducedMotion\(\)\) return;/);
    expect(home).toMatch(/if \(document\.hidden\) \{ clearTimeout\(timer\); setPeek\(0\); \}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.m-rac\.peek \.rh-peek i \{ animation: none; \} \}/);
    const kf = css.match(/@keyframes rh-peek \{[^\n]*\n/)![0];
    expect(kf).not.toMatch(/(top|left|width|height|margin):/);
  });
  it('credits a source for every new sprite and drops the v6.9 custom tree', () => {
    for (const f of ['Giant_Stump_Home.png', 'Giant_Stump_Window_Bars.png', 'Giant_Stump_Shadow.png', 'Raccoon_Kit_Head.png']) expect(sources[f], f).toBeTruthy();
    expect(JSON.stringify(sources['Giant_Stump_Home.png'])).toMatch(/stardewvalleywiki\.com\/mediawiki\/images\/en\/9\/9a\/Giant_Stump\.png/);
    expect(sources['Giant_Stump_Shadow.png'].from).toBe('app-made');
    for (const f of Object.keys(sources)) expect(f.startsWith('RaccoonTree_'), f).toBe(false);
  });
});

describe('v6.9.1 tutorial ending', () => {
  const i = TOUR.findIndex((s) => s.target === 'tabbar');
  it('step 16 is the short “Getting around” intro (two sentences at most)', () => {
    expect(i).toBe(15);
    expect(TOUR[i].body.length).toBeLessThanOrEqual(90);
    expect(TOUR[i].body.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(2);
  });
  it('then one short step per tab, in tab-bar order', () => {
    expect(TOUR.slice(i + 1, i + 6).map((s) => s.target)).toEqual(['tab-today', 'tab-progress', 'tab-villagers', 'tab-search', 'tab-more']);
    for (const s of TOUR.slice(i + 1, i + 6)) expect(s.body.length).toBeLessThanOrEqual(90);
  });
  it('ends by spotlighting the home control that returns to #/', () => {
    const last = TOUR[TOUR.length - 1];
    expect(last.target).toBe('home');
    expect(last.body).toBe('Tap here anytime to get back to the front page.');
    expect(today).toMatch(/<a className="brand" href="#\/" data-tour="home"/);
    expect(TOUR).toHaveLength(22);
  });
});
