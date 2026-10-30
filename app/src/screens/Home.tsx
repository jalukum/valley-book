import { useProfile } from '../lib/state';
import { SEASONS, weekday, core, items } from '../data';
import { Ui } from '../components/ui';
import { Brand, FarmPill } from './Today';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { meadowTrees, groundAtlas, treeSize, groundTiles, meadowScatter, type Tuft, RACCOON_HOME, WINDOW_BOX, homeTufts, homeFit, nextPeekDelay, PEEK_SHOW_MS, clearOfDoor } from '../lib/meadow';

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
      <RaccoonHome season={season} />
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

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** v6.9.2 the raccoons' home in the meadow's middle gap (see RACCOON_HOME, homeFit): the real Giant Stump, unmodified, on the meadow
 *  grass (behind the side trees, forage and Junimos) with a soft pixel shadow and grass at its foot. Every 6–15 s a kit rises up
 *  behind the lit window's bars. The timer only runs while the page is visible and not under reduced motion. */
function RaccoonHome({ season }: { season: number }) {
  const stump = core.ui['rhome:Stump'], bars = core.ui['rhome:Bars'], shadow = core.ui['rhome:Shadow'], kit = core.ui['rac:Kit'];
  const [peek, setPeek] = useState(0);
  // Keep the chimney clear of the menu buttons on short screens: sink the stump (never below the side trees' line) if a button reaches it.
  const ref = useRef<HTMLDivElement>(null);
  const [{ scale, bottom }, setFit] = useState(() => homeFit(240, window.devicePixelRatio || 1));
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const px = (n: number) => Math.round(n * scale * dpr) / dpr + 'px'; // game px → CSS px on whole device pixels
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current, m = el?.parentElement;
      if (!el || !m) return;
      const bub = [...document.querySelectorAll('.bubbles .bubble')].reduce((a, b) => Math.max(a, b.getBoundingClientRect().bottom), 0);
      setFit(homeFit(m.getBoundingClientRect().bottom - bub, window.devicePixelRatio || 1));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  useEffect(() => {
    if (reducedMotion()) return;
    let timer = 0, n = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        if (document.hidden) return;
        setPeek(++n);
        timer = window.setTimeout(() => { setPeek(0); schedule(); }, PEEK_SHOW_MS);
      }, nextPeekDelay(Math.random()));
    };
    const onVis = () => { if (document.hidden) { clearTimeout(timer); setPeek(0); } else schedule(); };
    document.addEventListener('visibilitychange', onVis);
    schedule();
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  if (!stump) return null;
  const { w, h, roots, shadow: sh } = RACCOON_HOME, [bx, by, bw, bh] = WINDOW_BOX;
  const img = (s: { s: string }, cls: string) => <img className={cls} src={'./' + s.s} style={{ width: px(w), height: px(h) }} alt="" draggable={false} />;
  return (
    <div ref={ref} className={'m-rac' + (peek ? ' peek' : '')} style={{ width: px(w), height: px(h), marginLeft: px(-w / 2), bottom }} data-scale={scale}>
      {shadow && <img className="rh-shadow" src={'./' + shadow.s} style={{ width: px(sh.w), height: px(sh.h), left: px((w - sh.w) / 2), top: px(roots - sh.h / 2) }} alt="" draggable={false} />}
      {img(stump, 'rh-stump')}
      {kit && (
        <span key={peek} className="rh-peek" style={{ left: px(bx), top: px(by), width: px(bw), height: px(bh) }}>
          <i style={{ left: px(Math.round((bw - kit.w) / 2)), top: px(bh - kit.h), width: px(kit.w), height: px(kit.h), backgroundImage: `url(./${kit.s})`, '--hide': `translateY(${px(kit.h)})` } as CSSProperties} />
        </span>
      )}
      {bars && img(bars, 'rh-bars')}
      {homeTufts(season).map((t, i) => {
        const spr = core.ui[t.k];
        return spr && <img key={i} className="rh-tuft" src={'./' + spr.s} style={{ left: px(t.x - t.w / 2), top: px(roots - t.h + 4), width: px(t.w), height: px(t.h) }} alt="" draggable={false} />;
      })}
    </div>
  );
}
