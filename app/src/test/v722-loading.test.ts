import { describe, it, expect, vi, afterEach } from 'vitest';
import { APP_VERSION, CHANGELOG, noteToShow } from '../lib/changelog';
import { isChunkError, retryImport, reloadOnce } from '../lib/lazyload';
import { warmList, isWarm, noteSprite } from '../lib/warm';
import { core } from '../data';

const raw = (g: Record<string, unknown>) => Object.values(g).join('\n');
const APP = raw(import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }));
const MAIN = raw(import.meta.glob('../main.tsx', { query: '?raw', import: 'default', eager: true }));
const DATA = raw(import.meta.glob('../data.ts', { query: '?raw', import: 'default', eager: true }));
const UI = raw(import.meta.glob('../components/ui.tsx', { query: '?raw', import: 'default', eager: true }));
const EB = raw(import.meta.glob('../components/ErrorBoundary.tsx', { query: '?raw', import: 'default', eager: true }));
const SW = raw(import.meta.glob('../../scripts/build-sw.mjs', { query: '?raw', import: 'default', eager: true }));
const HTML = raw(import.meta.glob('../../index.html', { query: '?raw', import: 'default', eager: true }));
const CSS = raw(import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }));
const never = Symbol('pending');
const settle = <T,>(p: Promise<T>) => Promise.race([p, new Promise((r) => setTimeout(() => r(never), 30))]);

describe('v7.2.2 version + letter', () => {
  it('is 7.2.2 with a plain-words note', () => {
    expect(APP_VERSION).toBe('7.2.2');
    expect(noteToShow('7.2.1', true)).toBe('7.2.2');
    const t = CHANGELOG[0].items.join(' ');
    expect(t).toMatch(/Tabs and pictures load faster/);
    expect(t).toMatch(/blank/); expect(t).toMatch(/Tap to reload/);
  });
  it('service worker cache is v722', () => { expect(SW).toMatch(/valleybook-v722-/); expect(SW).not.toMatch(/valleybook-v721-/); });
});

