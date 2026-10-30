import { useEffect, useState, type ReactNode } from 'react';
import { Sheet, Ui, Chip } from './ui';
import { useProfile, update, weekKey, WEATHER_LABEL, weatherIcon, type Profile } from '../lib/state';
import { SEASONS, weekday } from '../data';
import { weatherChoices, defaultWeather, fixedWeather } from '../lib/weather';

let openFn: (() => void) | null = null;
export const openDateSheet = () => openFn?.();

/** Advance the in-game day; crossing into a new week resets the 2-gifts-per-week counters. */
export function nextDay(p: Profile) {
  const d = { ...p.date };
  d.day++;
  if (d.day > 28) { d.day = 1; d.season++; if (d.season > 3) { d.season = 0; d.year++; } }
  p.date = d;
  p.time = 600;
  resetWeather(p);
  if (weekKey(d) !== p.giftWeek) { p.gifts = {}; p.giftWeek = weekKey(d); }
}
/** A new date starts with the game's forecast where it is fixed, otherwise sunny; the player can then pick Rain etc. */
export function resetWeather(p: Profile) {
  p.weather = defaultWeather(p.date.season, p.date.day, p.date.year);
}
export function setDate(p: Profile, d: { season: number; day: number; year: number }) {
  const same = p.date.season === d.season && p.date.day === d.day && p.date.year === d.year;
  p.date = d;
  if (!same) resetWeather(p);
  if (weekKey(d) !== p.giftWeek) { p.gifts = {}; p.giftWeek = weekKey(d); }
}

export function DateChip({ compact }: { compact?: boolean }) {
  const p = useProfile();
  const s = SEASONS[p.date.season];
  return (
    <button className={'datechip season-' + s.toLowerCase() + (compact ? ' compact' : '')} onClick={openDateSheet} aria-label="Change in-game date">
      <Ui k={'season:' + s} size={24} eager />
      <span className="dc-t"><b>{weekday(p.date.day).slice(0, 3)} {p.date.day}</b>{!compact && <small>{s} · Y{p.date.year}</small>}</span>
      <span className="dc-wx" title={WEATHER_LABEL[p.weather]}><Ui k={weatherIcon(p.weather === 'wind' ? 'sun' : p.weather, p.date.season)} size={18} eager /></span>
    </button>
  );
}

type GameDate = Profile['date'];
export type Weather = Profile['weather'];

/** The Stardew-style season / day / year / weather picker. Used by the app's date sheet and by the Maps tab's own date. */
export function DatePickerBody({ date, weather, onDate, onWeather, onNext, nextLabel = 'Next day ›', wxHint, children }: {
  date: GameDate; weather: Weather; onDate: (d: GameDate) => void; onWeather: (w: Weather) => void; onNext: () => void; nextLabel?: string; wxHint?: string; children?: ReactNode;
}) {
  return <>
    <div className="ds-seasons">
      {SEASONS.map((s, i) => (
        <button key={s} className={'season-btn season-' + s.toLowerCase() + (date.season === i ? ' on' : '')} onClick={() => onDate({ ...date, season: i })}>
          <Ui k={'season:' + s} size={36} eager /><span>{s}</span>
        </button>
      ))}
    </div>
    <div className="ds-days">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} className="wd">{w}</span>)}
      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
        <button key={d} className={'day' + (date.day === d ? ' on' : '')} onClick={() => onDate({ ...date, day: d })}>{d}</button>
      ))}
    </div>
    <div className="ds-row">
      <span className="lbl">Year</span>
      <span className="stepper">
        <button onClick={() => onDate({ ...date, year: Math.max(1, date.year - 1) })} disabled={date.year <= 1} aria-label="Previous year">−</button>
        <b>{date.year}</b>
        <button onClick={() => onDate({ ...date, year: date.year + 1 })} aria-label="Next year">+</button>
      </span>
      <span className="grow" />
      <button className="btn" onClick={onNext}>{nextLabel}</button>
    </div>
    <WeatherRow date={date} weather={weather} onPick={onWeather} hint={wxHint} />
    {children}
  </>;
}

export function DateSheetHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => { openFn = () => setOpen(true); return () => { openFn = null; }; }, []);
  const p = useProfile();
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="In-game date">
      <DatePickerBody date={p.date} weather={p.weather} onDate={(d) => update((x) => setDate(x, d))} onWeather={(w) => update((x) => { x.weather = w; })} onNext={() => update(nextDay)}>
        <div className="ds-row"><Chip onClick={() => update((x) => { x.gifts = {}; x.giftWeek = weekKey(x.date); })}>Reset this week’s gifts</Chip></div>
      </DatePickerBody>
    </Sheet>
  );
}

/** Weather for the chosen date. Only weathers the game can roll that day, and only ones that change something. */
function WeatherRow({ date, weather, onPick, hint }: { date: GameDate; weather: Weather; onPick: (w: Weather) => void; hint?: string }) {
  const { season, day, year } = date;
  const opts = weatherChoices(season, day, year);
  const fixed = fixedWeather(season, day, year);
  const cur = weather === 'wind' ? 'sun' : weather;
  return (
    <div className="ds-wx">
      <span className="lbl">Weather</span>
      <div className="wx-grid">
        {opts.map((w) => (
          <button key={w} className={'wx' + (cur === w ? ' on' : '')} aria-pressed={cur === w} onClick={() => onPick(w)} disabled={opts.length === 1}>
            <Ui k={weatherIcon(w, season)} size={20} eager /><span>{WEATHER_LABEL[w]}</span>
          </button>
        ))}
      </div>
      <p className="hint">{fixed ? `The game always has ${WEATHER_LABEL[fixed].toLowerCase()} weather on this date.` : hint ?? 'Check the TV forecast in game the night before, then pick it here — your Day guide changes to match.'}{season === 3 && !fixed ? ' Snow plays like a sunny day for your plan.' : ''}</p>
    </div>
  );
}
