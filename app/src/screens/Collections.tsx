import { museumRewardParts, partText } from '../lib/museum';
import { useMemo, type ReactNode } from 'react';
import { core, items, SEASONS } from '../data';
import { useProfile, toggle, isDone, type Profile } from '../lib/state';
import { TopBar, Panel, Sprite, ItemIcon, Ui, Bar, Chip, Seg, MissingToggle, SearchBox, Empty, useUiState, pct, gold } from '../components/ui';
import { DateChip } from '../components/DateSheet';
import { doneCount } from '../lib/progress';
import { fishSeasons, fishWeather, fishTimeText } from '../lib/fish';
import { query } from '../lib/router';
import type { Recipe, Fish } from '../types';

const norm = (s: string) => s.toLowerCase();
const itemHref = (q: string) => `#/item/${encodeURIComponent(q)}`;

function Head({ have, total, icon, label }: { have: number; total: number; icon: ReactNode; label: string }) {
  return (
    <Panel>
      <div className="big-prog">{icon}<div><b className="big-n">{have}/{total}</b><small>{label} · {pct(have, total)}</small></div></div>
      <Bar value={have} max={total} />
    </Panel>
  );
}

export function CollectionsHub() {
  const p = useProfile();
  const fishIds = core.fish.filter((f) => f.collection).map((f) => f.qid);
  const craft = core.recipes.crafting.filter((r) => r.perfection);
  const rows = [
    { href: '#/museum', icon: <Ui k="Museum" size={32} />, name: 'Museum', sub: 'Artifacts & minerals donated', have: doneCount(p, 'museum', core.museum.items.map((i) => i.qid)), total: core.museum.items.length },
    { href: '#/fish', icon: <ItemIcon qid="(O)128" />, name: 'Fish', sub: 'Caught, and what’s in season', have: doneCount(p, 'fish', fishIds), total: fishIds.length },
    { href: '#/shipping', icon: <ItemIcon qid="(O)24" />, name: 'Items shipped', sub: 'Farm & forage', have: doneCount(p, 'shipping', core.shipping.map((s) => s.qid)), total: core.shipping.length },
    { href: '#/cooking', icon: <Ui k="Cooking" size={32} />, name: 'Cooking', sub: 'Recipes cooked', have: doneCount(p, 'cooking', core.recipes.cooking.map((r) => r.id)), total: core.recipes.cooking.length },
    { href: '#/crafting', icon: <ItemIcon qid="(BC)13" />, name: 'Crafting', sub: 'Recipes crafted', have: doneCount(p, 'crafting', craft.map((r) => r.id)), total: craft.length },
  ];
  return (
    <div className="screen">
      <TopBar title="Collections" back="#/more" />
      {rows.map((r) => (
        <a key={r.href} className="panel hub-row" href={r.href}>
          <span className="row-ic">{r.icon}</span>
          <span className="row-main"><b>{r.name}</b><small>{r.sub}</small></span>
          <span className="hub-n">{r.have}/{r.total}</span>
          <Bar value={r.have} max={r.total} />
        </a>
      ))}
    </div>
  );
}

// ---------------- museum ----------------
function museumRewardState(p: Profile) {
  const donated = new Set(core.museum.items.filter((i) => isDone(p, 'museum', i.qid)).map((i) => i.qid));
  return museumRewardParts(core.museum.rewards, core.museum.items, donated);
}

