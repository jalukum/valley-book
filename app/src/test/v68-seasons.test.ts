import { describe, it, expect } from 'vitest';
import SOURCES from '../../../sprites/derived/SOURCES.json';
import { core, items } from '../data';
import { meadowTrees, meadowKinds, meadowScatter, TREE_SEASONS, treeKind } from '../lib/meadow';

const SRC = SOURCES as Record<string, { from: string; crop?: number[] }>;
const SEASON = ['spring', 'summer', 'fall', 'winter'];
const treeKeys = (s: number) => meadowTrees(s).map((t) => t.k);
const elements = (s: number) => {
  const k = meadowKinds(s);
  return new Set([...treeKeys(s), ...k.weeds, k.tuft, ...k.forage]);
};

describe('v6.8 real spring and summer meadows', () => {
  it('spring and summer have different element sets (no shared trees or forage)', () => {
    const sp = elements(0), su = elements(1);
    expect([...sp].join()).not.toBe([...su].join());
    for (const k of treeKeys(0)) expect(treeKeys(1), k).not.toContain(k);
    for (const k of meadowKinds(0).forage) expect(meadowKinds(1).forage, k).not.toContain(k);
    const kinds = (s: number) => new Set(treeKeys(s).map(treeKind));
    for (const k of kinds(0)) expect(kinds(1).has(k), k).toBe(false);
  });
  it('each tree only appears in the seasons it really grows (Green Rain Trees wiki)', () => {
    for (const s of [0, 1, 2, 3]) for (const k of treeKeys(s)) {
      const kind = treeKind(k), rule = TREE_SEASONS[kind];
      expect(rule, kind).toBeTruthy();
      expect(rule.seasons, `${kind} in ${SEASON[s]}`).toContain(s);
      expect(rule.src).toMatch(/^https:\/\/stardewvalleywiki\.com\//);
      // the season suffix picks that season's own sprite panel
      expect(Number(k.split(':')[2] ?? 0), k).toBe(s);
    }
    expect(treeKeys(0).some((k) => /Mossy|Fiddlehead/.test(k))).toBe(false);
    for (const s of [0, 2, 3]) expect(treeKeys(s).some((k) => k.includes('Fiddlehead')), SEASON[s]).toBe(false);
    expect(treeKeys(1)).toEqual(['tree:MossyWild:1', 'tree:Fiddlehead:1', 'tree:Fiddlehead:1', 'tree:MossyLush:1']);
  });
  it('spring trees are the unedited first panel of the wiki Stage 5 sprites', () => {
    for (const n of ['Oak', 'Maple', 'Pine']) {
      const s = core.ui[`tree:${n}:0`];
      expect(s?.s, n).toMatch(new RegExp(`Tree_${n}_Spring\\.png$`));
      const src = SRC[`Tree_${n}_Spring.png`];
      expect(src.from).toBe(`https://stardewvalleywiki.com/File:${n}_Stage_5.png`);
      expect(src.crop?.[0]).toBe(0);
    }
  });
  it('forage on the grass is real forage of that season (item data seasons)', () => {
    for (const s of [0, 1, 2, 3]) for (const q of meadowKinds(s).forage) {
      const it = items[q];
      expect(it?.s, q).toBeTruthy();
      expect((it as { t?: string[] }).t ?? [], `${it.n} in ${SEASON[s]}`).toContain(SEASON[s]);
    }
    const names = (s: number) => meadowKinds(s).forage.map((q) => items[q].n);
    expect(names(0)).toEqual(expect.arrayContaining(['Daffodil', 'Dandelion', 'Leek', 'Spring Onion']));
    expect(names(1)).toEqual(expect.arrayContaining(['Sweet Pea', 'Spice Berry', 'Grape', 'Fiddlehead Fern']));
  });
  it('scatter stays the same size per season (layout/perf unchanged)', () => {
    for (const s of [0, 1]) {
      const sc = meadowScatter(s);
      expect(sc.length, SEASON[s]).toBe(meadowScatter(2).length);
    }
  });
});
