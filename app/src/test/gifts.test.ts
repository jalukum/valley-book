import { describe, it, expect } from 'vitest';
import gifts from '../generated/gifts.json';
import { items, core } from '../data';
import { groupTastes, whoLikes } from '../lib/gifts';
import type { GiftData } from '../types';

const all = gifts as unknown as Record<string, GiftData>;
const nameOf = (q: string) => items[q]?.n;

describe('gift taste display', () => {
  it('has gift data for every villager', () => {
    for (const n of core.npcs) expect(all[n.id], n.id).toBeTruthy();
  });
  it('splits personal and universal, sorted, no duplicates, known items only', () => {
    const g: GiftData = { tiers: { love: [['(O)72', 0], ['(O)74', 1], ['(O)72', 0], ['(O)zzz', 0], ['(O)24', 0]], like: [], neutral: [], dislike: [], hate: [] } } as any;
    const [love] = groupTastes(g, nameOf);
    expect(love.personal.map((r) => r.qid)).toEqual(['(O)72', '(O)24'].sort((a, b) => nameOf(a)!.localeCompare(nameOf(b)!)));
    expect(love.universal.map((r) => r.qid)).toEqual(['(O)74']);
    expect(love.total).toBe(3);
  });
  it("Abigail loves Amethyst and Pufferfish personally; Prismatic Shard universally", () => {
    const groups = groupTastes(all.Abigail, nameOf);
    const love = groups.find((t) => t.tier === 'love')!;
    const personal = love.personal.map((r) => nameOf(r.qid));
    expect(personal).toContain('Amethyst');
    expect(personal).toContain('Pufferfish');
    expect(love.universal.map((r) => nameOf(r.qid))).toContain('Prismatic Shard');
  });
  it('Haley hates Prismatic Shard (overrides the universal love)', () => {
    const hate = groupTastes(all.Haley, nameOf).find((t) => t.tier === 'hate')!;
    expect(hate.personal.map((r) => nameOf(r.qid))).toContain('Prismatic Shard');
    const love = groupTastes(all.Haley, nameOf).find((t) => t.tier === 'love')!;
    expect([...love.personal, ...love.universal].map((r) => nameOf(r.qid))).not.toContain('Prismatic Shard');
  });
  it('each item lands in exactly one tier per NPC', () => {
    for (const [npc, g] of Object.entries(all)) {
      const seen = new Set<string>();
      for (const t of groupTastes(g, nameOf)) for (const r of [...t.personal, ...t.universal]) { expect(seen.has(r.qid), `${npc} ${r.qid}`).toBe(false); seen.add(r.qid); }
    }
  });
  it('whoLikes inverts the tables', () => {
    const w = whoLikes(all, '(O)74');
    expect(w.love.length).toBeGreaterThan(25);
    expect(w.hate.map((x) => x.npc)).toContain('Haley');
  });
});
