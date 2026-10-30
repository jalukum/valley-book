import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { fishSeasons, fishAvailable, fishTimeText, fishWeather, fishExtras, fishEndsAt } from '../lib/fish';
import { FISH_WIKI } from '../lib/fishwiki';
import { newProfile } from '../lib/state';
import { fishToday } from '../lib/guide';

const F = (n: string) => core.fish.find((f) => f.name === n)!;
const S = (n: string) => fishSeasons(F(n));

describe('fish seasons follow the wiki', () => {
  it('every rod fish and jelly has a wiki row', () => {
    const missing = core.fish.filter((f) => f.method !== 'crab pot' && !FISH_WIKI[f.name]).map((f) => f.name);
    expect(missing).toEqual([]);
  });
  it.each([
    ['Tiger Trout', ['Fall', 'Winter']],
    ['Sardine', ['Spring', 'Fall', 'Winter']],
    ['Midnight Squid', ['Winter']],
    ['Spook Fish', ['Winter']],
    ['Blobfish', ['Winter']],
    ['Octopus', ['Summer']],
    ['Super Cucumber', ['Summer', 'Fall']],
    ['Goby', ['Spring', 'Summer', 'Fall', 'Winter']],
    ['Crimsonfish', ['Summer']],
    ['Angler', ['Fall']],
    ['Legend', ['Spring']],
    ['Glacierfish', ['Winter']],
    ['Walleye', ['Fall']],
    ['Catfish', ['Spring', 'Summer', 'Fall']],
    ['Carp', ['Spring', 'Summer', 'Fall', 'Winter']],
    ['Tuna', ['Summer', 'Winter']],
    ['Halibut', ['Spring', 'Summer', 'Winter']],
  ])('%s → %j', (n, ss) => expect(S(n)).toEqual(ss));

  it('Night Market fish only bite on the submarine, Winter 15–17, 5pm–2am', () => {
    for (const n of ['Midnight Squid', 'Spook Fish', 'Blobfish']) {
      const f = F(n);
      expect(fishAvailable(f, 'Winter', 18 * 60, 'sun', { day: 16 })).toBe(true);
      expect(fishAvailable(f, 'Winter', 18 * 60, 'sun', { day: 10 })).toBe(false);
      expect(fishAvailable(f, 'Winter', 12 * 60, 'sun', { day: 16 })).toBe(false);
      expect(fishAvailable(f, 'Spring', 18 * 60, 'sun', { day: 16 })).toBe(false);
      expect(fishTimeText(f)).toBe('5pm–2am');
    }
  });
  it('Octopus: Summer mornings, Night Market in Winter, any season on Ginger Island', () => {
    const f = F('Octopus');
    expect(fishAvailable(f, 'Summer', 9 * 60, 'sun', { day: 3, can: () => false })).toBe(true);
    expect(fishAvailable(f, 'Summer', 15 * 60, 'sun', { day: 3, can: () => false })).toBe(false);
    expect(fishAvailable(f, 'Spring', 9 * 60, 'sun', { day: 3, can: () => false })).toBe(false);
    expect(fishAvailable(f, 'Spring', 9 * 60, 'sun', { day: 3, can: (g) => g === 'island' })).toBe(true);
    expect(fishAvailable(f, 'Winter', 20 * 60, 'sun', { day: 15, can: (g) => g === 'nightMarket' })).toBe(true);
    expect(fishExtras(f).join(' ')).toMatch(/Night Market.*Ginger Island|Ginger Island.*Night Market/);
  });
  it('Super Cucumber bites in Fall evenings (not in plain Winter)', () => {
    const f = F('Super Cucumber');
    expect(fishAvailable(f, 'Fall', 19 * 60, 'sun', { can: () => false })).toBe(true);
    expect(fishAvailable(f, 'Winter', 19 * 60, 'sun', { day: 5, can: () => false })).toBe(false);
  });
  it('Sardine and Tiger Trout are out of season in Summer', () => {
    expect(fishAvailable(F('Sardine'), 'Summer', 600, 'sun')).toBe(false);
    expect(fishAvailable(F('Tiger Trout'), 'Spring', 600, 'sun')).toBe(false);
    expect(fishAvailable(F('Tiger Trout'), 'Winter', 600, 'sun')).toBe(true);
  });
  it('times, weather and festivals', () => {
    expect(fishTimeText(F('Halibut'))).toBe('6am–11am, 7pm–2am');
    expect(fishTimeText(F('Albacore'))).toBe('6am–11am, 6pm–2am');
    expect(fishTimeText(F('Goby'))).toBe('Any time');
    expect(fishTimeText(F('Crimsonfish'))).toBe('Any time');
    expect(fishWeather(F('Glacierfish'))).toBe('both');
    expect(fishWeather(F('Legend'))).toBe('rainy');
    // Rainbow Trout: any time and weather during the Trout Derby (Summer 20–21)
    expect(fishAvailable(F('Rainbow Trout'), 'Summer', 22 * 60, 'rain', { day: 20 })).toBe(true);
    expect(fishAvailable(F('Rainbow Trout'), 'Summer', 22 * 60, 'rain', { day: 5 })).toBe(false);
    // Squid: any time during SquidFest
    expect(fishAvailable(F('Squid'), 'Winter', 9 * 60, 'sun', { day: 12 })).toBe(true);
    expect(fishAvailable(F('Squid'), 'Winter', 9 * 60, 'sun', { day: 2 })).toBe(false);
    expect(fishEndsAt(F('Halibut'), 'Spring', 10 * 60, 'sun')).toBe(1100);
  });
  it('the Day guide follows the corrected seasons', () => {
    const p = newProfile(); p.setup.rod = 'bamboo'; p.date = { season: 1, day: 5, year: 1 }; p.weather = 'sun';
    const names = fishToday(core, p).map((r) => r.f.name);
    expect(names).not.toContain('Sardine');
    expect(names).not.toContain('Tiger Trout');
    expect(names).not.toContain('Midnight Squid');
    expect(names).toContain('Octopus');
    p.date = { season: 3, day: 16, year: 1 };
    const w = fishToday(core, p).map((r) => r.f.name);
    expect(w).toContain('Midnight Squid');
    expect(w).toContain('Tiger Trout');
    p.date = { season: 3, day: 5, year: 1 };
    expect(fishToday(core, p).map((r) => r.f.name)).not.toContain('Midnight Squid');
  });
});
