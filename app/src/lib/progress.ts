// Pure progress math (Community Center, Joja, collections, perfection). Unit-tested in progress.test.ts.
import type { Core, BItem, Reward, Spr, Bundle } from '../types';
import type { Profile } from './state';

export interface ActiveBundle {
  id: string; // key into profile.cc.checked
  room: string;
  name: string;
  color: string;
  items: BItem[];
  required: number;
  reward: Reward | null;
  icon: Spr | null;
  colorIcon: Spr | null;
  remix: boolean;
}
export const CC_ROOMS = ['Crafts Room', 'Pantry', 'Fish Tank', 'Boiler Room', 'Bulletin Board', 'Vault'];

const fromStd = (room: string, b: Bundle): ActiveBundle => ({ id: 'std:' + b.key, room, name: b.name, color: b.color, items: b.items, required: b.required || b.items.length, reward: b.reward, icon: b.icon, colorIcon: b.colorIcon, remix: false });

/** Which remix options are chosen in each slot of a room (defaults: first option / first N options). */
export function remixChoice(core: Core, p: Profile, room: string): number[] {
  const r = core.remix.find((x) => x.room === room);
  if (!r) return [];
  const saved = p.cc.remix[room];
  if (r.slots.length === 1 && r.slots[0].index === -1) {
    const n = r.count; const opts = r.slots[0].options.length;
    const valid = (saved || []).filter((i, k, a) => i >= 0 && i < opts && a.indexOf(i) === k).slice(0, n);
    for (let i = 0; valid.length < n && i < opts; i++) if (!valid.includes(i)) valid.push(i);
    return valid.sort((a, b) => a - b);
  }
  return r.slots.map((s, i) => { const v = saved?.[i] ?? 0; return v >= 0 && v < s.options.length ? v : 0; });
}

/** The bundles in play for the profile's CC mode (6 CC rooms + the Abandoned Joja Mart's "The Missing"). */
export function activeBundles(core: Core, p: Profile): ActiveBundle[] {
  const out: ActiveBundle[] = [];
  for (const room of core.rooms) {
    const r = p.cc.mode === 'remix' ? core.remix.find((x) => x.room === room.name) : undefined;
    if (!r) { room.bundles.forEach((b) => out.push(fromStd(room.name, b))); continue; }
    const choice = remixChoice(core, p, room.name);
    const opts = r.slots.length === 1 && r.slots[0].index === -1 ? choice.map((i) => r.slots[0].options[i]) : r.slots.map((s, i) => s.options[choice[i]]);
    for (const o of opts) out.push({ id: `rmx:${room.name}:${o.name}`, room: room.name, name: o.name, color: o.color, items: o.items, required: o.required ?? o.pick ?? o.items.length, reward: o.reward, icon: o.icon, colorIcon: o.colorIcon, remix: true });
  }
  return out;
}

/** Tick/untick item `i` of bundle `id` in the save. The ONE place bundle ticks live (Bundles pages and the Cart list share it). */
export function flipBundleItem(p: Profile, id: string, i: number) {
  const cur = new Set(p.cc.checked[id] || []);
  if (cur.has(i)) cur.delete(i); else cur.add(i);
  p.cc.checked[id] = [...cur].sort((x, y) => x - y);
}
export const checkedCount = (p: Profile, b: ActiveBundle) => (p.cc.checked[b.id] || []).filter((i) => i >= 0 && i < b.items.length).length;
export const bundleDone = (p: Profile, b: ActiveBundle) => checkedCount(p, b) >= b.required;

export interface CCProgress { percent: number; bundlesDone: number; bundles: number; roomsDone: string[]; rooms: number; complete: boolean }
/** CC % = average over the 6 CC rooms' bundles of min(deposited, required) / required. */
export function ccProgress(core: Core, p: Profile): CCProgress {
  const list = activeBundles(core, p).filter((b) => CC_ROOMS.includes(b.room));
  let sum = 0, done = 0;
  for (const b of list) { const c = Math.min(checkedCount(p, b), b.required); sum += c / b.required; if (c >= b.required) done++; }
  const roomsDone = CC_ROOMS.filter((r) => { const bs = list.filter((b) => b.room === r); return bs.length > 0 && bs.every((b) => bundleDone(p, b)); });
  return { percent: list.length ? (sum / list.length) * 100 : 0, bundlesDone: done, bundles: list.length, roomsDone, rooms: CC_ROOMS.length, complete: roomsDone.length === CC_ROOMS.length };
}

export const JOJA_KEYS = ['membership', 'Crafts Room', 'Pantry', 'Fish Tank', 'Boiler Room', 'Vault'];
export function jojaProgress(core: Core, p: Profile) {
  const bought = JOJA_KEYS.filter((k) => p.cc.joja[k]);
  const spent = (p.cc.joja.membership ? core.joja.membership : 0) + core.joja.developments.filter((d) => p.cc.joja[d.room]).reduce((a, d) => a + d.cost, 0);
  return { bought: bought.length, total: JOJA_KEYS.length, spent, cost: core.joja.total, complete: bought.length === JOJA_KEYS.length };
}

