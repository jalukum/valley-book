import { describe, it, expect } from 'vitest';
import SOURCES from '../../../sprites/derived/SOURCES.json';
import { core, items } from '../data';
import { museumRewardParts, partText } from '../lib/museum';
import { heartsLabel } from '../lib/labels';
import { TOURS } from '../lib/tour';

const SRC = SOURCES as Record<string, { from: string }>;
const PUBLIC = new Set(Object.keys(import.meta.glob('../../public/sprites/**/*.png')).map((k) => k.replace('../../public/', '')));
const FONTS = Object.keys(import.meta.glob('../fonts/*.woff')).map((k) => k.replace('../fonts/', ''));
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const SCREENS = import.meta.glob('../screens/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const wikiFile = (s: string) => { expect(PUBLIC.has(s), s).toBe(true); expect(SRC[s.split('/').pop()!]?.from, s).toMatch(/^https:\/\/stardewvalleywiki\.com\/File:/); };

describe('museum rewards', () => {
  it('every reward shows a real sprite (item sprite or wiki reward art), never the fallback Museum icon', () => {
    for (const r of core.museum.rewards) {
      if (r.reward?.qid && items[r.reward.qid]) continue;
      expect(r.icon, r.id).toBeTruthy();
      wikiFile(r.icon!.s);
    }
  });
  it('the Stardrop reward reads "Donate all 95 items" with donated/95, and only completes at 95', () => {
    expect(core.museum.items.length).toBe(95);
    const all = core.museum.rewards.filter((r) => r.requires.some((q) => q.all));
    expect(all.length).toBeGreaterThan(0);
    const some = new Set(core.museum.items.slice(0, 12).map((i) => i.qid));
    const [st] = museumRewardParts(all, core.museum.items, some);
    expect(st.parts.map(partText).join()).toContain('Donate all 95 items · 12/95');
    expect(st.earned).toBe(false);
    expect(museumRewardParts(all, core.museum.items, new Set(core.museum.items.slice(1).map((i) => i.qid)))[0].earned).toBe(false);
    expect(museumRewardParts(all, core.museum.items, new Set(core.museum.items.map((i) => i.qid)))[0].earned).toBe(true);
  });
  it('no reward progress text contains a -1 / 0 sentinel', () => {
    for (const d of [new Set<string>(), new Set(core.museum.items.map((i) => i.qid))])
      for (const s of museumRewardParts(core.museum.rewards, core.museum.items, d))
        for (const x of s.parts) { expect(partText(x), s.r.id).not.toMatch(/-1|\/0\b/); expect(x.need).toBeGreaterThan(0); }
  });
});

describe('sentinels elsewhere', () => {
  it('progress denominators are positive (bundles, slayer, walnuts, orders)', () => {
    for (const s of core.slayer) expect(s.count, s.id).toBeGreaterThan(0);
    for (const w of core.walnuts) expect(w.count, w.id).toBeGreaterThan(0);
    for (const b of core.rooms.flatMap((r) => r.bundles)) expect(b.required, b.key).toBeGreaterThan(0);
  });
  it('0-heart events never print "0♥"', () => {
    expect(heartsLabel(0)).toBe('any friendship');
    expect(heartsLabel(-1)).not.toContain('-1');
    expect(heartsLabel(8)).toBe('8♥');
  });
  it('the remix "3 Battery" reward resolves to Battery Pack', () => {
    const rw = core.remix.flatMap((r) => r.slots.flatMap((s) => s.options.map((o) => o.reward))).filter(Boolean);
    expect(rw.some((r) => r!.qid === '(O)787')).toBe(true);
    expect(rw.filter((r) => !r!.qid && !r!.icon).map((r) => r!.name)).toEqual([]);
  });
  it('every Monster Slayer reward has a real sprite', () => {
    for (const s of core.slayer) if (s.reward) { if (s.reward.qid && items[s.reward.qid]) continue; expect(s.reward.icon, s.id).toBeTruthy(); wikiFile(s.reward.icon!.s); }
  });
});

describe('secret notes', () => {
  it('all 27 secret notes and 11 journal scraps are present with text or image', () => {
    const k = (kind: string) => core.notes.filter((n) => n.kind === kind).map((n) => Number(n.id) % 1000).sort((a, b) => a - b);
    const kinds = [...new Set(core.notes.map((n) => n.kind))];
    expect(kinds.length).toBe(2);
    const [a, b] = kinds.map(k).sort((x, y) => y.length - x.length);
    expect(a).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(b).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
    for (const n of core.notes) expect(n.isImg ? !!n.img : n.text.length > 0, n.kind + n.id).toBe(true);
  });
  it('every picture note has its real wiki image asset', () => {
    const pics = core.notes.filter((n) => n.isImg);
    expect(pics.length).toBeGreaterThan(0);
    for (const n of pics) wikiFile(n.img!.s);
  });
});

describe('special items & powers', () => {
  it('every power has a real item or wiki sprite, no Junimo / missing fallback', () => {
    for (const p of core.powers) {
      if (p.item && items[p.item]) continue;
      expect(p.ui, p.id).toBeTruthy();
      expect(p.ui).not.toBe('Junimo');
      const s = core.ui[p.ui!]; expect(s, p.id).toBeTruthy(); expect(PUBLIC.has(s.s), s.s).toBe(true);
    }
  });
});

describe('digits: only the 2 and 5 glyphs are overridden', () => {
  it('the override font covers exactly U+0032 and U+0035 and its files exist', () => {
    const faces = CSS.match(/@font-face\s*{[^}]*'Pixelify Sans 25'[^}]*}/g) ?? [];
    expect(faces.length).toBe(2);
    for (const f of faces) expect(f).toMatch(/unicode-range:\s*U\+0032,\s*U\+0035\s*;/);
    expect(FONTS).toEqual(expect.arrayContaining(['pixelify-25-500.woff', 'pixelify-25-700.woff']));
    expect(CSS).toMatch(/--head:\s*'Pixelify Sans 25',\s*'Pixelify Sans'/);
  });
});

describe('navigation: no duplicate Goals hub', () => {
  const all = Object.values(SCREENS).join('\n');
  const hubs = Object.entries(SCREENS).find(([k]) => k.endsWith('/Progress.tsx'))![1]; // MoreHub + ProgressHub
  it('nothing links to the old #/goals hub', () => expect(all).not.toMatch(/href[:=]\s*['"{]?#\/goals/));
  it.each(['perfection', 'walnuts', 'island', 'orders', 'slayer', 'achievements', 'notes', 'powers'])('#/%s is listed by exactly one hub', (r) => {
    expect(hubs.match(new RegExp(`href: '#/${r}'`, 'g'))?.length ?? 0).toBe(1);
  });
  it('goal pages fall back to their own hub, not #/goals', () => expect(all).not.toContain('back="#/goals"'));
});
describe('tutorial', () => {
  it('never mentions a Goals page; the Progress tour calls the trackers checklists (v7.2)', () => {
    const txt = JSON.stringify(TOURS);
    expect(txt).not.toMatch(/\bGoals\b/);
    expect(TOURS.progress.find((s) => s.target === 'trackers')!.body).toMatch(/Checklists/);
  });
});
