import { Lk } from '../components/Link';
import { useEffect, useState, type ReactNode } from 'react';
import { core, items, npcById } from '../data';
import { useProfile, update, toggle, isDone, count, setCount } from '../lib/state';
import { TopBar, Panel, Sprite, ItemIcon, Ui, Bar, Check, Sheet, Stepper, MissingToggle, Empty, useUiState, gold, pct } from '../components/ui';
import { perfection, doneCount, walnutsFound, walnutTotal, farmerLevel } from '../lib/progress';
import type { Order } from '../types';

function Head({ have, total, icon, label }: { have: number; total: number; icon: ReactNode; label: string }) {
  return (
    <Panel>
      <div className="big-prog">{icon}<div><b className="big-n">{have}/{total}</b><small>{label} · {pct(have, total)}</small></div></div>
      <Bar value={have} max={total} />
    </Panel>
  );
}

/** v6.3: the old Goals hub duplicated the More tab, so it is gone. Old #/goals links (bookmarks, history) land on More. */
export function GoalsHub() {
  useEffect(() => { location.replace('#/more'); }, []);
  return null;
}

// ---------------- perfection ----------------
const SKILL_ORDER = ['Farming', 'Mining', 'Foraging', 'Fishing', 'Combat'];
const OBELISK_UI: Record<string, string> = { 'Earth Obelisk': 'Earth Obelisk', 'Water Obelisk': 'Water Obelisk', 'Desert Obelisk': 'Desert Obelisk', 'Island Obelisk': 'Island Obelisk' };
export function PerfectionScreen() {
  const p = useProfile();
  const perf = perfection(core, p);
  const P = core.perfection;
  const skills: string[] = P.skills || SKILL_ORDER;
  return (
    <div className="screen">
      <TopBar title="Perfection" back="#/more" />
      <Panel className="perf-hero">
        <Ui k="Gold Clock" size={64} eager />
        <div><b className="big-n huge">{perf.percent}%</b><small>{perf.exact.toFixed(2)}% exact · {perf.percent >= 100 ? 'Perfection reached!' : `${(100 - perf.exact).toFixed(1)}% to go`}</small></div>
        <Bar value={perf.exact} />
      </Panel>
      <Panel title="Breakdown">
        <div className="list">
          {perf.rows.map((r) => {
            const body = <>
              <span className="row-main"><span className="row-t">{r.name}</span><span className="row-s">{r.have}/{r.total} · worth {r.weight}%</span><Bar value={r.have} max={r.total} /></span>
              <span className="row-r pts">{r.points.toFixed(r.points % 1 ? 1 : 0)}%</span>
            </>;
            return r.route ? <Lk key={r.id} className="row perf-row" href={r.route}>{body}<span className="chev-r" /></Lk> : <div key={r.id} className="row perf-row">{body}</div>;
          })}
        </div>
      </Panel>
      <Panel title="Skills" icon={<Ui k="skill:Farming" size={24} />} right={<span className="count">Farmer level {farmerLevel(p, skills)}/25</span>}>
        <div className="list">
          {skills.map((s) => (
            <div key={s} className="row static"><span className="row-ic"><Ui k={'skill:' + s} size={32} /></span><span className="row-main"><span className="row-t">{s}</span></span>
              <Stepper value={p.perf.skills[s] ?? 0} max={10} onChange={(v) => update((x) => { x.perf.skills[s] = v; })} label={s + ' level'} /></div>
          ))}
        </div>
      </Panel>
      <Panel title="Obelisks & Gold Clock" icon={<Ui k="Earth Obelisk" size={24} />}>
        <div className="list">
          {(P.obelisks as string[]).map((o) => <Check key={o} on={!!p.perf.obelisks[o]} onClick={() => update((x) => { x.perf.obelisks[o] = x.perf.obelisks[o] ? 0 : 1; })} icon={<Ui k={OBELISK_UI[o] || o} size={32} />}>{o}</Check>)}
          <Check on={!!p.perf.goldClock} onClick={() => update((x) => { x.perf.goldClock = x.perf.goldClock ? 0 : 1; })} icon={<Ui k="Gold Clock" size={32} />} sub="10,000,000g from the Wizard">Gold Clock</Check>
        </div>
      </Panel>
      <Panel title="Stardrops" icon={<ItemIcon qid="(O)434" size={24} />} right={<span className="count">{(P.stardrops as any[]).filter((s) => p.perf.stardrops[s.id]).length}/{P.stardrops.length}</span>}>
        <div className="list">
          {(P.stardrops as { id: string; source: string }[]).map((s) => {
            const [where, how] = s.source.split(/:\s(.+)/);
            return <Check key={s.id} on={!!p.perf.stardrops[s.id]} onClick={() => update((x) => { x.perf.stardrops[s.id] = x.perf.stardrops[s.id] ? 0 : 1; })} icon={<ItemIcon qid="(O)434" />} sub={how}>{where}</Check>;
          })}
        </div>
      </Panel>
      {P.waiver && (
        <Panel title="Perfection waivers" icon={<Ui k="Golden Walnut" size={24} />}>
          <div className="row static"><span className="row-main"><span className="row-t">Waivers bought</span><span className="row-s">{gold(P.waiver.price)} each from {P.waiver.vendor}. +{P.waiver.percent}% each.</span></span>
            <Stepper value={p.perf.waivers} max={100} onChange={(v) => update((x) => { x.perf.waivers = v; })} label="Waivers" /></div>
        </Panel>
      )}
    </div>
  );
}

