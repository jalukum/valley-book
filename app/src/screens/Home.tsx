import { useProfile } from '../lib/state';
import { SEASONS, weekday, core, items } from '../data';
import { Ui } from '../components/ui';
import { Brand, FarmPill } from './Today';
import { useEffect, useState, type CSSProperties } from 'react';
import { meadowTrees, groundAtlas, treeSize, groundTiles, meadowScatter, type Tuft, RACCOON_TREE, PEEK_SPOTS, PEEK_ORDER, PIXEL_SCALE, raccoonTree, nextPeekDelay, pickPeek, PEEK_SHOW_MS, CROWN_SWAY_DELAY, clearOfDoor, type PeekSpot } from '../lib/meadow';

/** Launch screen: title, farm switcher, then one Stardew menu-box per main section, standing on real farm grass. */
export const BUBBLES: { id: string; href: string; icon: string; title: string; line: string; size?: number }[] = [
  { id: 'today', href: '#/today', icon: 'Junimo', title: 'Day guide', line: 'What to do today — fish, forage, crops, gifts' },
  { id: 'progress', href: '#/progress', icon: 'Junimo Bundle', title: 'Progress', line: 'Bundles, quests and collections to tick off' },
  { id: 'villagers', href: '#/villagers', icon: 'Heart', title: 'Villagers', line: 'Birthdays, loved gifts and where they are', size: 36 },
  { id: 'search', href: '#/search', icon: 'Magnifying Glass', title: 'Search', line: 'Any item, fish, villager or recipe' },
  { id: 'more', href: '#/more', icon: 'Backpack', title: 'More', line: 'Calendar, Perfection, saves and help' },
];

export default function Home() {
  const p = useProfile();
  const s = SEASONS[p.date.season];
  return (
    <div className="screen entry">
      <header className="entry-h">
        <Brand home />
        <FarmPill />
        <a className="entry-date" href="#/today"><Ui k={'season:' + s} size={20} eager /><span>{weekday(p.date.day)} {p.date.day} {s} · Year {p.date.year}</span></a>
      </header>
      <nav className="bubbles" aria-label="Where to go">
        {BUBBLES.map((b, i) => (
          <a key={b.id} href={b.href} className={'bubble b' + i} data-tour={'bubble-' + b.id}>
            <span className="bub-ic"><Ui k={b.icon} size={b.size ?? 44} eager /></span>
            <span className="bub-t"><b>{b.title}</b><small>{b.line}</small></span>
          </a>
        ))}
      </nav>
      <Meadow season={p.date.season} />
    </div>
  );
}

/** Front-page meadow: real wiki tree sprites for the season (spring Oak/Maple/Pine; summer Green Rain trees; see meadowTrees) on the
 *  grass, and a few Junimos (the wiki's real 4-frame Junimo animation, tinted like the game's coloured Junimos) hopping
 *  left → right along it. Decorative only: aria-hidden, no pointer events; Junimos hidden under reduced motion. */
export const MEADOW_JUNIMOS = ['green', 'blue', 'pink', 'yellow'] as const;
const BACK_TILES = groundTiles(48, 7), MAIN_TILES = groundTiles(48, 11);
/** Layers, back → front: far grass (1×, hazed) + far tufts · main grass · trees · mid tufts · Junimos · front tufts. */
function Meadow({ season }: { season: number }) {
  const strip = core.ui['junimo:Strip'], tiles = core.ui[groundAtlas(season)];
  const scatter = meadowScatter(season).filter(clearOfDoor);
  const tuft = (t: Tuft, i: number) => {
    const spr = t.k.startsWith('(') ? items[t.k] : core.ui[t.k];
    if (!spr) return null;
    return (
      <span key={t.layer + i} className={'m-tuft t-' + t.layer + (t.sway ? ' sway' : '')} style={{ left: t.x + '%', animationDelay: t.delay + 's' }}>
        <img src={'./' + spr.s} width={t.w} height={t.h} alt="" draggable={false} />
      </span>
    );
  };
  const row = (ts: number[], cls: string) => tiles && (
    <div className={cls}>{ts.map((t, i) => <i key={i} style={{ backgroundImage: `url(./${tiles.s})`, backgroundPositionX: `calc(${-t} * var(--tile))` }} />)}</div>
  );
  return (
    <div className={'meadow s' + (((season % 4) + 4) % 4)} aria-hidden>
      {row(BACK_TILES, 'm-ground far')}
      {scatter.filter((t) => t.layer === 'back').map(tuft)}
      {row(MAIN_TILES, 'm-ground entry-ground')}
      <RaccoonTree season={season} />
      {meadowTrees(season).map((t, i) => {
        const s = core.ui[t.k];
        if (!s) return null;
        const z = treeSize(s, t.scale);
        return <img key={t.k + i} className="m-tree" src={'./' + s.s} style={{ left: t.left, right: t.right, height: z.h, width: z.w }} alt="" draggable={false} />;
      })}
      {scatter.filter((t) => t.layer === 'mid').map(tuft)}
      {strip && MEADOW_JUNIMOS.map((c, i) => (
        <span key={c} className={'m-jun j' + i + ' ' + c}><i style={{ backgroundImage: `url(./${strip.s})` }} /></span>
      ))}
      {scatter.filter((t) => t.layer === 'front').map(tuft)}
    </div>
  );
}

