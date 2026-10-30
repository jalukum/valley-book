// Turns a villager's schedule line (from whereNow / pickBlock) into a spot on one of the map tabs.
import type { Npc, Schedule, SchedBlock } from '../types';
import type { Profile } from './state';
import { whereNow } from './where';
import { parseTime, currentEntry } from './schedule';
import { SPOTS, REGIONS, HOME_BY_ADDRESS, FIXED_NPCS, KEYWORDS, LOC_TO_SPOT, toImg, type Spot } from './mapdata';
import gamelocs from '../game/gamelocs.json';

export { SPOTS, REGIONS, toImg };
export const spotImg = (key: string): [number, number] => { const s = SPOTS[key]; return toImg(REGIONS[s.region], s.x, s.y); };

/** A villager's home spot: their Data/Characters.json `Home` location, mapped to its building (interiors -> the building). */
export function homeSpot(n: Npc, p?: Pick<Profile, 'hearts'>): string {
  if (n.id === 'Leo') return (p?.hearts?.Leo ?? 0) >= 6 ? 'Treehouse' : 'IslandHut';
  return gameHomeSpot(n.id) || HOME_BY_ADDRESS[n.address ?? ''] || 'Square';
}
type Homes = Record<string, { loc: string; if?: string }[]>;
/** The unconditional (default) home in the game data. */
export function gameHomeSpot(id: string): string | null {
  const h = (gamelocs.homes as Homes)[id]; if (!h) return null;
  const d = h.find((x) => !x.if) ?? h[0];
  return LOC_TO_SPOT[d.loc] ?? null;
}

