import { describe, it, expect } from 'vitest';
import { letterAtLaunch, noteToShow, APP_VERSION, CHANGELOG } from '../lib/changelog';
import { TOURS } from '../lib/tour';
import { balancedRows, gridSpans } from '../lib/chipgrid';
import { installNoLongPress, isEditable } from '../lib/nopress';

const raw = (g: Record<string, unknown>) => Object.values(g).join('\n');
const SRC = raw(import.meta.glob(['../screens/*.tsx', '../components/*.tsx', '../App.tsx'], { query: '?raw', import: 'default', eager: true }));
const file = (g: Record<string, unknown>) => raw(g);
const TODAY = file(import.meta.glob('../screens/Today.tsx', { query: '?raw', import: 'default', eager: true }));
const FISH = file(import.meta.glob('../screens/Collections.tsx', { query: '?raw', import: 'default', eager: true }));
const SEARCH = file(import.meta.glob('../screens/Search.tsx', { query: '?raw', import: 'default', eager: true }));
const NOTICES = file(import.meta.glob('../components/Notices.tsx', { query: '?raw', import: 'default', eager: true }));
const APP = file(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }));
const TOUR = file(import.meta.glob('../components/Tour.tsx', { query: '?raw', import: 'default', eager: true }));
const CSS = file(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }));

describe('v7.2.1 update letter', () => {
  it('shows only at launch after an update, never on a new install, never under a tour', () => {
    expect(APP_VERSION).toBe('7.2.3');
    expect(letterAtLaunch('7.2', true, true, false)).toBe('7.2.3'); // first open after updating
    expect(letterAtLaunch('7.2.3', true, true, false)).toBeNull(); // once per version
    expect(letterAtLaunch(null, false, false, false)).toBeNull(); // brand-new install: Day guide tour instead
    expect(letterAtLaunch(null, false, true, false)).toBeNull();
    expect(letterAtLaunch('7.2', true, true, true)).toBeNull(); // a tour is open at launch
    expect(letterAtLaunch('7.2', true, false, false)).toBeNull(); // still onboarding
    expect(noteToShow('7.2', true)).toBe('7.2.3');
  });
  it('is decided once, marks the version seen at launch, and is dropped for good when a tour opens', () => {
    expect(NOTICES).toMatch(/let pending[\s\S]{0,300}letterAtLaunch\(/);
    expect(NOTICES).toMatch(/writeSeen\(\)/);
    expect(NOTICES).toMatch(/if \(blocked && pending\) \{ drop\(\)/);
    expect(APP).toMatch(/<UpdateNote blocked=\{!!ui\.tourOpen\} \/>/);
  });
  it('7.2.1 changelog in plain words', () => {
    const c = CHANGELOG.find((x) => x.version === '7.2.1')!;
    expect(c.version).toBe('7.2.1');
    const t = c.items.join(' ');
    expect(t).toMatch(/Fish filters/); expect(t).toMatch(/Tutorials/); expect(t).toMatch(/after an update/);
    expect(t).toMatch(/press(ing)? and hold/i); expect(c.items[c.items.length - 1]).toBe('Graphical bug fixes.');
  });
});

describe('v7.2.1 even chip grids', () => {
  it('balances rows so no chip sits alone', () => {
    expect(balancedRows(5)).toEqual([3, 2]);
    expect(balancedRows(4)).toEqual([2, 2]);
    expect(balancedRows(3)).toEqual([3]);
    expect(balancedRows(7)).toEqual([3, 2, 2]);
    expect(balancedRows(5, 2)).toEqual([2, 2, 1]);
    expect(balancedRows(0)).toEqual([]);
  });
  it('every row fills the full width', () => {
    for (const rows of [[3, 2], [1, 4], [2, 3], [5], [4]]) {
      const g = gridSpans(rows);
      let i = 0;
      for (const n of rows) { const sum = g.spans.slice(i, i + n).reduce((a, b) => a + b, 0); expect(sum).toBe(g.cols); i += n; }
    }
    expect(gridSpans([3, 2])).toEqual({ cols: 6, spans: [2, 2, 2, 3, 3] });
  });
  it('Fish uses a 3+2 toggle grid and All seasons over the four seasons', () => {
    expect(FISH).toMatch(/<ChipGrid rows=\{\[3, 2\]\} className="fish-toggles">/);
    expect(FISH).toMatch(/<ChipGrid rows=\{\[1, 4\]\} className="season-grid">/);
    expect(CSS).toMatch(/\.chips\.cgrid \{ display: grid/);
  });
});

describe('v7.2.1 tutorial highlights', () => {
  it('Energy, Birthday, Festival lights only those three, never Luck', () => {
    const s = TOURS.day.find((x) => x.title === 'Energy, Birthday, Festival')!;
    expect(s.target).toBe('xtabs');
    expect(TODAY).not.toMatch(/className="day-tabs[^"]*"[^>]*data-tour="xtabs"/);
    expect(TODAY).toMatch(/<button key=\{id\} data-tour="xtabs"/);
    expect(TODAY).toMatch(/data-tour="luck"/);
    expect(TOUR).toMatch(/querySelectorAll/);
  });
  it('Villagers “Maps” lights only the Maps tab', () => {
    expect(TOURS.villagers[2].target).toBe('vill-maps');
    expect(SRC).toMatch(/\{ v: 'maps', label: 'Maps', tour: 'vill-maps' \}/);
    expect(SRC).not.toMatch(/vill-seg/);
  });
  it('Recently viewed is always on the Search page, with a placeholder when empty', () => {
    expect(SEARCH).toMatch(/data-tour="recent"/);
    expect(SEARCH).toMatch(/Things you open will show up here/);
    expect(SEARCH).not.toMatch(/search-below/);
  });
});

describe('v7.2.1 no long-press menus', () => {
  it('CSS turns off the callout and selection app-wide but keeps text boxes editable', () => {
    expect(CSS).toMatch(/-webkit-touch-callout: none/);
    expect(CSS).toMatch(/-webkit-user-drag: none/);
    expect(CSS).toMatch(/input, textarea[^{]*\{[^}]*user-select: (text|auto)/);
  });
  it('blocks contextmenu, drag and select except in text boxes', () => {
    const handlers: Record<string, (e: unknown) => void> = {};
    const doc = { addEventListener: (t: string, f: (e: unknown) => void) => { handlers[t] = f; } } as unknown as Document;
    installNoLongPress(doc);
    const ev = (target: unknown) => { let p = false; return { e: { target, preventDefault: () => { p = true; } }, done: () => p }; };
    const tile = { closest: () => null, tagName: 'A' };
    const input = { closest: () => ({}), tagName: 'INPUT' };
    for (const t of ['contextmenu', 'selectstart', 'dragstart']) {
      const a = ev(tile); handlers[t](a.e); expect(a.done(), t).toBe(true);
      const b = ev(input); handlers[t](b.e); expect(b.done(), t).toBe(false);
    }
    expect(isEditable(tile as unknown as EventTarget)).toBe(false);
  });
  it('in-app links have no href (no iOS link preview) and still navigate; images never drag', () => {
    expect(SRC).not.toMatch(/<a [^>]*href=\{?["'`]#/);
    expect(SRC).toMatch(/draggable=\{false\}/);
    const LK = raw(import.meta.glob('../components/Link.tsx', { query: '?raw', import: 'default', eager: true }));
    expect(LK).toMatch(/role="link"/); expect(LK).toMatch(/go\(/);
  });
});
