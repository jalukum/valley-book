import { describe, it, expect } from 'vitest';
import { npcById } from '../data';
import { REL_PAIRS, relationsOf } from '../lib/relations';

const SCREENS = import.meta.glob('../screens/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const SW = Object.values(import.meta.glob('../../scripts/build-sw.mjs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const has = (a: string, b: string, re?: RegExp) => {
  const r = relationsOf(a).find((x) => x.who === b);
  expect(r, `${a} -> ${b}`).toBeTruthy();
  if (re) expect(r!.rel, `${a} -> ${b} label`).toMatch(re);
};

describe('v6.7 villager relationships', () => {
  it('named pairs show up on both villagers', () => {
    has('Lewis', 'Marnie', /romance/); has('Marnie', 'Lewis', /romance/);
    has('Jas', 'Vincent', /friend/); has('Vincent', 'Jas', /friend/);
    has('Jas', 'Marnie', /aunt/); has('Marnie', 'Jas', /niece/);
    has('Jas', 'Shane', /godfather/); has('Shane', 'Jas', /goddaughter/);
    has('Sebastian', 'Demetrius', /step-father/); has('Demetrius', 'Sebastian', /step-son/);
    has('Sam', 'Sebastian'); has('Sebastian', 'Sam'); has('Abigail', 'Sam'); has('Abigail', 'Sebastian');
    has('Gus', 'Emily'); has('Emily', 'Gus'); has('Clint', 'Emily'); has('Emily', 'Clint');
    has('Harvey', 'Maru'); has('Maru', 'Harvey'); has('Leah', 'Elliott'); has('Elliott', 'Willy'); has('Willy', 'Elliott');
    has('Leo', 'Linus'); has('Linus', 'Leo'); has('Sandy', 'Emily'); has('Haley', 'Alex'); has('Caroline', 'Jodi');
  });
  it('every link is symmetric, between real villagers, with no blank labels or duplicates', () => {
    const seen = new Set<string>();
    for (const p of REL_PAIRS) {
      expect(npcById[p.a], p.a).toBeTruthy(); expect(npcById[p.b], p.b).toBeTruthy();
      expect(p.a).not.toBe(p.b);
      expect(p.aSees.trim() && p.bSees.trim(), `${p.a}/${p.b}`).toBeTruthy();
      const k = [p.a, p.b].sort().join('|'); expect(seen.has(k), 'dup ' + k).toBe(false); seen.add(k);
    }
    for (const id of Object.keys(npcById)) for (const r of relationsOf(id)) {
      expect(relationsOf(r.who).some((x) => x.who === id), `${r.who} should list ${id}`).toBe(true);
    }
  });
  it('the villager page renders relations with sprite heads and villager links', () => {
    const v = SCREENS['../screens/Villager.tsx'];
    expect(v).toContain('relationsOf(n.id)');
    expect(v).toMatch(/<Sprite spr=\{o\.icon\}/);
    expect(v).toContain('#/villager/${encodeURIComponent(r.who)}');
    expect(v).not.toContain('n.family');
  });
});

describe('v6.7 wooden top banner', () => {
  const rule = (sel: string) => { const m = CSS.match(new RegExp('(^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); return m ? m[2] : ''; };
  it('the top bar is a wood sign, not the flat grass gradient', () => {
    const tb = rule('.topbar');
    expect(tb).toBeTruthy();
    expect(tb).not.toMatch(/--grass|--leaf|#3f8f34|#2a6c24/);
    expect(tb).toMatch(/repeating-linear-gradient/);
    expect(tb).toMatch(/--wood-d/);
    expect(rule('.tb-title')).toMatch(/--paper/);
    expect(rule('.tb-title h1')).toMatch(/text-shadow/);
    expect(rule('.back')).not.toMatch(/--grass/);
  });
  it('the farm selector keeps its green', () => {
    expect(CSS).toMatch(/\.farm-pill \{ background: linear-gradient\(#3f8f34, #2a6c24\); \}/);
  });
  it('service worker cache is v67', () => { expect(SW).toContain("valleybook-v67-"); });
});
