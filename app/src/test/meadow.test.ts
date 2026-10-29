import { describe, it, expect } from 'vitest';
import SOURCES from '../../../sprites/derived/SOURCES.json';
import { core, items } from '../data';
import { groundTiles, meadowScatter, meadowKinds, rng, GROUND_TILE_COUNT, SWAY_S, WISP_S } from '../lib/meadow';

const SRC = SOURCES as Record<string, { from: string }>;
const PUBLIC = new Set(Object.keys(import.meta.glob('../../public/sprites/**/*.png')).map((k) => k.replace('../../public/', '')));
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';

describe('v6.2 living meadow ground', () => {
  it('every ground/weed/tuft sprite exists, is built into public and cites the wiki', () => {
    const keys = ['ground:Tiles', ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'weed:' + i), 'tuft:spring', 'tuft:fall', 'tuft:winter'];
    for (const k of keys) {
      const s = core.ui[k];
      expect(s, k).toBeTruthy();
      expect(PUBLIC.has(s.s), s.s).toBe(true);
      const f = s.s.split('/').pop()!;
      expect(SRC[f]?.from, f).toMatch(/^https:\/\/stardewvalleywiki\.com\/File:/);
    }
  });
  it('seeded: same layout on every load, different seeds differ', () => {
    expect(groundTiles(40, 11)).toEqual(groundTiles(40, 11));
    expect(groundTiles(40, 11)).not.toEqual(groundTiles(40, 7));
    expect(meadowScatter(0)).toEqual(meadowScatter(0));
    const r = rng(5); const v = Array.from({ length: 50 }, r);
    expect(v.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('ground tiles vary with no short repeat and no doubled detail tile', () => {
    const t = groundTiles(48, 11);
    expect(t.every((x) => x >= 0 && x < GROUND_TILE_COUNT)).toBe(true);
    expect(new Set(t).size).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < t.length; i++) if (t[i] >= 2) expect(t[i - 1]).not.toBe(t[i]);
    // not periodic with any short period (the old strip repeated every 2 tiles)
    for (let p = 1; p <= 8; p++) expect(t.slice(p).every((x, i) => x === t[i]), 'period ' + p).toBe(false);
  });
  it('scatter is irregular: spacing varies, all layers present, within the strip', () => {
    for (let s = 0; s < 4; s++) {
      const sc = meadowScatter(s);
      for (const l of ['back', 'mid', 'front']) expect(sc.some((t) => t.layer === l)).toBe(true);
      expect(sc.every((t) => t.x >= 0 && t.x <= 100)).toBe(true);
      const xs = sc.filter((t) => t.layer === 'back').map((t) => t.x).sort((a, b) => a - b);
      const gaps = xs.slice(1).map((x, i) => Math.round((x - xs[i]) * 10));
      expect(new Set(gaps).size).toBeGreaterThan(gaps.length / 2);
      for (const t of sc) expect(core.ui[t.k] ?? items[t.k], t.k).toBeTruthy();
    }
  });
  it('seasons: green weeds spring/summer, red/orange in fall, no weeds in winter; seasonal forage', () => {
    expect(meadowKinds(0).weeds.length).toBeGreaterThan(0);
    expect(meadowKinds(2).weeds).toContain('weed:7');
    expect(meadowKinds(3).weeds).toEqual([]);
    expect(meadowScatter(3).some((t) => t.k.startsWith('weed:'))).toBe(false);
    expect(meadowKinds(2).tuft).toBe('tuft:fall');
    expect(meadowKinds(3).tuft).toBe('tuft:winter');
    expect(meadowKinds(0).forage.map((q) => items[q].n)).toContain('Daffodil');
    expect(meadowKinds(3).forage.map((q) => items[q].n)).toContain('Crocus');
  });
  it('sway is synced to the wind wisp, cheap (transform only) and off under reduced motion', () => {
    expect(SWAY_S * 4).toBe(WISP_S);
    expect(CSS).toMatch(/animation: wisp 13s/);
    expect(CSS).toMatch(/\.m-tuft\.sway \{ animation: sway 3\.25s/);
    expect(CSS).toMatch(/prefers-reduced-motion: reduce\) \{ \.m-tuft\.sway \{ animation: none/);
    expect(CSS).toMatch(/\.meadow \{[^}]*pointer-events: none/);
    const kf = CSS.match(/@keyframes sway \{[^\n]*/)![0];
    expect(kf).not.toMatch(/left|top|width|height|margin/);
  });
});
