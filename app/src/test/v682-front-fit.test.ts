import { describe, it, expect } from 'vitest';

// v6.8.2: the front page (#/) fits the screen exactly, no vertical scroll, on every phone height and safe-area inset.
// (Headless counterpart: scripts/front-fit.mjs checks .app scrollHeight <= clientHeight at 375x667, 390x844, 430x932.)
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const APP = Object.values(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const blocks = (sel: string) => [...CSS.matchAll(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}', 'g'))].map((m) => m[1]).join(';');

describe('v6.8.2 front page fits without scrolling', () => {
  it('the front page is the only no-tabs page, and its app shell does not scroll', () => {
    expect(APP).toMatch(/'app' \+ \(tab === 'home' \? ' no-tabs' : ''\)/);
    expect(blocks('.app.no-tabs')).toMatch(/overflow: hidden/);
    expect(blocks('.app')).toMatch(/overflow-y: auto/); // every other page still scrolls normally
  });
  it('.main is exactly the screen tall with both safe-area insets inside it (border-box)', () => {
    expect(CSS).toMatch(/\* \{ box-sizing: border-box;/);
    expect(blocks('.app.no-tabs .main')).toMatch(/height: 100%; display: flex; flex-direction: column/);
    expect(blocks('.app.no-tabs .main')).toMatch(/padding-bottom: calc\(var\(--sab\) \+ 12px\)/);
    expect(blocks('.main')).toMatch(/padding: calc\(var\(--sat\) \+ 4px\)/);
  });
  it('the entry screen flexes to fill .main instead of a 100dvh min-height that overflowed by the home-indicator inset', () => {
    expect(blocks('.app.no-tabs .main > .entry')).toMatch(/flex: 1 1 auto; min-height: 0/);
    expect(blocks('.entry')).not.toMatch(/min-height/);
    expect(blocks('.entry')).not.toMatch(/100dvh/);
  });
  it('the meadow and ground still reach the very bottom edge (through the bottom padding)', () => {
    expect(blocks('.meadow')).toMatch(/bottom: calc\(-12px - var\(--sab\)\)/);
    expect(blocks('.entry-ground')).toMatch(/bottom: calc\(-12px - var\(--sab\)\)/);
  });
});
