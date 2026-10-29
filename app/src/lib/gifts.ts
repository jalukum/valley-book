// Gift-taste display helpers. Unit-tested in gifts.test.ts.
import type { GiftData, Tier } from '../types';
export const TIERS: Tier[] = ['love', 'like', 'neutral', 'dislike', 'hate'];
export const TIER_LABEL: Record<Tier, string> = { love: 'Loves', like: 'Likes', neutral: 'Neutral', dislike: 'Dislikes', hate: 'Hates' };
export interface GiftRow { qid: string; universal: boolean }
export interface TierGroup { tier: Tier; personal: GiftRow[]; universal: GiftRow[]; total: number }

/** Splits one NPC's tier lists into personal vs universal tastes, each sorted by item name. Unknown items are dropped. */
export function groupTastes(g: GiftData, nameOf: (qid: string) => string | undefined): TierGroup[] {
  return TIERS.map((tier) => {
    const seen = new Set<string>();
    const rows: GiftRow[] = [];
    for (const [qid, u] of g.tiers[tier] || []) { if (seen.has(qid) || !nameOf(qid)) continue; seen.add(qid); rows.push({ qid, universal: u === 1 }); }
    const by = (a: GiftRow, b: GiftRow) => (nameOf(a.qid) || '').localeCompare(nameOf(b.qid) || '');
    const personal = rows.filter((r) => !r.universal).sort(by);
    const universal = rows.filter((r) => r.universal).sort(by);
    return { tier, personal, universal, total: rows.length };
  });
}

/** Inverse index: for one item, which NPCs have it in each tier. */
export function whoLikes(all: Record<string, GiftData>, qid: string): Record<Tier, { npc: string; universal: boolean }[]> {
  const out = { love: [], like: [], neutral: [], dislike: [], hate: [] } as Record<Tier, { npc: string; universal: boolean }[]>;
  for (const [npc, g] of Object.entries(all)) for (const tier of TIERS) { const hit = (g.tiers[tier] || []).find((r) => r[0] === qid); if (hit) { out[tier].push({ npc, universal: hit[1] === 1 }); break; } }
  return out;
}
