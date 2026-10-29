import { core, SEASONS } from '../data';
import { isRaining, type Profile } from './state';
import { worldFlags } from './progress';
import { pickBlock, currentEntry, type WorldCtx, type DayPick } from './schedule';
import type { Schedule } from '../types';

export function ctxOf(p: Profile): WorldCtx {
  const f = worldFlags(core, p);
  return { season: SEASONS[p.date.season], day: p.date.day, year: p.date.year, weather: p.weather === 'green' ? 'green' : isRaining(p.weather) ? 'rain' : 'sun', busRepaired: f.busRepaired, ccRestored: f.ccRestored, bridgeRepaired: f.bridgeRepaired, hearts: p.hearts, spouse: p.spouse };
}
export interface Where { pick: DayPick; idx: number; text: string; place: string | null }
/** Where an NPC is at the profile's time: the schedule entry in effect, and the most recent named place. */
export function whereNow(npc: string, s: Schedule | undefined, p: Profile): Where {
  const pick = pickBlock(npc, s, ctxOf(p));
  if (!pick.block) return { pick, idx: -1, text: '', place: null };
  const idx = currentEntry(pick.block, p.time);
  if (idx < 0) return { pick, idx, text: 'At home (before their first move)', place: null };
  let place: string | null = null;
  for (let i = idx; i >= 0 && !place; i--) { const l = pick.block.e[i][2]; if (l.length) place = l[l.length - 1]; }
  return { pick, idx, text: pick.block.e[idx][1], place };
}
