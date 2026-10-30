import { describe, it, expect } from 'vitest';
import { APP_VERSION, CHANGELOG } from '../lib/changelog';
import { fullHeight } from '../lib/viewport';
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
  it('is 7.2.4, keeps the 7.2.3 note, v724 cache', () => {
    expect(APP_VERSION).toBe('7.2.4');
    const t = CHANGELOG.find((c) => c.version === '7.2.3')!.items.join(' ');
    expect(t).toMatch(/Tutorials now scroll the page/);
    expect(t).toMatch(/Graphical bug fixes/);
    expect(SW).toMatch(/valleybook-v724-/); expect(SW).not.toMatch(/valleybook-v723-/);
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

describe('v7.2.4 no strip at the bottom of the iOS home-screen app', () => {
  const iPhone = { innerWidth: 393, screenWidth: 393, screenHeight: 852, standalone: true };
  it('always fills the real screen in standalone, short innerHeight or not', () => {
    expect(fullHeight({ ...iPhone, innerHeight: 852 })).toBe(852); // the case v7.2.3 missed: innerHeight right, fixed boxes short
    expect(fullHeight({ ...iPhone, innerHeight: 793 })).toBe(852);
    expect(fullHeight({ innerWidth: 852, innerHeight: 393, screenWidth: 393, screenHeight: 852, standalone: true })).toBe(393); // landscape
    expect(fullHeight({ innerWidth: 852, innerHeight: 340, screenWidth: 393, screenHeight: 852, standalone: true })).toBe(393);
  });
  it('leaves browsers, split view and desktop alone', () => {
    expect(fullHeight({ ...iPhone, innerHeight: 700, standalone: false })).toBe(0);
    expect(fullHeight({ ...iPhone, innerWidth: 320, innerHeight: 852 })).toBe(0);
  });
  it('re-measures on launch, rotation, resize, visual-viewport resize, pageshow and coming back', () => {
    expect(MAIN).toMatch(/watchViewport\(\)/);
    const VP = raw(import.meta.glob('../lib/viewport.ts', { query: '?raw', import: 'default', eager: true }));
    for (const ev of ["'resize'", "'orientationchange'", "'pageshow'", 'visualViewport', 'visibilitychange', "'vb-sa'", "'--vb-h'"]) expect(VP).toContain(ev);
  });
  it('full-screen layers get an explicit screen height and the tab bar is pinned to it, only in standalone', () => {
    expect(CSS).toMatch(/html\.vb-sa \{ --vb-full: max\(100lvh, var\(--vb-h, 0px\)\); \}/);
    expect(CSS).toMatch(/html\.vb-sa \.app, html\.vb-sa \.sky,[\s\S]{0,200}html\.vb-sa #boot \{ top: 0; bottom: auto; height: var\(--vb-full\); \}/);
    expect(CSS).toMatch(/html\.vb-sa \.tabbar \{ top: auto; bottom: calc\(100% - var\(--vb-full\)\); \}/);
    expect(CSS).not.toMatch(/--vb-gap/); expect(HTML).not.toMatch(/--vb-gap/);
  });
  it('any leftover strip is grass tiles (snow in winter) on the front page and tab-bar cream elsewhere, not sky blue', () => {
    const HOME = raw(import.meta.glob('../screens/Home.tsx', { query: '?raw', import: 'default', eager: true }));
    expect(HOME).toMatch(/setProperty\('--meadow-tile', `url\(\.\/\$\{tiles\.s\}\)`\)/);
    expect(CSS).toMatch(/html:has\(\.meadow\) \{ background-color: var\(--sky-1\);[\s\S]{0,120}var\(--meadow-tile/);
    expect(CSS).toMatch(/background-position: left 0 bottom 0, left 0 bottom 32px, left 0 bottom 64px;/);
    expect(CSS).toMatch(/html \{ background-color: var\(--sky-1\); background-image: linear-gradient\(var\(--bar\), var\(--bar\)\);/);
  });
  it('nothing green or cream behind the status bar: the canvas colour is sky (wood under a top bar)', () => {
    const tail = CSS.slice(CSS.indexOf('v7.2.4 iOS home-screen app strip'));
    expect(tail).not.toMatch(/html[^{]*\{ background-color: (#6aa744|#c6f3ff|var\(--bar\))/);
  });
});
