import { useEffect, useRef } from 'react';
import { TopBar, SearchBox, ItemIcon, Sprite, Empty, useUiState } from '../components/ui';
import { search, type Hit } from '../lib/search';
import { npcById, core } from '../data';

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
      <div ref={ref} className="sticky-tools"><SearchBox value={q} onChange={setQ} placeholder="Items, villagers, fish, bundles, recipes" /></div>
      {!q && <Empty>Try “diamond”, “Abigail”, “catfish”, “quality crops” or “salad”.</Empty>}
      {q && !hits.length && <Empty>Nothing matches “{q}”.</Empty>}
      {ORDER.map((k) => {
        const list = hits.filter((h) => h.kind === k);
        if (!list.length) return null;
        return (
          <section key={k} className="panel">
            <div className="panel-h"><h2>{LABEL[k]}</h2><span className="grow" /><span className="count">{list.length}</span></div>
            <div className="list">
              {list.slice(0, 30).map((h) => (
                <a key={h.kind + h.href + h.title} className="nav-row" href={h.href}>
                  <span className="row-ic">{h.npc ? <Sprite spr={npcById[h.npc]?.icon} size={32} /> : h.qid ? <ItemIcon qid={h.qid} /> : <BundleIc title={h.title} />}</span>
                  <span className="row-main"><b>{h.title}</b><small>{h.sub}</small></span><span className="chev-r" />
                </a>
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
