import { describe, it, expect } from 'vitest';
import { TOURS, TOUR, REPLAY, TAB_TOURS, autoTour, openTour, startIndex } from '../lib/tour';
import { CHANGELOG } from '../lib/changelog';

const raw = (g: Record<string, unknown>) => Object.values(g).join('\n');
const SRC = raw(import.meta.glob(['../screens/*.tsx', '../components/*.tsx', '../App.tsx'], { query: '?raw', import: 'default', eager: true }));
const MORE = raw(import.meta.glob('../screens/Progress.tsx', { query: '?raw', import: 'default', eager: true }));
const APP = raw(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }));

describe('v7.2 tutorials', () => {
  it('every step is short: one or two lines', () => {
    for (const [id, steps] of Object.entries(TOURS)) for (const s of steps) {
      expect(s.body.length, `${id}/${s.target}`).toBeLessThanOrEqual(95);
      if (s.altBody) expect(s.altBody.length, `${id}/${s.target} alt`).toBeLessThanOrEqual(95);
      expect(s.body.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(2);
    }
  });
  it('every spotlight target exists in the app', () => {
    for (const steps of Object.values(TOURS)) for (const s of steps) {
      for (const t of [s.target, s.alt].filter(Boolean) as string[]) {
        if (t.startsWith('tile-') || t === 'bubble-today') continue; // built from keys
        expect(SRC, t).toMatch(new RegExp(`(data-tour=(\\{[^}]*)?|tour: )["']${t}["']`));
      }
    }
  });
  it('the Day guide tour teaches the v7.1 Starred button (right after Heart scenes) and the luck chip, and drops the tab-bar steps', () => {
    const t = TOUR.map((s) => s.target);
    expect(t[t.indexOf('tile-events') + 1]).toBe('tile-starred');
    expect(t).toContain('luck');
    expect(t.some((x) => x === 'tabbar' || x.startsWith('tab-'))).toBe(false);
    expect(t[t.length - 1]).toBe('home');
  });
  it('Progress is two steps: edit where you are, then the trackers', () => {
    expect(TOURS.progress.map((s) => s.target)).toEqual(['setup', 'trackers']);
  });
  it('Villagers explains the calendar and villager pages, then walks through Maps', () => {
    const v = TOURS.villagers;
    expect(v.slice(0, 3).map((s) => s.target)).toEqual(['vill-cal', 'vill-card', 'vill-maps']);
    expect(v[2].tap).toBe('maps');
    expect(v.slice(3).every((s) => s.route === 'maps')).toBe(true);
    expect(v.map((s) => s.target)).toEqual(expect.arrayContaining(['map-who', 'map-day', 'map-time', 'map-tabs', 'map-vp']));
  });
  it('Search: search anything, then recently viewed (the section is always there, so no fallback is needed)', () => {
    expect(TOURS.search.map((s) => s.target)).toEqual(['search-box', 'recent']);
    expect(TOURS.search[1].alt).toBeUndefined();
  });
  it('More is one step on the replay setting', () => {
    expect(TOURS.more).toHaveLength(1);
    expect(TOURS.more[0].target).toBe('replay');
  });
  it('tab tours play once per device, only on the tab’s own pages, never during another tour, onboarding or the update letter', () => {
    const fresh = { onboarded: true };
    expect(autoTour('progress', fresh)).toBe('progress');
    expect(autoTour('villagers', fresh)).toBe('villagers');
    expect(autoTour('maps', fresh)).toBe('villagers');
    expect(autoTour('search', fresh)).toBe('search');
    expect(autoTour('more', fresh)).toBe('more');
    expect(autoTour('today', fresh)).toBeNull();
    expect(autoTour('item', fresh)).toBeNull();
    expect(autoTour('bundles', fresh)).toBeNull();
    expect(autoTour('progress', { onboarded: true, tabTours: { progress: true } })).toBeNull();
    expect(autoTour('progress', { onboarded: false })).toBeNull();
    expect(autoTour('progress', { onboarded: true, tourOpen: true })).toBeNull();
    expect(autoTour('progress', fresh, true)).toBeNull();
    expect(Object.values(TAB_TOURS)).not.toContain('day');
  });
  it('existing users who finished the old tour are not sent through the Day guide again, but still get the tab tours', () => {
    const old = { onboarded: true, tourSeen: true } as const;
    expect(openTour(undefined)).toBeNull();
    expect(autoTour('', old)).toBeNull();
    expect(autoTour('progress', old)).toBe('progress');
    expect(openTour(true)).toBe('day');
    expect(openTour('search')).toBe('search');
  });
  it('a tour opened on one of its later screens starts there', () => {
    expect(startIndex(TOURS.villagers, 'maps')).toBe(3);
    expect(startIndex(TOURS.villagers, 'villagers')).toBe(0);
    expect(startIndex(TOURS.day, 'nowhere')).toBe(0);
  });
  it('More has a parchment dropdown of the four replayable tutorials, not a native select', () => {
    expect(REPLAY.map((r) => r.label)).toEqual(['Day guide', 'Progress', 'Villagers & Maps', 'Search']);
    expect(MORE).toMatch(/who-dd replay-dd/);
    expect(MORE).not.toMatch(/<select/);
    expect(MORE).toMatch(/role="listbox"/);
  });
  it('App starts the tab tour and renders one tour by id', () => {
    expect(APP).toMatch(/autoTour\(/);
    expect(APP).toMatch(/<Tour key=\{'tour:' \+ tourId\} id=\{tourId\}/);
  });
  it('the page and the tour never share a React key (a Progress tour keyed "progress" next to the Progress page left the old page on screen)', () => {
    expect(APP).toMatch(/<main className="main" key=\{'page:' \+ r\.join\('\/'\)\}>/);
  });
  it('the tour card is clamped fully on screen when a tall target leaves no room on either side', () => {
    const T = raw(import.meta.glob('../components/Tour.tsx', { query: '?raw', import: 'default', eager: true }));
    expect(T).toMatch(/Math\.max\(8, Math\.min\(vh - popH - 8/);
  });
  it('7.2 changelog entry', () => {
    const c = CHANGELOG.find((x) => x.version === '7.2')!;
    expect(c.items[0]).toMatch(/first time you visit each tab.*replay any of them from More/);
  });
});
