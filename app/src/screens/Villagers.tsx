import { core, SEASONS } from '../data';
import { useProfile } from '../lib/state';
import { TopBar, Panel, Sprite, Ui, Seg, Chip, Empty, useUiState } from '../components/ui';
import { heartsTarget } from '../lib/progress';
import { query, go } from '../lib/router';
import { useEffect } from 'react';
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
