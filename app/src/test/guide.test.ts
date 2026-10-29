import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { newProfile, type Profile } from '../lib/state';
import { dayGuide, fishToday, cropsToday, bundlesToday, access, openQuests, eventsToday, ordersAvailable, roadmap, growWindow, whatToDo, planSlots } from '../lib/guide';
import type { Task } from '../lib/guide';
import { activeBundles } from '../lib/progress';

const at = (season: number, day: number, year: number, weather: Profile['weather'] = 'sun', patch: (p: Profile) => void = () => {}) => {
  const p = newProfile('t'); p.date = { season, day, year }; p.weather = weather; patch(p); return p;
};
const ISLAND = /Ginger|Island|Pirate|Caldera|Volcano|Walnut|\bQi\b/;
const DESERT = /Desert|Oasis|Calico|Skull/;

describe('Year 1 Spring 1', () => {
  const p = at(0, 1, 1);
  const gd = dayGuide(core, p);
  it('never shows the island, Skull Cavern or the desert', () => {
    const text = JSON.stringify([gd.tasks, gd.fish.map((f) => [f.f.name, f.where]), gd.forage, gd.crops.map((c) => [c.c.name, c.shop])]);
    expect(text).not.toMatch(ISLAND);
    expect(text).not.toMatch(DESERT);
    expect(gd.a.island || gd.a.skull || gd.a.bus).toBe(false);
  });
  it('has no fishing (rod arrives Spring 2) and no mines (open Spring 5)', () => {
    expect(gd.fish).toHaveLength(0);
    expect(gd.a.minesOpen).toBe(false);
    expect(gd.tasks.some((t) => t.id === 'mines')).toBe(false);
  });
  it('starts with parsnips and the intro quests', () => {
    expect(gd.tasks[0].id).toBe('d1-plant');
    expect(gd.quests.map((q) => q.id)).toEqual(expect.arrayContaining(['introductions', 'getting-started']));
    expect(gd.quests.map((q) => q.id)).not.toContain('the-skull-key');
  });
  it('gives a best move plus up to three more, each with a reason', () => {
    const w = whatToDo(gd);
    expect(w.best).toBeTruthy();
    expect(w.more.length).toBeGreaterThanOrEqual(2);
    [w.best!, ...w.more].forEach((t) => expect(t.why.length).toBeGreaterThan(10));
  });
});

describe('weather', () => {
  const rainFish = (p: Profile) => fishToday(core, p).filter((r) => r.rainOnly).map((r) => r.f.name);
  it('rain-only fish appear only in rain (and storms / green rain)', () => {
    expect(rainFish(at(0, 10, 1, 'sun'))).toHaveLength(0);
    expect(rainFish(at(0, 10, 1, 'wind'))).toHaveLength(0);
    expect(rainFish(at(0, 10, 1, 'rain'))).toContain('Catfish');
    expect(rainFish(at(0, 10, 1, 'storm'))).toContain('Catfish');
    expect(rainFish(at(1, 12, 1, 'green')).length).toBeGreaterThan(0);
  });
  it('sun-only fish disappear in rain', () => {
    const names = (w: Profile['weather']) => fishToday(core, at(0, 10, 1, w)).map((r) => r.f.name);
    expect(names('sun')).toContain('Sunfish');
    expect(names('rain')).not.toContain('Sunfish');
  });
  it('legendary fish only in their own season', () => {
    const names = (season: number) => { const p = at(season, 10, 2, 'rain'); p.perf.skills.Fishing = 10; p.setup.mine = 120; return fishToday(core, p).map((r) => r.f.name); };
    expect(names(1)).not.toContain('Angler');
    expect(names(2)).toContain('Angler');
    expect(names(0)).toContain('Legend');
    expect(names(1)).toContain('Crimsonfish');
    expect(names(3)).not.toContain('Crimsonfish');
  });
});

describe('crops', () => {
  it('excludes crops that cannot mature by day 28', () => {
    const late = cropsToday(core, at(0, 22, 1)).map((r) => r.c.name);
    expect(late).toContain('Parsnip'); // 4 days
    expect(late).not.toContain('Cauliflower'); // 12 days
    for (const r of cropsToday(core, at(0, 22, 1))) expect(r.readyDay).toBeLessThanOrEqual(28);
    expect(cropsToday(core, at(0, 28, 1))).toHaveLength(0);
  });
  it('lets multi-season crops use the next season', () => {
    const corn = core.guide.crops.find((c) => c.name === 'Corn')!;
    expect(growWindow(corn, 1, 20)).toBe(8 + 28);
  });
  it('never sells Oasis seeds without the bus, and applies the Joja markup', () => {
    expect(cropsToday(core, at(0, 3, 1)).some((r) => r.c.name === 'Rhubarb')).toBe(false);
    const wed = cropsToday(core, at(0, 3, 1)).find((r) => r.c.name === 'Parsnip')!; // Wednesday: Pierre closed
    expect(wed.shop).toBe('JojaMart');
    expect(wed.seedPrice).toBe(25);
    const bus = cropsToday(core, at(0, 3, 1, 'sun', (p) => { p.flags.bus = 'yes'; })).some((r) => r.c.name === 'Rhubarb');
    expect(bus).toBe(true);
  });
});

