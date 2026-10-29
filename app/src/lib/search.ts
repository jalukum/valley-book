import { core, items } from '../data';
export interface Hit { kind: 'Villager' | 'Item' | 'Fish' | 'Bundle' | 'Cooking' | 'Crafting'; title: string; sub: string; href: string; qid?: string; npc?: string; score: number }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, "'");
interface Entry { kind: Hit['kind']; title: string; sub: string; href: string; qid?: string; npc?: string; key: string }
let index: Entry[] | null = null;
function build(): Entry[] {
  const out: Entry[] = [];
  const fishQ = new Set(core.fish.map((f) => f.qid));
  for (const n of core.npcs) out.push({ kind: 'Villager', title: n.name, sub: n.birthday ? `Birthday ${n.birthday.season} ${n.birthday.day}` : 'Villager', href: `#/villager/${encodeURIComponent(n.id)}`, npc: n.id, key: norm(n.name) });
  for (const [qid, it] of Object.entries(items)) out.push({ kind: fishQ.has(qid) ? 'Fish' : 'Item', title: it.n, sub: it.c || (it.k === 'bc' ? 'Craftable' : 'Item'), href: `#/item/${encodeURIComponent(qid)}`, qid, key: norm(it.n) });
  core.rooms.forEach((r, i) => r.bundles.forEach((b) => out.push({ kind: 'Bundle', title: `${b.name}${/Bundle|g$/.test(b.name) ? '' : ' Bundle'}`, sub: r.name, href: `#/bundles/room/${i}?b=${encodeURIComponent(b.name)}`, key: norm(b.name + ' bundle') })));
  core.remix.forEach((r) => { const i = core.rooms.findIndex((x) => x.name === r.room); r.slots.forEach((s) => s.options.forEach((o) => { if (!out.some((e) => e.kind === 'Bundle' && e.key === norm(o.name + ' bundle'))) out.push({ kind: 'Bundle', title: `${o.name} Bundle`, sub: `${r.room} · Remixed`, href: `#/bundles/room/${i}?b=${encodeURIComponent(o.name)}&remix`, key: norm(o.name + ' bundle') }); })); });
  for (const r of core.recipes.cooking) out.push({ kind: 'Cooking', title: r.name, sub: 'Cooking recipe', href: r.out ? `#/item/${encodeURIComponent(r.out)}` : '#/cooking', qid: r.out || undefined, key: norm(r.name) });
  for (const r of core.recipes.crafting) out.push({ kind: 'Crafting', title: r.name, sub: 'Crafting recipe', href: r.out ? `#/item/${encodeURIComponent(r.out)}` : '#/crafting', qid: r.out || undefined, key: norm(r.name) });
  return out;
}
export function search(q: string, limit = 80): Hit[] {
  const n = norm(q.trim());
  if (!n) return [];
  index ??= build();
  const words = n.split(/\s+/);
  const hits: Hit[] = [];
  for (const e of index) {
    if (!words.every((w) => e.key.includes(w))) continue;
    let score = e.key === n ? 0 : e.key.startsWith(n) ? 1 : e.key.split(/[\s(]/).some((w) => w.startsWith(words[0])) ? 2 : 3;
    if (e.kind === 'Villager') score -= 0.5;
    hits.push({ ...e, score });
  }
  return hits.sort((a, b) => a.score - b.score || a.title.length - b.title.length || a.title.localeCompare(b.title)).slice(0, limit);
}
