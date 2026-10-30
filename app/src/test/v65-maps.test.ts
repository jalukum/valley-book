import { describe, it, expect } from 'vitest';
import schedules from '../generated/schedules.json';
import { core, npcById } from '../data';
import { newProfile, type Profile } from '../lib/state';
import { whereNow } from '../lib/where';
import { locate, spotForLine, spotImg, schedPinHref, coverScale } from '../lib/maps';
import { SPOTS, REGIONS, REGION_ORDER } from '../lib/mapdata';
import type { Schedule } from '../types';

const S = schedules as unknown as Record<string, Schedule>;
const PUBLIC = new Set(Object.keys(import.meta.glob('../../public/sprites/**/*.png')).map((k) => k.replace('../../public/', '')));
const SCREENS = import.meta.glob('../screens/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const MAPS = SCREENS['../screens/Maps.tsx'];
const VILLAGER = SCREENS['../screens/Villager.tsx'];
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const day = (season: number, d: number, weather: Profile['weather'] = 'sun') => { const p = newProfile(); p.date = { season, day: d, year: 1 }; p.weather = weather; return p; };

describe('v6.5 picker: one villager or no one', () => {
  it('has no "Everyone" option; opens with nobody chosen and offers "No one (just the map)" first', () => {
    expect(MAPS).not.toMatch(/Everyone|GroupHeads|pin-count|fanned/);
    expect(MAPS).toContain("'No one (just the map)'");
    expect(MAPS).toContain("'Choose a villager'");
    expect(MAPS).toMatch(/items: \(Npc \| null\)\[\] = \[null, \.\.\.byName\]/);
    expect(MAPS).toMatch(/useState<string \| null>\(qn && npcById\[qn\] \? qn : null\)/);
  });
  it('is a dropdown under the button (no wheel, no bottom sheet, no native select)', () => {
    expect(MAPS).toContain('PickerDropdown');
    expect(MAPS).not.toMatch(/PickerWheel|<select/);
    expect((MAPS.match(/<Sheet /g) || []).length).toBe(1); expect(MAPS).toContain('title="Map date"'); // the only sheet is the map's date picker
    expect(CSS).toMatch(/\.who-dd \{[^}]*position: absolute;[^}]*top: calc\(100% \+ 4px\)/);
    expect(CSS).toMatch(/\.who-dd \{[^}]*max-height: 56dvh;[^}]*overflow-y: auto/);
  });
  it('follows the chosen villager to their map tab, and the dropdown rolls up before locating', () => {
    expect(MAPS).toMatch(/if \(myRegion && myRegion !== tab\) setTab\(myRegion\); \}, \[sel, myRegion\]\)/);
    expect(CSS).toMatch(/\.who-dd\.closing \{ animation: dd-rollup/);
    for (const k of ['dd-unroll', 'dd-rollup', 'pin-glow']) { const m = CSS.match(new RegExp('@keyframes ' + k + ' \\{([^@]*?)\\}\\s*\\n'))!; expect(m, k).toBeTruthy(); expect(m[1]).not.toMatch(/(?:^|[;{\s])(top|left|width|height|margin|box-shadow)\s*:/); }
  });
  it('draws a pin only for the chosen villager, and the card links to "Villager info"', () => {
    expect((MAPS.match(/className="pin on"/g) || []).length).toBe(1);
    expect(MAPS).toContain('Villager info');
    expect(MAPS).not.toContain('Full schedule');
  });
});

