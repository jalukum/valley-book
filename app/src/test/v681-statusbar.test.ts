import { describe, it, expect } from 'vitest';

// v6.8.1: the iOS status-bar area above the wooden banner is clean, solid wood: no blur, grey tint or fade.
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const APP = Object.values(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const block = (sel: string) => { const m = CSS.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m?.[1] ?? ''; };
const header = ['.topbar', 'html:has(.topbar), html:has(.topbar) body'];

describe('v6.8.1 status bar sits on clean wood', () => {
  it('no backdrop-filter blur anywhere, and no mask/fade/filter on the header', () => {
    expect(CSS).not.toMatch(/backdrop-filter/);
    for (const s of header) {
      const b = block(s);
      expect(b, s).not.toBe('');
      expect(b, s).not.toMatch(/mask|filter|opacity/);
    }
  });
  it('v6.8.3: one continuous textured board from the very top of the screen: no separate flat strip, no fade', () => {
    expect(CSS).not.toMatch(/\.sat-cap/);
    expect(APP).not.toMatch(/sat-cap/);
    const b = block('.topbar');
    expect(b).toMatch(/position: sticky; top: 0/);
    expect(b).toMatch(/padding: calc\(var\(--sat\) \+ 7px\)/); // the board itself runs up through the status-bar inset
    expect(b).toMatch(/margin-top: calc\(-4px - var\(--sat\)\)/); // ...starting at the screen's top edge
    expect(b).toMatch(/repeating-linear-gradient\(180deg[^\n]*\/\* grain \*\//); // grain + seams + knots cover the whole box
    expect(b).toMatch(/repeating-linear-gradient\(90deg[^\n]*\/\* knots and streaks \*\//);
    expect(b).toMatch(/linear-gradient\(0deg, #8e5a2b 0, #9c6533 24px, #b47d43 52px\)/); // shading fixed to the bottom edge, flat-free above
    expect(b).not.toMatch(/var\(--sat\)\)?,? *(#|rgba|transparent)/); // no colour stop tied to the inset (no strip/seam)
    expect(b).toMatch(/background-color: #a5703a/); // opaque
    expect(CSS).toMatch(/--sat: env\(safe-area-inset-top, 0px\)/);
  });
  it('no grey or translucent colours behind the status bar: header backgrounds are solid wood hexes', () => {
    for (const s of header) for (const c of block(s).match(/background-color: [^;]+/g) ?? []) expect(c, s).toMatch(/#[0-9a-f]{6}$/i);
    expect(block('html:has(.topbar), html:has(.topbar) body')).toMatch(/background-color: #a5703a/);
  });
  it('the app sets a wood theme-color while a wooden top bar is on screen', () => {
    expect(APP).toMatch(/const wood = !!document\.querySelector\('\.topbar'\)/);
    expect(APP).toMatch(/wood \? '#b47d43' : '#6fc2ee'/);
  });
});
