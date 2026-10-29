import { describe, it, expect } from 'vitest';
import SOURCES from '../../../sprites/derived/SOURCES.json';
import { core, items } from '../data';
import { newProfile, type Profile } from '../lib/state';
import { cartBundles, cartToday, access } from '../lib/guide';
import { activeBundles, flipBundleItem, checkedCount, bundleDone } from '../lib/progress';
import { navInit, navStep, backPlan, prevScreen, normHash } from '../lib/nav';
import { makeBurst, nextDelay, firstDelay, POP_MIN_MS, POP_MAX_MS, POP_MAX, FIRST_MIN_MS, FIRST_MAX_MS, POP_PX } from '../components/Popcorn';
import { treeSize, MEADOW_TREES, PIXEL_SCALE } from '../lib/meadow';
import { core as C6 } from '../data';
import { TOUR as STEPS } from '../lib/tour';

const SCREENS = import.meta.glob('../screens/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const PUBLIC = new Set(Object.keys(import.meta.glob('../../public/sprites/**/*.png')).map((k) => k.replace('../../public/', '')));

const at = (season: number, day: number, year: number, patch: (p: Profile) => void = () => {}) => {
  const p = newProfile('t'); p.date = { season, day, year }; patch(p); return p;
};
const pool = new Set(core.guide.cartPool);
const qidOf = (n: string) => Object.entries(items).find(([, v]) => v.n === n)?.[0];

describe('Traveling Cart bundle drop-downs', () => {
  const p = at(1, 12, 1);
  const groups = cartBundles(core, p);
  it('lists only items the cart can sell (wiki Standard Stock), normal quality only', () => {
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.items.length).toBeGreaterThan(0); // bundles with nothing the cart sells are omitted
      for (const { it } of g.items) { expect(pool.has(it.qid!)).toBe(true); expect(!it.quality || it.quality === 'normal').toBe(true); }
    }
  });
  it('the wiki list leaves out minerals the cart never stocks', () => {
    expect(pool.has(qidOf('Quartz')!)).toBe(false);
    expect(pool.has(qidOf('Fire Quartz')!)).toBe(false);
  });
  it('hides donated items and finished bundles, but keeps this-visit ticks so they can be undone', () => {
    const g = groups[0]; const first = g.items[0];
    const q = at(1, 12, 1); flipBundleItem(q, g.b.id, first.i);
    const after = cartBundles(core, q).find((x) => x.b.id === g.b.id);
    expect(after?.items.some((x) => x.i === first.i)).toBeFalsy();
    const kept = cartBundles(core, q, new Set([g.b.id + ':' + first.i])).find((x) => x.b.id === g.b.id)!;
    expect(kept.items.find((x) => x.i === first.i)?.done).toBe(true);
    const b = activeBundles(core, q).find((x) => x.id === g.b.id)!;
    q.cc.checked[b.id] = b.items.map((_, i) => i);
    expect(bundleDone(q, b)).toBe(true);
    expect(cartBundles(core, q).some((x) => x.b.id === b.id)).toBe(false);
  });
  it('shares state with the bundle checklist both ways', () => {
    const g = groups[0]; const q = at(1, 12, 1);
    const b = activeBundles(core, q).find((x) => x.id === g.b.id)!;
    flipBundleItem(q, b.id, g.items[0].i);
    expect(checkedCount(q, b)).toBe(1); // what the Bundles page counts
    flipBundleItem(q, b.id, g.items[0].i);
    expect(checkedCount(q, b)).toBe(0);
    q.cc.checked[b.id] = [g.items[0].i]; // ticked on the Bundles page → gone from the cart list
    expect(cartBundles(core, q).find((x) => x.b.id === b.id)?.items.some((x) => x.i === g.items[0].i)).toBeFalsy();
  });
  it('Joja route has no bundle lists', () => {
    expect(cartBundles(core, at(1, 12, 1, (x) => { x.cc.route = 'joja'; }))).toEqual([]);
  });
  it('cartToday counts the drop-down items on a cart day (Friday)', () => {
    const q = at(1, 12, 1); const c = cartToday(core, q, access(core, q));
    expect(c).not.toBeNull();
    expect(c!.count).toBe(c!.groups.reduce((n, g) => n + g.items.length, 0));
  });
});

describe('back arrows follow real history', () => {
  it('Today → Orders → back returns to Today, not Goals/More', () => {
    let s = navInit('#/today');
    s = navStep(s, '#/orders', null);
    expect(backPlan(s, '#/goals')).toEqual({ kind: 'history' });
    expect(prevScreen(s)).toBe('#/today');
    s = navStep(s, '#/today', 0); // browser went back to entry 0
    expect(s.cur).toBe(0);
    expect(backPlan(s, '#/more')).toEqual({ kind: 'replace', to: '#/more' });
  });
  it('deep link / fresh open falls back to the sensible parent', () => {
    expect(backPlan(navInit('#/villager/Abigail'), '#/villagers')).toEqual({ kind: 'replace', to: '#/villagers' });
  });
  it('a fallback replace keeps the same entry; new taps drop forward entries', () => {
    let s = navInit('#/goals');
    s = navStep(s, '#/more', null, true);
    expect(s).toEqual({ stack: ['#/more'], cur: 0 });
    s = navStep(s, '#/goals', null); s = navStep(s, '#/orders', null); s = navStep(s, '#/goals', 1); // back
    s = navStep(s, '#/walnuts', null);
    expect(s.stack).toEqual(['#/more', '#/goals', '#/walnuts']);
    expect(prevScreen(s)).toBe('#/goals');
  });
  it('forward navigation lands on the known entry', () => {
    let s = navInit('#/'); s = navStep(s, '#/today', null); s = navStep(s, '#/', 0); s = navStep(s, '#/today', 1);
    expect(s.cur).toBe(1);
  });
  it('treats #, #/ and empty as the front page', () => {
    expect(normHash('')).toBe('#/'); expect(normHash('#')).toBe('#/'); expect(normHash('#/today?x=1')).toBe('#/today?x=1');
  });
  it('no screen uses a javascript: back link', () => {
    expect(Object.keys(SCREENS).length).toBeGreaterThan(5);
    for (const [f, src] of Object.entries(SCREENS)) expect(src, f).not.toMatch(/javascript:history/);
  });
});