describe('v6.5 Calico Desert tab', () => {
  it('is a real tab with its own full-size wiki render', () => {
    expect(REGION_ORDER).toEqual(['valley', 'island', 'desert']);
    const d = REGIONS.desert; const m = core.ui[d.img];
    expect(d.img).toBe('map:Desert'); expect([m.w, m.h]).toEqual([800, 960]); expect([d.w, d.h]).toEqual([800, 960]);
    expect(PUBLIC.has(m.s)).toBe(true);
  });
  it('has the Oasis, Skull Cavern, the Desert Trader and the bus stop inside the image', () => {
    for (const k of ['Desert', 'SkullCavern', 'DesertTrader', 'DesertBus']) { const [x, y] = spotImg(k); expect(SPOTS[k].region).toBe('desert'); expect(x > 0 && x < 800 && y > 0 && y < 960, k).toBe(true); }
    expect(SPOTS.Desert.label).toMatch(/Oasis/);
  });
  it('sends desert schedule lines to desert spots', () => {
    expect(spotForLine('Boards the bus to Calico Desert to attend the Desert Festival.', [], 'Square')).toBe('DesertFest');
    expect(spotForLine('Stands outside the Oasis.', [], 'Square')).toBe('Desert');
    expect(spotForLine('Heads into the Skull Cavern.', [], 'Square')).toBe('SkullCavern');
  });
  it('Sandy pins on the desert map at the Oasis', () => {
    const r = locate(npcById.Sandy, S.Sandy, day(2, 14), 870);
    expect(SPOTS[r.spot].region).toBe('desert');
  });
});

describe('v6.5 zoom: fully zoomed out still fills the portrait frame', () => {
  it('the smallest zoom covers the frame for every map, so there is never an empty strip', () => {
    for (const [w, h] of [[375, 362], [390, 520], [360, 300], [430, 560]]) for (const r of REGION_ORDER) {
      const R = REGIONS[r]; const s = coverScale(w, h, R.w, R.h);
      expect(R.w * s, `${r} ${w}x${h}`).toBeGreaterThanOrEqual(w - 0.01); expect(R.h * s).toBeGreaterThanOrEqual(h - 0.01);
      expect(Math.min(R.w * s - w, R.h * s - h)).toBeLessThan(0.01); // one side fits exactly: no extra zoom
    }
  });
});

describe('v6.5 schedule lines link to the map', () => {
  it('builds a link with villager, time and schedule', () => {
    expect(schedPinHref('Emily', 1210, 3)).toBe('#/maps?npc=Emily&t=1210&b=3');
    expect(VILLAGER).toContain('className="sched-pin"'); expect(VILLAGER).toContain('schedPinHref(npc.id, t, bi)');
    expect(VILLAGER).toContain('see-map'); // the main "See on map" button stays
  });
  it('locate can show a chosen schedule instead of today’s', () => {
    const p = day(0, 9, 'rain');
    for (const id of ['Emily', 'Pierre', 'Abigail']) S[id].blocks.forEach((b) => {
      b.e.forEach((e) => {
        const t = Number(e[0].replace(/\D/g, '')); if (!t) return;
        const r = locate(npcById[id], S[id], p, 1200, b); expect(typeof r.spot).toBe('string'); expect(SPOTS[r.spot], `${id} ${r.spot}`).toBeTruthy();
      });
    });
    const today = whereNow('Emily', S.Emily, { ...p, time: 1210 }).pick.block!; // Spring 9, rain: at the Saloon
    expect(locate(npcById.Emily, S.Emily, p, 1210).spot).toBe('Saloon');
    expect(locate(npcById.Emily, S.Emily, day(2, 14), 1210, today).spot).toBe('Saloon'); // forced onto a sunny fall day

  });
});

describe('v6.5 portrait lock', () => {
  const MANIFEST = Object.values(import.meta.glob('../../public/manifest.webmanifest', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
  const APP = Object.values(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
  it('manifest asks for portrait', () => { expect(JSON.parse(MANIFEST).orientation).toBe('portrait'); });
  it('landscape overlay only on touch phones, hidden otherwise', () => {
    expect(CSS).toMatch(/\.rotate-lock \{ display: none; \}/);
    expect(CSS).toContain('@media (orientation: landscape) and (max-height: 600px) and (pointer: coarse)');
    expect(APP).toContain('className="rotate-lock"');
    expect(APP).toContain('Turn your phone upright to keep playing');
    expect(APP).toMatch(/<Ui k="Junimo"/);
  });
  it('tries screen.orientation.lock inside try/catch', () => { expect(APP).toMatch(/try \{.*lock\?\.\('portrait'\).*catch/); });
});
