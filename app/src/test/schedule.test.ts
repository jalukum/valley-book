import { describe, it, expect } from 'vitest';
import schedules from '../generated/schedules.json';
import { core } from '../data';
import { newProfile } from '../lib/state';
import { whereNow } from '../lib/where';
import { parseTime, fmtTime } from '../lib/schedule';
import { fishAvailable } from '../lib/fish';
import { festivalOn } from '../lib/festivals';
import type { Schedule } from '../types';
const S = schedules as unknown as Record<string, Schedule>;

describe('schedule helpers', () => {
  it('parses and formats times', () => {
    expect(parseTime('6:00 AM')).toBe(360);
    expect(parseTime('12:30 PM')).toBe(750);
    expect(fmtTime(1500)).toMatch(/1(:00)?\s?AM/i);
  });
  it('finds a block for most villagers on spring 1', () => {
    const p = newProfile(); p.time = 720;
    const hits = core.npcs.filter((n) => whereNow(n.id, S[n.id], p).pick.block).length;
    expect(hits).toBeGreaterThan(core.npcs.length * 0.7);
  });
  it('Pierre is at his shop at noon on a regular weekday', () => {
    const p = newProfile(); p.date = { season: 0, day: 2, year: 1 }; p.time = 720;
    const w = whereNow('Pierre', S.Pierre, p);
    expect(w.text + ' ' + (w.place || '')).toMatch(/shop|counter|Pierre/i);
  });
});
describe('fish & festivals', () => {
  it('Catfish only bites in rain', () => {
    const f = core.fish.find((x) => x.name === 'Catfish')!;
    expect(fishAvailable(f, 'Spring', 720, 'rain')).toBe(true);
    expect(fishAvailable(f, 'Spring', 720, 'sun')).toBe(false);
  });
  it('Egg Festival is Spring 13', () => {
    expect(festivalOn(0, 13)?.name).toMatch(/Egg/);
    expect(festivalOn(0, 12)).toBeFalsy();
  });
});
