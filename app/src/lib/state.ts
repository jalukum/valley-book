// Per-farm progress, persisted to localStorage. Tiny external store + React hook.
import { useSyncExternalStore } from 'react';
import { weatherChoices, defaultWeather } from './weather';
import { type FarmType, isFarmType } from './farms';

export type Weather = 'sun' | 'rain' | 'storm' | 'wind' | 'snow' | 'green';
/** Storms and Green Rain count as rain (crops watered, rain fish bite); wind and snow count as dry. */
export const isRaining = (w: Weather | string) => w === 'rain' || w === 'storm' || w === 'green';
export type Auto = 'auto' | 'yes' | 'no';
export interface Setup {
  mine: number; // deepest Mines floor reached (0..120)
  skullDepth: number; // deepest Skull Cavern floor
  tools: { pickaxe: number; axe: number; hoe: number; can: number }; // 0 basic, 1 copper, 2 steel, 3 gold, 4 iridium
  rod: 'auto' | 'none' | 'bamboo' | 'fiberglass' | 'iridium';
  house: number; // 0 starter, 1 kitchen, 2 nursery, 3 cellar
  backpack: number; // 12 | 24 | 36
  island: Auto; skull: Auto; greenhouse: Auto;
  keys: Record<string, boolean>; // skullKey, rustyKey, clubCard, talisman, magnifier, boat, kegs, jars
  raccoon: number; // 0 big tree standing, 1 stump fallen, 2 stump repaired
  raccoonDone: number; // raccoon requests completed
  route?: 'cc' | 'joja';
}
export interface Profile {
  id: string;
  name: string;
  farmType: FarmType; // map picked at character creation (wiki: Farm_Maps)
  created: number;
  date: { season: number; day: number; year: number };
  weather: Weather;
  time: number; // minutes after midnight, 360 (6:00 AM) .. 1560 (2:00 AM next day)
  flags: { cc: 'auto' | 'yes' | 'no'; bus: 'auto' | 'yes' | 'no'; bridge: boolean };
  cc: {
    mode: 'standard' | 'remix';
    route: 'cc' | 'joja';
    checked: Record<string, number[]>; // bundle id -> item indices deposited
    remix: Record<string, number[]>; // remix room -> chosen option per slot (or chosen options for pick-N slots)
    joja: Record<string, boolean>; // 'membership' | room name
  };
  done: Record<string, Record<string, number>>; // collection -> id -> 1 (or a count)
  hearts: Record<string, number>;
  gifts: Record<string, number>;
  giftWeek: string; // season-year-week key when gifts were last auto-reset
  spouse: string | null;
  perf: { stardrops: Record<string, number>; obelisks: Record<string, number>; goldClock: number; skills: Record<string, number>; waivers: number };
  setup: Setup;
  recent: string[]; // v7.0 recently viewed, newest first: 'item:<qid>' | 'villager:<id>'
}
export interface Store { activeId: string; profiles: Profile[] }

const KEY = 'sdv:profiles';
export const RECENT_MAX = 10;
const uid = () => Math.random().toString(36).slice(2, 10);
export function newProfile(name = 'My Farm', farmType: FarmType = 'standard'): Profile {
  return {
    id: uid(), name, farmType, created: Date.now(),
    date: { season: 0, day: 1, year: 1 }, weather: 'sun', time: 600,
    flags: { cc: 'auto', bus: 'auto', bridge: false },
    cc: { mode: 'standard', route: 'cc', checked: {}, remix: {}, joja: {} },
    done: {}, hearts: {}, gifts: {}, giftWeek: weekKey({ season: 0, day: 1, year: 1 }), spouse: null,
    perf: { stardrops: {}, obelisks: {}, goldClock: 0, skills: {}, waivers: 0 },
    setup: newSetup(), recent: [],
  };
}
export const newSetup = (): Setup => ({ mine: 0, skullDepth: 0, tools: { pickaxe: 0, axe: 0, hoe: 0, can: 0 }, rod: 'auto', house: 0, backpack: 12,
  island: 'auto', skull: 'auto', greenhouse: 'auto', keys: {}, raccoon: 0, raccoonDone: 0 });