export function MuseumScreen() {
  const p = useProfile();
  const [missing, setMissing] = useUiState('mus:missing', false);
  const [tab, setTab] = useUiState<'items' | 'rewards'>('mus:tab', 'items');
  const [q, setQ] = useUiState('mus:q', '');
  const have = doneCount(p, 'museum', core.museum.items.map((i) => i.qid));
  const rewards = museumRewardState(p);
  return (
    <div className="screen">
      <TopBar title="Museum" back="#/collections" />
      <Head have={have} total={core.museum.items.length} icon={<Ui k="Museum" size={48} />} label={`${rewards.filter((x) => x.earned).length}/${rewards.length} rewards earned`} />
      <Seg value={tab} onChange={setTab} options={[{ v: 'items', label: 'Donations' }, { v: 'rewards', label: 'Rewards' }]} />
      {tab === 'items' ? <>
        <div className="tools"><SearchBox value={q} onChange={setQ} placeholder="Search artifacts & minerals" /><MissingToggle value={missing} onChange={setMissing} /></div>
        {(['Artifact', 'Mineral'] as const).map((k) => {
          const all = core.museum.items.filter((i) => i.kind === k);
          const list = all.filter((i) => (!missing || !isDone(p, 'museum', i.qid)) && (!q || norm(i.name).includes(norm(q))));
          return (
            <Panel key={k} title={k + 's'} right={<span className="count">{all.filter((i) => isDone(p, 'museum', i.qid)).length}/{all.length}</span>}>
              {!list.length && <Empty>{missing ? 'All donated!' : 'No matches.'}</Empty>}
              <div className="list">
                {list.map((i) => <ColRow key={i.qid} col="museum" id={i.qid} qid={i.qid} name={i.name} sub={i.foundIn.slice(0, 3).join(' · ')} />)}
              </div>
            </Panel>
          );
        })}
      </> : (
        <Panel title="Gunther’s rewards" icon={<Ui k="Museum" size={24} />}>
          <p className="hint">Earned automatically from your donations.</p>
          <div className="list">
            {rewards.filter(({ r }) => r.reward?.name || r.actions).map(({ r, parts, earned }) => (
              <div key={r.id} className={'row static' + (earned ? ' done' : '')}>
                <span className="box" aria-hidden />
                <span className="row-ic">{r.reward?.qid && items[r.reward.qid] ? <ItemIcon qid={r.reward.qid} /> : r.icon ? <RewardSprite s={r.icon} /> : <Ui k="Museum" size={32} />}</span>
                <span className="row-main"><span className="row-t">{r.reward?.name ? r.reward.name.replace(/^'(.*)'$/, '“$1”') : 'Rusty Key'}{r.reward?.count && r.reward.count > 1 ? ` ×${r.reward.count}` : ''}{r.reward?.isRecipe ? ' recipe' : ''}</span>
                  <span className="row-s">{parts.map(partText).join(' · ')}{r.reward?.note ? ' — ' + r.reward.note : ''}</span></span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/** Wiki reward sprite (furniture / special item), whole-pixel scaled to fit the 32 px icon slot. */
function RewardSprite({ s }: { s: { s: string; w: number; h: number } }) {
  const k = Math.max(s.w, s.h) / 32, w = Math.round(s.w / k), h = Math.round(s.h / k);
  return <img className="px" src={'./' + s.s} width={w} height={h} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />;
}

function ColRow({ col, id, qid, name, sub, right, dim }: { col: string; id: string; qid: string | null; name: ReactNode; sub?: ReactNode; right?: ReactNode; dim?: boolean }) {
  const p = useProfile();
  const on = isDone(p, col, id);
  return (
    <div className={'row bitem' + (on ? ' done' : '') + (dim ? ' dim' : '')}>
      <button className="row-btn" onClick={() => toggle(col, id)} aria-pressed={on}>
        <span className="box" aria-hidden />
        <span className="row-ic"><ItemIcon qid={qid} /></span>
        <span className="row-main"><span className="row-t">{name}</span>{sub && <span className="row-s">{sub}</span>}</span>
        {right && <span className="row-r">{right}</span>}
      </button>
      {qid && items[qid] && <a className="row-go" href={itemHref(qid)} aria-label="Details"><span className="chev-r" /></a>}
    </div>
  );
}

// ---------------- fish ----------------
export function FishScreen() {
  const p = useProfile();
  const season = SEASONS[p.date.season];
  const [missing, setMissing] = useUiState('fish:missing', false);
  const [now, setNow] = useUiState('fish:now', query().has('season'));
  const [sf, setSf] = useUiState<string>('fish:season', 'all');
  const [method, setMethod] = useUiState<string>('fish:method', 'all');
  const [q, setQ] = useUiState('fish:q', '');
  const coll = core.fish.filter((f) => f.collection);
  const have = doneCount(p, 'fish', coll.map((f) => f.qid));
  const filt = (f: Fish) =>
    (!missing || !isDone(p, 'fish', f.qid)) &&
    (!now || fishSeasons(f).includes(season)) &&
    (sf === 'all' || fishSeasons(f).includes(sf)) &&
    (method === 'all' || (method === 'rod' ? f.method !== 'crab pot' : f.method === 'crab pot')) &&
    (!q || norm(f.name).includes(norm(q)) || (f.summary.locations || []).some((l) => norm(l).includes(norm(q))));
  const list = coll.filter(filt).sort((a, b) => a.name.localeCompare(b.name));
  const extra = core.fish.filter((f) => !f.collection).filter(filt);
  const row = (f: Fish) => {
    const wx = fishWeather(f);
    const seasons = fishSeasons(f);
    return <ColRow key={f.qid} col="fish" id={f.qid} qid={f.qid} name={<>{f.name}{f.legendary && <span className="tag gold-t">Legendary</span>}</>}
      sub={<>{(f.summary.locations || []).join(', ') || (f.method === 'crab pot' ? `Crab pot · ${f.water === 'ocean' ? 'ocean' : 'freshwater'}` : '')}<br />
        <span className="fish-meta">{seasons.length === 4 ? 'All seasons' : seasons.join(' · ')} · {f.method === 'crab pot' ? 'Any time' : fishTimeText(f)}{wx !== 'both' && <> · <Ui k={wx === 'sunny' ? 'weather:Sun' : 'weather:Rain2'} size={16} /> {wx === 'sunny' ? 'Sun' : 'Rain'}</>}</span></>} />;
  };
  return (
    <div className="screen">
      <TopBar title="Fish" back="#/collections" right={<DateChip compact />} />
      <Head have={have} total={coll.length} icon={<ItemIcon qid="(O)128" size={48} />} label="caught" />
      <div className="tools"><SearchBox value={q} onChange={setQ} placeholder="Search fish or location" /></div>
      <div className="chips scroll-x">
        <Chip on={now} onClick={() => setNow(!now)}>In season</Chip>
        <MissingToggle value={missing} onChange={setMissing} />
        <Chip on={method === 'rod'} onClick={() => setMethod(method === 'rod' ? 'all' : 'rod')}>Rod</Chip>
        <Chip on={method === 'pot'} onClick={() => setMethod(method === 'pot' ? 'all' : 'pot')}>Crab pot</Chip>
      </div>
      <div className="chips scroll-x">
        <Chip on={sf === 'all'} onClick={() => setSf('all')}>All seasons</Chip>
        {SEASONS.map((s) => <Chip key={s} on={sf === s} onClick={() => setSf(s)}><Ui k={'season:' + s} size={16} />{s}</Chip>)}
      </div>
      {now && <p className="hint">Fish you can catch in {season}, any time or weather. The Day guide’s Fish tile shows what bites today.</p>}
      <Panel title="Fish collection" right={<span className="count">{list.length}</span>}>
        {!list.length && <Empty>No fish match these filters.</Empty>}
        <div className="list">{list.map(row)}</div>
      </Panel>
      {extra.length > 0 && <Panel title="Legendary Fish Family" right={<span className="count">{extra.length}</span>}><p className="hint">Qi’s Extended Family quest. Not part of the collection or perfection.</p><div className="list">{extra.map(row)}</div></Panel>}
    </div>
  );
}

// ---------------- shipping ----------------
export function ShippingScreen() {
  const p = useProfile();
  const [missing, setMissing] = useUiState('ship:missing', false);
  const [view, setView] = useUiState<'grid' | 'list'>('ship:view', 'grid');
  const [q, setQ] = useUiState('ship:q', '');
  const have = doneCount(p, 'shipping', core.shipping.map((s) => s.qid));
  const list = core.shipping.filter((s) => (!missing || !isDone(p, 'shipping', s.qid)) && (!q || norm(s.name).includes(norm(q))));
  const cats = [...new Set(core.shipping.map((s) => s.category))];
  return (
    <div className="screen">
      <TopBar title="Items shipped" back="#/collections" />
      <Head have={have} total={core.shipping.length} icon={<ItemIcon qid="(O)24" size={48} />} label="shipped (counts for perfection)" />
      <div className="tools"><SearchBox value={q} onChange={setQ} placeholder="Search" /><MissingToggle value={missing} onChange={setMissing} /></div>
      <Seg small value={view} onChange={setView} options={[{ v: 'grid', label: 'Grid' }, { v: 'list', label: 'List' }]} />
      {!list.length && <Empty>{missing ? 'Everything shipped!' : 'No matches.'}</Empty>}
      {cats.map((c) => {
        const xs = list.filter((s) => s.category === c);
        if (!xs.length) return null;
        return (
          <Panel key={c} title={c} right={<span className="count">{xs.length}</span>}>
            {view === 'grid' ? (
              <div className="tgrid">
                {xs.map((s) => { const on = isDone(p, 'shipping', s.qid); return (
                  <button key={s.qid} className={'tcell' + (on ? ' on' : '')} onClick={() => toggle('shipping', s.qid)} aria-pressed={on} title={s.name}>
                    <ItemIcon qid={s.qid} /><span>{s.name}</span>
                  </button>); })}
              </div>
            ) : (
              <div className="list">{xs.map((s) => <ColRow key={s.qid} col="shipping" id={s.qid} qid={s.qid} name={s.name} sub={[s.seasons.length && s.seasons.length < 4 ? s.seasons.map((x) => x[0].toUpperCase() + x.slice(1)).join(' · ') : '', items[s.qid] ? gold(items[s.qid].p) : ''].filter(Boolean).join(' · ')} />)}</div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

// ---------------- recipes ----------------
export function Ingredients({ r }: { r: Recipe }) {
  return (
    <span className="ings">
      {r.ing.map((g, i) => (
        <span key={i} className="ing" title={g.name}>{g.qid && items[g.qid] ? <ItemIcon qid={g.qid} size={16} /> : null}<span>{g.name}{g.count > 1 ? ` ×${g.count}` : ''}</span></span>
      ))}
    </span>
  );
}

export function RecipesScreen({ kind }: { kind: 'cooking' | 'crafting' }) {
  const p = useProfile();
  const [missing, setMissing] = useUiState(kind + ':missing', false);
  const [q, setQ] = useUiState(kind + ':q', '');
  const all = core.recipes[kind];
  const counted = all.filter((r) => r.perfection);
  const have = doneCount(p, kind, counted.map((r) => r.id));
  const list = useMemo(() => all.filter((r) => (!missing || !isDone(p, kind, r.id)) && (!q || norm(r.name).includes(norm(q)) || r.ing.some((g) => norm(g.name).includes(norm(q))))), [all, missing, q, p]);
  return (
    <div className="screen">
      <TopBar title={kind === 'cooking' ? 'Cooking' : 'Crafting'} back="#/collections" />
      <Head have={have} total={counted.length} icon={kind === 'cooking' ? <Ui k="Cooking" size={48} /> : <ItemIcon qid="(BC)13" size={48} />} label={kind === 'cooking' ? 'dishes cooked' : 'items crafted'} />
      <div className="tools"><SearchBox value={q} onChange={setQ} placeholder="Search recipe or ingredient" /><MissingToggle value={missing} onChange={setMissing} /></div>
      <Panel>
        {!list.length && <Empty>{missing ? 'All done!' : 'No matches.'}</Empty>}
        <div className="list">
          {list.map((r) => <ColRow key={r.id} col={kind} id={r.id} qid={r.out} name={<>{r.name}{!r.perfection && <span className="tag">Not needed for perfection</span>}</>} sub={<><Ingredients r={r} /><span className="unlock">{r.unlock}</span></>} />)}
        </div>
      </Panel>
    </div>
  );
}
