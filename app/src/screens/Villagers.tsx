import { core, SEASONS } from '../data';
import { useProfile, update, weatherIcon, WEATHER_LABEL } from '../lib/state';
import { weatherChoices } from '../lib/weather';
import { TopBar, Panel, Sprite, Ui, Seg, Chip, Empty, useUiState } from '../components/ui';
import { DateChip } from '../components/DateSheet';
import { heartsTarget } from '../lib/progress';
import { useAsync } from '../lib/useAsync';
import { loadSchedules } from '../data';
import { whereNow } from '../lib/where';
import { query } from '../lib/router';
import { FESTIVALS, festivalOn } from '../lib/festivals';
import { fmtTime } from '../lib/schedule';
import type { Npc } from '../types';

const href = (n: Npc) => `#/villager/${encodeURIComponent(n.id)}`;

/** Villager list filters: one even row of equal chips (no sideways scrolling). Birthdays live on the Calendar. */
export const VILL_FILTERS: { v: string; label: string }[] = [
  { v: 'all', label: 'All' }, { v: 'single', label: 'Marriage candidates' }, { v: 'gift', label: 'Gifts left this week' }, { v: 'todo', label: 'Not maxed' },
];

export function VillagersScreen() {
  const p = useProfile();
  const [mode, setMode] = useUiState<'grid' | 'now'>('vill:mode', query().has('now') ? 'now' : 'grid');
  const [f0, setF] = useUiState<string>('vill:filter', 'all');
  const f = VILL_FILTERS.some((x) => x.v === f0) ? f0 : 'all'; // an old saved 'bday' filter falls back to All
  const season = SEASONS[p.date.season];
  let list = [...core.npcs].sort((a, b) => a.name.localeCompare(b.name));
  if (f === 'single') list = list.filter((n) => n.romanceable);
  if (f === 'todo') list = list.filter((n) => (p.hearts[n.id] ?? 0) < heartsTarget(n.romanceable));
  if (f === 'gift') list = list.filter((n) => (p.gifts[n.id] ?? 0) < 2);
  return (
    <div className="screen">
      <TopBar title="Villagers" right={<a className="btn sm" href="#/calendar"><Ui k="Calendar" size={16} /> Calendar</a>} />
      <Seg value={mode} onChange={setMode} options={[{ v: 'grid', label: 'Friends' }, { v: 'now', label: 'Where are they now?' }]} />
      {mode === 'grid' ? <>
        <div className="chips vtags" data-tour="vill-tags">
          {VILL_FILTERS.map((x) => <Chip key={x.v} on={f === x.v} onClick={() => setF(x.v)}>{x.v === 'all' ? `All ${core.npcs.length}` : x.label}</Chip>)}
        </div>
        <div className="vgrid">
          {list.map((n) => {
            const h = p.hearts[n.id] ?? 0; const g = p.gifts[n.id] ?? 0;
            const bday = n.birthday?.season === season && n.birthday.day === p.date.day;
            return (
              <a key={n.id} className={'vcard' + (bday ? ' bday' : '') + (h >= heartsTarget(n.romanceable) ? ' maxed' : '')} href={href(n)}>
                <Sprite spr={n.portrait} size={64} alt="" />
                <b>{n.name}</b>
                <span className="vmeta"><Ui k="Heart" size={12} />{h}<span className="gdots" aria-label={`${g} of 2 gifts this week`}><i className={g >= 1 ? 'on' : ''} /><i className={g >= 2 ? 'on' : ''} /></span></span>
                {bday && <span className="bday-tag">Birthday</span>}
              </a>
            );
          })}
        </div>
      </> : <WhereNow />}
    </div>
  );
}

