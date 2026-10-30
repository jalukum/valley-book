// v6.9 tap sound effects. One shared AudioContext (created + unlocked on the first touch/click/key, which iOS requires),
// the six short WAVs fetched + decoded once after that gesture, played through one GainNode at 0.35.
// Sounds are picked centrally by a capture-phase click listener (sfxFor), so each tap makes at most one sound and screens
// don't need their own calls. data-sfx="<sound>|none" on an element (or an ancestor) overrides the guess.
export const SOUNDS = ['button-tap', 'nav-tab-switch', 'back-close', 'toggle', 'checklist-complete', 'save-success'] as const;
export type Sound = (typeof SOUNDS)[number];
export const SFX_GAIN = 0.35, SFX_THROTTLE_MS = 60, SFX_KEY = 'sdv:sfx';
const ALIAS: Record<string, Sound | null> = { tap: 'button-tap', nav: 'nav-tab-switch', tab: 'nav-tab-switch', back: 'back-close', close: 'back-close', toggle: 'toggle', check: 'checklist-complete', save: 'save-success', none: null };

/** What the element is, as read off the DOM at tap time (before React applies the change). */
export interface Tapped { tag: string; role?: string | null; cls?: string; pressed?: string | null; checked?: boolean | null; type?: string | null; sfx?: string | null; label?: string | null }
/** Rows/boxes that tick something off a checklist (bundle items, collections, tasks, shipping grid, notes, setup keys). */
const CHECKLIST = /(^|\s)(check|row-btn|tick|check-chip|tcell)(\s|$)/;

/** The one sound for a tap, or null for none. Ticking a checklist row ON = checklist-complete; unticking = toggle. */
export function sfxFor(t: Tapped): Sound | null {
  if (t.sfx != null) return t.sfx in ALIAS ? ALIAS[t.sfx] : (SOUNDS as readonly string[]).includes(t.sfx) ? (t.sfx as Sound) : 'button-tap';
  const tag = t.tag.toLowerCase(), cls = t.cls || '';
  if (tag === 'input') {
    if (t.type === 'checkbox') return t.checked ? 'checklist-complete' : 'toggle'; // `checked` is already the new state on click
    if (t.type === 'radio') return 'toggle';
    return null; // text fields, the time slider (range): no sound
  }
  if (tag === 'select' || tag === 'textarea' || tag === 'label') return null;
  if (t.role === 'switch') return 'toggle';
  if (t.role === 'tab' || /(^|\s)(tab|bubble|map-tab)(\s|$)/.test(cls)) return 'nav-tab-switch';
  if (/(^|\s)back(\s|$)/.test(cls) || t.label === 'Back' || t.label === 'Close') return 'back-close';
  if (t.pressed != null) {
    if (CHECKLIST.test(cls)) return t.pressed === 'true' ? 'toggle' : 'checklist-complete';
    return 'toggle'; // filter chips, weather picks, favourites
  }
  if (t.role === 'radio') return 'toggle';
  return 'button-tap';
}

const TAPPABLE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="radio"], input, select, textarea, label, [data-sfx]';
export function describe(el: Element): Tapped {
  const own = el.closest('[data-sfx]');
  const i = el as HTMLInputElement;
  return {
    tag: el.tagName, role: el.getAttribute('role'), cls: el.getAttribute('class') || '', pressed: el.getAttribute('aria-pressed'),
    checked: el.tagName === 'INPUT' ? i.checked : null, type: el.tagName === 'INPUT' ? i.type : null,
    sfx: own ? own.getAttribute('data-sfx') : null, label: el.getAttribute('aria-label'),
  };
}

// --- setting (default ON, persisted) ---
const listeners = new Set<() => void>();
export function sfxEnabled(): boolean {
  try { return localStorage.getItem(SFX_KEY) !== '0'; } catch { return true; }
}
export function setSfxEnabled(on: boolean) {
  try { localStorage.setItem(SFX_KEY, on ? '1' : '0'); } catch { /* private mode */ }
  listeners.forEach((f) => f());
}
export const onSfxChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** Same sound at most once per SFX_THROTTLE_MS. Exported for tests. */
export function makeThrottle(ms = SFX_THROTTLE_MS) {
  const last = new Map<string, number>();
  return (s: string, now: number) => { const t = last.get(s); if (t != null && now - t < ms) return false; last.set(s, now); return true; };
}

// --- Web Audio ---
let ctx: AudioContext | null = null, gain: GainNode | null = null;
const buffers = new Map<Sound, AudioBuffer>();
let loading: Promise<void> | null = null;
const throttle = makeThrottle();

function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) void ctx.resume(); return; }
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AC = w.AudioContext || w.webkitAudioContext;
  if (!AC) return;
  const c = (ctx = new AC());
  gain = c.createGain();
  gain.gain.value = SFX_GAIN;
  gain.connect(c.destination);
  // iOS: a (silent) sound started inside the gesture unlocks output for the rest of the session
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, 22050); src.connect(c.destination); src.start(0);
  if (c.state === 'suspended') void c.resume();
  loading = Promise.all(SOUNDS.map(async (s) => {
    try {
      const data = await (await fetch(`./sfx/${s}.wav`)).arrayBuffer();
      // callback form too, for older Safari
      const buf = await new Promise<AudioBuffer>((ok, bad) => { const p = c.decodeAudioData(data, ok, bad); if (p && typeof p.then === 'function') p.then(ok, bad); });
      buffers.set(s, buf);
    } catch { /* missing/undecodable: that sound stays silent */ }
  })).then(() => {});
}

export function playSfx(s: Sound) {
  if (!sfxEnabled() || document.hidden || !ctx || !gain) return;
  if (!throttle(s, performance.now())) return;
  const go = () => {
    const buf = buffers.get(s);
    if (!buf || !ctx || !gain || document.hidden) return;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(gain); src.start(0);
  };
  if (buffers.has(s)) go();
  else if (loading) { const t = performance.now(); void loading.then(() => { if (performance.now() - t < 250) go(); }); } // first tap: play if it decodes quickly
}

let installed = false;
/** Install once at startup: unlock on the first gesture, one sound per click, mute while hidden. Scrolls, map pinch/pan and
 *  slider drags never produce a click on a tappable element, so they stay silent. */
export function installSfx(doc: Document = document) {
  if (installed) return; installed = true;
  const first = () => unlock();
  for (const ev of ['pointerdown', 'touchend', 'keydown']) doc.addEventListener(ev, first, { capture: true, passive: true });
  doc.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    if (!target || !target.closest) return;
    const el = target.closest(TAPPABLE);
    if (!el) { if (target.classList.contains('sheet-wrap')) playSfx('back-close'); return; } // tapping a sheet's backdrop closes it
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
    const s = sfxFor(describe(el));
    if (s) playSfx(s);
  }, { capture: true });
  doc.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (doc.hidden) void ctx.suspend(); else void ctx.resume();
  });
}
