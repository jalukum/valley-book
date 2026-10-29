import { useState } from 'react';
import { npcById, items, SEASONS, loadGifts, loadSchedules } from '../data';
import { useProfile, update } from '../lib/state';
import { TopBar, Panel, Sprite, Ui, ItemIcon, Chip, Empty, Stepper } from '../components/ui';
import { DateChip } from '../components/DateSheet';
import { useAsync } from '../lib/useAsync';
import { groupTastes, TIER_LABEL, type TierGroup } from '../lib/gifts';
import { whereNow } from '../lib/where';
import { fmtTime, parseTime } from '../lib/schedule';
import { festivalOn } from '../lib/festivals';
import { heartsTarget } from '../lib/progress';
import type { SchedBlock, Npc } from '../types';

const nameOf = (q: string) => items[q]?.n;

export default function VillagerScreen({ id }: { id?: string }) {
  const n = id ? npcById[decodeURIComponent(id)] : undefined;
  if (!n) return <div className="screen"><TopBar title="Villager" back="#/villagers" /><Empty>Villager not found.</Empty></div>;
  return <Villager n={n} />;
}

function Villager({ n }: { n: Npc }) {
  const p = useProfile();
  const h = p.hearts[n.id] ?? 0;
  const married = p.spouse === n.id;
  const max = married ? 14 : 10;
  const g = p.gifts[n.id] ?? 0;
  const season = SEASONS[p.date.season];
  const bdayToday = n.birthday?.season === season && n.birthday.day === p.date.day;
  const family = n.family && typeof n.family === 'object' && !Array.isArray(n.family) ? Object.entries(n.family as Record<string, string>) : [];
  return (
    <div className="screen">
      <TopBar title={n.name} back="#/villagers" />
      <Panel className="npc-hero">
        <Sprite spr={n.portrait} size={128} eager alt={n.name} />
        <div className="npc-facts">
          {n.birthday && <div className="fact"><Ui k={'season:' + n.birthday.season} size={16} /><span>Birthday <b>{n.birthday.season} {n.birthday.day}</b>{bdayToday && <span className="bday-tag">Today!</span>}</span></div>}
          {n.address && <div className="fact"><span>Lives at <b>{n.address}</b>{n.location && n.location !== n.address ? `, ${n.location}` : ''}</span></div>}
          {!n.address && n.location && <div className="fact"><span>Lives in <b>{n.location}</b></span></div>}
          <div className="fact">{n.romanceable ? <><Ui k="Heart" size={16} /><span><b>Marriage candidate</b></span></> : <span>Not marriageable</span>}</div>
          {family.length > 0 && <div className="fact fam">{family.map(([who, rel]) => npcById[who] ? <a key={who} href={`#/villager/${encodeURIComponent(who)}`}><b>{who}</b> ({rel})</a> : <span key={who}><b>{who}</b> ({rel})</span>)}</div>}
        </div>
      </Panel>

      <Panel title="Friendship" icon={<Ui k="Heart" size={24} />} right={<Stepper value={h} max={max} onChange={(v) => update((x) => { x.hearts[n.id] = v; })} label="Hearts" />}>
        <div className={'hearts' + (max > 10 ? ' h14' : '')} role="group" aria-label="Hearts">
          {Array.from({ length: max }, (_, i) => (
            <button key={i} className={i < h ? 'on' : ''} onClick={() => update((x) => { x.hearts[n.id] = h === i + 1 ? i : i + 1; })} aria-label={`${i + 1} hearts`}><Ui k="Heart" size={24} /></button>
          ))}
        </div>
        <p className="hint">{h >= heartsTarget(n.romanceable) ? 'Counts toward perfection (Great Friends).' : `${heartsTarget(n.romanceable)} hearts counts toward perfection.`}{n.romanceable && !married && h >= 8 ? ' Give a Bouquet to go past 8.' : ''}</p>
        {n.romanceable && (
          <div className="ds-row"><span className="lbl">Married</span>
            <Chip on={married} onClick={() => update((x) => { x.spouse = married ? null : n.id; })}>{married ? `Married to ${n.name}` : 'Mark as spouse'}</Chip>
          </div>
        )}
        <div className="ds-row gifts-week">
          <span className="lbl">Gifts this week</span>
          <span className="gift-slots">
            {[0, 1].map((i) => <button key={i} className={g > i ? 'on' : ''} onClick={() => update((x) => { x.gifts[n.id] = g > i ? i : i + 1; })} aria-label={`Gift ${i + 1}`}><Ui k="Gift" size={32} /></button>)}
          </span>
          <b>{g}/2</b>
        </div>
        {bdayToday && <p className="hint strong">It’s {n.name}’s birthday: gifts are worth 8× and don’t count toward the weekly limit.</p>}
      </Panel>

      <Gifts n={n} />
      <ScheduleView n={n} />
    </div>
  );
}

