import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sfxFor, SOUNDS, sfxEnabled, setSfxEnabled, onSfxChange, makeThrottle, SFX_GAIN, SFX_KEY } from '../lib/sfx';
const raw = (g: Record<string, unknown>) => Object.values(g)[0] as string;
const more = raw(import.meta.glob('../screens/Progress.tsx', { query: '?raw', import: 'default', eager: true }));
const main = raw(import.meta.glob('../main.tsx', { query: '?raw', import: 'default', eager: true }));
const sfxSrc = raw(import.meta.glob('../lib/sfx.ts', { query: '?raw', import: 'default', eager: true }));
const onb = raw(import.meta.glob('../components/Onboarding.tsx', { query: '?raw', import: 'default', eager: true }));
const files = Object.keys(import.meta.glob('../../public/sfx/*.wav', { query: '?url', import: 'default' }));

describe('v6.9 tap sound effects', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) });
  });
  it('ships all six sounds', () => {
    expect(files.map((f) => f.split('/').pop()).sort()).toEqual(SOUNDS.map((s) => s + '.wav').sort());
  });
  it('maps controls to sounds', () => {
    expect(sfxFor({ tag: 'BUTTON', cls: 'btn' })).toBe('button-tap');
    expect(sfxFor({ tag: 'A', cls: 'nav-row' })).toBe('button-tap');
    expect(sfxFor({ tag: 'A', cls: 'tab on' })).toBe('nav-tab-switch');           // bottom tab bar
    expect(sfxFor({ tag: 'BUTTON', role: 'tab', cls: 'map-tab' })).toBe('nav-tab-switch'); // Maps / Friends / day tabs
    expect(sfxFor({ tag: 'A', cls: 'bubble b0' })).toBe('nav-tab-switch');        // home page section bubbles
    expect(sfxFor({ tag: 'A', cls: 'back', label: 'Back' })).toBe('back-close');
    expect(sfxFor({ tag: 'BUTTON', cls: 'btn sm', sfx: 'close' })).toBe('back-close'); // sheet Done / Cancel
    expect(sfxFor({ tag: 'BUTTON', cls: 'chip', pressed: 'false' })).toBe('toggle'); // filter chips
    expect(sfxFor({ tag: 'BUTTON', cls: 'chip on', pressed: 'true' })).toBe('toggle');
    expect(sfxFor({ tag: 'BUTTON', role: 'switch', cls: 'nav-row' })).toBe('toggle');
    expect(sfxFor({ tag: 'BUTTON', cls: 'btn primary', sfx: 'save' })).toBe('save-success');
    expect(sfxFor({ tag: 'BUTTON', sfx: 'none' })).toBe(null);
  });
  it('plays the checklist sound only when ticking, not unticking', () => {
    for (const cls of ['row check', 'row-btn', 'tick', 'chip check-chip', 'tcell']) {
      expect(sfxFor({ tag: 'BUTTON', cls, pressed: 'false' })).toBe('checklist-complete');
      expect(sfxFor({ tag: 'BUTTON', cls: cls + ' on', pressed: 'true' })).toBe('toggle');
    }
    expect(sfxFor({ tag: 'INPUT', type: 'checkbox', checked: true })).toBe('checklist-complete');
    expect(sfxFor({ tag: 'INPUT', type: 'checkbox', checked: false })).toBe('toggle');
  });
  it('stays silent for text fields and the time slider', () => {
    expect(sfxFor({ tag: 'INPUT', type: 'range' })).toBe(null);
    expect(sfxFor({ tag: 'INPUT', type: 'search' })).toBe(null);
    expect(sfxFor({ tag: 'TEXTAREA' })).toBe(null);
  });
  it('is on by default and remembers the More toggle', () => {
    expect(sfxEnabled()).toBe(true);
    let n = 0; const off = onSfxChange(() => n++);
    setSfxEnabled(false);
    expect(localStorage.getItem(SFX_KEY)).toBe('0'); expect(sfxEnabled()).toBe(false);
    setSfxEnabled(true);
    expect(sfxEnabled()).toBe(true); expect(n).toBe(2); off();
    expect(more).toMatch(/<SoundToggle \/>/);
    expect(more).toMatch(/role="switch" aria-checked=\{on\}/);
    expect(more).toMatch(/<b>Sound effects<\/b>/);
  });
  it('throttles the same sound to once per 60 ms, but not different sounds', () => {
    const t = makeThrottle(60);
    expect(t('toggle', 0)).toBe(true); expect(t('toggle', 30)).toBe(false); expect(t('button-tap', 30)).toBe(true); expect(t('toggle', 61)).toBe(true);
  });
  it('uses one AudioContext at gain 0.35, unlocked on the first gesture, muted while hidden, installed once', () => {
    expect(SFX_GAIN).toBe(0.35);
    expect(sfxSrc.match(/new AC\(\)/g)!.length).toBe(1);
    expect(sfxSrc).toMatch(/\['pointerdown', 'touchend', 'keydown'\]/);
    expect(sfxSrc).toMatch(/if \(doc\.hidden\) void ctx\.suspend\(\)/);
    expect(sfxSrc).toMatch(/if \(!sfxEnabled\(\) \|\| document\.hidden/);
    expect(main).toMatch(/installSfx\(document\);/);
    expect(onb).toMatch(/data-sfx="save" onClick=\{finish\}/);
  });
});
