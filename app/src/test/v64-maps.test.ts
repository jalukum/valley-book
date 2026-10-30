import { describe, it, expect } from 'vitest';
import schedules from '../generated/schedules.json';
import { core, npcById } from '../data';
import { newProfile, type Profile } from '../lib/state';
import { whereNow } from '../lib/where';
import { locate, spotForLine, spotImg, homeSpot } from '../lib/maps';
import { SPOTS, REGIONS, toImg, HOME_BY_ADDRESS, FIXED_NPCS } from '../lib/mapdata';
import type { Schedule } from '../types';
const S = schedules as unknown as Record<string, Schedule>;
// Sprites the app actually ships (prepare-data copies the tracked sprites/ folder into public/sprites).
const PUBLIC = new Set(Object.keys(import.meta.glob('../../public/sprites/**/*.png')).map((k) => k.replace('../../public/', '')));
const existsSync = (rel: string) => PUBLIC.has('sprites/' + rel);
const SPR = '';
const day = (season: number, d: number, weather: Profile['weather'] = 'sun') => { const p = newProfile(); p.date = { season, day: d, year: 1 }; p.weather = weather; return p; };
const at = (p: Profile, t: number) => Object.fromEntries(core.npcs.map((n) => [n.id, locate(n, S[n.id], p, t)]));

describe('v6.4 map position mapping', () => {
  it('maps world-map pixels onto the 400×244 wiki map (img = 4/3·g + offset)', () => {
    expect(toImg(REGIONS.valley, 0, 0)).toEqual([-2, -1]);
    expect(toImg(REGIONS.valley, 300, 180)).toEqual([398, 239]);
    const [x, y] = spotImg('SeedShop'); // MapPixelArea 175,84,6,3 -> centre 178,85.5
    expect(x).toBeCloseTo(235.33, 1); expect(y).toBeCloseTo(113, 5);
    expect(spotImg('Saloon')).toEqual([4 / 3 * 179 - 2, 4 / 3 * 96.5 - 1]);
  });
  it('every spot lands inside its map image', () => {
    for (const [k, s] of Object.entries(SPOTS)) {
      const r = REGIONS[s.region]; const [x, y] = toImg(r, s.x, s.y);
      expect(x, k).toBeGreaterThan(0); expect(x, k).toBeLessThan(r.w);
      expect(y, k).toBeGreaterThan(0); expect(y, k).toBeLessThan(r.h);
      // and inside the area the map can pan to, so a chosen villager can always be centred on screen
      const [x0, y0, x1, y1] = r.bounds;
      expect(x, k).toBeGreaterThanOrEqual(x0 + 10); expect(x, k).toBeLessThanOrEqual(x1 - 10);
      expect(y, k).toBeGreaterThanOrEqual(y0 + 10); expect(y, k).toBeLessThanOrEqual(y1 - 10);
    }
  });
  it('every villager has a home spot; Wizard, Dwarf and Krobus stay home', () => {
    for (const n of core.npcs) expect(SPOTS[homeSpot(n)], n.id).toBeTruthy();
    for (const a of Object.values(HOME_BY_ADDRESS)) expect(SPOTS[a]).toBeTruthy();
    const p = day(2, 14);
    for (const id of FIXED_NPCS) { const r = locate(npcById[id], S[id], p, 900); expect(r.kind).toBe('fixed'); expect(r.spot).toBe(homeSpot(npcById[id])); }
  });
  it('reads destinations out of schedule lines', () => {
    expect(spotForLine('Leaves home to work at The Stardrop Saloon.', ['The Stardrop Saloon'], 'HaleyHouse')).toBe('Saloon');
    expect(spotForLine('Returns home from the Stardrop Saloon.', [], 'SamHouse')).toBe('SamHouse');
    expect(spotForLine('Leaves JojaMart and heads for the Stardrop Saloon.', [], 'AnimalShop')).toBe('Saloon');
    expect(spotForLine('Walks to the dock on Island South, stands near the entrance to Island Southeast.', [], 'IslandHut')).toBe('IslandSouth');
    expect(spotForLine('Stands by a trash can.', [], 'X')).toBeNull();
  });
});

describe('v6.4 whereNow at slider times', () => {
  it('Spring 9, rain, 8:10 PM: Emily works at the Saloon until 12:30 AM, then goes home', () => {
    const p = day(0, 9, 'rain'); const r = at(p, 1210);
    expect(whereNow('Emily', S.Emily, { ...p, time: 1210 }).place).toMatch(/Saloon/);
    expect(r.Emily.spot).toBe('Saloon'); expect(r.Emily.until).toBe(1470); expect(r.Emily.next).toBe('HaleyHouse');
    for (const id of ['Clint', 'Pam', 'Leah', 'Shane', 'Gus', 'Harvey', 'Willy']) expect(r[id].spot, id).toBe('Saloon');
  });
  it('Fall 14, sunny, 2:30 PM: Pierre, Caroline, Jodi and Kent are at the general store; Leo is on the island', () => {
    const r = at(day(2, 14), 870);
    for (const id of ['Pierre', 'Caroline', 'Jodi', 'Kent']) expect(r[id].spot, id).toBe('SeedShop');
    expect(SPOTS[r.Leo.spot].region).toBe('island');
    expect(SPOTS[r.Sandy.spot].region).toBe('desert');
  });
  it('before the first move everyone is at home, and every 10-minute step of the slider resolves', () => {
    const p = day(1, 3);
    const early = at(p, 360);
    for (const n of core.npcs) if (early[n.id].kind === 'before') expect(early[n.id].spot).toBe(homeSpot(n, p));
    for (let t = 360; t <= 1560; t += 10) for (const r of Object.values(at(p, t))) {
      expect(SPOTS[r.spot], `${r.npc.id} ${t}`).toBeTruthy();
      if (r.until != null) expect(r.until).toBeGreaterThan(t);
    }
  });
});

describe('v6.4 map pins use each villager’s own sprite', () => {
  it('every villager pinned on the map resolves to an existing icon and portrait named for that NPC', () => {
    const pinned = new Set<string>();
    for (const [p, t] of [[day(2, 14), 870], [day(0, 9, 'rain'), 1210], [day(3, 18), 1140]] as const) for (const r of Object.values(at(p, t))) pinned.add(r.npc.id);
    expect(pinned.size).toBe(core.npcs.length);
    for (const id of pinned) {
      const n = npcById[id];
      expect(n.icon?.s, id).toBe(`sprites/npc_icons/${id}_Icon.png`);
      expect(n.portrait?.s, id).toBe(`sprites/portraits/${id}.png`);
      expect(existsSync(SPR + `npc_icons/${id}_Icon.png`), id).toBe(true);
      expect(existsSync(SPR + `portraits/${id}.png`), id).toBe(true);
    }
  });
  it('the map art files exist', () => {
    for (const k of ['map:Valley', 'map:Island']) expect(existsSync(SPR + core.ui[k].s.replace(/^sprites\//, ''))).toBe(true);
  });
});
