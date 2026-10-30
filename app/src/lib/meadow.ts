/** True in-game size: the wiki tree images are the game sprites at 5× (Wild Tree 48×97 px, Fiddlehead Stalk 31×95 px);
 *  the Junimo (16×16 px in game) is drawn at 2×, so trees use the same 2× → 2/5 of the wiki image. */
export const WIKI_TREE_SCALE = 5, PIXEL_SCALE = 2;
export const treeSize = (s: { w: number; h: number }, wikiScale = WIKI_TREE_SCALE) => ({ w: (s.w / wikiScale) * PIXEL_SCALE, h: (s.h / wikiScale) * PIXEL_SCALE });
export interface MeadowTree { k: string; left?: string; right?: string; scale: number }
/** v6.8: each tree only stands in the seasons it really grows in the game (Stardew Valley Wiki):
 *  - Green Rain Trees (the two mossy wild trees = types 1/2, the Fiddlehead Stalk = type 3) first appear with the Green Rain,
 *    which only falls in summer (wiki: Weather#Green Rain, Green_Rain_Trees). Type 3 drops Fiddlehead Fern, a summer forage.
 *  - In fall, Oaks and Maples outside town may turn into Green Rain Trees types 1/2 and stay that way until the next spring
 *    (wiki: Green_Rain_Trees), so the mossy pair stays through fall (leafy) and winter (bare; moss can't grow in winter, wiki: Moss).
 *    The Fiddlehead Stalk never does that, so it is summer-only.
 *  - Spring therefore shows plain common trees in their spring panels: Oak, Maple and Pine (wiki: Trees).
 *  Common-tree wiki images are the sprite at 2× (scale 2); Green Rain Tree images are 5× (scale 5). */
export const TREE_SEASONS: Record<string, { seasons: number[]; src: string }> = {
  MossyWild: { seasons: [1, 2, 3], src: 'https://stardewvalleywiki.com/Green_Rain_Trees' },
  MossyLush: { seasons: [1, 2, 3], src: 'https://stardewvalleywiki.com/Green_Rain_Trees' },
  Fiddlehead: { seasons: [1], src: 'https://stardewvalleywiki.com/Green_Rain_Trees' },
  Oak: { seasons: [0, 2], src: 'https://stardewvalleywiki.com/Oak_Tree' },
  Maple: { seasons: [0, 2], src: 'https://stardewvalleywiki.com/Maple_Tree' },
  Pine: { seasons: [0, 3], src: 'https://stardewvalleywiki.com/Pine_Tree' },
};
export const treeKind = (k: string) => k.split(':')[1];
export function meadowTrees(season: number): MeadowTree[] {
  const s = ((season % 4) + 4) % 4;
  if (s === 0) return [
    { k: 'tree:Maple:0', left: '-14px', scale: 2 },
    { k: 'tree:Oak:0', left: '40px', scale: 2 },
    { k: 'tree:Pine:0', right: '44px', scale: 2 },
    { k: 'tree:Oak:0', right: '-12px', scale: 2 },
  ];
  const sfx = ':' + s;
  const mid: [string, number][] = s === 2 ? [['tree:Maple:2', 2], ['tree:Oak:2', 2]] : s === 3 ? [['tree:Pine:3', 2], ['tree:Pine:3', 2]] : [['tree:Fiddlehead:1', 5], ['tree:Fiddlehead:1', 5]];
  return [
    { k: 'tree:MossyWild' + sfx, left: '-38px', scale: WIKI_TREE_SCALE },
    { k: mid[0][0], left: s >= 2 ? '30px' : '44px', scale: mid[0][1] },
    { k: mid[1][0], right: s >= 2 ? '34px' : '50px', scale: mid[1][1] },
    { k: 'tree:MossyLush' + sfx, right: '-34px', scale: WIKI_TREE_SCALE },
  ];
}
export const MEADOW_TREES = meadowTrees(0);

/** v6.3 ground atlas per season: green Standard Farm grass, or (winter) pale-blue snow patches cut from the Festival of Ice
 *  screenshot. No clean fall ground art exists on the wiki, so fall keeps the real green tiles. */
export const groundAtlas = (season: number) => ((((season % 4) + 4) % 4) === 3 ? 'ground:Tiles:3' : 'ground:Tiles');

/** v6.3 falling "air" per season. Petal + leaf = the game's own TV weather-animation sprites (4 tumble frames);
 *  snow = single pixels in that same icon's flake colour; summer motes = made pixel dots (no real sprite exists). */
