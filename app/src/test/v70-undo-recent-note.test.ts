import { describe, it, expect } from 'vitest';
import { update, active, toggle, getUndo, applyUndo, clearUndo, addRecent, clearRecent, normalizeProfile, RECENT_MAX, undoLabel } from '../lib/state';
import { noteToShow, APP_VERSION, CHANGELOG, newer } from '../lib/changelog';

describe('v7.0 undo after a tick', () => {
  it('a tick offers Undo, and Undo restores the exact previous state', () => {
    update((p) => { p.hearts.Abigail = 3; p.done.fish = { '(O)128': 1 }; });
    clearUndo();
    const before = JSON.stringify(active());
    toggle('fish', '(O)130');
    expect(getUndo()?.label).toBe('Ticked off');
    expect(active().done.fish['(O)130']).toBe(1);
    expect(applyUndo()).toBe(true);
    expect(JSON.stringify(active())).toBe(before);
    expect(getUndo()).toBeNull();
  });
  it('unticking, hearts, gifts and bundle ticks are undoable too', () => {
    toggle('fish', '(O)128'); expect(getUndo()?.label).toBe('Unticked'); applyUndo(); expect(active().done.fish['(O)128']).toBe(1);
    update((p) => { p.hearts.Abigail = 4; }); expect(getUndo()?.label).toBe('Hearts changed'); applyUndo(); expect(active().hearts.Abigail).toBe(3);
    update((p) => { p.gifts.Abigail = 1; }); expect(getUndo()?.label).toBe('Gift logged');
    update((p) => { p.cc.checked['Spring Crops'] = [0]; }); expect(getUndo()?.label).toBe('Bundle updated');
    applyUndo(); expect(active().cc.checked['Spring Crops']).toBeUndefined(); expect(active().gifts.Abigail).toBe(1);
  });
  it('date / weather / recently viewed changes never offer Undo', () => {
    clearUndo();
    update((p) => { p.date = { ...p.date, day: 5 }; }); expect(getUndo()).toBeNull();
    update((p) => { p.weather = 'rain'; }); expect(getUndo()).toBeNull();
    addRecent('item:(O)128'); expect(getUndo()).toBeNull();
    const a = active(); expect(undoLabel(a, { ...a, date: { ...a.date, day: 6 }, gifts: {} })).toBeNull();
  });
});

describe('v7.0 recently viewed', () => {
  it('newest first, no duplicates, at most 10, per farm, clearable', () => {
    clearRecent();
    for (let i = 0; i < 14; i++) addRecent('item:(O)' + (100 + i));
    addRecent('villager:Abigail'); addRecent('item:(O)110');
    const r = active().recent;
    expect(r.length).toBe(RECENT_MAX);
    expect(r[0]).toBe('item:(O)110'); expect(r[1]).toBe('villager:Abigail');
    expect(new Set(r).size).toBe(r.length);
    clearRecent(); expect(active().recent).toEqual([]);
    expect(normalizeProfile({ name: 'Old farm' }).recent).toEqual([]);
  });
});

describe('v7.0 update note', () => {
  it('never on first install, once per newer version', () => {
    expect(APP_VERSION).toBe('7.2.3');
    expect(CHANGELOG.find((c) => c.version === '7.0')!.items.some((x) => /Graphical bug fixes/.test(x))).toBe(true);
    expect(CHANGELOG.find((c) => c.version === '7.1')!.items.some((x) => /Stars/.test(x) && /Heart scenes/.test(x))).toBe(true);
    expect(noteToShow(null, false)).toBeNull(); // brand-new install
    expect(noteToShow(null, true)).toBe('7.2.3'); // had Valley Book before
    expect(noteToShow('7.0', true)).toBe('7.2.3');
    expect(noteToShow('7.2', true)).toBe('7.2.3');
    expect(noteToShow('7.2.1', true)).toBe('7.2.3');
    expect(noteToShow('7.2.2', true)).toBe('7.2.3');
    expect(noteToShow('7.2.3', true)).toBeNull(); // already seen
    expect(newer('7.0.1', '7.0')).toBe(true); expect(newer('7.0', '7.0.0')).toBe(false);
  });
});
