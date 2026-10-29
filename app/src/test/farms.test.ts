import { describe, it, expect } from 'vitest';
import SOURCES from '../../../sprites/derived/SOURCES.json';
import { core } from '../data';
import { newProfile, normalizeProfile, type Profile } from '../lib/state';
import { fishToday, forageToday, dayGuide, bundlesToday, access } from '../lib/guide';
import { FARM_TYPES, farmFish, farmIconKey, type FarmType } from '../lib/farms';

const SRC = import.meta.glob(['../**/*.tsx', '../**/*.ts', '!../test/**'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const PUBLIC = new Set(Object.keys(import.meta.glob('../../public/sprites/**/*.png')).map((k) => k.replace('../../public/', '')));
const at = (season: number, day: number, year: number, farmType: FarmType, patch: (p: Profile) => void = () => {}) => {
  const p = newProfile('t', farmType); p.date = { season, day, year }; p.weather = 'sun'; patch(p); return p;
};
const fish = (n: string) => core.fish.find((f) => f.name === n)!;

describe('farm types: storage and migration', () => {
  it('has the 8 game farm maps, each with its real wiki map icon', () => {
    expect(FARM_TYPES.map((f) => f.name)).toEqual(['Standard', 'Riverland', 'Forest', 'Hill-top', 'Wilderness', 'Four Corners', 'Beach', 'Meadowlands']);
    const src = SOURCES as Record<string, { from?: string }>;
    for (const f of FARM_TYPES) {
      const spr = core.ui['farm:' + f.id];
      expect(spr, f.id).toBeTruthy();
      expect(PUBLIC.has(spr.s)).toBe(true);
      expect(src[spr.s.split('/').pop()!]?.from).toMatch(/^https:\/\/stardewvalleywiki\.com\/File:.*Farm_Map_Icon\.png$/);
    }
  });
  it('old saves without a farm type become Standard — even one named "Riverland Farm"', () => {
    const old: any = { ...newProfile('Riverland Farm') }; delete old.farmType;
    expect(normalizeProfile(old).farmType).toBe('standard');
    expect(normalizeProfile({ ...old, farmType: 'moon' }).farmType).toBe('standard');
    expect(normalizeProfile({ ...old, farmType: 'beach' }).farmType).toBe('beach');
  });
});

describe('farm types: fishing on the farm (wiki Farm Maps)', () => {
  it('matches each map’s water', () => {
    expect(farmFish(fish('Bream'), 'riverland')).toBe(true); // town river
    expect(farmFish(fish('Bream'), 'standard')).toBe(false);
    expect(farmFish(fish('Walleye'), 'wilderness')).toBe(true); // mountain lake
    expect(farmFish(fish('Bream'), 'wilderness')).toBe(false);
    expect(farmFish(fish('Pufferfish'), 'beach')).toBe(true); // ocean
    expect(farmFish(fish('Blobfish'), 'beach')).toBe(false); // Night Market submarine only
    expect(farmFish(fish('Super Cucumber'), 'beach')).toBe(true);
    expect(farmFish(fish('Bream'), 'hilltop')).toBe(true); // forest river
    expect(farmFish(fish('Smallmouth Bass'), 'hilltop')).toBe(false); // town river + forest pond only
    expect(farmFish(fish('Walleye'), 'meadowlands')).toBe(true); // forest pond
    expect(farmFish(fish('Woodskip'), 'forest')).toBe(true);
    expect(farmFish(fish('Glacierfish'), 'forest')).toBe(false); // legendaries keep their own spot
    expect(farmFish(fish('Goby'), 'riverland')).toBe(false); // waterfall only
  });
  it('Forest Farm lists Woodskip as catchable on the farm before the Secret Woods opens', () => {
    const p = at(0, 10, 1, 'forest');
    const row = fishToday(core, p).find((r) => r.f.name === 'Woodskip');
    expect(row?.where).toMatch(/^Your farm/);
    expect(fishToday(core, at(0, 10, 1, 'standard')).some((r) => r.f.name === 'Woodskip')).toBe(false);
  });
  it('Standard farm never says "Your farm" for fish', () => {
    expect(fishToday(core, at(1, 10, 1, 'standard')).some((r) => /Your farm/.test(r.where))).toBe(false);
  });
});

describe('farm types: forage and day-guide jobs', () => {
  it('Forest Farm spring forage spawns in the west clearings', () => {
    const rows = forageToday(core, at(0, 10, 1, 'forest'));
    expect(rows.find((r) => r.name === 'Dandelion')?.where[0]).toBe('Your farm (west clearings)');
    expect(forageToday(core, at(0, 10, 1, 'standard')).some((r) => r.where.some((w) => /Your farm/.test(w)))).toBe(false);
  });
  it('Beach Farm gets season-specific beach forage year-round (Nautilus Shell in summer)', () => {
    expect(forageToday(core, at(1, 10, 1, 'beach')).find((r) => r.name === 'Nautilus Shell')?.where).toContain('Your farm (shore)');
  });
  it('adds only the jobs the map supports', () => {
    const ids = (t: FarmType, patch?: (p: Profile) => void) => dayGuide(core, at(0, 10, 1, t, patch)).tasks.map((x) => x.id);
    expect(ids('forest', (p) => { p.setup.tools.axe = 1; })).toContain('farm-stumps');
    expect(ids('forest')).not.toContain('farm-stumps'); // basic axe can't chop Large Stumps
    expect(ids('hilltop')).toContain('farm-quarry');
    expect(ids('wilderness')).toContain('farm-monsters');
    expect(ids('meadowlands')).toContain('farm-coop');
    expect(ids('beach')).toContain('farm-crates');
    expect(ids('standard').some((x) => x.startsWith('farm-'))).toBe(false);
  });
  it('Meadowlands day 1 swaps the parsnip job for the chickens + Hay', () => {
    const t = dayGuide(core, at(0, 1, 1, 'meadowlands')).tasks.map((x) => x.id);
    expect(t).toContain('d1-hay'); expect(t).not.toContain('d1-plant');
    expect(dayGuide(core, at(0, 1, 1, 'standard')).tasks.map((x) => x.id)).toContain('d1-plant');
  });
  it('Forest Farm with a copper axe can fill Hardwood bundle slots from the farm', () => {
    const p = at(0, 10, 1, 'forest', (q) => { q.setup.tools.axe = 1; });
    const a = access(core, p);
    expect(bundlesToday(core, p, a).some((r) => r.name === 'Hardwood' && /Large Stumps/.test(r.how))).toBe(true);
  });
});

describe('no native browser dialogs', () => {
  it('the app never calls prompt/confirm/alert', () => {
    expect(Object.keys(SRC).length).toBeGreaterThan(20);
    for (const [f, s] of Object.entries(SRC)) expect(/\b(window\.)?(prompt|confirm|alert)\s*\(/.test(s), f).toBe(false);
  });
});

describe('farm icon follows the farm’s map', () => {
  it('farmIconKey maps each type to its own map icon, Standard for unknown', () => {
    for (const f of FARM_TYPES) expect(farmIconKey(f.id)).toBe('farm:' + f.id);
    expect(farmIconKey(undefined)).toBe('farm:standard'); expect(farmIconKey('moon')).toBe('farm:standard');
  });
  it('switcher, farms list and picker all draw the farm-map icon (no fixed generic Farm icon)', () => {
    const src = (end: string) => Object.entries(SRC).find(([k]) => k.endsWith(end))![1];
    expect(src('screens/Today.tsx')).toMatch(/k=\{farmIconKey\(p\.farmType\)\}/);
    expect(src('screens/Profiles.tsx')).toMatch(/k=\{farmIconKey\(p\.farmType\)\}/);
    expect(src('components/Onboarding.tsx')).toMatch(/k=\{'farm:' \+ f\.id\}/);
    for (const [f, s] of Object.entries(SRC)) expect(/k="Farm"/.test(s), f).toBe(false);
  });
});