// ---------------- walnuts ----------------
const AREAS: [string, RegExp][] = [
  ['Field Office', /Field Office/], ['Volcano', /Volcano/], ['Island Farm', /Island Farm|Gourmand|Farm Cave/], ['Pirate Cove', /Cove/],
  ['Island East (Jungle)', /Jungle|Leo's/], ['Island North', /Island North/], ['Island West', /Island West|Birdie|Darts/], ['Island South', /Island South/],
];
const areaOf = (name: string) => AREAS.find(([, re]) => re.test(name))?.[0] ?? 'Around the island';
export function WalnutsScreen() {
  const p = useProfile();
  const [missing, setMissing] = useUiState('wal:missing', false);
  const found = walnutsFound(core, p);
  const groups: { area: string; list: typeof core.walnuts }[] = [];
  for (const w of core.walnuts) { const a = areaOf(w.name); let g = groups.find((x) => x.area === a); if (!g) groups.push((g = { area: a, list: [] })); g.list.push(w); }
  const order = [...AREAS.map((a) => a[0]), 'Around the island'];
  groups.sort((a, b) => order.indexOf(a.area) - order.indexOf(b.area));
  return (
    <div className="screen">
      <TopBar title="Golden Walnuts" back="#/progress" />
      <Head have={found} total={walnutTotal(core)} icon={<Ui k="Golden Walnut" size={48} />} label="found" />
      <div className="chips"><MissingToggle value={missing} onChange={setMissing} /></div>
      {groups.map((g) => {
        const have = g.list.reduce((a, w) => a + Math.min(w.count, count(p, 'walnuts', w.id)), 0);
        const tot = g.list.reduce((a, w) => a + w.count, 0);
        const list = g.list.filter((w) => !missing || count(p, 'walnuts', w.id) < w.count);
        if (!list.length) return null;
        return (
          <Panel key={g.area} title={g.area} right={<span className="count">{have}/{tot}</span>}>
            <div className="list">
              {list.map((w) => w.count === 1
                ? <Check key={w.id} on={count(p, 'walnuts', w.id) >= 1} onClick={() => toggle('walnuts', w.id)} icon={<Ui k="Golden Walnut" size={32} />} sub={w.hint || undefined}>{w.name}</Check>
                : <div key={w.id} className={'row static' + (count(p, 'walnuts', w.id) >= w.count ? ' done' : '')}><span className="row-ic"><Ui k="Golden Walnut" size={32} /></span><span className="row-main"><span className="row-t">{w.name}</span>{w.hint && <span className="row-s pre">{w.hint}</span>}</span><Stepper value={Math.min(w.count, count(p, 'walnuts', w.id))} max={w.count} onChange={(v) => setCount('walnuts', w.id, v)} label={w.name} /></div>)}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

// ---------------- island upgrades ----------------
export function IslandScreen() {
  const p = useProfile();
  const done = core.island.filter((i) => isDone(p, 'island', i.id));
  const spent = done.reduce((a, i) => a + i.cost, 0); const total = core.island.reduce((a, i) => a + i.cost, 0);
  return (
    <div className="screen">
      <TopBar title="Island upgrades" back="#/more" />
      <Head have={done.length} total={core.island.length} icon={<Sprite spr={npcById.Leo?.icon} size={48} />} label={`${spent}/${total} walnuts spent`} />
      <Panel>
        <div className="list">
          {core.island.map((i) => <Check key={i.id} on={isDone(p, 'island', i.id)} onClick={() => toggle('island', i.id)} icon={<Ui k="Golden Walnut" size={32} />} sub={<>{i.description}<br /><i>{i.location}</i></>} right={<b className="cost">{i.cost}</b>}>{i.name}</Check>)}
        </div>
      </Panel>
    </div>
  );
}

// ---------------- special orders ----------------
function OrderRewards({ o }: { o: Order }) {
  return (
    <span className="rewards">
      {o.rewards.map((r, i) => r.type === 'gold' ? <span key={i} className="rw"><Ui k="Gold" size={16} />{r.amount ? gold(r.amount) : 'Gold'}</span>
        : r.type === 'qiGems' ? <span key={i} className="rw"><Ui k="Qi Gem" size={16} />{r.amount ?? ''} Qi Gems</span>
        : r.type === 'item' && r.qid && items[r.qid] ? <span key={i} className="rw"><ItemIcon qid={r.qid} size={16} />{items[r.qid].n}{r.amount ? ` ×${r.amount}` : ''}</span>
        : r.type === 'friendship' ? <span key={i} className="rw"><Ui k="Heart" size={16} />Friendship</span>
        : r.type === 'unlock' ? <span key={i} className="rw">Unlocks something new</span> : null)}
    </span>
  );
}
export function OrdersScreen() {
  const p = useProfile();
  const [missing, setMissing] = useUiState('ord:missing', false);
  const boards = [...new Set(core.orders.map((o) => o.board))];
  return (
    <div className="screen">
      <TopBar title="Special orders" back="#/progress" />
      <Head have={doneCount(p, 'orders', core.orders.map((o) => o.id))} total={core.orders.length} icon={<Ui k="Mr. Qi" size={48} />} label="completed" />
      <div className="chips"><MissingToggle value={missing} onChange={setMissing} /></div>
      {boards.map((b) => {
        const all = core.orders.filter((o) => o.board === b);
        const list = all.filter((o) => !missing || !isDone(p, 'orders', o.id));
        if (!list.length) return null;
        return (
          <Panel key={b} title={b === 'Town' ? 'Town board' : b === 'Qi' ? 'Mr. Qi’s challenges' : b} right={<span className="count">{all.filter((o) => isDone(p, 'orders', o.id)).length}/{all.length}</span>}>
            <div className="list">
              {list.map((o) => {
                const n = npcById[o.requester];
                const icon = n ? <Sprite spr={n.icon} size={32} /> : o.board === 'Qi' ? <Ui k="Mr. Qi" size={32} /> : <Ui k="Calendar" size={32} />;
                return <Check key={o.id} on={isDone(p, 'orders', o.id)} onClick={() => toggle('orders', o.id)} icon={icon}
                  sub={<><span className="quote">{o.text.replace(/\[random ([^\]]+)\]/gi, 'a certain $1').replace(/\[([^\]]+)\]/g, '$1')}</span><span className="o-meta">{o.requester ? `${o.requester} · ` : ''}{o.duration}{o.repeatable ? ' · repeatable' : ''}</span><OrderRewards o={o} /></>}>{o.name}</Check>;
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

// ---------------- achievements ----------------
export function AchievementsScreen() {
  const p = useProfile();
  const [missing, setMissing] = useUiState('ach:missing', false);
  const inGame = core.achievements.filter((a) => a.inGame);
  const plat = core.achievements.filter((a) => !a.inGame);
  const row = (a: (typeof core.achievements)[number]) => <Check key={a.name} on={isDone(p, 'achievements', a.name)} onClick={() => toggle('achievements', a.name)} icon={a.icon ? <Sprite spr={a.icon} size={32} /> : undefined} sub={a.desc}>{a.name}</Check>;
  const f = (l: typeof inGame) => l.filter((a) => !missing || !isDone(p, 'achievements', a.name));
  return (
    <div className="screen">
      <TopBar title="Achievements" back="#/more" />
      <Head have={doneCount(p, 'achievements', inGame.map((a) => a.name))} total={inGame.length} icon={<Ui k="Star Token" size={48} />} label="in-game achievements" />
      <div className="chips"><MissingToggle value={missing} onChange={setMissing} /></div>
      <Panel title="In-game">{!f(inGame).length && <Empty>All unlocked!</Empty>}<div className="list">{f(inGame).map(row)}</div></Panel>
      {f(plat).length > 0 && <Panel title="Steam / console only"><p className="hint">Not shown in the in-game menu.</p><div className="list">{f(plat).map(row)}</div></Panel>}
    </div>
  );
}

// ---------------- monster slayer ----------------
export function SlayerScreen() {
  const p = useProfile();
  return (
    <div className="screen">
      <TopBar title="Monster Slayer" back="#/more" />
      <Head have={doneCount(p, 'slayer', core.slayer.map((s) => s.id))} total={core.slayer.length} icon={<Ui k="skill:Combat" size={48} />} label="eradication goals (counts for perfection)" />
      <Panel>
        <div className="list">
          {core.slayer.map((s) => (
            <Check key={s.id} on={isDone(p, 'slayer', s.id)} onClick={() => toggle('slayer', s.id)} icon={s.sprites[0] ? <Sprite spr={s.sprites[0]} size={32} /> : <Ui k="skill:Combat" size={32} />}
              sub={<>Kill {s.count.toLocaleString('en-US')}: {s.targets.join(', ')}<br />{s.reward?.name && <span className="reward">{s.reward.qid && items[s.reward.qid] ? <ItemIcon qid={s.reward.qid} size={16} /> : s.reward.icon ? <Sprite spr={s.reward.icon} size={16} /> : null}<span>Reward: {s.reward.name}</span></span>}</>}>{s.name}</Check>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------------- secret notes ----------------
export function NotesScreen() {
  const p = useProfile();
  const [missing, setMissing] = useUiState('notes:missing', false);
  const kinds = ['Secret Note', 'Journal Scrap'];
  const [big, setBig] = useState<(typeof core.notes)[number] | null>(null);
  // Enlarged picture: the biggest whole-pixel multiple of the note's 72 px art that fits the screen width.
  const bigPx = big?.img ? Math.max(1, Math.floor(Math.min(window.innerWidth - 40, 504) / 72)) * 72 : 0;
  return (
    <div className="screen">
      <TopBar title="Secret notes" back="#/more" />
      <Head have={doneCount(p, 'notes', core.notes.map((n) => n.kind + n.id))} total={core.notes.length} icon={<ItemIcon qid="(O)79" size={48} />} label="found" />
      <div className="chips"><MissingToggle value={missing} onChange={setMissing} /></div>
      {kinds.map((k) => {
        const all = core.notes.filter((n) => n.kind === k);
        const list = all.filter((n) => !missing || !isDone(p, 'notes', n.kind + n.id));
        if (!list.length) return null;
        return (
          <Panel key={k} title={k + 's'} right={<span className="count">{all.filter((n) => isDone(p, 'notes', n.kind + n.id)).length}/{all.length}</span>}>
            <div className="list">
              {list.map((n) => {
                const id = n.kind + n.id; const on = isDone(p, 'notes', id);
                return (
                  <div key={id} className={'row note' + (on ? ' done' : '')}>
                    <button className="row-btn" onClick={() => toggle('notes', id)} aria-pressed={on}><span className="box" aria-hidden /><span className="row-ic"><ItemIcon qid={k === 'Secret Note' ? '(O)79' : '(O)842'} /></span><span className="row-main"><span className="row-t">{k} #{n.id}</span><span className="row-s clamp1">{n.isImg ? 'Picture note' : n.text.replace(/\s+/g, ' ')}</span></span></button>
                    <details className="note-d"><summary>{n.isImg ? 'See note' : 'Read note'}</summary>
                      {n.img ? <button className="note-img" onClick={() => setBig(n)} aria-label={`Enlarge ${k} #${n.id}`}><img src={'./' + n.img.s} width={144} height={144} alt={`${k} #${n.id} (picture)`} loading="lazy" draggable={false} /><small>Tap to enlarge</small></button> : n.text ? <p className="pre">{n.text}</p> : null}
                      {n.solutions.map((x, i) => <div key={i} className="note-sol"><b>{x.title === 'Solution' ? 'Solution' : x.title}</b><p className="pre">{x.text}</p></div>)}
                      {n.solutions.length > 0 && <small className="note-src">From the Stardew Valley Wiki</small>}
                      {n.reveals.length > 0 && <div className="reveals">{n.reveals.map(([npc, q], i) => <Lk key={i} className="ing" href={`#/item/${encodeURIComponent(q)}`}><Sprite spr={npcById[npc]?.icon} size={16} /><ItemIcon qid={q} size={16} /><span>{items[q]?.n}</span></Lk>)}</div>}
                    </details>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
      <Sheet open={!!big} onClose={() => setBig(null)} title={big ? `${big.kind} #${big.id}` : ''}>
        {big?.img && <img className="note-big" src={'./' + big.img.s} width={bigPx} height={bigPx} alt={`${big.kind} #${big.id} (picture)`} draggable={false} />}
      </Sheet>
    </div>
  );
}

// ---------------- powers ----------------
export function PowersScreen() {
  const p = useProfile();
  const groups: [string, (x: (typeof core.powers)[number]) => boolean][] = [
    ['Special items', (x) => !x.id.startsWith('Book_') && !x.id.startsWith('Mastery_')],
    ['Books', (x) => x.id.startsWith('Book_')],
    ['Masteries', (x) => x.id.startsWith('Mastery_')],
  ];
  return (
    <div className="screen">
      <TopBar title="Special items & powers" back="#/more" />
      <Head have={doneCount(p, 'powers', core.powers.map((x) => x.id))} total={core.powers.length} icon={<ItemIcon qid="(O)Book_Speed" size={48} />} label="unlocked" />
      {groups.map(([g, f]) => (
        <Panel key={g} title={g}>
          <div className="list">
            {core.powers.filter(f).map((x) => <Check key={x.id} on={isDone(p, 'powers', x.id)} onClick={() => toggle('powers', x.id)} icon={x.item && items[x.item] ? <ItemIcon qid={x.item} /> : x.ui ? <Ui k={x.ui} size={32} /> : undefined} sub={x.desc || undefined}>{x.name}</Check>)}
          </div>
        </Panel>
      ))}
    </div>
  );
}
