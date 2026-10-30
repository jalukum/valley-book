import { Lk } from '../components/Link';
import { useEffect, useRef } from 'react';
import { TopBar, SearchBox, ItemIcon, Sprite, Empty, Ui, useUiState } from '../components/ui';
import { search, type Hit } from '../lib/search';
import { npcById, core, items, fishByQid } from '../data';
import { useProfile, clearRecent } from '../lib/state';

const ORDER: Hit['kind'][] = ['Villager', 'Item', 'Fish', 'Bundle', 'Cooking', 'Crafting'];
const LABEL: Record<Hit['kind'], string> = { Villager: 'Villagers', Item: 'Items', Fish: 'Fish', Bundle: 'Bundles', Cooking: 'Cooking recipes', Crafting: 'Crafting recipes' };

export default function SearchScreen() {
  const [q, setQ] = useUiState('search', '');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('input')?.focus(); }, []);
  const hits = search(q);
  return (
    <div className="screen">
      <TopBar title="Search" />
      <div ref={ref} className="sticky-tools" data-tour="search-box"><SearchBox value={q} onChange={setQ} placeholder="Items, villagers, fish, bundles, recipes" /></div>
      {!q && <Empty>Search for anything</Empty>}
      {!q && <Recent />}
      {q && !hits.length && <Empty>Nothing matches “{q}”.</Empty>}
      {ORDER.map((k) => {
        const list = hits.filter((h) => h.kind === k);
        if (!list.length) return null;
        return (
          <section key={k} className="panel">
            <div className="panel-h"><h2>{LABEL[k]}</h2><span className="grow" /><span className="count">{list.length}</span></div>
            <div className="list">
              {list.slice(0, 30).map((h) => (
                <Lk key={h.kind + h.href + h.title} className="nav-row" href={h.href}>
                  <span className="row-ic">{h.npc ? <Sprite spr={npcById[h.npc]?.icon} size={32} /> : h.qid ? <ItemIcon qid={h.qid} /> : <BundleIc title={h.title} />}</span>
                  <span className="row-main"><b>{h.title}</b><small>{h.sub}</small></span><span className="chev-r" />
                </Lk>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
function BundleIc({ title }: { title: string }) {
  const name = title.replace(/ Bundle$/, '');
  for (const r of core.rooms) for (const b of r.bundles) if (b.name === name) return <Sprite spr={b.colorIcon} size={32} />;
  for (const r of core.remix) for (const s of r.slots) for (const o of s.options) if (o.name === name) return <Sprite spr={o.colorIcon} size={32} />;
  return null;
}

/** v7.0: the last few items, fish and villagers opened on this farm, shown while the search box is empty. */
function Recent() {
  const p = useProfile();
  const list = (p.recent || []).map((k) => {
    const [kind, ...rest] = k.split(':'); const id = rest.join(':');
    if (kind === 'villager') { const n = npcById[id]; return n ? { k, title: n.name, sub: 'Villager', href: `#/villager/${encodeURIComponent(id)}`, ic: <Sprite spr={n.icon} size={32} /> } : null; }
    const it = items[id]; return it ? { k, title: it.n, sub: fishByQid[id] ? 'Fish' : it.c || 'Item', href: `#/item/${encodeURIComponent(id)}`, ic: <ItemIcon qid={id} /> } : null;
  }).filter(Boolean) as { k: string; title: string; sub: string; href: string; ic: React.ReactNode }[];
  // v7.2.1: the section is always here (with a short placeholder until something's opened), so the tutorial can point at it.
  return (
    <section className={'panel recent' + (list.length ? '' : ' empty')} data-tour="recent">
      <div className="panel-h"><h2>Recently viewed</h2><span className="grow" />{list.length > 0 && <button className="btn sm" data-sfx="close" onClick={clearRecent}>Clear</button>}</div>
      {list.length ? <div className="list">
        {list.map((r) => <Lk key={r.k} className="nav-row" href={r.href}><span className="row-ic">{r.ic}</span><span className="row-main"><b>{r.title}</b><small>{r.sub}</small></span><span className="chev-r" /></Lk>)}
      </div> : <p className="hint recent-empty"><Ui k="Magnifying Glass" size={20} />Things you open will show up here.</p>}
    </section>
  );
}