function WhereNow() {
  const p = useProfile();
  const sched = useAsync(loadSchedules);
  const fest = festivalOn(p.date.season, p.date.day);
  const wx = weatherChoices(p.date.season, p.date.day, p.date.year);
  if (!sched) return <div className="loading">Loading schedules…</div>;
  const rows = core.npcs.map((n) => ({ n, w: whereNow(n.id, sched[n.id], p) })).sort((a, b) => (a.w.place || '~').localeCompare(b.w.place || '~') || a.n.name.localeCompare(b.n.name));
  return <>
    <Panel className="now-ctl">
      <div className="now-bar"><DateChip /><span className="now-time"><b>{fmtTime(p.time)}</b><small>Time of day</small></span></div>
      <input type="range" min={360} max={1560} step={10} value={p.time} onChange={(e) => { const t = Number(e.target.value); update((x) => { x.time = t; }); }} aria-label="Time of day" />
      <div className="range-ticks"><span>6am</span><span>12pm</span><span>6pm</span><span>2am</span></div>
      {wx.length > 1 && <div className="wx-grid">{wx.map((w) => (
        <button key={w} className={'wx' + (p.weather === w ? ' on' : '')} onClick={() => update((x) => { x.weather = w; })} aria-pressed={p.weather === w}>
          <Ui k={weatherIcon(w, p.date.season)} size={20} eager /><span>{WEATHER_LABEL[w]}</span>
        </button>
      ))}</div>}
      <p className="hint">Weather is shared with your Day guide (rain changes fish, watering and some schedules). Time of day only moves villagers here.</p>
    </Panel>
    {fest && <Panel className="notice"><b>{fest.name} today</b><span>Most villagers attend: {fest.where}. Schedules below are their normal routine.</span></Panel>}
    <p className="hint">Where everyone is at {fmtTime(p.time)}{wx.length > 1 ? ` on a ${WEATHER_LABEL[p.weather].toLowerCase()} day` : ''}.</p>
    <div className="panel"><div className="list">
      {rows.map(({ n, w }) => (
        <a key={n.id} className="nav-row" href={href(n)}>
          <span className="row-ic"><Sprite spr={n.icon} size={32} /></span>
          <span className="row-main"><b>{n.name}{w.place ? <span className="place"> · {w.place}</span> : null}</b><small>{w.pick.block ? w.text : 'Schedule not listed for today'}</small></span>
          <span className="chev-r" />
        </a>
      ))}
    </div></div>
  </>;
}

export function CalendarScreen() {
  const p = useProfile();
  const [s, setS] = useUiState<number>('cal:season', p.date.season);
  const season = SEASONS[s];
  const bd = (d: number) => core.npcs.filter((n) => n.birthday?.season === season && n.birthday.day === d);
  const events = [
    ...core.npcs.filter((n) => n.birthday?.season === season).map((n) => ({ day: n.birthday!.day, n, fest: null as null | (typeof FESTIVALS)[number] })),
    ...FESTIVALS.filter((f) => f.season === s).map((f) => ({ day: f.days[0], n: null as Npc | null, fest: f })),
  ].sort((a, b) => a.day - b.day);
  return (
    <div className={'screen season-' + season.toLowerCase()}>
      <TopBar title="Calendar" back="#/villagers" />
      <div className="season-tabs">
        {SEASONS.map((x, i) => <button key={x} className={'season-btn season-' + x.toLowerCase() + (s === i ? ' on' : '')} onClick={() => setS(i)}><Ui k={'season:' + x} size={24} eager /><span>{x}</span></button>)}
      </div>
      <div className="panel cal">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => <span key={w} className="wd">{w}</span>)}
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
          const ns = bd(d); const f = festivalOn(s, d);
          const today = p.date.season === s && p.date.day === d;
          return (
            <div key={d} className={'cal-d' + (today ? ' today' : '') + (f ? ' fest' : '')}>
              <span className="cal-n">{d}</span>
              {ns.map((n) => <a key={n.id} href={href(n)} aria-label={`${n.name}’s birthday`}><Sprite spr={n.icon} size={32} /></a>)}
              {f && !ns.length && <span className="cal-f">{f.name.replace(/^(The |Dance of the )/, '').split(' ')[0]}</span>}
            </div>
          );
        })}
      </div>
      <Panel title={`${season} events`} icon={<Ui k={'season:' + season} size={24} />}>
        {!events.length && <Empty>No events.</Empty>}
        <div className="list">
          {events.map((e, i) => e.n ? (
            <a key={i} className="nav-row" href={href(e.n)}><span className="row-ic"><Sprite spr={e.n.icon} size={32} /></span><span className="row-main"><b>{e.n.name}’s birthday</b><small>{season} {e.day}</small></span><span className="chev-r" /></a>
          ) : (
            <div key={i} className="nav-row"><span className="row-ic"><Ui k="Calendar" size={32} /></span><span className="row-main"><b>{e.fest!.name}</b><small>{season} {e.fest!.days.join(', ')} · {e.fest!.where}</small></span></div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