export type AirKind = 'petal' | 'mote' | 'leaf' | 'snow';
export const AIR_KIND: AirKind[] = ['petal', 'mote', 'leaf', 'snow'];
export const AIR_SPRITE: Record<AirKind, string | null> = { petal: 'air:petal', mote: null, leaf: 'air:leaf', snow: null };
export interface Air { x: number; size: number; dur: number; delay: number; drift: number; frame: number }
/** Seeded particles (x in %); `soft` = the other screens: fewer + fainter. Durations are long so it stays calm. */
export function seasonAir(season: number, soft = false, seed = 31): { kind: AirKind; sprite: string | null; items: Air[] } {
  const s = ((season % 4) + 4) % 4, kind = AIR_KIND[s], r = rng(seed + s * 7 + (soft ? 1000 : 0));
  const n = Math.round([10, 8, 9, 22][s] * (soft ? 0.45 : 1));
  const items: Air[] = [];
  for (let i = 0; i < n; i++) {
    const dur = Math.round((kind === 'snow' ? 14 + r() * 10 : kind === 'mote' ? 7 + r() * 6 : 16 + r() * 10) * 10) / 10;
    items.push({ x: Math.round(((i + 0.1 + r() * 0.8) / n) * 1000) / 10, size: kind === 'snow' ? (r() < 0.3 ? 4 : 2) : 2, dur, delay: -Math.round(r() * dur * 10) / 10, drift: Math.round((r() * 2 - 1) * 40), frame: Math.floor(r() * 4) });
  }
  return { kind, sprite: AIR_SPRITE[kind], items };
}

/* ---------- v6.2: living ground ---------- */
/** Small seeded PRNG (mulberry32) so the meadow is irregular but identical on every load (no layout jump). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ground_Tiles.png atlas: 0, 1 plain grass · 2 sprout · 3 twig (all unedited 16×16 Standard Farm tiles). */
export const GROUND_TILE_COUNT = 4;
/** A seeded tile row: mostly the two plain tiles, the odd sprout/twig, never the same detail tile twice in a row. */
export function groundTiles(n: number, seed: number): number[] {
  const r = rng(seed), out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = r();
    let t = v < 0.08 ? 2 : v < 0.13 ? 3 : v < 0.565 ? 0 : 1;
    if (t >= 2 && out[i - 1] === t) t = 0;
    out.push(t);
  }
  return out;
}

/** One wind period of the tuft sway: a quarter of the sky's 13 s wind wisp, so gusts line up with the wisps. */
export const WISP_S = 13, SWAY_S = WISP_S / 4;
export type Layer = 'back' | 'mid' | 'front';
export interface Tuft { k: string; x: number; layer: Layer; w: number; h: number; delay: number; sway: boolean }
type Season = 0 | 1 | 2 | 3;
/** Real sprites per season. Weeds are the in-game Weeds debris (green in spring/summer, red/orange in fall; the wiki notes
 *  weeds don't appear in winter). Tall tufts are the grown Fiber crop in its seasonal colours. Forage = that season's
 *  wild forage items (the ground forage in game uses the item sprite). */
export function meadowKinds(season: number) {
  const s = (((season % 4) + 4) % 4) as Season;
  const weeds = s === 3 ? [] : s === 2 ? ['weed:7', 'weed:8', 'weed:1'] : ['weed:2', 'weed:3', 'weed:4', 'weed:5', 'weed:6'];
  const tuft = s === 2 ? 'tuft:fall' : s === 3 ? 'tuft:winter' : 'tuft:spring';
  const forage = [['(O)18', '(O)22', '(O)16', '(O)20', '(O)399'], ['(O)402', '(O)396', '(O)398', '(O)259'], ['(O)404', '(O)408'], ['(O)418', '(O)283']][s];
  return { weeds, tuft, forage };
}
/** Sprite box at the meadow's 2× pixel scale: weeds are 2× already (32 px), Fiber is 3× on the wiki, items are 48 px (3×). */
const SIZE: Record<string, [number, number]> = { weed: [32, 32], tuft: [30, 50], item: [32, 32] };
const LAYER_SCALE: Record<Layer, number> = { back: 0.5, mid: 1, front: 1 };

/** Irregular, seeded scatter across the strip (x in % of width). Stratified jitter → even coverage but no visible
 *  repeat; back tufts are half size (farther away), front ones overlap passing Junimos. */
