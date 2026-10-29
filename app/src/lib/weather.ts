// Which weather can actually happen on a given date (wiki: Weather, Modding:Weather data).
import type { Weather } from './state';
import { festivalOn } from './festivals';

/** Green Rain can only fall on these Summer days (wiki: Weather#Green_Rain). */
export const GREEN_RAIN_DAYS = [5, 6, 7, 14, 15, 16, 18, 23];

/** Weather fixed by the game on this date, or null if it is rolled. */
export function fixedWeather(season: number, day: number, year: number): Weather | null {
  if (festivalOn(season, day)) return 'sun'; // festivals (active and passive) are always clear
  if (day === 1) return 'sun';
  if (season === 0 && year === 1) { if (day === 3) return 'rain'; if (day === 2 || day === 4 || day === 5) return 'sun'; }
  if (season === 1 && (day === 13 || day === 26)) return 'storm';
  return null;
}

/** Every weather that can happen on this date. The first entry is the default the plan assumes. */
export function possibleWeather(season: number, day: number, year: number): Weather[] {
  const fixed = fixedWeather(season, day, year);
  if (fixed) return [fixed];
  switch (season) {
    case 0: return year === 1 ? ['sun', 'rain', 'wind'] : ['sun', 'rain', 'storm', 'wind'];
    case 1: return GREEN_RAIN_DAYS.includes(day) ? ['sun', 'rain', 'storm', 'green'] : ['sun', 'rain', 'storm'];
    case 2: return ['sun', 'rain', 'storm', 'wind'];
    default: return ['sun', 'snow'];
  }
}

/** Weather the date picker offers: only weathers that change something in the game.
 *  Wind (debris) is cosmetic — it plays like a sunny day — so it is folded into Sunny. */
export function weatherChoices(season: number, day: number, year: number): Weather[] {
  return possibleWeather(season, day, year).filter((w) => w !== 'wind');
}
/** The weather a new date starts with: the game's fixed weather when it has one, otherwise sunny. */
export const defaultWeather = (season: number, day: number, year: number): Weather => weatherChoices(season, day, year)[0] ?? 'sun';
