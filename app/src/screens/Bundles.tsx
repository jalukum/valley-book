import { Lk } from '../components/Link';
import { useEffect, useMemo } from 'react';
import { core, items, SEASONS } from '../data';
import { useProfile, update, WEATHER_LABEL, type Profile } from '../lib/state';
import { bundleFinish, type BundleFinish } from '../lib/guide';
import { flipBundleItem, activeBundles, ccProgress, checkedCount, bundleDone, jojaProgress, remixChoice, type ActiveBundle } from '../lib/progress';
import { itemSeasons } from '../lib/seasons';
import { query } from '../lib/router';
import { TopBar, Panel, Sprite, ItemIcon, Ui, Bar, Seg, Chip, ChipGrid, Check, Empty, gold, useUiState } from '../components/ui';
import { StarButton } from '../components/Stars';
import { starKey } from '../lib/stars';
import type { BItem, Reward } from '../types';

export const bundleTitle = (n: string) => (/^[\d,]+g$/.test(n) || /Bundle$/.test(n) ? n : n + ' Bundle');

export function toggleItem(b: Pick<ActiveBundle, 'id'>, i: number) {
  update((p) => flipBundleItem(p, b.id, i));
}

export function RewardLine({ r }: { r: Reward | null }) {
  if (!r || !r.name) return null;
  return <span className="reward">{r.qid && items[r.qid] ? <ItemIcon qid={r.qid} size={16} /> : null}<span>{r.name}{r.count && r.count > 1 ? ` ×${r.count}` : ''}{r.isRecipe ? ' recipe' : ''}</span></span>;
}

function Quality({ q }: { q: string }) {
  if (!q || q === 'normal') return null;
  return <span className={'qual q-' + q}>{q[0].toUpperCase() + q.slice(1)} quality</span>;
}

export function BundleItemRow({ it, on, onToggle, dim }: { it: BItem; on: boolean; onToggle: () => void; dim?: boolean }) {
  const seasons = itemSeasons(it.qid);
  const icon = it.gold ? <Ui k="Gold" size={32} /> : <ItemIcon qid={it.qid} />;
  const name = it.gold ? gold(it.gold) : it.name;
  return (
    <div className={'row bitem' + (on ? ' done' : '') + (dim ? ' dim' : '')}>
      <button className="row-btn" onClick={onToggle} aria-pressed={on}>
        <span className="box" aria-hidden />
        <span className="row-ic">{icon}</span>
        <span className="row-main">
          <span className="row-t">{name}{it.count > 1 && <span className="cnt"> ×{it.count}</span>} <Quality q={it.quality} /></span>
          {(it.source || seasons) && <span className="row-s">{seasons && <span className="seas">{seasons.join(' · ')}</span>}{it.source}</span>}
        </span>
      </button>
      {it.qid && items[it.qid] && <Lk className="row-go" href={`#/item/${encodeURIComponent(it.qid)}`} aria-label={`${name} details`}><span className="chev-r" /></Lk>}
    </div>
  );
}

export function BundleCard({ b, p }: { b: ActiveBundle; p: Profile }) {
  const set = new Set(p.cc.checked[b.id] || []);
  const c = checkedCount(p, b);
  const done = c >= b.required;
  return (
    <section className={'panel bundle' + (done ? ' complete' : '')} id={'b-' + b.name}>
      <div className="bundle-h">
        <Sprite spr={b.icon || b.colorIcon} size={48} />
        <div className="bundle-t">
          <h2>{bundleTitle(b.name)}</h2>
          <RewardLine r={b.reward} />
        </div>
        <span className={'pill' + (done ? ' ok' : '')}>{Math.min(c, b.required)}/{b.required}</span>
        <StarButton k={starKey.bundle(b.id)} name={bundleTitle(b.name)} />
      </div>
      {b.required < b.items.length && <p className="hint">Any {b.required} of these {b.items.length}</p>}
      <div className="list">
        {b.items.map((it, i) => <BundleItemRow key={i} it={it} on={set.has(i)} dim={done && !set.has(i)} onToggle={() => toggleItem(b, i)} />)}
      </div>
    </section>
  );
}