function Gifts({ n }: { n: Npc }) {
  const all = useAsync(loadGifts);
  const [more, setMore] = useState(false);
  if (!all) return <Panel title="Gifts" icon={<Ui k="Gift" size={24} />}><div className="loading">Loading…</div></Panel>;
  const g = all[n.id];
  if (!g) return <Panel title="Gifts" icon={<Ui k="Gift" size={24} />}><Empty>No gift data.</Empty></Panel>;
  const groups = groupTastes(g, nameOf);
  const show = more ? groups : groups.filter((x) => x.tier === 'love' || x.tier === 'like');
  return (
    <Panel title="Gifts" icon={<Ui k="Gift" size={24} />}>
      {show.map((t) => <TierBlock key={t.tier} t={t} />)}
      <button className="btn wide" onClick={() => setMore(!more)}>{more ? 'Hide neutral, dislikes & hates' : `Show neutral, dislikes & hates (${groups.filter((x) => !['love', 'like'].includes(x.tier)).reduce((a, x) => a + x.total, 0)})`}</button>
    </Panel>
  );
}

function TierBlock({ t }: { t: TierGroup }) {
  const [allU, setAllU] = useState(false);
  if (!t.total) return null;
  const U = 18;
  const uni = allU ? t.universal : t.universal.slice(0, U);
  return (
    <div className={'tier tier-' + t.tier}>
      <h3 className="sh3">{TIER_LABEL[t.tier]} <span className="count">{t.total}</span></h3>
      {t.personal.length > 0 && <div className="gift-grid">{t.personal.map((r) => <GiftTile key={r.qid} qid={r.qid} />)}</div>}
      {t.universal.length > 0 && <>
        <div className="uni-h"><span className="uni">Universal</span><small>everyone feels this way, unless listed otherwise</small></div>
        <div className="gift-grid uni-grid">{uni.map((r) => <GiftTile key={r.qid} qid={r.qid} universal />)}</div>
        {t.universal.length > U && <button className="link" onClick={() => setAllU(!allU)}>{allU ? 'Show fewer' : `Show all ${t.universal.length} universal`}</button>}
      </>}
    </div>
  );
}
function GiftTile({ qid, universal }: { qid: string; universal?: boolean }) {
  return <a className={'gift' + (universal ? ' u' : '')} href={`#/item/${encodeURIComponent(qid)}`}><ItemIcon qid={qid} size={32} /><span>{nameOf(qid)}</span></a>;
}

function Timeline({ b, idx }: { b: SchedBlock; idx: number }) {
  return (
    <ol className="timeline">
      {b.e.map((e, i) => (
        <li key={i} className={i === idx ? 'now' : i < idx ? 'past' : ''}>
          <span className="t">{parseTime(e[0]) != null ? fmtTime(parseTime(e[0])!) : e[0]}</span>
          <span className="d">{e[1]}{e[2].length > 0 && <span className="locs">{e[2].map((l) => <span key={l} className="loc">{l}</span>)}</span>}</span>
        </li>
      ))}
    </ol>
  );
}

function ScheduleView({ n }: { n: Npc }) {
  const p = useProfile();
  const sched = useAsync(loadSchedules);
  const [showAll, setShowAll] = useState(false);
  const fest = festivalOn(p.date.season, p.date.day);
  if (!sched) return <Panel title="Schedule" icon={<Ui k="Calendar" size={24} />}><div className="loading">Loading…</div></Panel>;
  const s = sched[n.id];
  if (!s || !s.blocks.length) return <Panel title="Schedule" icon={<Ui k="Calendar" size={24} />}><Empty>{n.name} has no regular schedule listed.</Empty></Panel>;
  const w = whereNow(n.id, s, p);
  const groups: { sub: string; blocks: SchedBlock[] }[] = [];
  for (const b of s.blocks) { const k = b.sub || 'General'; let gr = groups.find((x) => x.sub === k); if (!gr) groups.push((gr = { sub: k, blocks: [] })); gr.blocks.push(b); }
  return (
    <Panel title="Schedule" icon={<Ui k="Calendar" size={24} />} right={<DateChip compact />}>
      {fest && <p className="notice-in"><b>{fest.name}</b> today: {n.name} is likely at the festival ({fest.where}).</p>}
      {w.pick.block ? <>
        <div className="where">
          <span className="where-l">Now</span>
          <div><b>{w.place || (w.idx < 0 ? 'At home' : n.location || '')}</b><small>{w.text}</small></div>
        </div>
        <h3 className="sh3">Today: {w.pick.block.cond}{w.pick.married ? ' (married)' : ''}</h3>
        <Timeline b={w.pick.block} idx={w.idx} />
        {w.pick.alt && <details className="alt"><summary>Or, on some days: {w.pick.alt.cond}</summary><Timeline b={w.pick.alt} idx={-2} /></details>}
      </> : <p className="hint">{p.spouse === n.id ? `${n.name} lives on your farm. Married villagers mostly stay at the farmhouse and visit town on set days.` : 'No listed schedule matches today.'}</p>}
      <button className="btn wide" onClick={() => setShowAll(!showAll)}>{showAll ? 'Hide full schedule' : `Full schedule (${s.blocks.length} variations)`}</button>
      {showAll && <div className="all-sched">
        {s.notes.map((x, i) => <p key={i} className="hint pre">{x.text}</p>)}
        {groups.map((gr) => (
          <div key={gr.sub}>
            <h3 className="sh3 sub">{gr.sub}</h3>
            {gr.blocks.map((b, i) => <details key={i} open={b === w.pick.block}><summary>{b.cond}{b === w.pick.block ? ' · today' : ''}</summary><Timeline b={b} idx={b === w.pick.block ? w.idx : -2} /></details>)}
          </div>
        ))}
      </div>}
    </Panel>
  );
}
