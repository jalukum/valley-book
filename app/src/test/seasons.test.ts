import { describe, it, expect } from 'vitest';
import SOURCES from '../../../sprites/derived/SOURCES.json';
import { core } from '../data';
import { meadowTrees, groundAtlas, seasonAir, treeSize, AIR_KIND, PIXEL_SCALE } from '../lib/meadow';

const SRC = SOURCES as Record<string, { from: string }>;
const PUBLIC = new Set(Object.keys(import.meta.glob('../../public/sprites/**/*.png')).map((k) => k.replace('../../public/', '')));
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const wiki = (k: string) => {
  const s = core.ui[k];
  expect(s, k).toBeTruthy();
  expect(PUBLIC.has(s.s), s.s).toBe(true);
  const f = s.s.split('/').pop()!;
  expect(SRC[f]?.from, f).toMatch(/^https:\/\/stardewvalleywiki\.com\/File:/);
  return s;
};

describe('v6.3 seasons: trees, ground and air follow the selected season', () => {
  it('each season has its own real tree panels; Fiddlehead only in spring/summer', () => {
    const keys = [0, 1, 2, 3].map((s) => meadowTrees(s).map((t) => t.k));
    expect(new Set(keys.map((k) => k.join())).size).toBe(4);
    expect(keys[0]).toEqual(['tree:MossyWild', 'tree:Fiddlehead', 'tree:Fiddlehead', 'tree:MossyLush']);
    expect(keys[1]).toContain('tree:Fiddlehead:1');
    for (const s of [2, 3]) expect(keys[s].some((k) => k.startsWith('tree:Fiddlehead')), 'season ' + s).toBe(false);
    expect(keys[2]).toEqual(expect.arrayContaining(['tree:MossyWild:2', 'tree:Maple:2', 'tree:Oak:2', 'tree:MossyLush:2']));
    expect(keys[3]).toEqual(['tree:MossyWild:3', 'tree:Pine:3', 'tree:Pine:3', 'tree:MossyLush:3']);
    for (const k of keys.flat()) wiki(k);
    expect(meadowTrees(5).map((t) => t.k)).toEqual(keys[1]); // wraps
  });
  it('trees stay at true in-game scale in every season (2× pixels: ~3 × 6 tiles, crisp)', () => {
    const tile = 16 * PIXEL_SCALE;
    for (const s of [0, 1, 2, 3]) for (const t of meadowTrees(s)) {
      const z = treeSize(core.ui[t.k], t.scale);
      expect(Math.abs(z.w - Math.round(z.w)) < 1e-9 || t.scale === 2, t.k).toBe(true);
      expect(z.h / tile, t.k).toBeGreaterThan(5.5);
      expect(z.h / tile, t.k).toBeLessThan(6.2);
      expect(z.w / tile, t.k).toBeLessThanOrEqual(3);
    }
  });
  it('winter swaps to the real snow ground; other seasons keep the grass tiles', () => {
    expect(groundAtlas(3)).toBe('ground:Tiles:3');
    for (const s of [0, 1, 2]) expect(groundAtlas(s)).toBe('ground:Tiles');
    expect(wiki('ground:Tiles:3')).toMatchObject({ w: 64, h: 16 });
    expect(SRC['Ground_Tiles_Winter.png'].from).toMatch(/Festival_of_Ice/);
    expect(CSS).toMatch(/\.meadow\.s3 \.m-ground \{ background: #c6f3ff/);
  });
  it('air per season: petals, fireflies, leaves, snow; real sprites where the game has them', () => {
    expect(AIR_KIND).toEqual(['petal', 'mote', 'leaf', 'snow']);
    expect(seasonAir(0).sprite).toBe('air:petal');
    expect(seasonAir(2).sprite).toBe('air:leaf');
    expect(seasonAir(1).sprite).toBeNull();
    expect(seasonAir(3).sprite).toBeNull();
    expect(wiki('air:petal')).toMatchObject({ w: 28, h: 7 }); // 4 square frames
    expect(wiki('air:leaf')).toMatchObject({ w: 32, h: 8 });
    expect(SRC['Particle_Leaf.png'].from).toMatch(/FallWindAnimated/);
    expect(SRC['Particle_Petal.png'].from).toMatch(/SpringWindAnimated/);
  });
  it('other screens get fewer particles; layout is seeded and calm (long durations)', () => {
    for (const s of [0, 1, 2, 3]) {
      const full = seasonAir(s).items, soft = seasonAir(s, true).items;
      expect(soft.length).toBeLessThan(full.length);
      expect(soft.length).toBeGreaterThan(0);
      expect(seasonAir(s)).toEqual(seasonAir(s));
      for (const a of full) { expect(a.dur).toBeGreaterThanOrEqual(7); expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x).toBeLessThanOrEqual(100); }
    }
  });
  it('CSS: sky + wind tinted per season, air is click-through, transforms/opacity only, still under reduced motion', () => {
    for (const s of ['summer', 'fall', 'winter']) expect(CSS).toMatch(new RegExp(`:root\\[data-season='${s}'\\] \\{ --sky-1`));
    expect(CSS).toMatch(/\.sky-wind i \{ background: var\(--wisp/);
    expect(CSS).toMatch(/\.air \{[^}]*pointer-events: none/);
    const kf = [...CSS.matchAll(/@keyframes (air-[\w-]+|blink) \{([^@]*?)\}\s*\}/g)];
    expect(kf.length).toBeGreaterThanOrEqual(6);
    for (const [, name, body] of kf) for (const prop of body.matchAll(/([a-z-]+):/g)) expect(['transform', 'opacity'], name).toContain(prop[1]);
    const rm = CSS.slice(CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(rm).toMatch(/\.air-p, \.air-s, \.air-f img, \.air-mote i \{ animation: none !important/);
  });
  it('Junimos stay in every season (meadow + popcorn untouched by season)', () => {
    expect(CSS).not.toMatch(/\.meadow\.s\d[^{]*m-jun/);
    expect(CSS).not.toMatch(/data-season[^{]*popcorn/);
  });
});
