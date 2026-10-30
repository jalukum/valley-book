/** v7.1 stars: pin items, fish, villagers and bundles per farm. Keys: 'item:<qid>' | 'villager:<id>' | 'bundle:<id>'. */
import { core, items, npcById, fishByQid } from '../data';
import { update, type Profile } from './state';
import { activeBundles, checkedCount, type ActiveBundle } from './progress';
import { fishSeasons, seasonsText, fishTimeText } from './fish';
import type { Spr } from '../types';

export const starKey = {
  item: (qid: string) => 'item:' + qid,
  villager: (id: string) => 'villager:' + id,
  bundle: (id: string) => 'bundle:' + id,
};
export const isStarred = (p: Pick<Profile, 'stars'>, key: string) => (p.stars || []).includes(key);
/** Newest star first. */
export function toggleStar(key: string) {
  update((p) => {
    const s = p.stars || [];
    p.stars = s.includes(key) ? s.filter((k) => k !== key) : [key, ...s];
  });
}

export type StarGroup = 'Fish' | 'Items' | 'Villagers' | 'Bundles';
export const STAR_GROUPS: StarGroup[] = ['Fish', 'Items', 'Villagers', 'Bundles'];
export interface StarEntry { key: string; group: StarGroup; name: string; sub: string; href: string; qid?: string; spr?: Spr | null }

function allBundles(p: Profile): ActiveBundle[] {
  const other = { ...p, cc: { ...p.cc, mode: p.cc.mode === 'remix' ? 'standard' : 'remix' } } as Profile;
  const seen = new Set<string>();
  return [...activeBundles(core, p), ...activeBundles(core, other)].filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
}
const SEASON_NAME: Record<string, string> = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };

export function starEntry(p: Profile, key: string, bundles = allBundles(p)): StarEntry | null {
  const i = key.indexOf(':');
  const kind = key.slice(0, i), id = key.slice(i + 1);
  if (kind === 'item') {
    const it = items[id];
    if (!it) return null;
    const f = fishByQid[id];
    if (f) return { key, group: 'Fish', name: it.n, sub: `${seasonsText(fishSeasons(f))} · ${fishTimeText(f)}`, href: '#/item/' + encodeURIComponent(id), qid: id };
    return { key, group: 'Items', name: it.n, sub: it.c || 'Item', href: '#/item/' + encodeURIComponent(id), qid: id };
  }
  if (kind === 'villager') {
    const n = npcById[id];
    if (!n) return null;
    const bd = n.birthday ? `Birthday ${SEASON_NAME[n.birthday.season.toLowerCase()] || n.birthday.season} ${n.birthday.day}` : 'Villager';
    const h = p.hearts[id];
    return { key, group: 'Villagers', name: n.name, sub: h != null ? `${bd} · ${h}♥` : bd, href: '#/villager/' + encodeURIComponent(id), spr: n.icon || n.portrait };
  }
  if (kind === 'bundle') {
    const b = bundles.find((x) => x.id === id);
    if (!b) return null;
    const room = core.rooms.findIndex((r) => r.name === b.room);
    const c = Math.min(checkedCount(p, b), b.required);
    return { key, group: 'Bundles', name: b.name, sub: `${b.room} · ${c} of ${b.required}`, href: `#/bundles/room/${Math.max(0, room)}?b=${encodeURIComponent(b.name)}`, spr: b.colorIcon || b.icon };
  }
  return null;
}

/** Starred things for this farm, grouped Fish / Items / Villagers / Bundles (newest first in each group). */
export function starredGroups(p: Profile): { group: StarGroup; list: StarEntry[] }[] {
  const bundles = allBundles(p);
  const all = (p.stars || []).map((k) => starEntry(p, k, bundles)).filter((x): x is StarEntry => !!x);
  return STAR_GROUPS.map((group) => ({ group, list: all.filter((e) => e.group === group) })).filter((g) => g.list.length);
}
export const starCount = (p: Profile) => starredGroups(p).reduce((n, g) => n + g.list.length, 0);