export function meadowScatter(season: number, seed = 1729): Tuft[] {
  const r = rng(seed + season * 101), { weeds, tuft, forage } = meadowKinds(season), out: Tuft[] = [];
  const counts: Record<Layer, number> = { back: 14, mid: 7, front: season % 4 === 3 ? 3 : 5 };
  (['back', 'mid', 'front'] as Layer[]).forEach((layer) => {
    const n = counts[layer];
    for (let i = 0; i < n; i++) {
      const x = Math.round(((i + 0.15 + r() * 0.7) / n) * 1000) / 10;
      const v = r();
      let k: string, kind: string;
      if (forage.length && layer !== 'back' && v < 0.16) { k = forage[Math.floor(r() * forage.length)]; kind = 'item'; }
      else if (!weeds.length || v < 0.5) { k = tuft; kind = 'tuft'; }
      else { k = weeds[Math.floor(r() * weeds.length)]; kind = 'weed'; }
      const [w, h] = SIZE[kind], sc = LAYER_SCALE[layer];
      out.push({ k, x, layer, w: Math.round(w * sc), h: Math.round(h * sc), delay: -Math.round((1 - x / 100) * SWAY_S * 100) / 100, sway: kind !== 'item' });
    }
  });
  return out;
}

/** v6.9.2 the raccoon home: the REAL Giant Stump (wiki: Giant_Stump.png, the 1.6 in-game screenshot at exactly 3×), unmodified,
 *  cut out by app/scripts/make-raccoon-home.py at 1 game px per pixel. It stands ON the meadow ground like the side trees, at their
 *  2× game-pixel scale where the screen has room (else the largest crisp scale that fits); depth comes only from being drawn behind
 *  the side trees and Junimos plus a slight tint. One sprite for every season (the wiki has no seasonal stump). A stump doesn't sway.
 *  Sizes in game px; ROOTS = the row where the roots meet the ground (the steps and door raccoons sit on the grass below it). */
export const RACCOON_HOME = { w: 100, h: 110, roots: 87, scale: PIXEL_SCALE, shadow: { w: 108, h: 14 } } as const;
/** The lit window's glass box (x, y, w, h in game px): a kit rises up behind its bars every so often. */
export const WINDOW_BOX = [26, 51, 10, 13] as const;
/** Fit on the meadow, given the room (CSS px) from the meadow's bottom edge (= the screen's) up to the lowest menu button:
 *  roots at ROOTS_AT (3 px above the side trees' trunks at 30), the sprite's foot (steps) at most FOOT_SINK px under the screen edge
 *  behind the front grass; if a button would still reach the chimney the stump sinks lower (down to DEEP_SINK, partly behind the
 *  Junimos and foreground grass) rather than float. Scale = the largest k/dpr ≤ 2 (whole device pixels per game pixel) that fits. */
export const HOME_GAP = 4, ROOTS_AT = 33, FOOT_SINK = 8, DEEP_SINK = 24;
export function homeFit(room: number, dpr = 2) {
  const { h, roots } = RACCOON_HOME, below = h - roots, d = Math.max(1, Math.round(dpr));
  for (let k = PIXEL_SCALE * d; k >= d; k--) {
    const sc = k / d;
    let bottom = Math.max(-FOOT_SINK, ROOTS_AT - below * sc);
    bottom = Math.min(bottom, Math.floor(room - HOME_GAP - h * sc));
    if (bottom >= -DEEP_SINK || k === d) return { scale: sc, bottom: Math.max(bottom, -DEEP_SINK) };
  }
  return { scale: 1, bottom: 0 };
}
/** Peeks: a kit every 6–15 s (random), up for ~1.6 s. */
export const PEEK_MIN_MS = 6000, PEEK_MAX_MS = 15000, PEEK_SHOW_MS = 1600;
export const nextPeekDelay = (r: number) => Math.round(PEEK_MIN_MS + Math.min(Math.max(r, 0), 1) * (PEEK_MAX_MS - PEEK_MIN_MS));
/** Grass at the stump's foot (x in game px from its left edge; drawn over the base so it sits IN the grass, not on top of it). */
export function homeTufts(season: number) {
  const { weeds, tuft } = meadowKinds(season);
  const t = (x: number, k: string | undefined) => (k ? { x, k, w: 16, h: 16 } : { x, k: tuft, w: 15, h: 25 }); // weeds 1×, Fiber at back-tuft size
  return [t(4, undefined), t(22, weeds[0]), t(76, weeds[1]), t(95, undefined)];
}
/** Keep the raccoons' front door in view: no mid/front grass tuft stands within DOOR_CLEAR % of the meadow's centre. */
export const DOOR_CLEAR = 7;
export const clearOfDoor = (t: { x: number; layer: Layer }) => t.layer === 'back' || Math.abs(t.x - 50) >= DOOR_CLEAR;