export function BundlesHome() {
  const p = useProfile();
  const cc = ccProgress(core, p);
  const list = activeBundles(core, p);
  const needed = neededItems(p).length;
  const [bf, setBf] = useUiState<'all' | 'today' | 'short'>('bundles:filter', 'all');
  return (
    <div className="screen">
      <TopBar title="Community Center" back="#/progress" />
      <Seg value={p.cc.route} onChange={(v) => update((x) => { x.cc.route = v; })} options={[{ v: 'cc', label: 'Community Center' }, { v: 'joja', label: 'Joja route' }]} />
      {p.cc.route === 'joja' ? <JojaBody /> : <>
        <Panel>
          <div className="big-prog"><Ui k="Junimo Bundle" size={48} /><div><b className="big-n">{Math.floor(cc.percent)}%</b><small>{cc.bundlesDone}/{cc.bundles} bundles · {cc.roomsDone.length}/6 rooms</small></div></div>
          <Bar value={cc.percent} />
          <div className="ds-row"><span className="lbl">Bundles</span><Seg small value={p.cc.mode} onChange={(v) => update((x) => { x.cc.mode = v; })} options={[{ v: 'standard', label: 'Standard' }, { v: 'remix', label: 'Remixed' }]} /></div>
          {p.cc.mode === 'remix' && <p className="hint">Pick which remixed bundles your game rolled inside each room.</p>}
        </Panel>
        <Lk className="panel nav-row big" href="#/bundles/needed"><span className="row-ic"><Ui k="Junimo" size={32} /></span><span className="row-main"><b>Shopping list</b><small>{needed} item{needed === 1 ? '' : 's'} still needed · filter by season</small></span><span className="chev-r" /></Lk>
        <ChipGrid rows={[3]}>
          <Chip on={bf === 'all'} onClick={() => setBf('all')}>All rooms</Chip>
          <Chip on={bf === 'today'} onClick={() => setBf('today')}><Ui k="Junimo" size={16} />Finish today</Chip>
          <Chip on={bf === 'short'} onClick={() => setBf('short')}>One item short</Chip>
        </ChipGrid>
        {bf !== 'all' ? <BundleFilter which={bf} /> : <div className="rooms">
          {core.rooms.map((r, i) => {
            const bs = list.filter((b) => b.room === r.name);
            const d = bs.filter((b) => bundleDone(p, b)).length;
            const complete = d === bs.length;
            return (
              <Lk key={r.name} className={'panel room' + (complete ? ' complete' : '')} href={`#/bundles/room/${i}`}>
                <div className="room-dots">{bs.map((b) => <Sprite key={b.id} spr={b.colorIcon} size={16} className={bundleDone(p, b) ? '' : 'ghost'} />)}</div>
                <div className="room-b"><h2>{r.name}</h2><small>{r.reward}</small></div>
                <span className={'pill' + (complete ? ' ok' : '')}>{d}/{bs.length}</span>
                <Bar value={d} max={bs.length} />
              </Lk>
            );
          })}
        </div>}
      </>}
    </div>
  );
}

const SEASON_WX = (p: Profile) => `${SEASONS[p.date.season]} ${p.date.day}, ${WEATHER_LABEL[p.weather].toLowerCase()}`;
function BundleFilter({ which }: { which: 'today' | 'short' }) {
  const p = useProfile();
  const { finish, short } = useMemo(() => bundleFinish(core, p), [p]);
  const list = which === 'today' ? finish : short;
  const roomIdx = (room: string) => Math.max(0, core.rooms.findIndex((r) => r.name === room));
  const card = (e: BundleFinish) => {
    const total = e.today.length + (which === 'short' ? 1 : 0);
    return (
      <Lk key={e.b.id} className="bt-card" href={`#/bundles/room/${roomIdx(e.b.room)}?b=${encodeURIComponent(e.b.name)}`}>
        <div className="bt-h"><Sprite spr={e.b.icon} size={36} /><span className="grow"><b>{e.b.name}</b>
          <small>{e.b.room} · {which === 'today' ? `${e.need} still needed` : `${e.today.length} of ${total} today`}</small></span>
          <span className={'pill' + (which === 'today' ? ' ok' : '')}>{which === 'today' ? 'Today' : `${e.today.length}/${e.need}`}</span></div>
        <div className="bt-items">
          {e.today.map((r) => <div key={r.index} className="bt-it"><ItemIcon qid={r.qid} size={28} /><span><b>{r.name}{r.count > 1 ? ` ×${r.count}` : ''}{r.quality && r.quality !== 'normal' ? ` (${r.quality})` : ''}</b><small>{r.how}</small></span></div>)}
          {which === 'short' && (e.missing.length === 1 || e.today.length + e.missing.length === e.need
            ? e.missing.slice(0, 1).map((m) => <div key={m.index} className="bt-it miss">{m.qid ? <ItemIcon qid={m.qid} size={28} /> : <Ui k="Junimo" size={28} />}<span><b>{m.name}</b><small>{m.why}</small></span></div>)
            : <div className="bt-it miss"><Ui k="Junimo" size={28} /><span><b>One more item</b><small>Any of: {e.missing.slice(0, 4).map((m) => m.name).join(', ')}{e.missing.length > 4 ? '…' : ''} (not gettable today)</small></span></div>)}
        </div>
      </Lk>
    );
  };
  return (
    <Panel title={which === 'today' ? 'Finish today' : 'One item short'} right={<span className="count">{list.length}</span>}>
      <p className="hint">{which === 'today'
        ? `Bundles where every item you still need can be in your hands by tonight (${SEASON_WX(p)}). Crops that still have to grow don't count.`
        : `Bundles you could get all but one item for today (${SEASON_WX(p)}).`}</p>
      {!list.length && <Empty>{which === 'today' ? 'No bundle can be finished today. Try One item short.' : 'No bundle is one item short today.'}</Empty>}
      {list.map(card)}
    </Panel>
  );
}

