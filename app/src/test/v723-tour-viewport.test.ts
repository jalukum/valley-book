import { describe, it, expect } from 'vitest';
import { APP_VERSION, CHANGELOG } from '../lib/changelog';
import { viewportGap } from '../lib/viewport';
import { TOURS } from '../lib/tour';

const raw = (g: Record<string, unknown>) => Object.values(g).join('\n');
const TOUR = raw(import.meta.glob('../components/Tour.tsx', { query: '?raw', import: 'default', eager: true }));
const MAIN = raw(import.meta.glob('../main.tsx', { query: '?raw', import: 'default', eager: true }));
const CSS = raw(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }));
const SW = raw(import.meta.glob('../../scripts/build-sw.mjs', { query: '?raw', import: 'default', eager: true }));
const HTML = raw(import.meta.glob('../../index.html', { query: '?raw', import: 'default', eager: true }));
const OVF = raw(import.meta.glob('../../scripts/overflow-check.mjs', { query: '?raw', import: 'default', eager: true }));
const PROG = raw(import.meta.glob('../screens/Progress.tsx', { query: '?raw', import: 'default', eager: true }));

describe('v7.2.3 version', () => {
  it('is 7.2.3 with a plain-words note and a v723 cache', () => {
    expect(APP_VERSION).toBe('7.2.3');
    const t = CHANGELOG[0].items.join(' ');
    expect(t).toMatch(/Tutorials now scroll the page/);
    expect(t).toMatch(/Graphical bug fixes/);
    expect(SW).toMatch(/valleybook-v723-/); expect(SW).not.toMatch(/valleybook-v722-/);
  });
});

describe('v7.2.3 tutorial targets scroll into view', () => {
  it('the More tour points at the Replay a tutorial box', () => {
    expect(TOURS.more[0].target).toBe('replay');
    expect(PROG).toMatch(/data-tour="replay"/);
  });
  it('scrolls the app (not the window) after the tab change, smoothly unless reduced motion', () => {
    expect(TOUR).toMatch(/const reveal = \(\) =>/);
    expect(TOUR).toMatch(/requestAnimationFrame\(\(\) => \{ raf = requestAnimationFrame\(reveal\); \}\)/); // after the router's scroll-to-top
    expect(TOUR).toMatch(/sc\.scrollTo\(\{ top, behavior: still \? 'auto' : 'smooth' \}\)/);
    expect(TOUR).toMatch(/prefers-reduced-motion: reduce/);
    expect(TOUR).not.toMatch(/scrollIntoView/);
  });
  it('centres between the top bar and the tab bar, leaves room for the card, and keeps tall targets under the bar', () => {
    expect(TOUR).toMatch(/querySelector\('\.topbar'\)/); expect(TOUR).toMatch(/querySelector\('\.tabbar'\)/);
    expect(TOUR).toMatch(/box\.top \+ box\.height \/ 2 - \(lo \+ hi\) \/ 2/);
    expect(TOUR).toMatch(/popRef\.current\?\.offsetHeight/);
    expect(TOUR).toMatch(/r\.h = Math\.max\(120, Math\.min\(r\.h, vh - r\.top - popH - 26\)\)/);
  });
  it('the overflow check fails any step whose highlight is off screen, under a bar or under the card, incl. More from its tab', () => {
    expect(OVF).toMatch(/hidden, covered/);
    expect(OVF).toMatch(/'more-tab': null/);
  });
});

describe('v7.2.3 no strip at the bottom of the iOS home-screen app', () => {
  const iPhone = { innerWidth: 430, screenWidth: 430, screenHeight: 932, standalone: true };
  it('measures the missing status-bar height when iOS lays the page out short', () => {
    expect(viewportGap({ ...iPhone, innerHeight: 873 })).toBe(59); // the screenshot: 176px at 3x
    expect(viewportGap({ ...iPhone, innerHeight: 932 })).toBe(0);
    expect(viewportGap({ innerWidth: 932, innerHeight: 430, screenWidth: 430, screenHeight: 932, standalone: true })).toBe(0); // landscape, fine
    expect(viewportGap({ innerWidth: 932, innerHeight: 400, screenWidth: 430, screenHeight: 932, standalone: true })).toBe(30); // landscape, short
  });
  it('does nothing in a browser tab, split view, or for gaps bigger than a status bar', () => {
    expect(viewportGap({ ...iPhone, innerHeight: 800, standalone: false })).toBe(0); // Safari's own toolbars
    expect(viewportGap({ ...iPhone, innerWidth: 320, innerHeight: 873 })).toBe(0);
    expect(viewportGap({ ...iPhone, innerHeight: 700 })).toBe(0);
    expect(viewportGap({ ...iPhone, innerHeight: 0 })).toBe(0);
  });
  it('re-measures on launch, rotation, resize, visual-viewport resize, pageshow and coming back', () => {
    expect(MAIN).toMatch(/watchViewport\(\)/);
    const VP = raw(import.meta.glob('../lib/viewport.ts', { query: '?raw', import: 'default', eager: true }));
    for (const ev of ["'resize'", "'orientationchange'", "'pageshow'", 'visualViewport', 'visibilitychange']) expect(VP).toContain(ev);
  });
  it('the app shell, tab bar, sky and full-screen layers reach down through the gap', () => {
    expect(CSS).toMatch(/\.app, \.sky, \.popcorn, \.tour, \.onb, \.sheet-wrap, \.dd-scrim, \.oops\.full, \.rotate-lock \{ bottom: calc\(-1 \* var\(--vb-gap, 0px\)\); \}/);
    expect(CSS).toMatch(/\.tabbar \{ bottom: calc\(-1 \* var\(--vb-gap, 0px\)\); \}/);
    expect(HTML).toMatch(/id="boot" style="position:fixed;inset:0;bottom:calc\(-1 \* var\(--vb-gap, 0px\)\);background:linear-gradient/);
  });
  it('any leftover gap shows the bottom surface (tab bar cream, grass or snow), not sky blue', () => {
    expect(CSS).toMatch(/html \{ background-color: var\(--bar\); background-image: linear-gradient\(var\(--sky-1\), var\(--sky-1\)\); background-repeat: no-repeat; background-size: 100% 50%; \}/);
    expect(CSS).toMatch(/html:has\(\.meadow\) \{ background-color: #6aa744; \}/);
    expect(CSS).toMatch(/html:has\(\.meadow\.s3\) \{ background-color: #c6f3ff; \}/);
  });
});
