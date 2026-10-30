import { describe, it, expect } from 'vitest';
import { blockZoom, lockPageZoom, ZOOM_OK } from '../lib/nozoom';

// v6.8.3: no page pinch / double-tap zoom (Maps keeps its own pinch-zoom), and no "Run first-time setup again" setting.
const raw = (g: Record<string, unknown>) => (Object.values(g)[0] as string) ?? '';
const HTML = raw(import.meta.glob('../../index.html', { query: '?raw', import: 'default', eager: true }));
const CSS = raw(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }));
const MAIN = raw(import.meta.glob('../main.tsx', { query: '?raw', import: 'default', eager: true }));
const MORE = raw(import.meta.glob('../screens/Progress.tsx', { query: '?raw', import: 'default', eager: true }));
const APP = raw(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }));
const ONB = raw(import.meta.glob('../components/Onboarding.tsx', { query: '?raw', import: 'default', eager: true }));
const SRC = Object.values(import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).join('\n');

const el = (inMap: boolean) => ({ closest: (s: string) => (inMap && s === ZOOM_OK ? {} : null) });
const ev = (target: unknown, touches?: number) => { const e = { target, touches: touches == null ? undefined : { length: touches }, cancelable: true, prevented: false, preventDefault() { e.prevented = true; } }; return e; };

describe('v6.8.3 page zoom is locked', () => {
  it('viewport meta forbids zoom, keeps viewport-fit=cover', () => {
    const m = HTML.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? '';
    expect(m).toMatch(/maximum-scale=1/);
    expect(m).toMatch(/user-scalable=no/);
    expect(m).toMatch(/viewport-fit=cover/);
  });
  it('the app only allows panning (no pinch / double-tap zoom); the map viewport keeps touch-action:none for its own pinch', () => {
    expect(CSS).toMatch(/html, body, \.app \{ touch-action: pan-x pan-y; \}/);
    expect(CSS).toMatch(/\.map-vp \{[^}]*touch-action: none/);
    expect(ZOOM_OK).toBe('.map-vp');
  });
  it('iOS gesture events and multi-finger touchmoves are cancelled outside the map, never inside it', () => {
    for (const [t, n] of [[el(false), undefined], [el(false), 2]] as const) { const e = ev(t, n); expect(blockZoom(e as Parameters<typeof blockZoom>[0])).toBe(true); expect(e.prevented).toBe(true); }
    for (const [t, n] of [[el(true), undefined], [el(true), 2]] as const) { const e = ev(t, n); expect(blockZoom(e as Parameters<typeof blockZoom>[0])).toBe(false); expect(e.prevented).toBe(false); }
    const one = ev(el(false), 1); expect(blockZoom(one as Parameters<typeof blockZoom>[0])).toBe(false); expect(one.prevented).toBe(false); // normal one-finger scroll
    expect(blockZoom(ev(null) as Parameters<typeof blockZoom>[0])).toBe(true);
  });
  it('listeners are non-passive on gesturestart/change/end and touchmove, installed at startup', () => {
    const got: [string, boolean | undefined][] = [];
    lockPageZoom({ addEventListener: (t, _f, o) => got.push([t, o?.passive]) });
    expect(got).toEqual([['gesturestart', false], ['gesturechange', false], ['gestureend', false], ['touchmove', false]]);
    expect(MAIN).toMatch(/lockPageZoom\(document\)/);
  });
  it('every text input, select and textarea is at least 16px, so iOS never auto-zooms on focus', () => {
    for (const sel of ['.search input', '.onb-f input', '.ta', '.sel']) {
      const b = CSS.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}'))?.[1] ?? '';
      const px = Number(b.match(/font: (?:\d{3} )?(\d+)px/)?.[1]);
      expect(px, sel).toBeGreaterThanOrEqual(16);
    }
  });
});

describe('v6.8.3 "Run first-time setup again" is gone', () => {
  it('no such setting or re-run trigger anywhere', () => {
    expect(SRC).not.toMatch(/Run first-time setup again/);
    expect(SRC).not.toMatch(/setUi\(\{ onboarded: false \}\)/);
  });
  it('first-launch onboarding still runs for new users, and the tutorial replay stays under More', () => {
    expect(APP).toMatch(/\{!ui\.onboarded && <Onboarding \/>\}/);
    expect(ONB).toMatch(/setUi\(\{ onboarded: true, tourOpen: !getUi\(\)\.tourSeen \}\)/);
    expect(MORE).toMatch(/<b>Replay a tutorial<\/b>/); // v7.2 dropdown
    expect(MORE).toMatch(/startTour\(t\.id\)/);
    expect(MORE).toMatch(/href="#\/setup"/); // "Where are you in the game?" questions stay editable
  });
});

describe('v6.8.3 short-screen front page', () => {
  it('has a compact max-height:600px block for the front page', () => {
    const css = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }))[0] as string;
    const i = css.indexOf('@media (max-height: 600px)');
    expect(i).toBeGreaterThan(-1);
    const block = css.slice(i, i + 1200);
    expect(block).toMatch(/\.entry\s*\{\s*gap:\s*6px/);
    expect(block).toMatch(/\.bubbles\s*\{/);
  });
});