const px = (n: number) => n * PIXEL_SCALE + 'px';
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** v6.9 the raccoon tree in the meadow's middle gap (see RACCOON_TREE): trunk, swaying crown, and every 6–15 s one raccoon head
 *  peeking out of the door, window or hollow. The timer only runs while the page is visible and not under reduced motion
 *  (then a kit sits still in the hollow, as in the game's own screenshot). */
function RaccoonTree({ season }: { season: number }) {
  const t = raccoonTree(season);
  const trunk = core.ui[t.trunk], crown = core.ui[t.crown], door = core.ui[t.door];
  const [peek, setPeek] = useState<{ spot: PeekSpot; n: number } | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    let timer = 0, last: PeekSpot | null = null, n = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        if (document.hidden) return;
        last = pickPeek(Math.random(), last);
        setPeek({ spot: last, n: ++n });
        timer = window.setTimeout(() => { setPeek(null); schedule(); }, PEEK_SHOW_MS);
      }, nextPeekDelay(Math.random()));
    };
    const onVis = () => { if (document.hidden) { clearTimeout(timer); setPeek(null); } else schedule(); };
    document.addEventListener('visibilitychange', onVis);
    schedule();
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  if (!trunk || !crown) return null;
  const W = px(RACCOON_TREE.w), H = px(RACCOON_TREE.h);
  return (
    <div className={'m-rac' + (peek ? ' peek-' + peek.spot : '')} style={{ width: W, height: H, marginLeft: px(-RACCOON_TREE.w / 2) }}>
      <img className="rt-trunk" src={'./' + trunk.s} width={RACCOON_TREE.w * PIXEL_SCALE} height={RACCOON_TREE.h * PIXEL_SCALE} alt="" draggable={false} />
      {door && <img className="rt-door" src={'./' + door.s} width={RACCOON_TREE.w * PIXEL_SCALE} height={RACCOON_TREE.h * PIXEL_SCALE} alt="" draggable={false} />}
      <img className="rt-crown" src={'./' + crown.s} width={RACCOON_TREE.w * PIXEL_SCALE} height={RACCOON_TREE.h * PIXEL_SCALE} style={{ animationDelay: CROWN_SWAY_DELAY + 's' }} alt="" draggable={false} />
      {PEEK_ORDER.map((spot) => {
        const p = PEEK_SPOTS[spot], who = core.ui[p.who];
        if (!who) return null;
        const [x, y, w, h] = p.box;
        // heads sit on the opening's bottom edge ("below") or lean in from the doorway's right jamb ("side")
        const head = p.from === 'side'
          ? { left: 0, top: px(h - who.h), '--hide': `translateX(${px(w)})` }
          : { left: px(Math.round((w - who.w) / 2)), top: px(h - who.h), '--hide': `translateY(${px(who.h)})` };
        return (
          <span key={spot + (peek?.spot === spot ? peek.n : '')} className={'rt-peek ' + spot + ' from-' + p.from} style={{ left: px(x), top: px(y), width: px(w), height: px(h) }}>
            <i style={{ ...head, width: px(who.w), height: px(who.h), backgroundImage: `url(./${who.s})` } as CSSProperties} />
          </span>
        );
      })}
    </div>
  );
}
