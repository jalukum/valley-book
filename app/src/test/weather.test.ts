import { describe, it, expect } from 'vitest';
import { core } from '../data';
import { newProfile, normalizeProfile, type Profile } from '../lib/state';
import { dayGuide, planSignature, ifThen } from '../lib/guide';
import { possibleWeather, fixedWeather, weatherChoices, defaultWeather } from '../lib/weather';

const at = (season: number, day: number, year: number, patch: (p: Profile) => void = () => {}) => {
  const p = newProfile('t'); p.date = { season, day, year }; patch(p); return p;
};
const ALL = [0, 1, 2, 3].flatMap((s) => Array.from({ length: 28 }, (_, i) => [1, 2].map((y) => [s, i + 1, y] as const)).flat());

describe('possible weather', () => {
  it('never offers snow outside winter, or rain/storm/wind in winter', () => {
    for (const [s, d, y] of ALL) {
      const w = possibleWeather(s, d, y);
      if (s !== 3) expect(w).not.toContain('snow');
      else for (const x of ['rain', 'storm', 'wind', 'green']) expect(w).not.toContain(x);
    }
  });
  it('wind only in spring and fall, green rain only on its summer days, no Y1 spring storms', () => {
    for (const [s, d, y] of ALL) {
      const w = possibleWeather(s, d, y);
      if (s === 1 || s === 3) expect(w).not.toContain('wind');
      if (w.includes('green')) { expect(s).toBe(1); expect([5, 6, 7, 14, 15, 16, 18, 23]).toContain(d); }
      if (s === 0 && y === 1) expect(w).not.toContain('storm');
    }
  });
  it('fixes the days the game fixes', () => {
    for (const s of [0, 1, 2, 3]) expect(possibleWeather(s, 1, 2)).toEqual(['sun']);
    expect(fixedWeather(0, 3, 1)).toBe('rain');
    expect(possibleWeather(0, 2, 1)).toEqual(['sun']);
    expect(possibleWeather(0, 5, 1)).toEqual(['sun']);
    expect(possibleWeather(1, 13, 1)).toEqual(['storm']);
    expect(possibleWeather(1, 26, 3)).toEqual(['storm']);
    expect(possibleWeather(0, 13, 1)).toEqual(['sun']); // Egg Festival
    expect(possibleWeather(3, 25, 1)).toEqual(['sun']); // Feast of the Winter Star
  });
});

describe('time of day never changes the plan', () => {
  for (const [s, d, y] of [[0, 1, 1], [1, 12, 1], [2, 10, 2], [3, 5, 1], [1, 20, 2]] as const) {
    it(`Y${y} ${['Spring', 'Summer', 'Fall', 'Winter'][s]} ${d}`, () => {
      for (const w of possibleWeather(s, d, y)) {
        const sig = (t: number) => planSignature(dayGuide(core, at(s, d, y, (p) => { p.time = t; p.weather = w; })));
        expect(sig(600)).toBe(sig(1400));
        expect(sig(600)).toBe(sig(2400));
      }
    });
  }
});

const wx = (s: number, d: number, y: number, w: Profile['weather'], patch: (p: Profile) => void = () => {}) => dayGuide(core, at(s, d, y, (p) => { p.weather = w; patch(p); }), {});
const ids = (g: ReturnType<typeof dayGuide>) => g.tasks.map((t) => t.id);
const fishNames = (g: ReturnType<typeof dayGuide>) => g.fish.map((f) => f.f.name);

