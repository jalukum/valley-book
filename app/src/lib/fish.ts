import type { Fish } from '../types';
export type WeatherNow = 'sun' | 'rain' | 'storm' | 'wind' | 'snow' | 'green';
const wet = (w: WeatherNow) => w === 'rain' || w === 'storm' || w === 'green';
export const ALL_SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
// Legendary fish spawn via per-location conditions the game data doesn't express as seasons; use the wiki's season.
export const fishSeasons = (f: Fish): string[] => (f.legendary && f.summary.seasons?.length ? f.summary.seasons : null) ?? f.seasons ?? (f.summary.seasons?.length ? f.summary.seasons : ALL_SEASONS);
export const fishWeather = (f: Fish): 'sunny' | 'rainy' | 'both' => {
  const w = (f.weather || f.summary.weather || 'both').toLowerCase();
  return w.startsWith('sun') ? 'sunny' : w.startsWith('rain') ? 'rainy' : 'both';
};
/** minutes (360..1560) -> game clock HHMM (600..2600) */
export const toHHMM = (mins: number) => Math.floor(mins / 60) * 100 + (mins % 60);
export function fishAvailable(f: Fish, season: string, mins: number, weather: WeatherNow): boolean {
  if (!fishSeasons(f).includes(season)) return false;
  const w = fishWeather(f);
  if (w === 'sunny' && wet(weather)) return false;
  if (w === 'rainy' && !wet(weather)) return false;
  if (f.times && f.times.length) { const t = toHHMM(mins); if (!f.times.some(([a, b]) => t >= a && t < b)) return false; }
  return true;
}
export const fmtHHMM = (t: number) => { const h = Math.floor(t / 100) % 24; const m = t % 100; return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`; };
export const fishTimeText = (f: Fish) => (f.times?.length ? f.times.map(([a, b]) => (a === 600 && b === 2600 ? 'Any time' : `${fmtHHMM(a)}–${fmtHHMM(b)}`)).join(', ') : (f.summary.time ? f.summary.time.replace(/\s*-\s*/g, '–').replace(/(\d)\s*(AM|PM)/gi, (_m, d: string, ap: string) => d + ap.toLowerCase()) : 'Any time'));
