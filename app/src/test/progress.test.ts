import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { newProfile, normalizeProfile, parseImport, weekKey } from '../lib/state';
import { activeBundles, ccProgress, perfection, jojaProgress, walnutsFound, walnutTotal, farmerLevel, worldFlags, remixChoice } from '../lib/progress';

const fresh = () => newProfile('Test');
const fillAll = (p: ReturnType<typeof fresh>) => { for (const b of activeBundles(core, p)) p.cc.checked[b.id] = b.items.map((_, i) => i); };

describe('community center progress', () => {
  it('starts at 0 and reaches 100 with every bundle filled', () => {
    const p = fresh();
    expect(ccProgress(core, p).percent).toBe(0);
    fillAll(p);
    const cc = ccProgress(core, p);
    expect(cc.percent).toBeCloseTo(100);
    expect(cc.complete).toBe(true);
    expect(cc.roomsDone.length).toBe(6);
    expect(worldFlags(core, p).ccRestored).toBe(true);
  });
  it('counts partial bundles proportionally and caps at required', () => {
    const p = fresh();
    const b = activeBundles(core, p).find((x) => x.room === 'Crafts Room' && x.required < x.items.length)!;
    p.cc.checked[b.id] = b.items.map((_, i) => i); // more than required
    const all = activeBundles(core, p).filter((x) => x.room !== 'Abandoned Joja Mart').length;
    expect(ccProgress(core, p).percent).toBeCloseTo(100 / all);
    expect(ccProgress(core, p).bundlesDone).toBe(1);
  });
  it('has 30 standard CC bundles across 6 rooms', () => {
    const p = fresh();
    expect(ccProgress(core, p).bundles).toBe(30);
  });
  it('remix picks keep the chosen count', () => {
    const p = fresh(); p.cc.mode = 'remix';
    for (const r of core.remix) {
      const ch = remixChoice(core, p, r.room);
      const pickN = r.slots.length === 1 && r.slots[0].index === -1;
      expect(ch.length).toBe(pickN ? r.count : r.slots.length);
      if (pickN) { p.cc.remix[r.room] = [0, 0, 1]; expect(new Set(remixChoice(core, p, r.room)).size).toBe(r.count); }
    }
    expect(ccProgress(core, p).bundles).toBeGreaterThan(0);
  });
  it('joja progress sums costs', () => {
    const p = fresh(); p.cc.route = 'joja';
    p.cc.joja.membership = true; p.cc.joja.Vault = true;
    const j = jojaProgress(core, p);
    expect(j.bought).toBe(2);
    expect(j.spent).toBe(core.joja.membership + core.joja.developments.find((d) => d.room === 'Vault')!.cost);
    expect(worldFlags(core, p).busRepaired).toBe(true);
  });
});

describe('perfection', () => {
  it('is 0 for a new farm', () => {
    expect(perfection(core, fresh()).percent).toBe(0);
  });
  it('category weights sum to 100', () => {
    const sum = perfection(core, fresh()).rows.reduce((a, r) => a + r.weight, 0);
    expect(sum).toBe(100);
  });
  it('reaches exactly 100 when everything is done', () => {
    const p = fresh();
    for (const s of core.shipping) (p.done.shipping ||= {})[s.qid] = 1;
    for (const f of core.fish) (p.done.fish ||= {})[f.qid] = 1;
    for (const r of core.recipes.cooking) (p.done.cooking ||= {})[r.id] = 1;
    for (const r of core.recipes.crafting) (p.done.crafting ||= {})[r.id] = 1;
    for (const s of core.slayer) (p.done.slayer ||= {})[s.id] = 1;
    for (const w of core.walnuts) (p.done.walnuts ||= {})[w.id] = w.count;
    for (const n of core.npcs) p.hearts[n.id] = 10;
    for (const o of core.perfection.obelisks) p.perf.obelisks[o] = 1;
    for (const s of core.perfection.stardrops) p.perf.stardrops[s.id] = 1;
    for (const s of core.perfection.skills) p.perf.skills[s] = 10;
    p.perf.goldClock = 1;
    const r = perfection(core, p);
    expect(walnutsFound(core, p)).toBe(130);
    expect(r.rows.every((x) => x.have >= x.total)).toBe(true);
    expect(r.percent).toBe(100);
  });
  it('adds waivers and never exceeds 100', () => {
    const p = fresh(); p.perf.waivers = 3;
    expect(perfection(core, p).percent).toBe(3);
    p.perf.waivers = 500;
    expect(perfection(core, p).percent).toBe(100);
  });
  it('a single fish is worth 10% / fish count', () => {
    const p = fresh(); const fishIds = core.fish.filter((f) => f.collection);
    p.done.fish = { [fishIds[0].qid]: 1 };
    const row = perfection(core, p).rows.find((r) => r.id === 'fish')!;
    expect(row.points).toBeCloseTo(row.weight / fishIds.length);
  });
  it('farmer level is half the skill sum, capped at 25', () => {
    const p = fresh(); p.perf.skills = { Farming: 10, Mining: 5 } as Record<string, number>;
    expect(farmerLevel(p, core.perfection.skills)).toBe(7);
    p.perf.skills = { Farming: 99, Mining: 10, Foraging: 10, Fishing: 10, Combat: 10 };
    expect(farmerLevel(p, core.perfection.skills)).toBe(25);
  });
  it('walnut total is 130', () => expect(walnutTotal(core)).toBe(130));
});

describe('profiles import', () => {
  it('round-trips and normalizes bad values', () => {
    const p = fresh(); p.date = { season: 9, day: 40, year: 0 }; p.time = 2000;
    const [q] = parseImport(JSON.stringify({ profiles: [p] }));
    expect(q.date).toEqual({ season: 3, day: 28, year: 1 });
    expect(q.time).toBe(1560);
    expect(q.name).toBe('Test');
  });
  it('accepts a bare profile and rejects junk', () => {
    expect(parseImport(JSON.stringify(fresh())).length).toBe(1);
    expect(() => parseImport('{"foo":1}')).toThrow();
    expect(() => parseImport('not json')).toThrow();
  });
  it('fills missing fields of old profiles', () => {
    const q = normalizeProfile({ name: 'Old', date: { season: 1, day: 3, year: 2 } });
    expect(q.perf.skills).toEqual({});
    expect(q.cc.mode).toBe('standard');
  });
  it('week key changes every 7 days', () => {
    expect(weekKey({ season: 0, day: 7, year: 1 })).toBe(weekKey({ season: 0, day: 1, year: 1 }));
    expect(weekKey({ season: 0, day: 8, year: 1 })).not.toBe(weekKey({ season: 0, day: 7, year: 1 }));
  });
});
