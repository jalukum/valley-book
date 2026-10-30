import { Lk } from '../components/Link';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { sfxEnabled, setSfxEnabled, onSfxChange, playSfx } from '../lib/sfx';
import { core, npcById } from '../data';
import { useProfile, isDone } from '../lib/state';
import { REPLAY, type TourId } from '../lib/tour';
import { startTour } from '../components/Tour';
import { ddNext, type DdState, type DdEvent } from '../lib/mapui';
import { ccProgress, jojaProgress, doneCount, walnutsFound, walnutTotal } from '../lib/progress';
import { access, questDone, roadmap } from '../lib/guide';
import { TopBar, Ui, ItemIcon, Bar, Sprite } from '../components/ui';

export interface HubRow { href: string; icon: ReactNode; name: string; sub: string; have?: number; total?: number; v?: string }
export const HubRows = ({ rows }: { rows: HubRow[] }) => (
  <>
    {rows.map((r) => (
      <Lk key={r.href + r.name} className="panel hub-row" href={r.href}>
        <span className="row-ic">{r.icon}</span>
        <span className="row-main"><b>{r.name}</b><small>{r.sub}</small></span>
        <span className="hub-n">{r.v ?? (r.total != null ? `${r.have}/${r.total}` : <span className="chev-r" />)}</span>
        {r.total != null && <Bar value={r.have || 0} max={r.total} />}
      </Lk>
    ))}
  </>
);

export function ProgressHub() {
  const p = useProfile();
  const a = access(core, p);
  const cc = ccProgress(core, p);
  const joja = jojaProgress(core, p);
  const road = roadmap(core, p, a);
  const fishIds = core.fish.filter((f) => f.collection).map((f) => f.qid);
  const cook = core.recipes.cooking; const craft = core.recipes.crafting.filter((r) => r.perfection);
  const evs = core.guide.events.filter((e) => npcById[e.npc]);
  const rows: HubRow[] = [
    p.cc.route === 'joja'
      ? { href: '#/bundles/joja', icon: <Ui k="Community Center" size={32} />, name: 'Joja developments', sub: 'Buy each form at JojaMart', have: joja.bought, total: joja.total }
      : { href: '#/bundles', icon: <Ui k="Junimo Bundle" size={32} />, name: 'Community Center bundles', sub: 'Tick items as you put them in', have: Math.floor(cc.percent), total: 100, v: `${Math.floor(cc.percent)}%` },
    { href: '#/quests', icon: <Ui k="Quest" size={32} />, name: 'Quests', sub: 'Story and mail quests', have: core.guide.quests.filter((q) => questDone(p, q.id, a)).length, total: core.guide.quests.length },
    { href: '#/events', icon: <Ui k="Heart" size={28} />, name: 'Heart events', sub: 'Cutscenes with villagers', have: evs.filter((e) => isDone(p, 'events', e.id)).length, total: evs.length },
    { href: '#/orders', icon: <Ui k="Mr. Qi" size={32} />, name: 'Special orders', sub: a.ordersBoard ? 'Town board & Qi’s challenges' : 'Board opens Fall 2, Year 1', have: doneCount(p, 'orders', core.orders.map((o) => o.id)), total: core.orders.length },
    { href: '#/raccoon', icon: <Ui k="Raccoon" size={32} />, name: 'Raccoons', sub: 'Giant Stump requests', have: p.setup.raccoonDone, total: core.guide.raccoon.stages.length },
    { href: '#/museum', icon: <Ui k="Museum" size={32} />, name: 'Museum', sub: 'Artifacts & minerals donated', have: doneCount(p, 'museum', core.museum.items.map((i) => i.qid)), total: core.museum.items.length },
    { href: '#/fish', icon: <ItemIcon qid="(O)128" />, name: 'Fish caught', sub: 'Every fish in the collection', have: doneCount(p, 'fish', fishIds), total: fishIds.length },
    { href: '#/shipping', icon: <ItemIcon qid="(O)24" />, name: 'Items shipped', sub: 'Shipping bin collection', have: doneCount(p, 'shipping', core.shipping.map((s) => s.qid)), total: core.shipping.length },
    { href: '#/cooking', icon: <Ui k="Cooking" size={32} />, name: 'Cooking', sub: 'Recipes cooked', have: doneCount(p, 'cooking', cook.map((r) => r.id)), total: cook.length },
    { href: '#/crafting', icon: <ItemIcon qid="(BC)13" />, name: 'Crafting', sub: 'Recipes crafted', have: doneCount(p, 'crafting', craft.map((r) => r.id)), total: craft.length },
  ];
  // Walnuts live only here (the Goals hub is gone), so the row is always shown; before the island it says how it opens.
  rows.push({ href: '#/walnuts', icon: <Ui k="Golden Walnut" size={32} />, name: 'Golden Walnuts', sub: a.island ? 'Ginger Island' : 'Ginger Island · opens once Willy’s boat is fixed', have: walnutsFound(core, p), total: walnutTotal(core) });
  return (
    <div className="screen">
      <TopBar title="Progress" sub={p.name} />
      <Lk className="panel setup-card" href="#/setup" data-tour="setup">
        <Ui k="Backpack" size={40} />
        <span className="row-main"><b>Where are you in the game?</b><small>Mines {a.mine}, backpack {p.setup.backpack}, {p.cc.route === 'joja' ? 'Joja route' : 'Community Center route'}{a.bus ? ', bus running' : ''}{a.island ? ', island open' : ''}</small></span>
        <span className="chev-r" />
      </Lk>
      <Lk className="panel setup-card" href="#/road">
        <Ui k="Gold Clock" size={40} />
        <span className="row-main"><b>Road to Perfection</b><small>{road.current ? `Phase ${road.current.n} of 7 · ${road.current.name}` : 'Perfection reached!'}</small></span>
        <span className="chev-r" />
      </Lk>
      <div data-tour="trackers">
        <p className="hint">Checklists — tick things as you play. Today’s guide skips anything you’ve ticked.</p>
        <HubRows rows={rows} />
      </div>
    </div>
  );
}