/** World flags: explicit setting wins, otherwise derived from CC/Joja progress. */
export function worldFlags(core: Core, p: Profile) {
  const cc = ccProgress(core, p);
  const j = p.cc.joja;
  const autoCC = p.cc.route === 'joja' ? jojaProgress(core, p).complete : cc.complete;
  const autoBus = p.cc.route === 'joja' ? !!j.Vault : cc.roomsDone.includes('Vault');
  return {
    ccRestored: p.flags.cc === 'auto' ? autoCC : p.flags.cc === 'yes',
    busRepaired: p.flags.bus === 'auto' ? autoBus : p.flags.bus === 'yes',
    bridgeRepaired: p.flags.bridge,
  };
}

// ---------- collections ----------
export const doneCount = (p: Profile, col: string, ids: string[]) => { const m = p.done[col] || {}; return ids.reduce((a, id) => a + ((m[id] ?? 0) > 0 ? 1 : 0), 0); };
export function walnutsFound(core: Core, p: Profile) {
  const m = p.done.walnuts || {};
  return core.walnuts.reduce((a, w) => a + Math.min(w.count, m[w.id] ?? 0), 0);
}
export const walnutTotal = (core: Core) => core.walnuts.reduce((a, w) => a + w.count, 0);
export const heartsTarget = (romanceable: boolean) => (romanceable ? 8 : 10);
export const farmerLevel = (p: Profile, skills: string[]) => Math.min(25, Math.floor(skills.reduce((a, s) => a + Math.min(10, p.perf.skills[s] ?? 0), 0) / 2));

export interface PerfRow { id: string; name: string; weight: number; have: number; total: number; points: number; auto: boolean; route: string }
/** Perfection: each category contributes weight * min(1, have/total); +1% per waiver; floored, max 100. */
export function perfection(core: Core, p: Profile): { rows: PerfRow[]; percent: number; exact: number } {
  const P = core.perfection;
  const w = (name: string) => P.categories.find((c: any) => c.name.toLowerCase().startsWith(name.toLowerCase()))?.weightPercent ?? 0;
  const t = (name: string) => P.categories.find((c: any) => c.name.toLowerCase().startsWith(name.toLowerCase()))?.total ?? 0;
  const shipIds = core.shipping.map((s) => s.qid);
  const fishIds = core.fish.filter((f) => f.collection).map((f) => f.qid);
  const cookIds = core.recipes.cooking.filter((r) => r.perfection).map((r) => r.id);
  const craftIds = core.recipes.crafting.filter((r) => r.perfection).map((r) => r.id);
  const friends = core.npcs.filter((n) => n.perfection && (p.hearts[n.id] ?? 0) >= heartsTarget(n.romanceable)).length;
  const rows: Omit<PerfRow, 'points'>[] = [
    { id: 'shipping', name: 'Produce & Forage Shipped', weight: w('Produce'), have: doneCount(p, 'shipping', shipIds), total: t('Produce') || shipIds.length, auto: true, route: '#/shipping' },
    { id: 'obelisks', name: 'Obelisks on Farm', weight: w('Obelisks'), have: (P.obelisks as string[]).filter((o) => p.perf.obelisks[o]).length, total: 4, auto: false, route: '' },
    { id: 'clock', name: 'Golden Clock on Farm', weight: w('Golden Clock'), have: p.perf.goldClock ? 1 : 0, total: 1, auto: false, route: '' },
    { id: 'slayer', name: 'Monster Slayer Hero', weight: w('Monster Slayer'), have: doneCount(p, 'slayer', core.slayer.map((s) => s.id)), total: core.slayer.length, auto: true, route: '#/slayer' },
    { id: 'friends', name: 'Great Friends', weight: w('Great Friends'), have: friends, total: core.npcs.filter((n) => n.perfection).length, auto: true, route: '#/villagers' },
    { id: 'level', name: 'Farmer Level', weight: w('Farmer Level'), have: farmerLevel(p, P.skills), total: 25, auto: false, route: '' },
    { id: 'stardrops', name: 'Found All Stardrops', weight: w('Found All Stardrops'), have: (P.stardrops as any[]).filter((s) => p.perf.stardrops[s.id]).length, total: P.stardrops.length, auto: false, route: '' },
    { id: 'cooking', name: 'Cooking Recipes Made', weight: w('Cooking'), have: doneCount(p, 'cooking', cookIds), total: cookIds.length, auto: true, route: '#/cooking' },
    { id: 'crafting', name: 'Crafting Recipes Made', weight: w('Crafting'), have: doneCount(p, 'crafting', craftIds), total: craftIds.length, auto: true, route: '#/crafting' },
    { id: 'fish', name: 'Fish Caught', weight: w('Fish'), have: doneCount(p, 'fish', fishIds), total: fishIds.length, auto: true, route: '#/fish' },
    { id: 'walnuts', name: 'Golden Walnuts Found', weight: w('Golden Walnuts'), have: walnutsFound(core, p), total: walnutTotal(core), auto: true, route: '#/walnuts' },
  ];
  const full = rows.map((r) => ({ ...r, points: r.total ? (r.weight * Math.min(1, r.have / r.total)) : 0 }));
  const exact = Math.min(100, full.reduce((a, r) => a + r.points, 0) + Math.max(0, p.perf.waivers) * (P.waiver?.percent ?? 1));
  return { rows: full, percent: Math.floor(exact + 1e-9), exact };
}