describe('date picker weather', () => {
  it('never offers wind (cosmetic) and keeps every choice possible for the date', () => {
    for (const [s, d, y] of ALL) {
      const c = weatherChoices(s, d, y);
      expect(c).not.toContain('wind');
      for (const w of c) expect(possibleWeather(s, d, y)).toContain(w);
      expect(c[0]).toBe('sun' === c[0] ? 'sun' : fixedWeather(s, d, y));
    }
  });
  it('defaults to the forecast on fixed days, otherwise sunny', () => {
    expect(defaultWeather(0, 3, 1)).toBe('rain');
    expect(defaultWeather(1, 13, 1)).toBe('storm');
    expect(defaultWeather(1, 26, 2)).toBe('storm');
    expect(defaultWeather(0, 10, 1)).toBe('sun');
    expect(defaultWeather(3, 10, 1)).toBe('sun');
    expect(weatherChoices(0, 3, 1)).toEqual(['rain']);
    expect(weatherChoices(3, 10, 1)).toEqual(['sun', 'snow']);
    expect(weatherChoices(1, 14, 1)).toContain('green');
    expect(weatherChoices(1, 12, 1)).not.toContain('green');
  });
  it('saved wind, or weather the date cannot have, falls back to the default', () => {
    expect(normalizeProfile({ ...at(0, 10, 1), weather: 'wind' }).weather).toBe('sun');
    expect(normalizeProfile({ ...at(1, 10, 1), weather: 'snow' }).weather).toBe('sun');
    expect(normalizeProfile({ ...at(0, 3, 1), weather: 'sun' }).weather).toBe('rain');
    expect(normalizeProfile({ ...at(1, 10, 1), weather: 'rain' }).weather).toBe('rain');
  });
});

describe('weather changes the Day guide', () => {
  it('rain swaps sunny fish for rainy fish', () => {
    const sun = fishNames(wx(0, 10, 1, 'sun')), rain = fishNames(wx(0, 10, 1, 'rain'));
    expect(sun).toContain('Sunfish'); expect(sun).not.toContain('Catfish');
    expect(rain).toContain('Catfish'); expect(rain).not.toContain('Sunfish');
    expect(fishNames(wx(1, 10, 1, 'rain'))).toContain('Red Snapper');
    expect(fishNames(wx(1, 10, 1, 'sun'))).not.toContain('Red Snapper');
  });
  it('rain replaces watering and shows up in the Energy tab; sun does not', () => {
    const r = wx(1, 12, 1, 'rain'), s = wx(1, 12, 1, 'sun');
    expect(ids(r)).toContain('rain-water'); expect(ids(s)).not.toContain('rain-water');
    expect(ifThen(core, r).energy[0]?.id).toBe('rain-water');
    expect(ifThen(core, s).energy.some((t) => t.id === 'rain-water')).toBe(false);
  });
  it('rain ranks the Mines higher than on a sunny day', () => {
    const rank = (g: ReturnType<typeof dayGuide>) => ids(g).indexOf('mines');
    const r = wx(0, 20, 1, 'rain'), s = wx(0, 20, 1, 'sun');
    expect(rank(r)).toBeGreaterThanOrEqual(0);
    expect(r.tasks.find((t) => t.id === 'mines')!.score).toBeGreaterThan(s.tasks.find((t) => t.id === 'mines')!.score);
  });
  it('storms count as rain and add Lightning Rods from Foraging 6', () => {
    const lvl = (n: number) => (p: Profile) => { p.perf.skills.Foraging = n; };
    expect(ids(wx(1, 20, 2, 'storm', lvl(6)))).toEqual(expect.arrayContaining(['rain-water', 'storm-rods']));
    expect(ids(wx(1, 20, 2, 'storm', lvl(5)))).not.toContain('storm-rods');
    expect(ids(wx(1, 20, 2, 'rain', lvl(6)))).not.toContain('storm-rods');
  });
  it('green rain: moss task, rain fish, and no gifts in Year 1 only', () => {
    const g1 = wx(1, 14, 1, 'green'), g2 = wx(1, 14, 2, 'green');
    expect(ids(g1)).toEqual(expect.arrayContaining(['green-moss', 'green-nogift', 'rain-water']));
    expect(ids(g2)).toContain('green-moss'); expect(ids(g2)).not.toContain('green-nogift');
    expect(fishNames(g1)).toEqual(fishNames(wx(1, 14, 1, 'rain')));
  });
  it('snow plays like a sunny day (crops still need water)', () => {
    expect(planSignature(wx(3, 10, 1, 'snow'))).toBe(planSignature(wx(3, 10, 1, 'sun')));
  });
});