export function MoreHub() {
  const rows: HubRow[] = [
    { href: '#/calendar', icon: <Ui k="Calendar" size={32} />, name: 'Calendar', sub: 'Birthdays and festivals' },
    { href: '#/bundles/needed', icon: <Ui k="Junimo Bundle" size={32} />, name: 'Bundle shopping list', sub: 'Every item still needed' },
    { href: '#/collections', icon: <ItemIcon qid="(O)74" />, name: 'Collections', sub: 'Museum, fish, shipping, recipes' },
    { href: '#/perfection', icon: <Ui k="Gold Clock" size={32} />, name: 'Perfection tracker', sub: 'Every perfection requirement' },
    { href: '#/island', icon: <Sprite spr={npcById.Leo?.icon} size={32} />, name: 'Island upgrades', sub: 'Leo’s parrots' },
    { href: '#/slayer', icon: <Ui k="skill:Combat" size={32} />, name: 'Monster Slayer', sub: 'Adventurer’s Guild goals' },
    { href: '#/achievements', icon: <Ui k="Star Token" size={32} />, name: 'Achievements', sub: 'In-game achievements' },
    { href: '#/notes', icon: <ItemIcon qid="(O)79" />, name: 'Secret notes', sub: 'Notes & journal scraps' },
    { href: '#/powers', icon: <ItemIcon qid="(O)Book_Speed" />, name: 'Special items & powers', sub: 'Books, keys & masteries' },
    { href: '#/profiles', icon: <Ui k="Junimo" size={32} />, name: 'Farms & backup', sub: 'Switch farms, export or import' },
    { href: '#/about', icon: <Ui k="Junimo" size={32} />, name: 'About & sources', sub: 'Where the data comes from' },
  ];
  return (
    <div className="screen">
      <TopBar title="More" />
      <HubRows rows={rows} />
      <section className="panel">
        <div className="list">
          <SoundToggle />
          <ReplayPicker />
        </div>
      </section>
    </div>
  );
}

/** v6.9 More → Sound effects on/off (default on, kept in localStorage 'sdv:sfx'). Turning it on plays the toggle sound once. */
export function SoundToggle() {
  const on = useSyncExternalStore(onSfxChange, sfxEnabled, () => true);
  return (
    <button className="nav-row sw-row" role="switch" aria-checked={on} data-sfx="none" onClick={() => { setSfxEnabled(!on); if (!on) playSfx('toggle'); }}>
      <span className="row-ic"><ItemIcon qid="(BC)209" /></span>
      <span className="row-main"><b>Sound effects</b><small>Soft taps and chimes when you press things</small></span>
      <span className={'pswitch' + (on ? ' on' : '')} aria-hidden><i /></span>
    </button>
  );
}

const REPLAY_IC: Record<TourId, ReactNode> = {
  day: <Ui k="Junimo" size={28} />, progress: <Ui k="Junimo Bundle" size={28} />, villagers: <Ui k="Heart" size={24} />, search: <Ui k="Magnifying Glass" size={28} />, more: <Ui k="Backpack" size={28} />,
};
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** v7.2 More → Replay a tutorial: a parchment dropdown (same roll-up list as the Maps villager picker) of the four tutorials.
 *  Picking one goes to that page and plays it. */
export function ReplayPicker() {
  const [dd, setDd] = useState<DdState>('closed');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ddGo = (e: DdEvent, then?: () => void) => {
    const nx = ddNext(dd, e); setDd(nx);
    if (nx !== 'closing' || dd === 'closing') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setDd((s) => ddNext(s, 'rolled')); then?.(); }, reducedMotion() ? 0 : 170);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (dd !== 'open') return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') ddGo('escape'); };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  });
  return (
    <div className="who-wrap replay-wrap" data-tour="replay">
      <button className={'nav-row replay-btn' + (dd === 'open' ? ' open' : '')} onClick={() => ddGo('button')} aria-haspopup="listbox" aria-expanded={dd === 'open'}>
        <span className="row-ic"><Ui k="Quest" size={28} /></span>
        <span className="row-main"><b>Replay a tutorial</b><small>Pick one to watch it again</small></span>
        <span className="who-chev" aria-hidden />
      </button>
      {dd !== 'closed' && <>
        <div className="dd-scrim" onPointerDown={(e) => { e.preventDefault(); ddGo('outside'); }} aria-hidden />
        <div className={'who-dd replay-dd' + (dd === 'closing' ? ' closing' : '')} role="listbox" aria-label="Choose a tutorial to replay">
          {REPLAY.map((t) => (
            <button key={t.id} role="option" aria-selected={false} className="dd-row" onClick={() => dd === 'open' && ddGo('pick', () => startTour(t.id))}>
              <span className="dd-ic">{REPLAY_IC[t.id]}</span>
              <span className="dd-txt"><span className="dd-name">{t.label}</span><small>{t.sub}</small></span>
            </button>
          ))}
        </div>
      </>}
    </div>
  );
}
