import { describe, it, expect } from 'vitest';
import schedules from '../generated/schedules.json';
import gamelocs from '../game/gamelocs.json';
import sources from '../../../sprites/derived/SOURCES.json';
import { core, npcById } from '../data';
import { newProfile } from '../lib/state';
import { locate, spotForLine, spotImg, homeSpot, gameHomeSpot } from '../lib/maps';
import { SPOTS, LOC_TO_SPOT } from '../lib/mapdata';
import * as MD from '../lib/mapdata';
import { ddNext, mapDayTo, dayAfter, type DdState } from '../lib/mapui';
import type { Schedule } from '../types';

const S = schedules as unknown as Record<string, Schedule>;
const G = gamelocs as unknown as { homes: Record<string, { loc: string; if?: string }[]>; areas: Record<string, { region: string; x: number; y: number; w: number; h: number }> };
const SCREENS = import.meta.glob('../screens/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const MAPS = SCREENS['../screens/Maps.tsx'];
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const atTime = (id: string, cond: RegExp, t: number, season = 0) => {
  const p = newProfile(); p.date = { season, day: 2, year: 1 };
  const b = S[id].blocks.find((x) => cond.test(x.cond))!; expect(b, id + ' ' + cond).toBeTruthy();
  return locate(npcById[id], S[id], p, t, b).spot;
};

describe('v6.6 map locations come from the game data', () => {
  it('puts every villager\'s home on the building the game spawns them in (Data/Characters.json)', () => {
    let n = 0;
    for (const v of core.npcs) {
      const h = G.homes[v.id]; if (!h || v.id === 'Leo') continue;
      const def = h.find((x) => !x.if) ?? h[0];
      const want = LOC_TO_SPOT[def.loc]; if (!want) continue;
      expect(homeSpot(v), v.id).toBe(want); expect(gameHomeSpot(v.id)).toBe(want); n++;
    }
    expect(n).toBeGreaterThan(25);
    expect(homeSpot(npcById.Sebastian)).toBe('ScienceHouse');   // SebastianRoom is inside Robin's house
    expect(homeSpot(npcById.Harvey)).toBe('Hospital');          // HarveyRoom is upstairs in the clinic
    expect(homeSpot(npcById.Leo, { hearts: { Leo: 0 } } as never)).toBe('IslandHut');
    expect(homeSpot(npcById.Leo, { hearts: { Leo: 6 } } as never)).toBe('Treehouse');
  });
  it('puts each building spot on that building\'s WorldMap.json pixel area (interiors map to their exterior)', () => {
    const errs: string[] = []; let n = 0;
    const by: Record<string, string[]> = {};
    for (const [loc, spot] of Object.entries(LOC_TO_SPOT)) (by[spot] ??= []).push(loc);
    for (const [spot, locs] of Object.entries(by)) {
      const s = SPOTS[spot] as (typeof SPOTS)[string] & { indoor?: boolean };
      const areas = locs.map((l) => G.areas[l]).filter((a) => a && a.w > 0 && (a.region === 'Valley' || a.region === 'GingerIsland'));
      if (!s?.indoor || s.region === 'desert' || !areas.length) continue;
      n++;
      if (!areas.some((a) => Math.abs(s.x - (a.x + a.w / 2)) < 0.01 && Math.abs(s.y - (a.y + a.h / 2)) < 0.01)) errs.push(`${spot} ${s.x},${s.y} vs ${areas.map((a) => `${a.x + a.w / 2},${a.y + a.h / 2}`).join(' / ')}`);
    }
    expect(n).toBeGreaterThan(18);
    expect(errs).toEqual([]);
  });
  it('ends Sebastian\'s regular day at Robin\'s house, not by the Adventurer\'s Guild', () => {
    for (const t of [2130, 2300, 2500]) expect(atTime('Sebastian', /^Regular Schedule$/, t)).toBe('ScienceHouse');
    const lake = spotImg('Lake'), guild = spotImg('AdventureGuild');
    expect(Math.hypot(lake[0] - guild[0], lake[1] - guild[1])).toBeGreaterThan(18);
  });
  it('reads the wiki schedule lines to the right building', () => {
    const L: [string, string, string][] = [
      ['Sebastian', 'In Sam\'s room.', 'SamHouse'],
      ['Sebastian', 'Smoking by the lake next to his house.', 'Lake'],
      ['Alex', 'Goes to Haley and Emily\'s house.', 'HaleyHouse'],
      ['Alex', 'Goes to his grandparent\'s house.', 'JoshHouse'],
      ['Maru', 'Leaves home and heads to Harvey\'s.', 'Hospital'],
      ['Leah', 'Walks back to her cottage.', 'LeahHouse'],
      ['Abigail', 'Arrives in Sebastian’s room.', 'ScienceHouse'],
      ['Gus', 'Leaves the clinic to go tend the bar.', 'Saloon'],
      ['Penny', 'Walks Jas home to Marnie\'s Ranch.', 'AnimalShop'],
    ];
    for (const [id, line, want] of L) expect(spotForLine(line, [], homeSpot(npcById[id])), `${id}: ${line}`).toBe(want);
  });
});

describe('v6.6 map look', () => {
  it('has no pop-up place labels, trails or the "choose a villager and zoom" hint', () => {
    expect('LANDMARKS' in MD).toBe(false);
    expect(MAPS).not.toMatch(/map-label|map-trail|LANDMARKS|\.trail\b|Pinch or double-tap/);
    expect(CSS).not.toMatch(/\.map-label|\.map-trail/);
  });
  it('uses a grid-free desert render and credits it', () => {
    const d = (sources as Record<string, { from: string; also?: string; note?: string }>)['Map_Desert'] ?? Object.values(sources as Record<string, { from?: string }>).find((x) => /Desert/.test(x.from ?? ''));
    expect(JSON.stringify(d)).toMatch(/DesertDistances/); expect(JSON.stringify(d)).toMatch(/DesertForageLocations/); expect(JSON.stringify(d)).toMatch(/overlay|grid/i);
  });
});

describe('v6.6 villager dropdown', () => {
  it('keeps "No one (just the map)" pinned at the top while the list scrolls', () => {
    expect(CSS).toMatch(/\.dd-row\.none \{[^}]*position: sticky;[^}]*top: -4px;[^}]*background: var\(--paper\)/);
  });
  it('is a true toggle: open, tap the button, closed (with the roll-up)', () => {
    let s: DdState = 'closed';
    s = ddNext(s, 'button'); expect(s).toBe('open');
    s = ddNext(s, 'button'); expect(s).toBe('closing');
    s = ddNext(s, 'button'); expect(s).toBe('closing');  // a second tap mid-roll doesn't reopen
    s = ddNext(s, 'rolled'); expect(s).toBe('closed');
    expect(ddNext('open', 'outside')).toBe('closing'); expect(ddNext('open', 'pick')).toBe('closing'); expect(ddNext('closed', 'outside')).toBe('closed');
    expect(MAPS).toContain("onClick={() => ddGo('button')}");
    expect(CSS).toMatch(/\.who-wrap \.who-btn \{[^}]*z-index: 92/);   // above the .dd-scrim (z 90): the outside handler never sees the button tap
    expect(CSS).toMatch(/\.dd-scrim \{[^}]*z-index: 90/);
  });
});