describe('popcorn Junimos', () => {
  it('bursts are 1–4 scattered Junimos inside the screen, each on its own timing, in mixed colours', () => {
    let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const sizes = new Set<number>();
    for (let k = 0; k < 200; k++) {
      const b = makeBurst(rnd, k); sizes.add(b.length);
      expect(b.length).toBeGreaterThanOrEqual(1); expect(b.length).toBeLessThanOrEqual(POP_MAX);
      for (const j of b) { expect(j.x).toBeGreaterThanOrEqual(0); expect(j.x).toBeLessThanOrEqual(94); expect(j.delay).toBeGreaterThanOrEqual(0); expect(j.delay).toBeLessThanOrEqual(1200); }
      if (b.length > 1) { expect(new Set(b.map((j) => j.tint)).size).toBe(b.length); expect(new Set(b.map((j) => j.delay)).size).toBeGreaterThan(1); }
    }
    expect([...sizes].sort()).toEqual([1, 2, 3, 4]);
  });
  it('first pop 4–6 s after opening a page, then every 10–18 s', () => {
    expect(nextDelay(() => 0)).toBe(POP_MIN_MS); expect(nextDelay(() => 0.999999)).toBeLessThanOrEqual(POP_MAX_MS);
    expect(POP_MIN_MS).toBe(10000); expect(POP_MAX_MS).toBe(18000);
    expect(firstDelay(() => 0)).toBe(4000); expect(firstDelay(() => 0.999999)).toBeLessThanOrEqual(6000);
    expect(FIRST_MIN_MS).toBe(4000); expect(FIRST_MAX_MS).toBe(6000);
    expect(POP_PX % 16).toBe(0); // whole-pixel multiple of the 16 px Junimo
  });
});

describe('v6 sprites and copy', () => {
  it('front-page trees and the Junimo strip are real sprite files', () => {
    for (const k of ['tree:Fiddlehead', 'tree:MossyWild', 'tree:MossyLush', 'junimo:Strip']) {
      expect(core.ui[k], k).toBeTruthy(); expect(PUBLIC.has(core.ui[k].s), k).toBe(true);
    }
    expect(core.ui['junimo:Strip']).toMatchObject({ w: 192, h: 48 }); // 4 frames × 48
    const src = SOURCES as Record<string, { from?: string }>;
    for (const f of ['Tree_Fiddlehead.png', 'Tree_Mossy_Wild.png', 'Tree_Mossy_Lush.png', 'Junimo_Strip.png']) expect(src[f]?.from, f).toMatch(/stardewvalleywiki\.com\/File:/);
  });
  it('the Orders tile sprite (Prize Ticket) exists', () => {
    expect(items['(O)PrizeTicket']?.n).toBe('Prize Ticket');
    expect(PUBLIC.has(items['(O)PrizeTicket'].s)).toBe(true);
  });
  it('tutorial says the replay button is in the More tab, and never says "Birthday calendar"', () => {
    const text = JSON.stringify(STEPS);
    expect(text).toMatch(/replay this tour[^"]*More tab/i);
    expect(text).not.toMatch(/from Progress/);
    expect(text).not.toMatch(/birthday calendar/i);
    const scr = Object.values(SCREENS).join('\n');
    expect(scr).not.toMatch(/birthday calendar/i);
    expect(scr).not.toMatch(/setF\('bday'\)/);
  });
});

describe('v6.1 meadow trees at true in-game scale', () => {
  it('trees use the Junimo’s 2× pixel scale: Wild Tree 3 tiles wide, ~6 tall; Fiddlehead ~2 × 6', () => {
    const tile = 16 * PIXEL_SCALE; // a Junimo is one 16 px tile
    for (const t of MEADOW_TREES) {
      const z = treeSize(C6.ui[t.k]);
      expect(Number.isInteger(z.w) && Number.isInteger(z.h), t.k).toBe(true); // crisp whole pixels
      if (t.k.startsWith('tree:Mossy')) { expect(z.w / tile).toBe(3); expect(z.h / tile).toBeGreaterThanOrEqual(5.9); expect(z.h / tile).toBeLessThanOrEqual(6.1); }
      else { expect(z.h / tile).toBeGreaterThan(5.8); expect(z.w / tile).toBeLessThan(2); }
    }
    // kept at the screen edges
    for (const t of MEADOW_TREES) expect(parseInt(t.left ?? t.right ?? '999')).toBeLessThanOrEqual(60);
  });
});