describe('v7.2.2 failed downloads never leave a blank screen', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('recognises chunk-load errors from Safari, Chrome and Firefox (and nothing else)', () => {
    expect(isChunkError(new TypeError('Importing a module script failed.'))).toBe(true); // iOS Safari
    expect(isChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Villager-abc.js'))).toBe(true);
    expect(isChunkError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkError(new Error('Unable to preload CSS for /assets/x.css'))).toBe(true);
    expect(isChunkError(new TypeError("Cannot read properties of undefined (reading 'name')"))).toBe(false);
    expect(isChunkError(null)).toBe(false);
  });
  it('retries a failed import once', async () => {
    let n = 0;
    const load = retryImport(() => (++n === 1 ? Promise.reject(new TypeError('Importing a module script failed.')) : Promise.resolve('ok')), { delay: 0, reload: () => false });
    expect(await load()).toBe('ok'); expect(n).toBe(2);
    expect(await load()).toBe('ok'); expect(n).toBe(2); // memoised once loaded
  });
  it('reloads once after two failures, and waits for the reload instead of throwing', async () => {
    const reload = vi.fn(() => true);
    const load = retryImport(() => Promise.reject(new TypeError('Importing a module script failed.')), { delay: 0, reload });
    expect(await settle(load())).toBe(never);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('throws (to the error card) when it already reloaded, and never caches the failure', async () => {
    let n = 0;
    const load = retryImport(() => (++n <= 2 ? Promise.reject(new TypeError('Importing a module script failed.')) : Promise.resolve('ok')), { delay: 0, reload: () => false });
    await expect(load()).rejects.toThrow(/module script/);
    expect(await load()).toBe('ok'); // a later try starts fresh
  });
  it('non-chunk errors are not turned into reloads', async () => {
    const reload = vi.fn(() => true);
    const load = retryImport(() => Promise.reject(new Error('boom')), { delay: 0, reload });
    await expect(load()).rejects.toThrow('boom');
    expect(reload).not.toHaveBeenCalled();
  });
  it('reloadOnce reloads at most once a minute (no reload loops)', () => {
    const store: Record<string, string> = {};
    const reload = vi.fn();
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    vi.stubGlobal('location', { reload });
    expect(reloadOnce()).toBe(true);
    expect(reloadOnce()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('every lazy screen and data file uses the retrying loader', () => {
    expect(APP).not.toMatch(/\blazy\(/);
    expect(APP.match(/lazyRetry\(\(\) => import\(/g)?.length).toBe(3);
    expect(DATA).toMatch(/loadGifts = retryImport\(/); expect(DATA).toMatch(/loadSchedules = retryImport\(/);
  });
  it('pages sit inside an error boundary with a non-blank loading state; the whole app has one too', () => {
    expect(APP).toMatch(/<ErrorBoundary>\s*<Suspense fallback=\{<PageLoading \/>\}>\s*<Screen r=\{r\} \/>/);
    expect(MAIN).toMatch(/<ErrorBoundary full><App \/><\/ErrorBoundary>/);
    expect(MAIN).toMatch(/vite:preloadError/);
    expect(EB).toMatch(/getDerivedStateFromError/);
    expect(EB).toMatch(/Something went wrong/); expect(EB).toMatch(/Tap to reload/);
    expect(EB).not.toMatch(/\balert\(|\bconfirm\(/);
    expect(CSS).toMatch(/\.oops-card \{[^}]*var\(--paper\)/);
  });
  it('index.html shows a parchment card (not empty sky) until the app draws, with a reload if it never does', () => {
    expect(HTML).toMatch(/<div id="root"><div id="boot"/);
    expect(HTML).toMatch(/Tap to reload/);
    expect(HTML).toMatch(/prefers-reduced-motion/);
  });
});

describe('v7.2.2 service worker', () => {
  it('checks every precached file against its build hash, bypassing stale HTTP caches', () => {
    expect(SW).toMatch(/fetch\(u, \{ cache: mode \}\)/);
    expect(SW).toMatch(/\['no-cache', 'reload'\]/);
    expect(SW).toMatch(/crypto\.subtle\.digest\('SHA-256'/);
  });
  it('keeps the previous version\'s script chunks for pages still open on it', () => {
    expect(SW).toMatch(/const PREV = 'valleybook-prev'/);
    expect(SW).toMatch(/includes\('\/assets\/'\)/);
  });
  it('re-downloads only changed sprites, and never caches a failed response', () => {
    expect(SW).toMatch(/const MEDIA = 'valleybook-media'/);
    expect(SW).toMatch(/REST\.filter\(\(u\) => have\[u\] !== REVS\[u\]\)/);
    expect(SW).toMatch(/if \(res\.ok && res\.status === 200/);
  });
});

describe('v7.2.2 sprites ready before a tab opens', () => {
  it('warm-up covers UI icons, every villager portrait/icon and bundle icons, once each', () => {
    const l = warmList();
    expect(new Set(l).size).toBe(l.length);
    for (const s of Object.values(core.ui)) expect(l).toContain('./' + s.s);
    for (const n of core.npcs) { if (n.portrait) expect(l).toContain('./' + n.portrait.s); if (n.icon) expect(l).toContain('./' + n.icon.s); }
    expect(l.every((u) => u.startsWith('./sprites/'))).toBe(true);
    expect(warmList(['./sprites/items/x.png'])).toContain('./sprites/items/x.png');
  });
  it('remembers shown sprites without growing forever', () => {
    for (let i = 0; i < 400; i++) noteSprite('./sprites/items/' + i + '.png');
    expect(isWarm('./sprites/items/1.png')).toBe(false);
  });
  it('warmed sprites paint eagerly and synchronously; the rest stay lazy', () => {
    expect(UI).toMatch(/loading=\{eager \|\| warm \? 'eager' : 'lazy'\}/);
    expect(UI).toMatch(/decoding=\{warm \? 'sync' : 'async'\}/);
    expect(UI).toMatch(/fetchPriority=\{eager \? 'high' : undefined\}/);
  });
  it('warm-up starts after the first screen, in idle time', () => {
    expect(APP).toMatch(/setTimeout\(\(\) => startWarmup\(\[VillagerScreen\.preload, ItemScreen\.preload, MapsScreen\.preload, loadGifts, loadSchedules\]\), 700\)/);
  });
});
