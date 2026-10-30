import { describe, it, expect } from 'vitest';

// v6.8.1: the iOS status-bar area above the wooden banner is clean, solid wood: no blur, grey tint or fade.
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const APP = Object.values(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const block = (sel: string) => { const m = CSS.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m?.[1] ?? ''; };
const header = ['.topbar', '.sat-cap', 'html:has(.topbar), html:has(.topbar) body'];

describe('v6.8.1 status bar sits on clean wood', () => {
  it('no backdrop-filter blur anywhere, and no mask/fade/filter on the header', () => {
    expect(CSS).not.toMatch(/backdrop-filter/);
    for (const s of header) {
      const b = block(s);
      expect(b, s).not.toBe('');
      expect(b, s).not.toMatch(/mask|filter|opacity/);
    }
  });
  it('the safe-area cap is fixed, exactly env(safe-area-inset-top) tall, opaque wood above the banner', () => {
    const b = block('.sat-cap');
    expect(b).toMatch(/position: fixed; top: 0; left: 0; right: 0; height: var\(--sat\)/);
    expect(b).toMatch(/background-color: #b47d43/); // the banner's top wood colour, fully opaque
    expect(Number(b.match(/z-index: (\d+)/)?.[1])).toBeGreaterThan(Number(block('.topbar').match(/z-index: (\d+)/)?.[1]));
    expect(CSS).toMatch(/--sat: env\(safe-area-inset-top, 0px\)/);
    expect(block('.topbar')).toMatch(/padding: calc\(var\(--sat\) \+ 7px\)/); // wood still runs up through the inset
  });
  it('no grey or translucent colours behind the status bar: header backgrounds are solid wood hexes', () => {
    for (const s of header) for (const c of block(s).match(/background-color: [^;]+/g) ?? []) expect(c, s).toMatch(/#[0-9a-f]{6}$/i);
    expect(block('html:has(.topbar), html:has(.topbar) body')).toMatch(/background-color: #a5703a/);
  });
  it('the app shows the cap and sets a wood theme-color while a wooden top bar is on screen', () => {
    expect(APP).toMatch(/<div className="sat-cap" aria-hidden \/>/);
    expect(APP).toMatch(/const wood = !!document\.querySelector\('\.topbar'\)/);
    expect(APP).toMatch(/wood \? '#b47d43' : '#6fc2ee'/);
  });
});
