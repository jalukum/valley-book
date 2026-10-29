import type { MuseumItem, MuseumReward } from '../types';

export interface RewardPart { label: string; have: number; need: number; all?: boolean }
/** Progress toward each museum reward. The game's Count -1 ("every donatable item") arrives from prepare-data already
 *  resolved to the real total with `all: true`; a non-positive count is never shown as-is (treated as "all items"). */
export function museumRewardParts(rewards: MuseumReward[], items: MuseumItem[], donated: Set<string>) {
  const arts = items.filter((i) => i.kind === 'Artifact' && donated.has(i.qid)).length;
  const mins = items.filter((i) => i.kind === 'Mineral' && donated.has(i.qid)).length;
  const total = items.length, have = items.filter((i) => donated.has(i.qid)).length;
  return rewards.map((r) => {
    const parts: RewardPart[] = r.requires.map((q) => {
      if (q.qid) return { label: q.name, have: donated.has(q.qid) ? 1 : 0, need: 1 };
      const all = q.all || q.count <= 0;
      if (q.tag === 'item_type_arch') { const n = items.filter((i) => i.kind === 'Artifact').length; return { label: 'Artifacts', have: arts, need: all ? n : q.count, all }; }
      if (q.tag === 'item_type_minerals') { const n = items.filter((i) => i.kind === 'Mineral').length; return { label: 'Minerals', have: mins, need: all ? n : q.count, all }; }
      return { label: 'Donations', have, need: all ? total : q.count, all };
    });
    return { r, parts, earned: parts.every((x) => x.have >= x.need) };
  });
}
/** "Donations 12/40" · "Donate all 95 items 12/95" · "Rare Disc ✓". Never prints a sentinel count. */
export function partText(x: RewardPart) {
  const n = `${Math.min(x.have, x.need)}/${x.need}`;
  if (x.all) return `Donate all ${x.need} ${x.label === 'Donations' ? 'items' : x.label.toLowerCase()} · ${n}`;
  return `${x.label} ${n}`;
}
