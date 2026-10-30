// Turns a villager's schedule line (from whereNow / pickBlock) into a spot on one of the map tabs.
import type { Npc, Schedule } from '../types';
import type { Profile } from './state';
import { whereNow } from './where';
import { parseTime } from './schedule';
import { SPOTS, REGIONS, HOME_BY_ADDRESS, FIXED_NPCS, KEYWORDS, toImg, type Spot } from './mapdata';

export { SPOTS, REGIONS, toImg };
export const spotImg = (key: string): [number, number] => { const s = SPOTS[key]; return toImg(REGIONS[s.region], s.x, s.y); };

export function homeSpot(n: Npc, p?: Pick<Profile, 'hearts'>): string {
  if (n.id === 'Leo') return (p?.hearts?.Leo ?? 0) >= 6 ? 'Treehouse' : 'IslandHut';
  return HOME_BY_ADDRESS[n.address ?? ''] || 'Square';
}

const LEAVE_HOME = /\b(leaves?|leaving|exits?|steps? out of|comes? out of)\s+(of\s+)?(his|her|their|the)?\s*(home|house|room|bedroom|cottage|trailer|hut|tent|cabin)\b/gi;
const HOME = /\b(home|bed|bedroom|to sleep|kitchen|living room|in (his|her|their) (room|house|cottage|trailer|hut|tent|cabin|shop)|inside (his|her|their) (house|hut|cottage|trailer|cabin)|returns inside|enters (his|her) (hut|house|cottage|trailer|cabin)|(his|her) (room|bedroom))\b/i;

/** Spot for one schedule line, or null when the line names nowhere (the villager stays where they were). */
export function spotForLine(text: string, places: string[], home: string): string | null {
  const t = text.replace(LEAVE_HOME, ' ');
  if (HOME.test(t)) return home;
  let best: string | null = null; let at = -1;
  for (const [re, key] of KEYWORDS) {
    const g = new RegExp(re.source, 'gi'); let m: RegExpExecArray | null;
    while ((m = g.exec(t))) if (m.index >= at) { at = m.index; best = key; }
  }
  if (best) return best;
  for (let i = places.length - 1; i >= 0; i--) for (const [re, key] of KEYWORDS) if (re.test(places[i])) return key;
  return null;
}

export interface Placed {
  npc: Npc; spot: string; text: string;
  /** Minutes the current line ends at (next move), and where they go next. */
  until: number | null; next: string | null;
  /** Earlier spots today, oldest first (home first), without the current one. */
  trail: string[];
  kind: 'sched' | 'before' | 'none' | 'fixed';
}

export function locate(n: Npc, s: Schedule | undefined, p: Profile, time: number): Placed {
  const home = homeSpot(n, p);
  const w = whereNow(n.id, s, { ...p, time });
  const b = w.pick.block;
  if (!b) {
    const fixed = FIXED_NPCS.includes(n.id);
    return { npc: n, spot: home, text: fixed ? 'Always around here — the wiki lists no daily schedule.' : 'No schedule listed for today, so shown at home.', until: null, next: null, trail: [], kind: fixed ? 'fixed' : 'none' };
  }
  const spots: string[] = []; let cur = home;
  for (const e of b.e) { cur = spotForLine(e[1], e[2], home) ?? cur; spots.push(cur); }
  const nextOf = (i: number) => {
    for (let j = i + 1; j < b.e.length; j++) { const t = parseTime(b.e[j][0]); if (t != null && t > time) return { t, s: spots[j] }; }
    return null;
  };
  if (w.idx < 0) {
    const nx = nextOf(-1);
    return { npc: n, spot: home, text: 'At home (before their first move).', until: nx?.t ?? null, next: nx?.s ?? null, trail: [], kind: 'before' };
  }
  const spot = spots[w.idx];
  const trail: string[] = [home];
  for (let i = 0; i < w.idx; i++) if (trail[trail.length - 1] !== spots[i]) trail.push(spots[i]);
  if (trail[trail.length - 1] === spot) trail.pop();
  const nx = nextOf(w.idx);
  return { npc: n, spot, text: w.text, until: nx?.t ?? null, next: nx?.s ?? null, trail, kind: 'sched' };
}

export const spotOf = (k: string): Spot => SPOTS[k];