const NAMES = Object.keys(gamelocs.homes).filter((k) => /^[A-Z][a-z]+$/.test(k)).sort((a, b) => b.length - a.length).join('|');
const AP = "(?:'s|’s|s'|')";
/** "Leaves X", "from X": X is where they were, not where they go, so it is cut out up to the next verb or clause. */
const ORIGIN = /\b(leaves?|leaving|exits?|steps? out of|comes? out of|from)\b.*?(?=\b(to|and|for|then|heads?|goes|walks|towards?)\b|[,.;!(]|$)/gi;
/** Taking someone else home ("walking Vincent and Jas home") says nothing about where this villager goes. */
const ESCORT = /\bwalk(s|ing)?\s+[A-Z][a-z]+(\s*(,|and)\s*[A-Z][a-z]+)*\s+home\b/g;
const OWNROOM = '(room|bedroom|house|home|cottage|trailer|hut|tent|cabin|shop)';
/** Being near a house is not being in it ("the lake next to his house", "west of town"), and "on Ginger Island" is the whole island. */
const NEAR = new RegExp(`\\b((next to|close to|near|beside|by|((north|south|east|west)\\w*|the (north|south|east|west)\\w*) of) (his|her|their) ${OWNROOM}|((north|south|east|west)\\w*) of (pelican )?town|on ginger island)\\b`, 'gi');
/** Phrases that mean the villager's own home. */
const HOME = new RegExp(`\\b(home|kitchen|living room|(to|in|into) bed|to sleep|returns inside|back (to|in|into) (room|bed)|((back|goes|go|walks?|heads?|returns?|runs?) )?(to|in|into|inside|inside of|enters?|towards?|outside|outside of|in front of)( the entrance to)? (his|her|their) ${OWNROOM})\\b`, 'gi');
/** "<Villager>'s house/room/…", "<A> and <B>'s house", or "<Villager>'s" at the end of a clause -> that villager's home. */
const POSS = new RegExp(`\\b(${NAMES})${AP}(?=\\s+(house|home|room|bedroom|old room|cottage|trailer|place|shop|store|cabin|tent|tower|ranch|front door|door|porch|yard|clinic)\\b|\\s*([,.;!)]|$|and\\b|with\\b|to\\b))`, 'g');
/** "visits Robin", "follows Sam to his room" -> that villager's home. */
const VISIT = new RegExp(`\\b(visits?|visiting|follows?|following)\\s+(${NAMES})\\b(?!${AP})(?=\\s*([,.;!]|$|to (his|her|their) ${OWNROOM}|\\bat\\b|in\\b))`, 'g');

/** Spot for one schedule line, or null when the line names nowhere (the villager stays where they were).
 *  Every mention is found with its position; the one that comes last in the line wins (it is the destination). */
export function spotForLine(text: string, places: string[], home: string): string | null {
  const blank = (m: string) => ' '.repeat(m.length);
  const t = text.replace(ORIGIN, blank).replace(NEAR, blank).replace(ESCORT, blank);
  let best: string | null = null; let at = -1;
  const take = (i: number, key: string | null) => { if (key && i >= at) { at = i; best = key; } };
  const scan = (re: RegExp, key: (m: RegExpExecArray) => string | null) => { const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m: RegExpExecArray | null; while ((m = g.exec(t))) take(m.index, key(m)); };
  for (const [re, key] of KEYWORDS) scan(new RegExp(re.source, 'gi'), () => key);
  scan(POSS, (m) => gameHomeSpot(m[1]));
  scan(VISIT, (m) => gameHomeSpot(m[2]));
  scan(HOME, () => home);
  if (best) return best;
  for (let i = places.length - 1; i >= 0; i--) for (const [re, key] of KEYWORDS) if (re.test(places[i])) return key;
  return null;
}

export interface Placed {
  npc: Npc; spot: string; text: string;
  /** Minutes the current line ends at (next move), and where they go next. */
  until: number | null; next: string | null;
  kind: 'sched' | 'before' | 'none' | 'fixed';
}

/** Where a villager is at `time`. `forced` shows one particular schedule (e.g. a line tapped on the villager page) instead of today's. */
export function locate(n: Npc, s: Schedule | undefined, p: Profile, time: number, forced?: SchedBlock | null): Placed {
  let home = homeSpot(n, p);
  let w = whereNow(n.id, s, { ...p, time });
  if (forced) { const idx = currentEntry(forced, time); w = { pick: { block: forced, alt: null, married: false }, idx, text: idx >= 0 ? forced.e[idx][1] : '', place: null }; }
  const b = w.pick.block;
  // Leo's wiki schedules say which home they are for: valley ones talk about his treehouse, island ones about his hut.
  if (n.id === 'Leo' && b) { const f = b.e[0]?.[1] ?? ''; home = /\bhut\b|island/i.test(f) && !/treehouse/i.test(f) ? 'IslandHut' : b.e.some((e) => /treehouse/i.test(e[1])) ? 'Treehouse' : b.e.some((e) => /\bhut\b|island/i.test(e[1])) ? 'IslandHut' : home; }
  if (!b) {
    const fixed = FIXED_NPCS.includes(n.id);
    return { npc: n, spot: home, text: fixed ? 'Always around here — the wiki lists no daily schedule.' : 'No schedule listed for today, so shown at home.', until: null, next: null, kind: fixed ? 'fixed' : 'none' };
  }
  const spots: string[] = []; let cur = home;
  for (const e of b.e) { cur = spotForLine(e[1], e[2], home) ?? cur; spots.push(cur); }
  const nextOf = (i: number) => {
    for (let j = i + 1; j < b.e.length; j++) { const t = parseTime(b.e[j][0]); if (t != null && t > time) return { t, s: spots[j] }; }
    return null;
  };
  if (w.idx < 0) {
    const nx = nextOf(-1);
    return { npc: n, spot: home, text: 'At home (before their first move).', until: nx?.t ?? null, next: nx?.s ?? null, kind: 'before' };
  }
  const spot = spots[w.idx];
  const nx = nextOf(w.idx);
  return { npc: n, spot, text: w.text, until: nx?.t ?? null, next: nx?.s ?? null, kind: 'sched' };
}

export const spotOf = (k: string): Spot => SPOTS[k];

/** Link from a schedule line on a villager page to the map: that villager, that time, that schedule. */
export const schedPinHref = (id: string, time: number, block: number) => `#/maps?npc=${encodeURIComponent(id)}&t=${time}&b=${block}`;

/** Smallest zoom: the map covers the whole frame (fills its height on a phone), so zooming out never leaves an empty strip. */
export const coverScale = (boxW: number, boxH: number, w: number, h: number) => Math.max(boxW / w, boxH / h);
