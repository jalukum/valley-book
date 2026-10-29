import { items, fishByQid, core } from '../data';
import { fishSeasons } from './fish';
const ship = Object.fromEntries(core.shipping.map((s) => [s.qid, s.seasons]));
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** Seasons an item is obtainable in, or null when it isn't seasonal. */
export function itemSeasons(qid: string | null | undefined): string[] | null {
  if (!qid) return null;
  const f = fishByQid[qid];
  if (f) { const s = fishSeasons(f); return s.length >= 4 ? null : s; }
  const sh = ship[qid];
  if (sh && sh.length && sh.length < 4) return sh.map(cap);
  const t = items[qid]?.t;
  if (t && t.length && t.length < 4) return t.map(cap);
  return null;
}