describe('bundles', () => {
  it('excludes completed bundle items', () => {
    const p = at(0, 10, 1);
    const before = bundlesToday(core, p);
    const horseradish = before.find((r) => r.name === 'Wild Horseradish')!;
    expect(horseradish).toBeTruthy();
    p.cc.checked[horseradish.bundleId] = [horseradish.index];
    const after = bundlesToday(core, p);
    expect(after.some((r) => r.bundleId === horseradish.bundleId && r.index === horseradish.index)).toBe(false);
    const b = activeBundles(core, p).find((x) => x.id === horseradish.bundleId)!;
    p.cc.checked[b.id] = b.items.map((_, i) => i);
    expect(bundlesToday(core, p).some((r) => r.bundleId === b.id)).toBe(false);
  });
  it('shows no CC bundles on the Joja route', () => {
    expect(bundlesToday(core, at(0, 10, 1, 'sun', (p) => { p.cc.route = 'joja'; }))).toHaveLength(0);
  });
});

describe('gating', () => {
  it('locks the desert, Skull Cavern and island until their unlocks', () => {
    const mid = at(2, 10, 2, 'sun', (p) => { p.setup.mine = 120; });
    expect(access(core, mid).skull).toBe(false); // no bus yet
    mid.flags.bus = 'yes';
    expect(access(core, mid).skull).toBe(true);
    expect(fishToday(core, mid).some((r) => r.f.name === 'Sandfish')).toBe(true);
    expect(access(core, mid).island).toBe(false);
  });
  it('mine fish need the right floor', () => {
    const p = at(0, 10, 1, 'sun', (x) => { x.setup.mine = 19; });
    expect(fishToday(core, p).some((r) => r.f.name === 'Ghostfish')).toBe(false);
    p.setup.mine = 20;
    expect(fishToday(core, p).some((r) => r.f.name === 'Ghostfish')).toBe(true);
  });
  it('legendary fish need the fishing level and drop off once caught', () => {
    const p = at(0, 10, 1, 'rain');
    expect(fishToday(core, p).some((r) => r.f.name === 'Legend')).toBe(false);
    p.perf.skills.Fishing = 10;
    expect(fishToday(core, p).some((r) => r.f.name === 'Legend')).toBe(true);
    p.done.fish = { [core.fish.find((f) => f.name === 'Legend')!.qid]: 1 };
    expect(fishToday(core, p).some((r) => r.f.name === 'Legend')).toBe(false);
  });
  it('quests unlock by date, prerequisites and progress, and finished ones are skipped', () => {
    const p = at(0, 18, 1);
    expect(openQuests(core, p).some((q) => q.id === 'jodi-s-request')).toBe(false);
    p.date.day = 19;
    expect(openQuests(core, p).some((q) => q.id === 'jodi-s-request')).toBe(true);
    p.done.quests = { 'jodi-s-request': 1 };
    expect(openQuests(core, p).some((q) => q.id === 'jodi-s-request')).toBe(false);
    expect(openQuests(core, p).some((q) => q.id === 'how-to-win-friends')).toBe(false);
    p.done.quests.introductions = 1;
    expect(openQuests(core, p).some((q) => q.id === 'how-to-win-friends')).toBe(true);
  });
  it('heart events need the hearts and respect weather; seen ones are skipped', () => {
    const p = at(0, 10, 1);
    expect(eventsToday(core, p).every((r) => r.e.hearts === 0)).toBe(true);
    const ev = core.guide.events.find((e) => e.hearts > 0 && !e.special.length && !e.w && !e.access && !e.after?.length && !e.others.length && !e.days?.length && !e.y && !e.minPlayed && !e.notSeasons?.includes('spring') && !e.notDays?.includes(3) && !e.marriedTo)!;
    p.hearts[ev.npc] = ev.hearts;
    expect(eventsToday(core, p).some((r) => r.e.id === ev.id)).toBe(true);
    p.done.events = { [ev.id]: 1 };
    expect(eventsToday(core, p).some((r) => r.e.id === ev.id)).toBe(false);
    const rainy = core.guide.events.find((e) => e.w === 'rainy' && !e.special.length)!;
    if (rainy) {
      const q = at(1, 10, 2, 'sun'); q.hearts[rainy.npc] = 14; rainy.others.forEach((o) => (q.hearts[o.npc] = 14));
      expect(eventsToday(core, q).some((r) => r.e.id === rainy.id)).toBe(false);
    }
  });
  it('special orders only after Fall 2, Year 1', () => {
    expect(ordersAvailable(core, at(2, 1, 1))).toHaveLength(0);
    expect(ordersAvailable(core, at(2, 2, 1)).length).toBeGreaterThan(0);
  });
  it('the Vault infers the bus and the Pantry infers the greenhouse', () => {
    const p = at(1, 1, 1);
    for (const b of activeBundles(core, p).filter((b) => b.room === 'Vault' || b.room === 'Pantry')) p.cc.checked[b.id] = b.items.map((_, i) => i);
    const a = access(core, p);
    expect(a.bus).toBe(true);
    expect(a.greenhouse).toBe(true);
  });
});

