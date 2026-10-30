/** v7.1 luck of the day: what the Fortune Teller show said this morning. Stored per farm, tied to one in-game day. */
import { update, type Profile } from './state';

export interface LuckLevel { v: number; label: string; short: string; quote: string }
/** The five TV readings (wiki "Luck" → Fortune Teller), best first. */
export const LUCK: LuckLevel[] = [
  { v: 2, label: 'Very happy', short: 'very happy', quote: 'The spirits are very happy today! They will do their best to shower everyone with good fortune.' },
  { v: 1, label: 'Good humor', short: 'good humor', quote: 'The spirits are in good humor today. I think you’ll have a little extra luck.' },
  { v: 0, label: 'Neutral', short: 'neutral', quote: 'The spirits feel neutral today. The day is in your hands.' },
  { v: -1, label: 'Somewhat annoyed', short: 'somewhat annoyed', quote: 'The spirits are somewhat annoyed today. Luck will not be on your side.' },
  { v: -2, label: 'Very displeased', short: 'very displeased', quote: 'The spirits are very displeased today. They will do their best to make your life difficult.' },
];
export const luckDayKey = (p: Pick<Profile, 'date'>) => `y${p.date.year}-${p.date.season}-${p.date.day}`;
/** Today's luck, or null if it isn't set for the current in-game day (a new day forgets yesterday's reading). */
export function luckToday(p: Pick<Profile, 'date' | 'luck'>): number | null {
  return p.luck && p.luck.day === luckDayKey(p) ? p.luck.v : null;
}
export const luckLevel = (v: number | null) => (v == null ? null : LUCK.find((l) => l.v === v) || null);
export function setLuck(v: number | null) {
  update((p) => { p.luck = v == null ? null : { day: luckDayKey(p), v: Math.max(-2, Math.min(2, Math.round(v))) }; });
}