export const weekKey = (d: { season: number; day: number; year: number }) => `${d.year}-${d.season}-${Math.floor((d.day - 1) / 7)}`;

/** Fill in any fields missing from older / imported profiles. */
export function normalizeProfile(p: any): Profile {
  const base = newProfile(typeof p?.name === 'string' ? p.name : 'Imported Farm');
  if (!p || typeof p !== 'object') return base;
  const out: Profile = {
    ...base, ...p,
    id: typeof p.id === 'string' ? p.id : base.id,
    date: { ...base.date, ...(p.date || {}) },
    flags: { ...base.flags, ...(p.flags || {}) },
    cc: { ...base.cc, ...(p.cc || {}), checked: { ...(p.cc?.checked || {}) }, remix: { ...(p.cc?.remix || {}) }, joja: { ...(p.cc?.joja || {}) } },
    done: { ...(p.done || {}) }, hearts: { ...(p.hearts || {}) }, gifts: { ...(p.gifts || {}) },
    perf: { ...base.perf, ...(p.perf || {}), stardrops: { ...(p.perf?.stardrops || {}) }, obelisks: { ...(p.perf?.obelisks || {}) }, skills: { ...(p.perf?.skills || {}) } },
    setup: { ...base.setup, ...(p.setup || {}), tools: { ...base.setup.tools, ...(p.setup?.tools || {}) }, keys: { ...(p.setup?.keys || {}) } },
  };
  out.recent = Array.isArray(p.recent) ? p.recent.filter((x: unknown) => typeof x === 'string').slice(0, RECENT_MAX) : [];
  if (!isFarmType(out.farmType)) out.farmType = 'standard'; // older saves had no farm type: default Standard, user can change it
  if (!['sun', 'rain', 'storm', 'wind', 'snow', 'green'].includes(out.weather)) out.weather = 'sun';
  out.setup.mine = clamp(Math.round(out.setup.mine), 0, 120);
  out.date.season = clamp(Math.round(out.date.season), 0, 3);
  out.date.day = clamp(Math.round(out.date.day), 1, 28);
  out.date.year = clamp(Math.round(out.date.year), 1, 999);
  out.time = clamp(Math.round(out.time / 10) * 10, 360, 1560);
  // Wind is cosmetic (plays as sunny); any weather the date can't have falls back to the forecast default.
  if (!weatherChoices(out.date.season, out.date.day, out.date.year).includes(out.weather)) out.weather = defaultWeather(out.date.season, out.date.day, out.date.year);
  return out;
}
export const clamp = (n: number, a: number, b: number) => (Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : a);

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const profiles = (s.profiles || []).map(normalizeProfile);
      if (profiles.length) return { activeId: profiles.some((p: Profile) => p.id === s.activeId) ? s.activeId : profiles[0].id, profiles };
    }
  } catch { /* ignore corrupt storage */ }
  const p = newProfile();
  return { activeId: p.id, profiles: [p] };
}

let store: Store = typeof localStorage !== 'undefined' ? read() : (() => { const p = newProfile(); return { activeId: p.id, profiles: [p] }; })();
const listeners = new Set<() => void>();
function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota */ }
  listeners.forEach((l) => l());
}
export const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const getStore = () => store;
export const active = () => store.profiles.find((p) => p.id === store.activeId) || store.profiles[0];

export function useStore() { return useSyncExternalStore(subscribe, getStore, getStore); }
export function useProfile(): Profile { const s = useStore(); return s.profiles.find((p) => p.id === s.activeId) || s.profiles[0]; }

