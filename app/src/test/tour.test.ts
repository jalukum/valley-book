import { describe, it, expect } from 'vitest';
import { TOUR } from '../lib/tour';

describe('tutorial (v4)', () => {
  it('starts with one welcome step on the entry screen that opens the Day guide', () => {
    const entry = TOUR.filter((s) => s.route === '');
    expect(entry).toHaveLength(1);
    expect(TOUR[0]).toMatchObject({ route: '', target: 'bubble-today', tap: 'today' });
    expect(TOUR[0].title).toMatch(/Day guide/);
  });
  it('then teaches every Day guide tile, in tile order', () => {
    const tiles = TOUR.filter((s) => s.target.startsWith('tile-')).map((s) => s.target.slice(5));
    expect(tiles).toEqual(['fish', 'forage', 'crops', 'bundles', 'gifts', 'quests', 'events', 'starred', 'cart', 'orders']);
    expect(TOUR.slice(1).every((s) => s.route === 'today')).toBe(true);
  });
  it('tiles that are not always shown fall back to the grid with a “when it appears” note', () => {
    for (const k of ['tile-cart', 'tile-orders']) {
      const s = TOUR.find((t) => t.target === k)!;
      expect(s.alt).toBe('tiles');
      expect(s.altBody).toMatch(/appears/);
    }
  });
  it('the old weather-tab step is gone', () => {
    expect(TOUR.some((s) => s.target === 'wx')).toBe(false);
  });
});

import { core } from '../data';
describe('v4 art uses real game sprites', () => {
  it('sky, sun and grass sprites are bundled', () => {
    for (const k of ['sky:Cloud1', 'sky:Cloud2', 'sky:Moon', 'sky:Star', 'sky:Stars', 'sky:Sun', 'ground:Grass']) expect(core.ui[k], k).toBeTruthy();
    expect(core.ui['ground:Grass']).toMatchObject({ w: 64, h: 22 });
  });
});

describe('v5 Today’s plan card in the tour', () => {
  it('explains the merged card and no longer points at the old button or top-jobs list', () => {
    const t = TOUR.map((s) => s.target);
    expect(t).not.toContain('what');
    expect(t).not.toContain('guide');
    const i = t.indexOf('plan');
    expect(i).toBeGreaterThan(0);
    expect(t[i + 1]).toBe('plan-more');
    expect(TOUR[i].body).toMatch(/next job moves up/);
    expect(TOUR[i + 1].alt).toBe('plan');
  });
});
