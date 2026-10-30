import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { RACCOON_TREE, PEEK_SPOTS, PEEK_ORDER, PIXEL_SCALE, raccoonTree, nextPeekDelay, pickPeek, PEEK_MIN_MS, PEEK_MAX_MS, PEEK_SHOW_MS, CROWN_SWAY_DELAY, SWAY_S, meadowScatter, clearOfDoor } from '../lib/meadow';
const raw = (g: Record<string, unknown>) => Object.values(g)[0] as string;
const css = raw(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }));
const home = raw(import.meta.glob('../screens/Home.tsx', { query: '?raw', import: 'default', eager: true }));
const sources = JSON.parse(raw(import.meta.glob('../../../sprites/derived/SOURCES.json', { query: '?raw', import: 'default', eager: true })));

describe('v6.9 the raccoon tree on the home meadow', () => {
  it('has a trunk + crown for every season, all on the same 1-game-px canvas', () => {
    for (const s of [0, 1, 2, 3]) {
      const t = raccoonTree(s);
      for (const k of [t.trunk, t.crown, t.door]) {
        expect(core.ui[k], k).toBeTruthy();
        expect([core.ui[k].w, core.ui[k].h]).toEqual([RACCOON_TREE.w, RACCOON_TREE.h]);
      }
    }
    expect(raccoonTree(3).trunk).toBe('rtree:Trunk:3'); // snow on the bark top in winter
    expect(new Set([0, 1, 2, 3].map((s) => raccoonTree(s).crown)).size).toBe(4);
  });
  it('is drawn at the meadow pixel scale (2 CSS px per game px, like the Junimos and trees) and fits the 240px meadow', () => {
    expect(PIXEL_SCALE).toBe(2);
    expect(home).toMatch(/const px = \(n: number\) => n \* PIXEL_SCALE \+ 'px'/);
    expect(home).toMatch(/width=\{RACCOON_TREE\.w \* PIXEL_SCALE\}/);
    expect(RACCOON_TREE.h * PIXEL_SCALE + 30).toBeLessThanOrEqual(240);
    expect(css).toMatch(/\.m-rac \{ position: absolute; left: 50%; bottom: 30px; pointer-events: none; \}/);
    expect(css).toMatch(/\.m-rac img \{[^}]*image-rendering: pixelated/);
  });
  it('sits behind the side trees (drawn before them) inside the decorative meadow', () => {
    expect(home.indexOf('<RaccoonTree season={season} />')).toBeGreaterThan(-1);
    expect(home.indexOf('<RaccoonTree season={season} />')).toBeLessThan(home.indexOf('{meadowTrees(season)'));
  });
  it('keeps the front door clear of mid/front grass tufts', () => {
    expect(home).toMatch(/meadowScatter\(season\)\.filter\(clearOfDoor\)/);
    for (const s of [0, 1, 2, 3]) for (const t of meadowScatter(s).filter(clearOfDoor)) if (t.layer !== 'back') expect(Math.abs(t.x - 50)).toBeGreaterThanOrEqual(7);
  });
  it('peeks one head every 6–15 s at the door, window or hollow, never the same opening twice running', () => {
    expect([nextPeekDelay(0), nextPeekDelay(1), nextPeekDelay(0.5)]).toEqual([6000, 15000, 10500]);
    expect(PEEK_MIN_MS).toBe(6000); expect(PEEK_MAX_MS).toBe(15000);
    expect(PEEK_SHOW_MS).toBeGreaterThanOrEqual(1000); expect(PEEK_SHOW_MS).toBeLessThanOrEqual(2000);
    expect(PEEK_ORDER).toEqual(['door', 'window', 'hollow']);
    for (const r of [0, 0.3, 0.6, 0.99]) for (const last of PEEK_ORDER) expect(pickPeek(r, last)).not.toBe(last);
    for (const s of PEEK_ORDER) expect(core.ui[PEEK_SPOTS[s].who]).toBeTruthy();
  });
  it('pauses the peek timer while the page is hidden', () => {
    expect(home).toMatch(/if \(document\.hidden\) return;/);
    expect(home).toMatch(/addEventListener\('visibilitychange', onVis\)/);
    expect(home).toMatch(/if \(document\.hidden\) \{ clearTimeout\(timer\); setPeek\(null\); \}/);
  });
  it('sways the crown with the tufts’ wind and freezes under reduced motion', () => {
    expect(css).toMatch(/\.m-rac \.rt-crown \{[^}]*animation: crown-sway 3\.25s ease-in-out infinite;/);
    expect(SWAY_S).toBe(3.25);
    expect(CROWN_SWAY_DELAY).toBeCloseTo(-SWAY_S / 2, 1);
    expect(home).toMatch(/if \(reducedMotion\(\)\) return;/); // no peek timer
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.m-rac \.rt-crown \{ animation: none; \} \.rt-peek\.hollow i \{ transform: none; \}/);
    // only transform/opacity animate
    const kf = css.match(/@keyframes (crown-sway|rt-door|rt-peek) \{[^\n]*\n/g)!.join('');
    expect(kf).not.toMatch(/(top|left|width|height|margin):/);
  });
  it('credits the wiki sources for every new sprite', () => {
    for (const f of ['RaccoonTree_Trunk.png', 'RaccoonTree_Trunk_Winter.png', 'RaccoonTree_Crown_Spring.png', 'RaccoonTree_Crown_Summer.png', 'RaccoonTree_Crown_Fall.png', 'RaccoonTree_Crown_Winter.png', 'RaccoonTree_Door_Open.png', 'Raccoon_Head.png', 'Raccoon_Kit_Head.png', 'Raccoon_Kit_Head_2.png']) {
      expect(sources[f], f).toBeTruthy();
      expect(JSON.stringify(sources[f])).toMatch(/stardewvalleywiki\.com/);
    }
  });
});
