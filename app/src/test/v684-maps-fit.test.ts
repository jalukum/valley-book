import { describe, it, expect } from 'vitest';
const raw = (g: Record<string, unknown>) => Object.values(g)[0] as string;
const css = raw(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }));
const app = raw(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }));
const search = raw(import.meta.glob('../screens/Search.tsx', { query: '?raw', import: 'default', eager: true }));
const html = raw(import.meta.glob('../../index.html', { query: '?raw', import: 'default', eager: true }));

describe('v6.8.4 Maps fits the screen', () => {
  it('marks the app shell with .fit only on the Maps route', () => {
    expect(app).toMatch(/r\[0\] === 'maps' \? ' fit' : ''/);
  });
  it('locks page scroll only while Maps is open and lays Maps out as a flex column', () => {
    expect(css).toMatch(/\.app\.fit \{ overflow: hidden; \}/);
    expect(css).toMatch(/\.app\.fit \.main \{ height: 100%; display: flex; flex-direction: column; \}/);
    expect(css).toMatch(/\.app\.fit \.main > \.maps \{ flex: 1 1 auto; min-height: 0; \}/);
    expect(css).toMatch(/\.app\.fit \.maps > \* \{ flex: none; \}/);
    expect(css).toMatch(/\.app\.fit \.maps > \.map-vp \{ flex: 1 1 auto; min-height: 0; height: auto; \}/);
    // the generic shell keeps scrolling everywhere else
    expect(css).toMatch(/\.app \{ position: fixed; inset: 0; overflow-x: hidden; overflow-y: auto;/);
  });
  it('keeps in-map pinch/pan and keeps the dropdown above the tab bar', () => {
    expect(css).toMatch(/\.map-vp \{[^}]*touch-action: none/);
    expect(css).toMatch(/\.app\.fit \.who-dd \{ max-height: min\(56dvh, calc\(100dvh - var\(--sat\) - var\(--sab\) - var\(--tabh\) - 232px\)\); \}/);
  });
});

describe('v6.8.4 Search hint and status bar', () => {
  it('shows exactly "Search for anything" under the search bar and keeps the placeholder', () => {
    expect(search).toContain('<Empty>Search for anything</Empty>');
    expect(search).not.toMatch(/Try “diamond”/);
    expect(search).toContain('placeholder="Items, villagers, fish, bundles, recipes"');
  });
  it('leaves the status-bar setup unchanged (no visible cap shipped)', () => {
    expect(html).toContain('apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(css).not.toMatch(/\.sat-cap/);
  });
});
