import { core } from '../data';

// v7.2.2: sprites are hundreds of tiny PNGs. The service worker already has them on the phone, but each tab still had
// to fetch + decode its pictures the moment it opened, so they popped in late. After the first screen is drawn we now
// quietly fetch and decode the pictures the other tabs show (and the screen chunks) in idle moments, so opening a tab
// paints them straight away.

const warmed = new Set<string>();
const keep: HTMLImageElement[] = []; // holding them keeps the decoded pictures in memory
const RECENT_KEY = 'sdv:warm';
const RECENT_MAX = 160;
let recent: string[] = [];

/** True once a sprite URL has been fetched and decoded this session (so it can paint eagerly and synchronously). */
export const isWarm = (u: string) => warmed.has(u);

/** Remember sprites that were actually shown, so next launch warms the ones this player looks at. */
export function noteSprite(u: string) {
  if (recent[recent.length - 1] === u) return;
  const i = recent.indexOf(u);
  if (i >= 0) recent.splice(i, 1);
  recent.push(u);
  if (recent.length > RECENT_MAX) recent = recent.slice(-RECENT_MAX);
}

function loadRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(-RECENT_MAX) : []; } catch { return []; }
}
function saveRecent() {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(-RECENT_MAX))); } catch { /* quota */ }
}

/** The pictures the tab hubs show: UI icons, villager portraits and icons, bundle icons. Paths as the Sprite component writes them. */
export function warmList(extra: string[] = []): string[] {
  const out: string[] = [];
  const add = (s: string | null | undefined) => { if (s) out.push('./' + s); };
  Object.values(core.ui).forEach((s) => add(s?.s));
  core.npcs.forEach((n) => { add(n.portrait?.s); add(n.icon?.s); });
  core.rooms.forEach((r) => r.bundles?.forEach((b) => { add(b.icon?.s); add(b.colorIcon?.s); }));
  return [...new Set([...out, ...extra])];
}

function warmOne(u: string): Promise<void> {
  if (warmed.has(u)) return Promise.resolve();
  return new Promise((res) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = u;
    const done = () => { if (img.naturalWidth > 0) { warmed.add(u); keep.push(img); } res(); };
    if (img.decode) img.decode().then(done, done);
    else { img.onload = done; img.onerror = done; }
  });
}

type Idle = (cb: () => void) => void;
const idle: Idle = (cb) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 1500 });
  else setTimeout(cb, 50); // iOS Safari has no requestIdleCallback
};

let started = false;
/** Start idle warm-up: screen chunks first, then sprites in small batches. Safe to call more than once. */
export function startWarmup(chunks: (() => Promise<unknown>)[]) {
  if (started || typeof window === 'undefined') return;
  started = true;
  recent = loadRecent();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveRecent(); });
  window.addEventListener('pagehide', saveRecent);
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const lite = !!conn?.saveData && !navigator.serviceWorker?.controller; // only hold back when it would cost real data
  const queue = lite ? [] : warmList(recent);
  let ci = 0;
  const step = () => {
    if (ci < chunks.length) { const c = chunks[ci++]; c().catch(() => {}).finally(() => idle(step)); return; }
    const batch = queue.splice(0, 8);
    if (!batch.length) { try { performance.mark('vb-warm-done'); } catch { /* old browsers */ } return; }
    Promise.all(batch.map(warmOne)).then(() => idle(step));
  };
  idle(step);
}
