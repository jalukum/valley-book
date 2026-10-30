import { core, SEASONS } from '../data';
import { useProfile } from '../lib/state';
import { TopBar, Panel, Sprite, Ui, Seg, Chip, Empty, Sheet, useUiState } from '../components/ui';
import { shopDays, SHOP_LEGEND, SHOP_ICON } from '../lib/shopdays';
import { access } from '../lib/guide';
import { weekday } from '../data';
import { heartsTarget } from '../lib/progress';
import { query, go } from '../lib/router';
import { useEffect, useState } from 'react';
import { FESTIVALS, festivalOn } from '../lib/festivals';
import type { Npc } from '../types';

const href = (n: Npc) => `#/villager/${encodeURIComponent(n.id)}`;

/** Villager list filters: one even row of equal chips (no sideways scrolling). Birthdays live on the Calendar. */
export const VILL_FILTERS: { v: string; label: string }[] = [
  { v: 'all', label: 'All' }, { v: 'single', label: 'Marriage candidates' }, { v: 'gift', label: 'Gifts left this week' }, { v: 'todo', label: 'Not maxed' },
];

export function VillagersScreen() {
  const p = useProfile();
  // The old "Where are they now?" view is now the Maps screen; old ?now links land there.
  useEffect(() => { if (query().has('now')) location.replace('#/maps'); }, []);
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
      <Seg value="grid" onChange={(v) => v === 'maps' && go('#/maps')} options={[{ v: 'grid', label: 'Friends' }, { v: 'maps', label: 'Maps' }]} />
      <>
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
      </>
    </div>
  );
}

export function CalendarScreen() {
  const p = useProfile();
  const [s, setS] = useUiState<number>('cal:season', p.date.season);
  const [open, setOpen] = useState<number | null>(null);
  const season = SEASONS[s];
  const a = access(core, p);
  const ctx = { bus: a.bus, qi: a.qi };
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
          const marks = shopDays(s, d, p.date.year, ctx).filter((e, i, l) => l.findIndex((x) => x.kind === e.kind) === i && e.kind !== 'market');
          return (
            <div key={d} role="button" tabIndex={0} data-sfx="tap" aria-label={`${season} ${d}`} onClick={() => setOpen(d)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(d)}
              className={'cal-d' + (today ? ' today' : '') + (f ? ' fest' : '') + (marks.length ? ' has-m' : '')}>
              <span className="cal-n">{d}</span>
              {ns.map((n) => <a key={n.id} href={href(n)} onClick={(e) => e.stopPropagation()} aria-label={`${n.name}’s birthday`}><Sprite spr={n.icon} size={32} /></a>)}
              {f && !ns.length && <span className="cal-f">{f.name.replace(/^(The |Dance of the )/, '').split(' ')[0]}</span>}
              {!!marks.length && <span className="cal-m" aria-hidden>{marks.map((m) => <img key={m.kind} className={'cm cm-' + m.kind} src={'./' + (core.ui[m.icon]?.s || '')} alt="" draggable={false} />)}</span>}
            </div>
          );
        })}
      </div>
      <div className="cal-legend" aria-label="Calendar marks">
        {SHOP_LEGEND.map((l) => <span key={l.kind}><img className={'cm cm-' + l.kind} src={'./' + (core.ui[SHOP_ICON[l.kind]]?.s || '')} alt="" draggable={false} />{l.label}</span>)}
        <small>Tap a day to see what’s on.</small>
      </div>
      <DaySheet season={s} day={open} onClose={() => setOpen(null)} ctx={ctx} />
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

/** v7.0: everything on one calendar day — festival, birthdays, and the shop / TV / board days. */
function DaySheet({ season, day, onClose, ctx }: { season: number; day: number | null; onClose: () => void; ctx: { bus: boolean; qi: boolean } }) {
  const p = useProfile();
  if (day == null) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const name = SEASONS[season];
  const f = festivalOn(season, day);
  const ns = core.npcs.filter((n) => n.birthday?.season === name && n.birthday.day === day);
  const shops = shopDays(season, day, p.date.year, ctx);
  const isToday = p.date.season === season && p.date.day === day;
  const green = isToday && p.weather === 'green' && shops.some((e) => e.kind === 'queen' || e.kind === 'rerun');
  return (
    <Sheet open onClose={onClose} title={<>{weekday(day)}, {name} {day}<small className="ds-sub"> · Year {p.date.year}</small></>}>
      <div className="list day-list">
        {f && <div className="nav-row"><span className="row-ic"><Ui k="weather:Festival" size={28} /></span><span className="row-main"><b>{f.name}</b><small>{f.where}</small></span></div>}
        {ns.map((n) => <a key={n.id} className="nav-row" href={href(n)} onClick={onClose}><span className="row-ic"><Sprite spr={n.icon} size={32} /></span><span className="row-main"><b>{n.name}’s birthday</b><small>Birthday gifts count 8× the friendship</small></span><span className="chev-r" /></a>)}
        {shops.filter((e) => e.kind !== 'market' || !f).map((e, i) => <div key={i} className="nav-row"><span className="row-ic"><Ui k={e.icon} size={30} /></span><span className="row-main"><b>{e.title}</b><small>{e.detail}</small></span></div>)}
        {green && <p className="hint">Green Rain today, so the Queen of Sauce has no recipe.</p>}
        {!f && !ns.length && !shops.length && <Empty>Nothing special on this day.</Empty>}
      </div>
    </Sheet>
  );
}
