import { core } from '../data';
import { seasonAir } from '../lib/meadow';

const url = (s: string) => './' + s;

/** Ambient Stardew sky behind every screen: drifting clouds, wind wisps and a slow day → dusk → night → dawn loop.
 *  Sprites are the game's own (Cloud Decal, Night Sky Decal, Sunny icon). CSS transforms/opacity only; frozen to a calm
 *  daytime frame under prefers-reduced-motion. `full` = the entry screen; other screens get a lighter version. */
export function Sky({ full, season = 0 }: { full: boolean; season?: number }) {
  const img = (k: string, cls: string, scale: number) => {
    const s = core.ui[k];
    return s ? <img className={'sky-spr ' + cls} src={url(s.s)} width={s.w * scale} height={s.h * scale} alt="" draggable={false} /> : null;
  };
  return (
    <div className={'sky' + (full ? ' full' : ' soft')} aria-hidden>
      <div className="sky-dusk" />
      <div className="sky-night" />
      <div className="sky-stars">
        {img('sky:Star', 'st s1', 0.6)}{img('sky:Stars', 'st s2', 0.6)}{img('sky:Star', 'st s3', 0.45)}
        {img('sky:Star', 'st s4', 0.5)}{img('sky:Stars', 'st s5', 0.45)}{img('sky:Star', 'st s6', 0.4)}
      </div>
      <div className="sky-orbit">
        <span className="sky-sun">{img('sky:Sun', '', 3)}</span>
        <span className="sky-moon">{img('sky:Moon', '', 1)}</span>
      </div>
      <div className="sky-clouds">
        {img('sky:Cloud1', 'cl c1', 1.4)}{img('sky:Cloud2', 'cl c2', 1)}{img('sky:Cloud1', 'cl c3', 0.8)}{img('sky:Cloud2', 'cl c4', 1.2)}
      </div>
      <div className="sky-wind"><i className="w1" /><i className="w2" /><i className="w3" /></div>
      <SeasonAir season={season} soft={!full} />
    </div>
  );
}

/** v6.3 seasonal air, on every screen (fewer + fainter off the entry page): spring petals and fall leaves are the game's own
 *  tumbling TV-weather sprites (4 frames, shown at 2×), winter snow is single pixels, summer has a few fireflies at dusk/night
 *  (made pixel dots: the game has no firefly sprite on the wiki). Transforms + opacity only; a still frame under reduced motion. */
export function SeasonAir({ season, soft }: { season: number; soft: boolean }) {
  const { kind, sprite, items } = seasonAir(season, soft);
  const spr = sprite ? core.ui[sprite] : null;
  const fw = spr ? spr.h * 2 : 0; // square frames, 1× → 2×
  return (
    <div className={'air air-' + kind} key={kind}>
      {items.map((a, i) => (
        <span key={i} className="air-p" style={{ left: a.x + '%', animationDuration: a.dur + 's', animationDelay: a.delay + 's', ['--drift' as string]: a.drift + 'px', ['--y' as string]: Math.round((-a.delay / a.dur) * 100) + 'vh' }}>
          <span className="air-s" style={{ animationDelay: a.delay + 's' }}>
            {spr ? (
              <span className="air-f" style={{ width: fw, height: fw }}>
                <img src={url(spr.s)} width={spr.w * 2} height={fw} alt="" draggable={false} style={{ transform: `translateX(${-a.frame * fw}px)`, animationDelay: -a.frame * 0.2 + 's' }} />
              </span>
            ) : <i style={{ width: a.size, height: a.size }} />}
          </span>
        </span>
      ))}
    </div>
  );
}