function RemixPicker({ room }: { room: string }) {
  const p = useProfile();
  const r = core.remix.find((x) => x.room === room);
  if (!r) return null;
  const choice = remixChoice(core, p, room);
  if (r.slots.length === 1 && r.slots[0].index === -1) {
    const opts = r.slots[0].options;
    return (
      <Panel title="Your remixed bundles" icon={<Ui k="Junimo Bundle" size={24} />}>
        <p className="hint">Your game picked {r.count} of these {opts.length}. Tap to choose ({choice.length}/{r.count}).</p>
        <ChipGrid max={3} narrowMax={2}>
          {opts.map((o, i) => (
            <Chip key={o.name} on={choice.includes(i)} onClick={() => update((x) => {
              let c = remixChoice(core, x, room);
              if (c.includes(i)) return; // always keep exactly N; swap out the oldest choice
              c = [...c.slice(1), i];
              x.cc.remix[room] = c;
            })}><Sprite spr={o.colorIcon} size={16} />{o.name}</Chip>
          ))}
        </ChipGrid>
      </Panel>
    );
  }
  const multi = r.slots.map((s, si) => ({ s, si })).filter(({ s }) => s.options.length > 1);
  if (!multi.length) return null;
  return (
    <Panel title="Your remixed bundles" icon={<Ui k="Junimo Bundle" size={24} />}>
      <p className="hint">These slots are rolled at random. Pick the one in your game.</p>
      {multi.map(({ s, si }) => (
        <ChipGrid key={si} max={3} narrowMax={2} className="slot">
          {s.options.map((o, oi) => (
            <Chip key={o.name} on={choice[si] === oi} onClick={() => update((x) => { const c = remixChoice(core, x, room); c[si] = oi; x.cc.remix[room] = c; })}><Sprite spr={o.colorIcon} size={16} />{o.name}</Chip>
          ))}
        </ChipGrid>
      ))}
    </Panel>
  );
}

export function RoomScreen({ index }: { index: number }) {
  const p = useProfile();
  const room = core.rooms[index] || core.rooms[0];
  const target = query().get('b');
  useEffect(() => {
    if (!target) return;
    if (query().has('remix') && p.cc.mode !== 'remix') update((x) => { x.cc.mode = 'remix'; });
    requestAnimationFrame(() => document.getElementById('b-' + target)?.scrollIntoView({ block: 'start' }));
  }, [target]);
  const bs = activeBundles(core, p).filter((b) => b.room === room.name);
  const done = bs.filter((b) => bundleDone(p, b)).length;
  const img = done === bs.length && room.images[1] ? room.images[1] : room.images[0];
  return (
    <div className="screen">
      <TopBar title={room.name} back="#/bundles" sub={`${done}/${bs.length} bundles · ${room.reward}`} />
      <Panel className="room-hero">
        {img && <Sprite spr={img} size={120} eager />}
        <p>{room.description}</p>
      </Panel>
      {p.cc.mode === 'remix' && <RemixPicker room={room.name} />}
      {bs.map((b) => <BundleCard key={b.id} b={b} p={p} />)}
    </div>
  );
}

// ---------- shopping list ----------
export interface Need { key: string; it: BItem; bundles: { b: ActiveBundle; i: number }[]; seasons: string[] | null }
export function neededItems(p: Profile): Need[] {
  const map = new Map<string, Need>();
  for (const b of activeBundles(core, p)) {
    if (bundleDone(p, b)) continue;
    const set = new Set(p.cc.checked[b.id] || []);
    b.items.forEach((it, i) => {
      if (set.has(i)) return;
      const key = it.gold ? 'gold:' + it.gold : `${it.qid}|${it.quality}`;
      const n = map.get(key);
      if (n) { n.bundles.push({ b, i }); n.it = { ...n.it, count: n.it.count + it.count }; }
      else map.set(key, { key, it: { ...it }, bundles: [{ b, i }], seasons: itemSeasons(it.qid) });
    });
  }
  return [...map.values()];
}