/** Immutable-ish update of the active profile via a draft-mutating callback. */
export function update(fn: (p: Profile) => void) {
  const cur = active();
  const draft: Profile = structuredClone(cur);
  fn(draft);
  noteUndo(cur, draft);
  store = { ...store, profiles: store.profiles.map((p) => (p.id === cur.id ? draft : p)) };
  emit();
}

// ---------- v7.0 undo after a tick ----------
// Any update that only changes progress (ticks, hearts, gifts, bundles, perfection, setup keys) offers a few seconds of Undo,
// which puts those fields back exactly as they were. Date / weather / time / recently-viewed changes never offer it.
export const UNDO_FIELDS = ['done', 'hearts', 'gifts', 'cc', 'perf', 'setup', 'flags', 'spouse'] as const;
type UndoField = (typeof UNDO_FIELDS)[number];
export interface UndoEntry { id: number; profileId: string; before: Pick<Profile, UndoField>; label: string; at: number }
let undo: UndoEntry | null = null;
let undoSeq = 0;
const undoL = new Set<() => void>();
const undoEmit = () => undoL.forEach((l) => l());
export const getUndo = () => undo;
export function useUndo() { return useSyncExternalStore((l) => { undoL.add(l); return () => undoL.delete(l); }, getUndo, getUndo); }
export function clearUndo() { if (undo) { undo = null; undoEmit(); } }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** What changed, in plain words, for the Undo bar. */
export function undoLabel(a: Profile, b: Profile): string | null {
  const keys = (Object.keys({ ...a, ...b }) as (keyof Profile)[]).filter((k) => !same(a[k], b[k]));
  if (!keys.length || keys.some((k) => !(UNDO_FIELDS as readonly string[]).includes(k))) return null;
  const k = keys[0] as UndoField;
  const grew = (x: unknown, y: unknown) => JSON.stringify(y).length >= JSON.stringify(x).length;
  if (k === 'done') return grew(a.done, b.done) ? 'Ticked off' : 'Unticked';
  if (k === 'cc') return grew(a.cc, b.cc) ? 'Bundle updated' : 'Bundle item unticked';
  if (k === 'hearts') return 'Hearts changed';
  if (k === 'gifts') return grew(a.gifts, b.gifts) ? 'Gift logged' : 'Gift removed';
  if (k === 'perf') return 'Perfection updated';
  if (k === 'spouse') return 'Spouse changed';
  return 'Setup changed';
}
let undoing = false;
function noteUndo(cur: Profile, next: Profile) {
  if (undoing) return;
  const label = undoLabel(cur, next);
  if (!label) return;
  const before = {} as Pick<Profile, UndoField>;
  for (const f of UNDO_FIELDS) (before as any)[f] = structuredClone(cur[f]);
  undo = { id: ++undoSeq, profileId: cur.id, before, label, at: Date.now() };
  undoEmit();
}
/** Put the last tick back exactly as it was. */
export function applyUndo() {
  const u = undo;
  if (!u) return false;
  undo = null;
  const p = store.profiles.find((x) => x.id === u.profileId);
  if (p) {
    undoing = true;
    try { store = { ...store, profiles: store.profiles.map((x) => (x.id === u.profileId ? { ...x, ...structuredClone(u.before) } : x)) }; emit(); } finally { undoing = false; }
  }
  undoEmit();
  return !!p;
}
export function setStore(s: Store) { store = s; emit(); }
export function switchProfile(id: string) { store = { ...store, activeId: id }; emit(); }
export function addProfile(name: string, farmType: FarmType = 'standard') { const p = newProfile(name, farmType); store = { activeId: p.id, profiles: [...store.profiles, p] }; emit(); return p; }
export function renameProfile(id: string, name: string, farmType?: FarmType) { store = { ...store, profiles: store.profiles.map((p) => (p.id === id ? { ...p, name, ...(farmType ? { farmType } : {}) } : p)) }; emit(); }
export function deleteProfile(id: string) {
  let profiles = store.profiles.filter((p) => p.id !== id);
  if (!profiles.length) profiles = [newProfile()];
  store = { activeId: profiles.some((p) => p.id === store.activeId) ? store.activeId : profiles[0].id, profiles };
  emit();
}
export function exportProfiles(ids?: string[]) {
  const profiles = ids ? store.profiles.filter((p) => ids.includes(p.id)) : store.profiles;
  return JSON.stringify({ app: 'valley-book', version: 1, exported: new Date().toISOString(), profiles }, null, 1);
}
/** Import profiles from exported JSON text. Profiles whose id already exists get a new id (kept side by side). */
export function parseImport(text: string): Profile[] {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : Array.isArray(data?.profiles) ? data.profiles : data?.date ? [data] : null;
  if (!list || !list.length) throw new Error('No farm profiles found in that data.');
  return list.map(normalizeProfile);
}
export function importProfiles(list: Profile[]) {
  const ids = new Set(store.profiles.map((p) => p.id));
  const fresh = list.map((p) => (ids.has(p.id) ? { ...p, id: uid() } : p));
  store = { activeId: fresh[0].id, profiles: [...store.profiles, ...fresh] };
  emit();
}

