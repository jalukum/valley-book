import type { Profile } from './state';
import { defaultWeather } from './weather';

/** The Maps tab's villager dropdown: the selector button is a true toggle, and every way of closing rolls the list up first. */
export type DdState = 'closed' | 'open' | 'closing';
export type DdEvent = 'button' | 'outside' | 'escape' | 'pick' | 'rolled';
export function ddNext(s: DdState, e: DdEvent): DdState {
  if (e === 'rolled') return s === 'closing' ? 'closed' : s;
  if (e === 'button') return s === 'closed' ? 'open' : 'closing';
  return s === 'open' ? 'closing' : s;
}
export type MapDay = { date: Profile['date']; weather: Profile['weather'] };
export const sameDate = (a: Profile['date'], b: Profile['date']) => a.season === b.season && a.day === b.day && a.year === b.year;
/** Moving the Maps tab's own date: a new day gets that day's usual weather, the same day keeps the chosen one. */
export const mapDayTo = (m: MapDay, date: Profile['date']): MapDay => ({ date, weather: sameDate(m.date, date) ? m.weather : defaultWeather(date.season, date.day, date.year) });

/** The day after `d` (28-day seasons, 4 seasons a year). */
export function dayAfter(d: Profile['date']): Profile['date'] {
  let { season, day, year } = d; day++;
  if (day > 28) { day = 1; season++; if (season > 3) { season = 0; year++; } }
  return { season, day, year };
}
