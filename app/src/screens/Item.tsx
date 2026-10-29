import { core, items, npcById, fishByQid, loadGifts } from '../data';
import { useProfile, toggle, isDone } from '../lib/state';
import { TopBar, Panel, Sprite, ItemIcon, Ui, Empty, gold } from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { whoLikes, TIER_LABEL } from '../lib/gifts';
import { fishSeasons, fishTimeText, fishWeather } from '../lib/fish';
import { itemSeasons } from '../lib/seasons';
import { Ingredients } from './Collections';
import type { Tier } from '../types';

const href = (q: string) => `#/item/${encodeURIComponent(q)}`;

export default function ItemScreen({ qid: raw }: { qid?: string }) {
  const qid = raw ? decodeURIComponent(raw) : '';
  const it = items[qid];
  const p = useProfile();
  const gifts = useAsync(loadGifts);
  if (!it) return <div className="screen"><TopBar title="Item" back="#/search" /><Empty>Item not found.</Empty></div>;
  const fish = fishByQid[qid];
  const mus = core.museum.items.find((m) => m.qid === qid);
  const ship = core.shipping.find((s) => s.qid === qid);
  const makes = [...core.recipes.cooking.map((r) => ({ r, k: 'cooking' as const })), ...core.recipes.crafting.map((r) => ({ r, k: 'crafting' as const }))].filter((x) => x.r.out === qid);
  const uses = [...core.recipes.cooking.map((r) => ({ r, k: 'cooking' as const })), ...core.recipes.crafting.map((r) => ({ r, k: 'crafting' as const }))].filter((x) => x.r.ing.some((g) => g.qid === qid && !g.any));
  const bundles: { room: string; ri: number; name: string; count: number; quality: string; remix: boolean; source: string | null; icon: any }[] = [];
  core.rooms.forEach((r, ri) => r.bundles.forEach((b) => b.items.forEach((i) => { if (i.qid === qid) bundles.push({ room: r.name, ri, name: b.name, count: i.count, quality: i.quality, remix: false, source: i.source, icon: b.colorIcon }); })));
  core.remix.forEach((r) => r.slots.forEach((s) => s.options.forEach((o) => o.items.forEach((i) => { if (i.qid === qid && !bundles.some((x) => x.name === o.name)) bundles.push({ room: r.room, ri: core.rooms.findIndex((x) => x.name === r.room), name: o.name, count: i.count, quality: i.quality, remix: true, source: i.source, icon: o.colorIcon }); }))));
  const where = [...new Set([...bundles.map((b) => b.source).filter(Boolean) as string[]])];
  const seasons = itemSeasons(qid);
  const tastes = gifts ? whoLikes(gifts, qid) : null;
  const toggles: { col: string; id: string; label: string }[] = [];
  if (fish?.collection) toggles.push({ col: 'fish', id: qid, label: 'Caught' });
  if (ship) toggles.push({ col: 'shipping', id: qid, label: 'Shipped' });
  if (mus) toggles.push({ col: 'museum', id: qid, label: 'Donated' });
  makes.forEach((m) => toggles.push({ col: m.k, id: m.r.id, label: m.k === 'cooking' ? 'Cooked' : 'Crafted' }));
  return (
    <div className="screen">
      <TopBar title={it.n} back="#/search" />
      <Panel className="item-hero">
        <Sprite spr={it} size={96} eager alt={it.n} />
        <div>
          <h2 className="item-n">{it.n}</h2>
          {it.c && <span className="tag">{it.c}</span>}
          {it.p > 0 && <div className="fact"><Ui k="Gold" size={16} /><span>Sells for <b>{gold(it.p)}</b></span></div>}
          {seasons && <div className="fact">{seasons.map((s) => <Ui key={s} k={'season:' + s} size={16} />)}<span>{seasons.join(' · ')}</span></div>}
        </div>
        {it.d && <p className="item-d">{it.d}</p>}
      </Panel>
      {toggles.length > 0 && <div className="chips">{toggles.map((t) => { const on = isDone(p, t.col, t.id); return <button key={t.col + t.id} className={'chip check-chip' + (on ? ' on' : '')} onClick={() => toggle(t.col, t.id)} aria-pressed={on}><span className="box" aria-hidden />{t.label}</button>; })}</div>}

      {fish && (
        <Panel title="Fishing" icon={<ItemIcon qid="(O)145" size={24} />}>
          <dl className="dl">
            <dt>Where</dt><dd>{(fish.summary.locations || []).join(', ') || (fish.method === 'crab pot' ? `Crab pot (${fish.water || 'any water'})` : '—')}</dd>
            <dt>When</dt><dd>{fish.method === 'crab pot' ? 'Any time' : fishTimeText(fish)}</dd>
            <dt>Seasons</dt><dd>{fishSeasons(fish).length === 4 ? 'All seasons' : fishSeasons(fish).join(', ')}</dd>
            <dt>Weather</dt><dd>{fishWeather(fish) === 'both' ? 'Any' : fishWeather(fish) === 'sunny' ? 'Sun' : 'Rain'}</dd>
            {fish.difficulty != null && <><dt>Difficulty</dt><dd>{fish.difficulty}{fish.behavior ? ` (${fish.behavior})` : ''}</dd></>}
            {fish.level > 0 && <><dt>Fishing level</dt><dd>{fish.level}+</dd></>}
          </dl>
        </Panel>
      )}
      {mus && <Panel title="Museum" icon={<Ui k="Museum" size={24} />}><p className="hint">{mus.kind}. Found by:</p><ul className="ul">{mus.foundIn.map((f) => <li key={f}>{f}</li>)}</ul></Panel>}
      {where.length > 0 && !fish && <Panel title="Where to find"><ul className="ul">{where.map((w) => <li key={w}>{w}</li>)}</ul></Panel>}

      {makes.map(({ r, k }) => (
        <Panel key={r.id} title={k === 'cooking' ? 'Cooking recipe' : 'Crafting recipe'} icon={k === 'cooking' ? <Ui k="Cooking" size={24} /> : <ItemIcon qid="(BC)13" size={24} />}>
          <Ingredients r={r} />
          <p className="hint">{r.unlock}</p>
        </Panel>
      ))}

      {bundles.length > 0 && (
        <Panel title="Bundles" icon={<Ui k="Junimo Bundle" size={24} />}>
          <div className="list">
            {bundles.map((b) => (
              <a key={b.name + b.room} className="nav-row" href={`#/bundles/room/${b.ri}?b=${encodeURIComponent(b.name)}${b.remix ? '&remix' : ''}`}>
                <span className="row-ic"><Sprite spr={b.icon} size={32} /></span>
                <span className="row-main"><b>{b.name}{/Bundle$/.test(b.name) ? '' : ' Bundle'}</b><small>{b.room}{b.remix ? ' · Remixed' : ''} · ×{b.count}{b.quality !== 'normal' ? ` · ${b.quality} quality` : ''}</small></span><span className="chev-r" />
              </a>
            ))}
          </div>
        </Panel>
      )}

      {uses.length > 0 && (
        <Panel title="Used in recipes" right={<span className="count">{uses.length}</span>}>
          <div className="gift-grid">
            {uses.map(({ r }) => r.out && items[r.out] ? <a key={r.id} className="gift" href={href(r.out)}><ItemIcon qid={r.out} /><span>{r.name}</span></a> : null)}
          </div>
        </Panel>
      )}

      <Panel title="Gift tastes" icon={<Ui k="Gift" size={24} />}>
        {!tastes ? <div className="loading">Loading…</div> : (['love', 'like', 'neutral', 'dislike', 'hate'] as Tier[]).map((t) => {
          const list = tastes[t].filter((x) => npcById[x.npc]);
          if (!list.length) return null;
          const allU = list.length >= core.npcs.length - 6 && list.every((x) => x.universal);
          return (
            <div key={t} className={'tier tier-' + t}>
              <h3 className="sh3">{TIER_LABEL[t]} <span className="count">{list.length}</span></h3>
              {allU && <p className="hint">Universal: almost everyone.</p>}
              <div className="who">
                {list.sort((a, b) => a.npc.localeCompare(b.npc)).map((x) => (
                  <a key={x.npc} className={'who-n' + (x.universal ? ' u' : '')} href={`#/villager/${encodeURIComponent(x.npc)}`} title={x.npc}><Sprite spr={npcById[x.npc].icon} size={32} /><span>{x.npc}</span></a>
                ))}
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