describe('v6.6 the Maps tab has its own date and weather', () => {
  it('starts on, and resets to, the app date; changes only the map', () => {
    expect(MAPS).toMatch(/useState<MapDay>\(\{ date: p\.date, weather: p\.weather \}\)/);
    expect(MAPS).toMatch(/useEffect\(\(\) => \{ setMd\(\{ date: p\.date, weather: p\.weather \}\); \}, \[p\.date\.season, p\.date\.day, p\.date\.year, p\.weather\]\)/);
    expect(MAPS).toMatch(/locate\(npc, sched\[npc\.id\], pm, time, forced\)/);
    expect(MAPS).toContain('festivalOn(md.date.season, md.date.day)');
    expect(MAPS).not.toMatch(/update\(/);   // never writes the profile
    expect(MAPS).toContain('Reset to app date'); expect(MAPS).toContain('nextLabel="Tomorrow ›"'); expect(MAPS).toContain('<DatePickerBody');
    expect(MAPS).not.toMatch(/<select|type="date"|alert\(|confirm\(|prompt\(/);
  });
  it('steps to tomorrow across seasons and years, with that day\'s usual weather', () => {
    expect(dayAfter({ season: 0, day: 5, year: 1 })).toEqual({ season: 0, day: 6, year: 1 });
    expect(dayAfter({ season: 3, day: 28, year: 1 })).toEqual({ season: 0, day: 1, year: 2 });
    const m = { date: { season: 0, day: 5, year: 1 }, weather: 'rain' as const };
    expect(mapDayTo(m, m.date).weather).toBe('rain');
    expect(mapDayTo(m, { season: 0, day: 3, year: 1 }).weather).toBe('rain');   // the game always rains on Spring 3, year 1
    expect(mapDayTo(m, { season: 1, day: 13, year: 2 }).weather).toBe('storm'); // and storms on Summer 13
  });
});
