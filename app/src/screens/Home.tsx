import { useProfile } from '../lib/state';
import { SEASONS, weekday, core, items } from '../data';
import { Ui } from '../components/ui';
import { Brand, FarmPill } from './Today';
import { meadowTrees, groundAtlas, treeSize, groundTiles, meadowScatter, type Tuft } from '../lib/meadow';

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
  const scatter = meadowScatter(season);
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
