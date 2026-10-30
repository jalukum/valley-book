import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { newProfile } from '../lib/state';
import { fishBiting, bundleFinish, dayGuide } from '../lib/guide';
import { starKey, isStarred, starredGroups, starCount, starEntry } from '../lib/stars';
import { luckToday, luckLevel, LUCK } from '../lib/luck';
import { activeBundles } from '../lib/progress';

const prof = () => { const p = newProfile(); p.setup.rod = 'bamboo'; p.date = { season: 0, day: 9, year: 1 }; p.weather = 'sun'; p.time = 600; return p; };

describe('stars', () => {
  it('builds grouped entries for items, fish, villagers and bundles', () => {
    const p = prof();
    const b = activeBundles(core, p)[0];
    p.stars = [starKey.item('(O)128'), starKey.item('(O)24'), starKey.villager(core.npcs[0].id), starKey.bundle(b.id)];
    expect(isStarred(p, starKey.item('(O)128'))).toBe(true);
    const g = starredGroups(p);
    expect(g.map((x) => x.group)).toEqual(['Fish', 'Items', 'Villagers', 'Bundles']);
    expect(starCount(p)).toBe(4);
    expect(starEntry(p, starKey.bundle(b.id))!.href).toContain('#/bundles/room/');
  });
  it('ignores unknown keys', () => {
    const p = prof(); p.stars = ['item:(O)nope', 'junk'];
    expect(starCount(p)).toBe(0);
  });
});

describe('luck of the day', () => {
  it('has five levels and only applies to the day it was set', () => {
    expect(LUCK.map((l) => l.v)).toEqual([2, 1, 0, -1, -2]);
    const p = prof(); p.luck = { day: 'y1-0-9', v: 2 };
    expect(luckToday(p)).toBe(2);
    expect(luckLevel(2)!.label).toBeTruthy();
    p.date.day = 10;
    expect(luckToday(p)).toBeNull();
  });
  it('a lucky day lifts the Mines job, an unlucky day lowers it', () => {
    const p = prof(); p.setup.mine = 20; p.date = { season: 0, day: 12, year: 1 };
    const base = dayGuide(core, p);
    const mineTask = (g: typeof base) => g.tasks.find((t) => t.id === 'luck-mines' || t.id === 'mines');
    p.luck = { day: 'y1-0-12', v: 2 };
    const lucky = dayGuide(core, p);
    expect(lucky.tasks.some((t) => t.id === 'luck-mines')).toBe(true);
    p.luck = { day: 'y1-0-12', v: -2 };
    const unlucky = dayGuide(core, p);
    const b0 = mineTask(base), u = mineTask(unlucky);
    if (b0 && u) expect(u.score).toBeLessThan(b0.score);
  });
});

describe('biting right now', () => {
  it('sorts by which fish stop biting first and lists later fish', () => {
    const p = prof();
    const r = fishBiting(core, p);
    expect(r.now.length).toBeGreaterThan(3);
    for (let i = 1; i < r.now.length; i++) expect(r.now[i].until).toBeGreaterThanOrEqual(r.now[i - 1].until);
    const names = r.now.map((x) => x.f.name);
    expect(names).toContain('Sunfish'); // 6am–7pm, sunny, spring
    expect(names).not.toContain('Catfish'); // rain only
    expect(names).not.toContain('Eel'); // rain only, from 4pm
    expect(r.later.map((x) => x.f.name)).toContain('Bream'); // 6pm–2am
    expect(r.later.every((x) => x.start > 1000)).toBe(true);
  });
  it('rain and night change the list', () => {
    const p = prof(); p.weather = 'rain'; p.time = 1200; // 8pm
    const n = fishBiting(core, p).now.map((x) => x.f.name);
    expect(n).toContain('Eel');
    expect(n).toContain('Catfish');
    expect(n).not.toContain('Sunfish');
  });
});

describe('bundle filters', () => {
  it('finish today counts only items gettable today and skips crops that still grow', () => {
    const p = prof();
    const { finish, short } = bundleFinish(core, p);
    for (const e of [...finish, ...short]) for (const r of e.today) expect(r.how.startsWith('Plant today')).toBe(false);
    for (const e of finish) expect(e.today.length).toBe(e.need);
    for (const e of short) { expect(e.today.length).toBe(e.need - 1); expect(e.missing.length).toBeGreaterThan(0); }
  });
  it('spring foraging is finishable on a spring day and summer foraging is not', () => {
    const p = prof();
    const { finish, short } = bundleFinish(core, p);
    const names = [...finish, ...short].map((e) => e.b.name);
    expect(finish.map((e) => e.b.name)).toContain('Spring Foraging');
    expect(names).not.toContain('Summer Foraging');
    const lake = [...finish, ...short].find((e) => e.b.name === 'Lake Fish');
    if (lake && short.includes(lake)) expect(lake.missing.some((m) => /Not today/.test(m.why))).toBe(true);
  });
});