export function NeededScreen() {
  const p = useProfile();
  const cur = SEASONS[p.date.season];
  const [f, setF] = useUiState<string>('needed:season', 'now');
  const season = f === 'now' ? cur : f;
  const all = useMemo(() => neededItems(p), [p]);
  const list = all.filter((n) => season === 'all' || !n.seasons || n.seasons.includes(season));
  const seasonal = list.filter((n) => n.seasons).sort((a, b) => a.it.name.localeCompare(b.it.name));
  const any = list.filter((n) => !n.seasons).sort((a, b) => (a.it.gold ?? 0) - (b.it.gold ?? 0) || (a.it.name || '').localeCompare(b.it.name || ''));
  const row = (n: Need) => (
    <BundleItemRow key={n.key} it={{ ...n.it, source: `For ${[...new Set(n.bundles.map((x) => bundleTitle(x.b.name)))].join(', ')}${n.it.source ? ' · ' + n.it.source : ''}` }} on={false} onToggle={() => toggleItem(n.bundles[0].b, n.bundles[0].i)} />
  );
  return (
    <div className="screen">
      <TopBar title="Shopping list" back="#/bundles" sub={`${all.length} items left in unfinished bundles`} />
      <ChipGrid rows={[2, 3]} className="season-grid">
        <Chip on={f === 'now'} onClick={() => setF('now')}>Now ({cur})</Chip>
        {SEASONS.filter((s) => s !== cur).map((s) => <Chip key={s} on={f === s} onClick={() => setF(s)}><Ui k={'season:' + s} size={16} />{s}</Chip>)}
        <Chip on={f === 'all'} onClick={() => setF('all')}>All</Chip>
      </ChipGrid>
      {p.cc.route === 'joja' && <p className="hint">You’re on the Joja route; only the Missing Bundle still applies.</p>}
      {!list.length && <Empty>Nothing left to collect{season !== 'all' ? ` for ${season}` : ''}.</Empty>}
      {seasonal.length > 0 && <Panel title={season === 'all' ? 'Seasonal' : `Get in ${season}`} icon={season !== 'all' ? <Ui k={'season:' + season} size={24} /> : undefined} right={<span className="count">{seasonal.length}</span>}><p className="hint">Tap to mark as donated.</p><div className="list">{seasonal.map(row)}</div></Panel>}
      {any.length > 0 && <Panel title="Any season" right={<span className="count">{any.length}</span>}><div className="list">{any.map(row)}</div></Panel>}
    </div>
  );
}

// ---------- Joja ----------
function JojaBody() {
  const p = useProfile();
  const j = jojaProgress(core, p);
  const rows = [{ key: 'membership', name: 'Joja Membership', sub: 'Buy at JojaMart', cost: core.joja.membership }, ...core.joja.developments.map((d) => ({ key: d.room, name: d.name, sub: `Replaces the ${d.room}`, cost: d.cost }))];
  const missing = core.rooms.findIndex((r) => r.name === 'Abandoned Joja Mart');
  return <>
    <Panel>
      <div className="big-prog"><Ui k="Community Center" size={48} /><div><b className="big-n">{j.bought}/{j.total}</b><small>{gold(j.spent)} of {gold(j.cost)} spent</small></div></div>
      <Bar value={j.bought} max={j.total} />
    </Panel>
    <Panel title="Joja Community Development" icon={<Ui k="Gold" size={24} />}>
      <div className="list">
        {rows.map((r) => <Check key={r.key} on={!!p.cc.joja[r.key]} onClick={() => update((x) => { x.cc.joja[r.key] = !x.cc.joja[r.key]; })} sub={r.sub} right={gold(r.cost)}>{r.name}</Check>)}
      </div>
    </Panel>
    {missing >= 0 && <Lk className="panel nav-row big" href={`#/bundles/room/${missing}`}><span className="row-ic"><Ui k="Junimo Bundle" size={32} /></span><span className="row-main"><b>The Missing Bundle</b><small>Abandoned Joja Mart, after the Joja route is done</small></span><span className="chev-r" /></Lk>}
  </>;
}
export function JojaScreen() {
  return <div className="screen"><TopBar title="Joja route" back="#/bundles" /><JojaBody /></div>;
}
