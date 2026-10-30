import type { Fish } from '../types';
import { FISH_WIKI, type Spot, type Gate, type Times } from './fishwiki';
export type WeatherNow = 'sun' | 'rain' | 'storm' | 'wind' | 'snow' | 'green';
const wet = (w: WeatherNow | string) => w === 'rain' || w === 'storm' || w === 'green';
export const ALL_SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

/** Wiki spots for a fish (null for crab-pot catches and anything the wiki gives no rule for). */
export const fishSpots = (f: Fish): Spot[] | null => FISH_WIKI[f.name]?.spots ?? null;
const main = (f: Fish): Spot | null => fishSpots(f)?.[0] ?? null;

/** Normal seasons (wiki): leaves out the conditional extras — Ginger Island, the Night Market, festivals, Rain Totem. */
export const fishSeasons = (f: Fish): string[] => {
  const sp = fishSpots(f);
  if (!sp) return f.method === 'crab pot' || !f.seasons ? ALL_SEASONS : f.seasons;
  const base = sp.filter((x) => !x.extra);
  const set = new Set((base.length ? base : sp).flatMap((x) => x.seasons));
  return ALL_SEASONS.filter((x) => set.has(x as never));
};
/** Conditional extras shown under the seasons, e.g. "Ginger Island, any season". */
export const fishExtras = (f: Fish): string[] => [...new Set((fishSpots(f) || []).filter((x) => x.extra && (fishSpots(f) || []).some((y) => !y.extra)).map((x) => x.extra!))];
export const fishWeather = (f: Fish): 'sunny' | 'rainy' | 'both' => main(f)?.weather ?? 'both';
/** Display list of places (wiki). */
export const fishPlaces = (f: Fish): string[] => { const sp = fishSpots(f); return sp ? [...new Set(sp.map((x) => x.at))] : (f.summary.locations || []); };

/** minutes (360..1560) -> game clock HHMM (600..2600) */
export const toHHMM = (mins: number) => Math.floor(mins / 60) * 100 + (mins % 60);
const inTimes = (t: Times, hhmm: number) => !t || t.some(([a, b]) => hhmm >= a && hhmm < b);
export interface FishCtx { day?: number; can?: (g: Gate) => boolean }
const gateOk = (sp: Spot, day: number | undefined, can?: (g: Gate) => boolean) => {
  if (sp.gate === 'qi') return can ? can('qi') : false;
  if (sp.gate === 'nightMarket' && day == null) return true; // no date given: Winter is enough
  return !sp.gate || !can || can(sp.gate);
};
/** Spots biting in this season/day/weather; mins = null ignores the clock. */
export function fishSpotsNow(f: Fish, season: string, mins: number | null, weather: WeatherNow | string, ctx: FishCtx = {}): Spot[] {
  const sp = fishSpots(f);
  if (!sp) return [];
  const t = mins == null ? null : toHHMM(mins);
  return sp.filter((x) =>
    x.seasons.includes(season as never) &&
    (!x.days || ctx.day == null || (ctx.day >= x.days[0] && ctx.day <= x.days[1])) &&
    (x.weather === 'both' || (x.weather === 'rainy') === wet(weather)) &&
    (t == null || inTimes(x.times, t)) &&
    gateOk(x, ctx.day, ctx.can));
}
export function fishAvailable(f: Fish, season: string, mins: number, weather: WeatherNow | string, ctx: FishCtx = {}): boolean {
  if (!fishSpots(f)) return f.method === 'crab pot' || f.method === 'other' || fishSeasons(f).includes(season);
  return fishSpotsNow(f, season, mins, weather, ctx).length > 0;
}
/** HHMM when the current window ends (2600 = 2am), or null if not biting now. */
export function fishEndsAt(f: Fish, season: string, mins: number, weather: WeatherNow | string, ctx: FishCtx = {}): number | null {
  const t = toHHMM(mins);
  let end: number | null = null;
  for (const x of fishSpotsNow(f, season, mins, weather, ctx)) {
    const e = x.times ? Math.max(...x.times.filter(([a, b]) => t >= a && t < b).map(([, b]) => b)) : 2600;
    end = Math.max(end ?? 0, e);
  }
  return end;
}
export const fmtHHMM = (t: number) => { const h = Math.floor(t / 100) % 24; const m = t % 100; return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`; };
export const timesText = (t: Times) => (!t ? 'Any time' : t.map(([a, b]) => (a === 600 && b === 2600 ? 'Any time' : `${fmtHHMM(a)}–${fmtHHMM(b)}`)).join(', '));
export const fishTimeText = (f: Fish) => {
  const m = main(f);
  if (m) return m.gate === 'nightMarket' ? '5pm–2am' : timesText(m.times);
  return 'Any time';
};
export const seasonsText = (ss: string[]) => (ss.length === 4 ? 'All seasons' : ss.join(' · '));