// ---------- v7.0 recently viewed (per farm) ----------
export function addRecent(key: string) {
  const cur = active();
  if (cur.recent?.[0] === key) return;
  update((p) => { p.recent = [key, ...(p.recent || []).filter((k) => k !== key)].slice(0, RECENT_MAX); });
}
export function clearRecent() { update((p) => { p.recent = []; }); }

// ---------- small helpers ----------
export const isDone = (p: Profile, col: string, id: string) => (p.done[col]?.[id] ?? 0) > 0;
export const count = (p: Profile, col: string, id: string) => p.done[col]?.[id] ?? 0;
export function toggle(col: string, id: string) {
  update((p) => { const m = (p.done[col] ||= {}); if (m[id]) delete m[id]; else m[id] = 1; });
}
export function setCount(col: string, id: string, n: number) {
  update((p) => { const m = (p.done[col] ||= {}); if (n > 0) m[id] = n; else delete m[id]; });
}

// ---------- app-level UI flags (not per farm) ----------
const UI_KEY = 'sdv:ui';
export interface UiFlags { onboarded: boolean; tourSeen: boolean; tourOpen?: boolean }
let ui: UiFlags = (() => { try { return { onboarded: false, tourSeen: false, ...JSON.parse(localStorage.getItem(UI_KEY) || '{}') }; } catch { return { onboarded: false, tourSeen: false }; } })();
const uiL = new Set<() => void>();
export const getUi = () => ui;
export function setUi(patch: Partial<UiFlags>) {
  ui = { ...ui, ...patch };
  try { const { tourOpen, ...save } = ui; void tourOpen; localStorage.setItem(UI_KEY, JSON.stringify(save)); } catch { /* quota */ }
  uiL.forEach((l) => l());
}
export function useUi() { return useSyncExternalStore((l) => { uiL.add(l); return () => uiL.delete(l); }, getUi, getUi); }

// ---------- weather choices per season ----------
export const WEATHER_LABEL: Record<Weather, string> = { sun: 'Sunny', rain: 'Rain', storm: 'Storm', wind: 'Windy', snow: 'Snow', green: 'Green rain' };
/** Weather that can happen in each season (wiki: Weather). Green rain is summer only, snow winter only, windy (debris) spring/fall. */
export function weatherFor(season: number): Weather[] {
  return [['sun', 'rain', 'storm', 'wind'], ['sun', 'rain', 'storm', 'green'], ['sun', 'rain', 'storm', 'wind'], ['sun', 'snow']][season] as Weather[];
}
export const weatherIcon = (w: Weather, season: number) =>
  ({ sun: 'weather:Sun', rain: 'weather:Rain2', storm: 'weather:Storm', snow: 'weather:Snow', green: 'weather:GreenRain', wind: season === 2 ? 'weather:WindFall' : 'weather:WindSpring' })[w];
