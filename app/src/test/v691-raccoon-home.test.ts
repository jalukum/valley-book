import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { TOUR } from '../lib/tour';
import sharp from 'sharp';
import { RACCOON_HOME, WINDOW_BOX, KIT_HOLES, KITS, pickHole, homeTufts, nextPeekDelay, PEEK_MIN_MS, PEEK_MAX_MS, PEEK_SHOW_MS, KIT_STAGGER_MS, homeFit, HOME_SCALE, HOME_BACK, MID_GROUND, DEEP_SINK, meadowScatter, clearOfDoor } from '../lib/meadow';
const rgba = async (f: string) => { const { data, info } = await sharp('../sprites/derived/' + f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height, a: (x: number, y: number) => data[(y * info.width + x) * 4 + 3], hex: (x: number, y: number) => [0, 1, 2].map((k) => data[(y * info.width + x) * 4 + k].toString(16).padStart(2, '0')).join('') }; };
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
    expect(JSON.stringify(sources['Giant_Stump_Home.png'])).toMatch(/raccoons REMOVED \(no other pixel changed\)/);
  });
  it('v6.9.4 has no baked-in (static) raccoons left: none of the screenshot\u2019s raccoon greys in the stump art', async () => {
    const img = await rgba('Giant_Stump_Home.png');
    const greys = new Set(['655658', 'a5959a', '938382', 'd3d2da', '73676b', 'c1bcc5', 'aea0a6']);
    let n = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.a(x, y) && greys.has(img.hex(x, y))) n++;
    expect(n).toBe(0);
    expect(home).not.toMatch(/Raccoon_Icon|rac:Door/);
  });
  it('v6.9.4 one 1.5x stump on every phone, standing BACK on the extended mid grass where there is room', () => {
    expect(HOME_SCALE).toBe(1.5);
    for (const room of [217, 305, 400]) expect(homeFit(room, 2), `${room}`).toEqual({ scale: 1.5, bottom: HOME_BACK }); // 390x844, 430x932
    // the roots (rows 82–87) land well inside the mid grass, clear of its soft top edge (8px fade) and above the front band
    const tip = (row: number) => HOME_BACK + (RACCOON_HOME.h - row) * HOME_SCALE;
    expect(tip(82)).toBeLessThan(MID_GROUND.top - 12);
    expect(tip(87)).toBeGreaterThan(MID_GROUND.bottom);
    expect(HOME_BACK).toBeGreaterThan(30);                                       // behind the side trees' feet (30)
    expect(css).toMatch(/\.meadow \.m-ground\.mid \{ bottom: 40px; height: 60px;/);
    expect(MID_GROUND).toEqual({ bottom: 40, top: 100 });
    expect(css).toMatch(/\.meadow \.m-ground\.far \{ --tile: 16px; bottom: 92px;/);
    // short phones: the most-back spot that still clears the buttons (front grass), never below DEEP_SINK
    for (const room of [120, 148, 160]) {
      const f = homeFit(room, 2);
      expect(f.bottom + RACCOON_HOME.h * f.scale + 4 <= room || f.bottom === -DEEP_SINK, `${room}`).toBe(true);
      expect(f.bottom).toBeLessThan(HOME_BACK);
    }
    expect(homeFit(305, 3).scale).toBeCloseTo(4 / 3);                              // whole device px at dpr 3
    for (const room of [120, 148, 160, 200, 217, 260, 305]) for (const dpr of [1, 2, 3]) {
      const f = homeFit(room, dpr);
      expect(Number.isInteger(Math.round(f.scale * dpr * 1e6) / 1e6), `${room}@${dpr}`).toBe(true); // whole device px per game px
      expect(f.scale).toBeGreaterThanOrEqual(1);
      expect(f.bottom).toBeGreaterThanOrEqual(-DEEP_SINK);
    }
    expect(home.indexOf("'m-ground mid'")).toBeLessThan(home.indexOf("'m-ground entry-ground'"));
    expect(home.indexOf("'m-ground far'")).toBeLessThan(home.indexOf("'m-ground mid'"));
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
  it('v6.9.4 exactly 3 animated kits, each from a random free hole (never two in one), staggered, none under reduced motion', async () => {
    expect(KITS).toBe(3);
    expect(KIT_HOLES.length).toBeGreaterThanOrEqual(KITS + 3);
    expect(new Set(KIT_HOLES.map((h) => h.id)).size).toBe(KIT_HOLES.length);
    expect(KIT_HOLES.map((h) => h.id)).toEqual(expect.arrayContaining(['window', 'door', 'hollow', 'rim-l']));
    // pickHole never returns a busy hole, and every free hole can be picked
    for (let r = 0; r < 1; r += 0.05) { const b = [0, 3]; expect(b).not.toContain(pickHole(b, r)); }
    const seen = new Set<number>(); for (let r = 0; r < 1; r += 0.01) seen.add(pickHole([1], r));
    expect(seen.size).toBe(KIT_HOLES.length - 1);
    expect(KIT_STAGGER_MS).toBeGreaterThan(500);
    expect([nextPeekDelay(0), nextPeekDelay(1)]).toEqual([PEEK_MIN_MS, PEEK_MAX_MS]);
    expect(PEEK_SHOW_MS).toBeGreaterThanOrEqual(1000);
    expect(home).toMatch(/if \(reducedMotion\(\)\) return;/);
    expect(home).toMatch(/const busy = out\.flatMap/);
    expect(home).toMatch(/k \* KIT_STAGGER_MS/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.rh-kit, \.rh-hole \{ display: none; \} \}/);
    const kf = css.match(/@keyframes rh-peek \{[^\n]*\n/)![0];
    expect(kf).not.toMatch(/(top|left|width|height|margin):/);
    expect(css.match(/@keyframes rh-door \{[^\n]*\n/)![0]).not.toMatch(/(top|left|width|height|margin|background):/);
    // front holes clip the kit; window kits sit under the bars; behind kits are drawn before the stump
    expect(home.indexOf('o.hole.behind')).toBeLessThan(home.indexOf("'rh-stump'"));
    expect(home.indexOf('o.hole.clip')).toBeGreaterThan(home.indexOf("'rh-stump'"));
    expect(home.indexOf('o.hole.clip')).toBeLessThan(home.indexOf("'rh-bars'"));
    expect(KIT_HOLES.find((h) => h.id === 'window')!.clip).toEqual(WINDOW_BOX);
    // a kit hiding behind the stump is fully covered by bark (no stray raccoon pixels showing between peeks)
    const st = await rgba('Giant_Stump_Home.png'), kit = await rgba('Raccoon_Kit_Head.png');
    expect([kit.w, kit.h]).toEqual([core.ui['rac:Kit'].w, core.ui['rac:Kit'].h]);
    for (const h of KIT_HOLES) {
      if (h.behind) {
        let leak = 0, shown = 0;
        for (let y = 0; y < kit.h; y++) for (let x = 0; x < kit.w; x++) if (kit.a(x, y)) {
          if (!st.a(h.x + h.from[0] + x, h.y + h.from[1] + y)) leak++;
          if (!st.a(h.x + x, h.y + y)) shown++;
        }
        expect(leak, h.id).toBe(0);
        expect(shown, h.id).toBeGreaterThan(20);
      } else {
        const [cx, cy, cw, ch] = h.clip!;
        // hidden: pushed fully out of the clip box
        expect(h.y + h.from[1] >= cy + ch || h.x + h.from[0] >= cx + cw || h.x + h.from[0] + kit.w <= cx, h.id).toBe(true);
        expect(h.y + kit.h).toBeLessThanOrEqual(cy + ch + 1);
      }
    }
  });
  it('credits a source for every new sprite and drops the v6.9 custom tree', () => {
    for (const f of ['Giant_Stump_Home.png', 'Giant_Stump_Window_Bars.png', 'Giant_Stump_Shadow.png', 'Raccoon_Kit_Head.png']) expect(sources[f], f).toBeTruthy();
    expect(JSON.stringify(sources['Giant_Stump_Home.png'])).toMatch(/stardewvalleywiki\.com\/mediawiki\/images\/en\/9\/9a\/Giant_Stump\.png/);
    expect(sources['Giant_Stump_Shadow.png'].from).toBe('app-made');
    for (const f of Object.keys(sources)) expect(f.startsWith('RaccoonTree_'), f).toBe(false);
  });
});

describe('v6.9.1 tutorial ending (v7.2: tab-bar steps removed)', () => {
  it('has no tab-bar walkthrough any more', () => {
    expect(TOUR.some((s) => s.target === 'tabbar' || s.target.startsWith('tab-'))).toBe(false);
  });
  it('still ends by spotlighting the home control that returns to #/', () => {
    const last = TOUR[TOUR.length - 1];
    expect(last.target).toBe('home');
    expect(last.body).toMatch(/^Tap here anytime to get back to the front page\./);
    expect(today).toMatch(/<(a|Lk) className="brand" href="#\/" data-tour="home"/);
  });
});
