// Picks the schedule block that applies on a given in-game day, and the entry for a given time.
// Blocks are in the wiki's priority order; the first block whose conditions match wins.
import type { SchedBlock, Schedule } from '../types';

export interface WorldCtx {
  season: string; // 'Spring' ...
  day: number; // 1..28
  year: number;
  weather: 'sun' | 'rain' | 'green';
  busRepaired: boolean;
  ccRestored: boolean;
  bridgeRepaired: boolean;
  hearts: Record<string, number>; // npc id -> hearts
  spouse: string | null;
}
const WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekdayOf = (day: number) => WD[(day - 1) % 7];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

/** Day numbers mentioned in a condition such as "Spring 15, 16 and 17 (Bus Service Restored)". */
export function datesIn(cond: string): number[] {
  const head = cond.replace(/\(.*?\)/g, '');
  return (head.match(/\b\d{1,2}\b/g) || []).map(Number).filter((n) => n >= 1 && n <= 28);
}

/** Returns true / false, or null when the requirement can't be known (treated as not matching). */
export function requirementMet(req: string, ctx: WorldCtx): boolean {
  const r = req.trim();
  if (r === 'Year 1') return ctx.year === 1;
  if (r === 'Bus Service Restored') return ctx.busRepaired;
  if (r === 'No Bus Service') return !ctx.busRepaired;
  if (r === 'Community Center Restored') return ctx.ccRestored;
  if (r === 'Community Center Not Restored') return !ctx.ccRestored;
  if (r === 'Beach Bridge Repaired') return ctx.bridgeRepaired;
  if (r === 'All Seasons') return true;
  if (r === 'Option 1') return true; // random pick in game; Option 2 is offered as an alternative
  if (r === 'Option 2' || r === 'As Vendor') return false;
  if (r === 'Railroad Accessible') return !(ctx.year === 1 && (SEASONS.indexOf(ctx.season) === 0 || (ctx.season === 'Summer' && ctx.day < 3)));
  let m = /^No player has 6 hearts with (.+)$/.exec(r);
  if (m) return names(m[1]).every((n) => (ctx.hearts[n] ?? 0) < 6);
  m = /^Any player has at least 6 hearts with (.+)$/.exec(r);
  if (m) return names(m[1]).some((n) => (ctx.hearts[n] ?? 0) >= 6);
  return false; // e.g. "Alex's 14 heart event seen": unknown, assume not
}
const names = (s: string) => s.split(/\s*(?:,|\bor\b|\band\b)\s*/).map((x) => x.trim()).filter(Boolean);

export function blockMatches(b: SchedBlock, ctx: WorldCtx): boolean {
  const t = b.tags || {};
  if (b.sub && SEASONS.includes(b.sub) && b.sub !== ctx.season) return false;
  if (t.seasons && t.seasons.length && !t.seasons.includes(ctx.season)) return false;
  if (t.dates) { const d = datesIn(b.cond); if (d.length && !d.includes(ctx.day)) return false; }
  const wdOk = !t.weekdays?.length || t.weekdays.includes(weekdayOf(ctx.day));
  let weatherOk = true;
  if (t.weather === 'green rain') weatherOk = ctx.weather === 'green';
  else if (t.weather === 'rain') weatherOk = ctx.weather !== 'sun';
  if (t.weekdays?.length >= 2 && t.weather) { if (!(wdOk || weatherOk)) return false; } // "Friday, Saturday and Rain"
  else if (!wdOk || !weatherOk) return false;
  if (t.requirement && !requirementMet(t.requirement, ctx)) return false;
  return true;
}

export interface DayPick { block: SchedBlock | null; alt: SchedBlock | null; married: boolean }
export function pickBlock(npcId: string, s: Schedule | undefined, ctx: WorldCtx): DayPick {
  if (!s || !s.blocks.length) return { block: null, alt: null, married: false };
  const married = ctx.spouse === npcId;
  const pool = married ? s.blocks.filter((b) => b.sub === 'Marriage' || b.tags?.marriage) : s.blocks.filter((b) => b.sub !== 'Marriage' && !b.tags?.marriage);
  const i = pool.findIndex((b) => blockMatches(b, ctx));
  const block = i >= 0 ? pool[i] : null;
  let alt: SchedBlock | null = null;
  if (block?.tags?.requirement === 'Option 1') alt = pool.slice(i + 1).find((b) => b.tags?.requirement === 'Option 2' && b.cond.replace('Option 2', '') === block.cond.replace('Option 1', '')) || null;
  return { block, alt, married };
}

/** "9:00 AM" -> 540; times between midnight and 6 AM count as the next day (+24h). "All day" -> 360. */
export function parseTime(s: string): number | null {
  if (/all day/i.test(s)) return 360;
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(s.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12; if (m[3].toUpperCase() === 'PM') h += 12;
  let mins = h * 60 + Number(m[2]);
  if (mins < 360) mins += 1440;
  return mins;
}
export function fmtTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440; const h = Math.floor(m / 60); const mm = m % 60;
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Index of the entry in effect at `now` (minutes, 360..1560), or -1 if the day's first move hasn't happened yet. */
export function currentEntry(b: SchedBlock, now: number): number {
  let idx = -1;
  b.e.forEach((e, i) => { const t = parseTime(e[0]); if (t != null && t <= now) idx = i; });
  return idx;
}