describe('Road to Perfection', () => {
  it('starts in phase 1 and moves on as progress is saved', () => {
    expect(roadmap(core, at(0, 1, 1)).current?.n).toBe(1);
    const p = at(1, 1, 1, 'sun', (x) => { x.setup.mine = 40; x.setup.backpack = 24; x.done.quests = { 'getting-started': 1 }; });
    const b = activeBundles(core, p)[0]; p.cc.checked[b.id] = b.items.map((_, i) => i);
    expect(roadmap(core, p).current?.n).toBe(2);
  });
});

describe('planSlots (Today’s plan card)', () => {
  const T = (id: string, tick = true): Task => ({ id, label: 'Money' as const, title: id, why: '', score: 0, icon: {}, ...(tick ? { tick: { col: 'c', id } } : {}) });
  const tasks = [T('a'), T('b'), T('c', false), T('d')];
  it('puts the first job big and the rest under More jobs, with no job shown twice', () => {
    const s = planSlots(tasks, () => false);
    expect(s.best?.id).toBe('a');
    expect(s.more.map((t) => t.id)).toEqual(['b', 'c', 'd']);
    expect(new Set([s.best!.id, ...s.more.map((t) => t.id)]).size).toBe(tasks.length);
  });
  it('promotes the next job when #1 is ticked, and sinks ticked jobs to the end', () => {
    const s = planSlots(tasks, (t) => t.id === 'a');
    expect(s.best?.id).toBe('b');
    expect(s.more.map((t) => t.id)).toEqual(['c', 'd', 'a']);
    expect(s.open).toBe(3);
  });
  it('shows nothing big when everything is ticked or the list is empty', () => {
    expect(planSlots(tasks, () => true).best).toBeNull();
    expect(planSlots([], () => false)).toEqual({ best: null, more: [], open: 0 });
  });
  it('works on a real day guide', () => {
    const gd = dayGuide(core, at(1, 12, 1, 'rain'));
    const s = planSlots(gd.tasks, () => false);
    expect(s.best).toBe(gd.tasks[0]);
    expect(s.more.length).toBe(gd.tasks.length - 1);
  });
});

describe('every plan job can be ticked', () => {
  it('gives jobs without a checklist item a tick that lasts only for that day', () => {
    const gd = dayGuide(core, at(1, 12, 1, 'sun'));
    expect(gd.tasks.every((t) => !!t.tick)).toBe(true);
    const day = gd.tasks.filter((t) => t.tick!.col === 'plan');
    expect(day.length).toBeGreaterThan(0);
    for (const t of day) expect(t.tick!.id).toBe(`y1-1-12:${t.id}`);
    const next = dayGuide(core, at(1, 13, 1, 'sun')).tasks.filter((t) => t.tick!.col === 'plan');
    expect(next.every((t) => t.tick!.id.startsWith('y1-1-13:'))).toBe(true);
  });
  it('promotes the next job after ticking a day-only #1', () => {
    const p = at(1, 12, 1, 'sun');
    const first = dayGuide(core, p).tasks[0];
    p.done[first.tick!.col] = { [first.tick!.id]: 1 };
    const s = planSlots(dayGuide(core, p).tasks, (t) => (p.done[t.tick!.col]?.[t.tick!.id] ?? 0) > 0);
    expect(s.best?.id).not.toBe(first.id);
    expect(s.more[s.more.length - 1].id).toBe(first.id);
  });
});
