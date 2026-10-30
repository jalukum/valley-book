import { describe, it, expect } from 'vitest';

// v6.8: no rubber-band overscroll, and an iOS home-screen icon that fits the squircle mask.
const CSS = Object.values(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const ROUTER = Object.values(import.meta.glob('../lib/router.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const HTML = Object.values(import.meta.glob('../../index.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '';
const MANIFEST = JSON.parse(Object.values(import.meta.glob('../../public/manifest.webmanifest', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? '{}');
const ICONS = import.meta.glob('../../public/icons/*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const rule = (sel: string) => { const m = CSS.match(new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}', 'g')); return (m ?? []).join(' '); };

/** Minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) — enough to read our own icons' pixels. */
async function decode(dataUrl: string) {
  const bin = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
  const dv = new DataView(bin.buffer);
  let p = 8, w = 0, h = 0, ct = 0; const idat: Uint8Array[] = [];
  while (p < bin.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(...bin.slice(p + 4, p + 8));
    if (type === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); ct = bin[p + 17]; expect(bin[p + 16]).toBe(8); expect(bin[p + 20]).toBe(0); }
    if (type === 'IDAT') idat.push(bin.slice(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = new Uint8Array(await new Response(new Blob(idat as BlobPart[]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; expect(bpp, 'colour type ' + ct).toBeGreaterThan(0);
  const stride = w * bpp, out = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x], a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      out[y * stride + x] = (v + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  const px = (x: number, y: number) => { const i = y * stride + x * bpp; return [out[i], out[i + 1], out[i + 2], bpp === 4 ? out[i + 3] : 255]; };
  return { w, h, bpp, px };
}
const icon = (n: string) => ICONS[`../../public/icons/${n}`];
const isJunimo = ([r, g, b]: number[]) => g > r + 40 && g > b + 40; // the green Junimo, never in the wood/parchment

describe('v6.8 no overscroll bounce', () => {
  it('html/body never scroll and have overscroll off', () => {
    const r = rule('html, body');
    expect(r).toMatch(/overflow: hidden/);
    expect(r).toMatch(/overscroll-behavior: none/);
    expect(r).toMatch(/height: 100%/);
  });
  it('the app shell is the full-screen scroller with overscroll off; modals lock it; sheets contain', () => {
    const r = rule('.app');
    expect(r).toMatch(/position: fixed; inset: 0/);
    expect(r).toMatch(/overflow-y: auto/);
    expect(r).toMatch(/overscroll-behavior: none/);
    expect(rule('body.noscroll .app')).toMatch(/overflow: hidden/);
    expect(rule('.sheet-b')).toMatch(/overscroll-behavior: contain/);
    expect(CSS).toMatch(/\.map-vp \{[^}]*touch-action: none/); // Maps pinch/pan still owns its gestures
    expect(rule('.tabbar')).toMatch(/position: fixed/);
    expect(rule('.topbar')).toMatch(/position: sticky; top: 0/);
  });
  it('scroll memory on back uses the app scroller', () => {
    expect(ROUTER).toMatch(/querySelector<HTMLElement>\('\.app'\)/);
    expect(ROUTER).toMatch(/saved\.set\(lastHash, scroller\(\)\?\.scrollTop/);
    expect(ROUTER).toMatch(/sc\.scrollTop = y/);
  });
});

describe('v6.8 iOS home-screen icon', () => {
  it('apple-touch-icon is 180×180, opaque, square full-bleed (wood to every edge and corner)', async () => {
    expect(HTML).toMatch(/rel="apple-touch-icon" sizes="180x180" href="\.\/icons\/apple-touch-icon\.png"/);
    const im = await decode(icon('apple-touch-icon.png'));
    expect([im.w, im.h]).toEqual([180, 180]);
    expect(im.bpp).toBe(3); // no alpha channel at all
    const wood = [0x7a, 0x44, 0x19, 255];
    for (const [x, y] of [[0, 0], [179, 0], [0, 179], [179, 179], [90, 0], [0, 90], [179, 90], [90, 179], [8, 8], [171, 171]]) expect(im.px(x, y), `${x},${y}`).toEqual(wood);
  });
  it('the frame is even after the iOS squircle: same wood depth at the corner diagonal and the edge midpoints', async () => {
    const im = await decode(icon('apple-touch-icon.png'));
    const parchment = ([r, g, b]: number[]) => r > 230 && g > 180 && b > 100;
    const edge = [...Array(90).keys()].find((i) => parchment(im.px(90, i)))!;
    // iOS mask corner ≈ circle of radius 22.37% · 180 ≈ 40 px; distance from its arc to the parchment along the diagonal
    const R = 0.2237 * 180, arc = R - R / Math.SQRT2;
    const diag = [...Array(90).keys()].find((i) => parchment(im.px(i, i)))!;
    expect(Math.abs((diag - arc) * Math.SQRT2 - edge)).toBeLessThan(3);
  });
  it('Junimo identical and centred in the apple icon (same pixels as the 192 "any" icon art, nearest-neighbour)', async () => {
    const im = await decode(icon('apple-touch-icon.png'));
    let x0 = 999, x1 = 0, y0 = 999, y1 = 0;
    for (let y = 0; y < 180; y++) for (let x = 0; x < 180; x++) if (isJunimo(im.px(x, y))) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    expect(Math.abs((x0 + x1) / 2 - 89.5)).toBeLessThanOrEqual(2);
    expect(Math.abs((y0 + y1) / 2 - 89.5)).toBeLessThanOrEqual(3);
  });
  it('manifest: "any" icons are the square tiles; the maskable icon keeps the Junimo inside the 80% safe circle', async () => {
    const icons = MANIFEST.icons as { src: string; sizes: string; purpose?: string }[];
    expect(icons.filter((i) => !i.purpose).map((i) => i.sizes)).toEqual(['192x192', '512x512']);
    const m = icons.find((i) => i.purpose === 'maskable')!;
    const im = await decode(icon(m.src.split('/').pop()!));
    expect([im.w, im.h]).toEqual([512, 512]);
    expect(im.px(0, 0)[3]).toBe(255);
    let far = 0;
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) if (isJunimo(im.px(x, y))) far = Math.max(far, Math.hypot(x + 0.5 - 256, y + 0.5 - 256));
    expect(far).toBeGreaterThan(50);
    expect(far).toBeLessThan(0.4 * 512);
    for (const n of ['icon-192.png', 'icon-512.png']) { const a = await decode(icon(n)); expect(a.px(0, 0)[3], n).toBe(255); }
  });
});
