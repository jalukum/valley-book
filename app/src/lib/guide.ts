// The daily guide engine: what this save can actually do on the chosen day, ranked.
// Pure functions of (core, profile[, gifts]) so they can be unit-tested (guide.test.ts).
import type { Core, Fish, GCrop, GEvent, GQuest, GiftData, ShopOffer, BItem } from '../types';
import { isRaining, type Profile, type Weather } from './state';
import { type ActiveBundle, activeBundles, bundleDone, ccProgress, jojaProgress, worldFlags, walnutsFound, walnutTotal, perfection, doneCount, heartsTarget, farmerLevel, CC_ROOMS, JOJA_KEYS } from './progress';
import { fishSeasons, fishWeather } from './fish';
import { festivalOn, FESTIVALS } from './festivals';
import { items } from '../data';
import { type FarmType, farmFish, farmForage, farmInfo } from './farms';

export const SEASON_KEYS = ['spring', 'summer', 'fall', 'winter'];
export const SEASON_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'];
export const DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export type Label = 'Quest' | 'Bundle' | 'Money' | 'Friendship';
export interface Icon { qid?: string | null; ui?: string; npc?: string }
export interface Task { id: string; label: Label; title: string; why: string; where?: string; when?: string; score: number; icon: Icon; href?: string; tick?: { col: string; id: string } }

const absDay = (season: number, day: number, year: number) => (year - 1) * 112 + season * 28 + day;
const isDoneIn = (p: Profile, col: string, id: string) => (p.done[col]?.[id] ?? 0) > 0;
const nm = (qid?: string | null) => (qid && items[qid]?.n) || '';
const price = (qid?: string | null) => (qid && items[qid]?.p) || 0;
const g = (n: number) => n.toLocaleString('en-US') + 'g';

// ---------- what the save can reach today ----------
export interface Access {
  season: number; seasonKey: string; seasonName: string; day: number; year: number; dow: number; dowName: string; daysPlayed: number;
  weather: Weather; rain: boolean; festival: (typeof FESTIVALS)[number] | null;
  rod: boolean; fishing: number; farming: number; crabPots: boolean;
  minesOpen: boolean; mine: number; skullKey: boolean; skull: boolean; bus: boolean; island: boolean; qi: boolean;
  greenhouse: boolean; railroad: boolean; woods: boolean; sewer: boolean; bugLair: boolean; swamp: boolean; bridge: boolean;
  ccRoute: 'cc' | 'joja'; ccRestored: boolean; ccDone: boolean; jojaMember: boolean;
  pierreOpen: boolean; jojaOpen: boolean; cartToday: boolean; nightMarket: boolean; ordersBoard: boolean;
  jars: boolean; kegs: boolean; raccoon: number;
  farmType: FarmType; axe: number; pickaxe: number; combat: number;
}
const auto = (v: 'auto' | 'yes' | 'no', inferred: boolean) => (v === 'auto' ? inferred : v === 'yes');

export function access(core: Core, p: Profile): Access {
  const { season, day, year } = p.date;
  const dow = (day - 1) % 7;
  const d = absDay(season, day, year);
  const s = p.setup;
  const wf = worldFlags(core, p);
  const cc = ccProgress(core, p);
  const route = p.cc.route;
  const festival = festivalOn(season, day);
  const skill = (k: string) => p.perf.skills[k] ?? 0;
  const mine = Math.max(s.mine, s.keys.skullKey ? 120 : 0);
  const minesOpen = d >= absDay(0, 5, 1);
  const skullKey = mine >= 120 || !!s.keys.skullKey || isDoneIn(p, 'quests', 'the-skull-key');
  const bus = wf.busRepaired;
  const ccDone = route === 'cc' ? cc.complete : jojaProgress(core, p).complete;
  const pantry = route === 'joja' ? !!p.cc.joja.Pantry : cc.roomsDone.includes('Pantry');
  const walnuts = walnutsFound(core, p);
  const islandInferred = walnuts > 0 || Object.keys(p.done.island || {}).length > 0 || !!s.keys.boat;
  const island = auto(s.island, islandInferred) && (s.island === 'yes' || wf.ccRestored || islandInferred);
  const museum = Object.keys(p.done.museum || {}).length;
  const talisman = !!s.keys.talisman || isDoneIn(p, 'quests', 'dark-talisman');
  const rodInferred = d >= absDay(0, 2, 1);
  const rod = s.rod === 'auto' ? rodInferred : s.rod !== 'none';
  const nightMarket = season === 3 && day >= 15 && day <= 17;
  const desertFest = season === 0 && day >= 15 && day <= 17;
  return {
    season, seasonKey: SEASON_KEYS[season], seasonName: SEASON_NAMES[season], day, year, dow, dowName: DOW[dow], daysPlayed: d,
    weather: p.weather, rain: isRaining(p.weather), festival,
    rod, fishing: skill('Fishing'), farming: skill('Farming'), crabPots: skill('Fishing') >= 3,
    minesOpen, mine: minesOpen ? mine : 0, skullKey, skull: auto(s.skull, skullKey && bus) && bus, bus, island, qi: island && (walnuts >= 100 || !!s.keys.qi),
    greenhouse: auto(s.greenhouse, pantry), railroad: d >= absDay(1, 3, 1), woods: s.tools.axe >= 2 || !!s.keys.woods,
    sewer: museum >= 60 || !!s.keys.rustyKey, bugLair: talisman, swamp: isDoneIn(p, 'quests', 'goblin-problem'), bridge: wf.bridgeRepaired,
    ccRoute: route, ccRestored: wf.ccRestored, ccDone, jojaMember: !!p.cc.joja.membership,
    pierreOpen: !festival && (dow !== 2 || (route === 'cc' && cc.complete)),
    jojaOpen: !(route === 'cc' && cc.complete), cartToday: dow === 4 || dow === 6 || nightMarket || (desertFest && bus), nightMarket,
    ordersBoard: d >= absDay(2, 2, 1), jars: skill('Farming') >= 4 || !!s.keys.jars, kegs: skill('Farming') >= 8 || !!s.keys.kegs, raccoon: s.raccoon,
    farmType: p.farmType || 'standard', axe: s.tools.axe, pickaxe: s.tools.pickaxe, combat: skill('Combat'),
  };
}

// ---------- fish ----------
export interface FishRow { f: Fish; where: string; when: string; rainOnly: boolean }
const MINE_FLOOR: Record<string, number> = { Ghostfish: 20, Stonefish: 20, 'Ice Pip': 60, 'Lava Eel': 100 };
function fishReachable(f: Fish, a: Access): string | null {
  const off = fishReachableOff(f, a);
  if (!farmFish(f, a.farmType) || f.family || (f.level && a.fishing < f.level)) return off;
  return ['Your farm', off].filter(Boolean).join(', '); // the farm's own water (wiki: Farm Maps)
}
function fishReachableOff(f: Fish, a: Access): string | null {
  if (f.family) return null; // the legendary family only appears during Qi's "Extended Family" order
  if (f.legendary && a.fishing < f.level) return null;
  if (!f.legendary && f.level && a.fishing < f.level) return null;
  const sub = (f.summary.locations || []).length > 0 && (f.summary.locations || []).every((l) => /Submarine/.test(l));
  if (sub) return a.nightMarket ? 'Night Market submarine' : null;
  if (MINE_FLOOR[f.name]) {
    if (a.mine >= MINE_FLOOR[f.name]) return `The Mines, floor ${MINE_FLOOR[f.name]}`;
    if (f.name === 'Lava Eel' && a.island) return 'Volcano Caldera';
    return null;
  }
  if (f.name === 'Goby') return 'Cindersap Forest waterfalls';
  const ok = (l: string) => {
    if (l === 'Temp' || l === 'fishingGame' || l.startsWith('Farm_') || l === 'Submarine') return false;
    if (l === 'Desert') return a.bus;
    if (l === 'Woods') return a.woods;
    if (l === 'Sewer') return a.sewer;
    if (l === 'BugLand') return a.bugLair;
    if (l === 'WitchSwamp') return a.swamp;
    if (l === 'UndergroundMine') return a.mine >= 20;
    if (l.startsWith('Island') || l === 'Caldera') return a.island;
    return true;
  };
  const locs = f.locs || [];
  if (!locs.some(ok)) return null;
  const names = (f.summary.locations || f.spawns).filter((n) => {
    if (/Ginger|Pirate|Caldera|Island/i.test(n)) return a.island;
    if (/Desert/.test(n)) return a.bus;
    if (/Secret Woods/.test(n)) return a.woods;
    if (/Sewer/.test(n)) return a.sewer;
    if (/Bug Lair/.test(n)) return a.bugLair;
    if (/Swamp/.test(n)) return a.swamp;
    if (/Submarine/.test(n)) return a.nightMarket;
    if (/Farm/.test(n)) return false;
    return true;
  });
  return names.join(', ') || (f.summary.locations || [])[0] || '';
}
const timeText = (f: Fish) => {
  if (!f.times?.length) return 'any time';
  const fm = (t: number) => { const h = Math.floor(t / 100) % 24; return `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`; };
  return f.times.map(([x, y]) => (x === 600 && y === 2600 ? 'any time' : `${fm(x)}–${fm(y)}`)).join(', ');
};
export function fishToday(core: Core, p: Profile, a = access(core, p)): FishRow[] {
  if (!a.rod) return [];
  const out: FishRow[] = [];
  for (const f of core.fish) {
    if (f.method !== 'rod' || items[f.qid]?.cat !== -4) continue;
    if (!fishSeasons(f).includes(a.seasonName)) continue;
    const w = fishWeather(f);
    if (w === 'sunny' && a.rain) continue;
    if (w === 'rainy' && !a.rain) continue;
    if (f.legendary && isDoneIn(p, 'fish', f.qid)) continue; // legendaries can only be caught once
    const where = fishReachable(f, a);
    if (where === null) continue;
    out.push({ f, where, when: timeText(f), rainOnly: w === 'rainy' }); // time of day never changes the plan
  }
  return out.sort((x, y) => y.f.price - x.f.price);
}

// ---------- forage ----------
export interface ForageRow { qid: string; name: string; where: string[]; price: number; note?: string }
export function forageToday(core: Core, p: Profile, a = access(core, p)): ForageRow[] {
  const G = core.guide;
  const by = new Map<string, ForageRow>();
  for (const f of G.forage) {
    if (!f.seasons.includes(a.seasonKey)) continue;
    if (f.days && (a.day < f.days[0] || a.day > f.days[1])) continue;
    const acc = f.access || G.forageAccess[f.loc] || null;
    if (acc === 'railroad' && !a.railroad) continue;
    if (acc === 'bus' && !a.bus) continue;
    if (acc === 'woods' && !a.woods) continue;
    if (acc === 'island' && !a.island) continue;
    if (acc === 'mine' && !a.minesOpen) continue;
    if (acc === 'bridge' && !a.bridge) continue;
    const where = G.forageLoc[f.loc] || f.loc;
    const r = by.get(f.item) || { qid: f.item, name: nm(f.item), where: [], price: price(f.item), note: f.note };
    if (!r.where.includes(where)) r.where.push(where);
    by.set(f.item, r);
  }
  for (const f of farmForage(a.farmType, a.seasonKey)) {
    const r = by.get(f.qid) || { qid: f.qid, name: nm(f.qid), where: [], price: price(f.qid) };
    if (!r.where.includes(f.where)) r.where.unshift(f.where);
    by.set(f.qid, r);
  }
  return [...by.values()].sort((x, y) => y.price - x.price);
}

// ---------- crops ----------
export interface CropRow { c: GCrop; shop: string; seedPrice: number; harvests: number; readyDay: number; profit: number; perDay: number; artisan: { kind: string; perDay: number } | null; note?: string }
const SHOP_NAME: Record<string, string> = { pierre: "Pierre's", joja: 'JojaMart', oasis: 'the Oasis', egg: 'the Egg Festival', cart: 'the Traveling Cart' };
function offerOk(o: ShopOffer, a: Access) {
  if (o.seasons && o.seasons.length && !o.seasons.includes(a.seasonKey)) return false;
  if (a.year < (o.year || 1)) return false;
  if (o.dow && o.dow.length && !o.dow.some((d: any) => (typeof d === 'number' ? d === a.dow : String(d).toLowerCase().startsWith(a.dowName.toLowerCase().slice(0, 3))))) return false;
  return true;
}
export function seedPrice(c: GCrop, a: Access): { shop: string; price: number } | null {
  let best: { shop: string; price: number } | null = null;
  for (const [shop, offers] of Object.entries(c.shops)) {
    if (shop === 'pierre' && !a.pierreOpen) continue;
    if (shop === 'joja' && !a.jojaOpen) continue;
    if (shop === 'oasis' && !a.bus) continue;
    if (shop === 'egg' && a.festival?.name !== 'Egg Festival') continue;
    if (shop === 'cart' && !a.cartToday) continue;
    for (const o of offers) {
      if (shop !== 'egg' && !offerOk(o, a)) continue;
      const pr = shop === 'joja' && !a.jojaMember ? Math.round(o.price * 1.25) : o.price;
      if (!best || pr < best.price) best = { shop, price: pr };
    }
  }
  return best;
}
/** Days left to grow if planted today (the crop must be ready by the last day its seasons allow). */
export function growWindow(c: GCrop, season: number, day: number) {
  let left = 28 - day;
  for (let s = season + 1; s < season + 4 && c.seasons.includes(SEASON_KEYS[s % 4]); s++) left += 28;
  return left;
}
export function cropsToday(core: Core, p: Profile, a = access(core, p)): CropRow[] {
  const out: CropRow[] = [];
  for (const c of core.guide.crops) {
    if (!c.seasons.includes(a.seasonKey)) continue;
    const sp = seedPrice(c, a);
    if (!sp) continue;
    const left = growWindow(c, a.season, a.day);
    if (c.days > left) continue; // can't mature in time
    const harvests = c.regrow > 0 ? 1 + Math.floor((left - c.days) / c.regrow) : 1;
    const occupied = c.days + (harvests - 1) * Math.max(0, c.regrow);
    const gross = harvests * c.yield * c.sell;
    const profit = Math.round(gross - sp.price);
    let artisan: CropRow['artisan'] = null;
    if (a.kegs && (c.cat === -79 || c.cat === -75)) {
      const v = c.cat === -79 ? c.sell * 3 : Math.floor(c.sell * 2.25);
      artisan = { kind: c.cat === -79 ? 'Wine' : 'Juice', perDay: Math.round((harvests * c.yield * v - sp.price) / occupied) };
    } else if (a.jars && (c.cat === -79 || c.cat === -75)) {
      artisan = { kind: c.cat === -79 ? 'Jelly' : 'Pickles', perDay: Math.round((harvests * c.yield * (c.sell * 2 + 50) - sp.price) / occupied) };
    }
    out.push({ c, shop: SHOP_NAME[sp.shop] || sp.shop, seedPrice: sp.price, harvests, readyDay: a.day + c.days, profit, perDay: Math.round((profit / occupied) * 10) / 10, artisan, note: c.raised ? 'Grows on a trellis — you can’t walk through it.' : c.paddy ? 'Grows faster next to water.' : undefined });
  }
  return out.sort((x, y) => y.perDay - x.perDay);
}

// ---------- bundles ----------
export interface BundleRow { bundle: string; room: string; bundleId: string; index: number; qid: string; name: string; count: number; quality: string; how: string }
export function bundlesToday(core: Core, p: Profile, a = access(core, p), fish = fishToday(core, p, a), forage = forageToday(core, p, a), crops = cropsToday(core, p, a)): BundleRow[] {
  if (a.ccRoute === 'joja') return [];
  const fishQ = new Map(fish.map((r) => [r.f.qid, r]));
  const forQ = new Map(forage.map((r) => [r.qid, r]));
  const cropQ = new Map(crops.map((r) => [r.c.item, r]));
  const crab = new Set(core.fish.filter((f) => f.method === 'crab pot').map((f) => f.qid));
  const out: BundleRow[] = [];
  for (const b of activeBundles(core, p)) {
    if (bundleDone(p, b)) continue;
    if (b.room === 'The Missing' || b.room.includes('Joja')) { if (!a.ccDone) continue; }
    const checked = new Set(p.cc.checked[b.id] || []);
    b.items.forEach((it, i) => {
      if (checked.has(i) || !it.qid) return;
      let how = '';
      const fr = fishQ.get(it.qid); const fo = forQ.get(it.qid); const cr = cropQ.get(it.qid);
      if (fr) how = `Catch it: ${fr.where}, ${fr.when}`;
      else if (crab.has(it.qid) && a.crabPots) how = 'Crab pot catch';
      else if (fo) how = `Forage: ${fo.where.join(', ')}`;
      else if (cr) how = `Plant today at ${cr.shop}; ready Day ${cr.readyDay}`;
      else if (it.qid === '(O)709' && hardwoodOnFarm(a)) how = 'Chop the Large Stumps on your farm (copper axe or better)';
      if (!how) return;
      out.push({ bundle: b.name, room: b.room, bundleId: b.id, index: i, qid: it.qid, name: it.name, count: it.count, quality: it.quality, how });
    });
  }
  return out;
}

/** Forest Farm: 8 renewable Large Stumps; Four Corners: one. Large Stumps need a copper axe or better. */
export const hardwoodOnFarm = (a: Access) => (a.farmType === 'forest' || a.farmType === 'fourcorners') && a.axe >= 1;

/** Day-guide jobs that only exist because of the farm map (wiki: Farm Maps). */
export function farmTasks(a: Access): Task[] {
  const T: Task[] = [];
  const t = a.farmType; const nmF = farmInfo(t).name + ' Farm';
  const outdoors = !a.festival;
  if (!outdoors) return T;
  if (hardwoodOnFarm(a)) T.push({ id: 'farm-stumps', label: 'Money', title: t === 'forest' ? 'Chop the Large Stumps on your farm' : 'Chop the Large Stump on your farm', why: t === 'forest' ? `Your ${nmF} has 8 Large Stumps in the west clearings that grow back — free Hardwood for buildings and the Construction bundle.` : 'The top-left corner of your Four Corners Farm has a Large Stump — free Hardwood.', where: 'Your farm', score: 135, icon: { qid: '(O)709' } });
  if (t === 'forest' && a.axe < 1 && a.daysPlayed >= 3) T.push({ id: 'farm-axe', label: 'Quest', title: 'Upgrade to a Copper Axe', why: 'Your farm’s Large Stumps give Hardwood, but need a copper axe or better.', where: 'Clint’s Blacksmith', score: 115, icon: { ui: 'Axe' } });
  if (t === 'hilltop' || t === 'fourcorners') T.push({ id: 'farm-quarry', label: 'Money', title: 'Mine the quarry on your farm', why: `New stones, ore and geode nodes appear there every day — iron from Mining 4, gold from 7, iridium from 10.${t === 'hilltop' ? ' A stump, log or boulder can block the way until you have steel tools.' : ''}`, where: 'Your farm', score: 120, icon: { ui: 'Pickaxe' } });
  if (t === 'wilderness') T.push({ id: 'farm-monsters', label: 'Money', title: 'Monsters roam your farm tonight', why: `On the Wilderness Farm monsters spawn at night, and get tougher as your Combat level rises.${a.combat >= 9 ? ' At Combat 9+ Iridium Golems can appear — they can drop Iridium Ore.' : ' Bring a weapon if you work outside after dark.'}`, where: 'Your farm', when: 'after dark', score: 95, icon: { ui: 'skill:Combat' } });
  if (t === 'meadowlands') T.push({ id: 'farm-coop', label: 'Money', title: 'Collect eggs and pet your chickens', why: 'Meadowlands Farm starts you with a Coop and two chickens. Their Blue Grass is a treat animals love.', where: 'Your Coop', score: 125, icon: { qid: '(O)176' } });
  if (t === 'beach') T.push({ id: 'farm-crates', label: 'Money', title: 'Walk the shore on your farm', why: 'Beach forage spawns on your farm all year, and supply crates sometimes wash up.', where: 'Your farm', score: 100, icon: { qid: '(O)394' } });
  return T;
}

// ---------- birthdays & gifts ----------
export interface GiftPick { qid: string; tier: 'love' | 'like'; how: string }
export interface Bday { npc: string; name: string; gifts: GiftPick[]; inDays: number }
export function birthdays(core: Core, p: Profile, a = access(core, p), gifts?: Record<string, GiftData>, fish = fishToday(core, p, a), forage = forageToday(core, p, a)): Bday[] {
  const out: Bday[] = [];
  const today = new Set([...fish.map((f) => f.f.qid), ...forage.map((f) => f.qid)]);
  const had = new Set([...Object.keys(p.done.shipping || {}), ...Object.keys(p.done.fish || {})]);
  for (let k = 0; k < 7; k++) {
    const dd = a.day + k; if (dd > 28) break;
    for (const n of core.npcs) {
      if (!n.birthday || n.birthday.season !== a.seasonName || n.birthday.day !== dd) continue;
      if (n.id === 'Krobus' && !a.sewer) continue;
      if ((n.id === 'Leo') && !a.island) continue;
      const picks: GiftPick[] = [];
      const gd = gifts?.[n.id];
      if (gd) for (const tier of ['love', 'like'] as const) for (const [qid] of gd.tiers[tier] || []) {
        if (!items[qid] || picks.some((x) => x.qid === qid)) continue;
        if (today.has(qid)) picks.push({ qid, tier, how: 'Find it today' });
        else if (had.has(qid)) picks.push({ qid, tier, how: 'You’ve had one before' });
      }
      picks.sort((x, y) => (x.tier === y.tier ? (x.how < y.how ? -1 : 1) : x.tier === 'love' ? -1 : 1));
      out.push({ npc: n.id, name: n.name, gifts: picks.slice(0, 4), inDays: k });
    }
  }
  return out;
}

// ---------- traveling cart ----------
/** One Community Center bundle, with only the items the Traveling Cart can sell (wiki "Standard Stock" list). */
export interface CartGroup { b: ActiveBundle; items: { it: BItem; i: number; done: boolean }[] }
export interface CartInfo { open: boolean; groups: CartGroup[]; count: number; rareSeed: boolean }
/** Items the cart can sell, grouped by bundle. Hides donated items and finished bundles, except anything in `keep`
 *  ("bundleId:index", ticked on this visit to the page) so a mis-tap can be undone. The cart only sells normal quality,
 *  so silver/gold-quality slots are left out; gold slots (Vault) have no item. */
export function cartBundles(core: Core, p: Profile, keep: Set<string> = new Set()): CartGroup[] {
  if (p.cc.route === 'joja') return [];
  const pool = new Set(core.guide.cartPool);
  const out: CartGroup[] = [];
  for (const b of activeBundles(core, p)) {
    const checked = new Set(p.cc.checked[b.id] || []);
    const kept = (i: number) => keep.has(b.id + ':' + i);
    if (bundleDone(p, b) && !b.items.some((_, i) => kept(i))) continue;
    const list = b.items.map((it, i) => ({ it, i, done: checked.has(i) }))
      .filter(({ it, i, done }) => it.qid && pool.has(it.qid) && (!it.quality || it.quality === 'normal') && (!done || kept(i)));
    if (list.length) out.push({ b, items: list });
  }
  return out;
}
export function cartToday(core: Core, p: Profile, a = access(core, p)): CartInfo | null {
  if (!a.cartToday) return null;
  if (a.festival && !a.nightMarket && a.festival.name !== 'Desert Festival') return null;
  const groups = a.ccRoute === 'cc' ? cartBundles(core, p) : [];
  return { open: true, groups, count: groups.reduce((n, g) => n + g.items.length, 0), rareSeed: a.season <= 1 };
}

// ---------- heart events ----------
export interface EventRow { e: GEvent; name: string; why: string; when: string }
export function eventGateOk(e: GEvent, a: Access) {
  const acc = e.access;
  if (acc === 'railroad' && !a.railroad) return false;
  if (acc === 'woods' && !a.woods) return false;
  if (acc === 'sewer' && !a.sewer) return false;
  if (acc === 'bus' && !a.bus) return false;
  if ((acc === 'boat' || acc === 'island') && !a.island) return false;
  if (acc === 'qi' && !a.qi) return false;
  return true;
}
const hhmm = (t: number) => { const h = Math.floor(t / 100) % 24; const m = t % 100; return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`; };
export function eventsToday(core: Core, p: Profile, a = access(core, p)): EventRow[] {
  if (a.festival) return [];
  const known = new Set(core.guide.events.map((e) => e.id));
  const seen = (id: string) => isDoneIn(p, 'events', id);
  const byNpc = new Map<string, EventRow>();
  const sorted = [...core.guide.events].sort((x, y) => x.hearts - y.hearts);
  for (const e of sorted) {
    if (e.special.length || seen(e.id)) continue;
    if (byNpc.has(e.npc)) continue;
    if ((p.hearts[e.npc] ?? 0) < e.hearts) continue;
    if (e.others.some((o) => (p.hearts[o.npc] ?? 0) < o.hearts)) continue;
    if (!eventGateOk(e, a)) continue;
    if (e.after?.some((x) => known.has(x) && !seen(x))) continue;
    if (e.notAfter?.some((x) => seen(x))) continue;
    if (e.w === 'sunny' && a.rain) continue;
    if (e.w === 'rainy' && !a.rain) continue;
    if (e.notSeasons?.includes(a.seasonKey)) continue;
    if (e.notDays?.includes(a.dow)) continue;
    if (e.days?.length && !e.days.includes(a.day)) continue;
    if (e.y && (e.y === 1 ? a.year !== 1 : a.year < e.y)) continue;
    if (e.minPlayed && a.daysPlayed < e.minPlayed) continue;
    if (e.marriedTo && p.spouse !== e.marriedTo) continue;
    if (e.notMarriedTo?.includes(p.spouse || '')) continue;
    const when = e.t ? `${hhmm(e.t[0])}–${hhmm(e.t[1])}` : 'any time';
    byNpc.set(e.npc, { e, name: e.npc, when, why: `You have ${p.hearts[e.npc] ?? 0}♥ with ${e.npc} — their ${e.hearts}-heart scene can play${e.w === 'rainy' ? ' (rainy days only)' : ''}.` });
  }
  return [...byNpc.values()];
}

// ---------- quests ----------
/** A quest counts as done if it's ticked, or if the saved setup proves it (e.g. Mines floor 40 reached). */
export function questDone(p: Profile, id: string, a?: Access) {
  if (isDoneIn(p, 'quests', id)) return true;
  const mine = Math.max(p.setup.mine, p.setup.keys.skullKey ? 120 : 0);
  switch (id) {
    case 'explore-the-mine': return mine >= 5;
    case 'deeper-in-the-mine': return mine >= 40;
    case 'to-the-bottom': return mine >= 120;
    case 'the-skull-key': return !!a?.skull && p.setup.skullDepth > 0;
    case 'qi-s-challenge': return p.setup.skullDepth >= 25;
    case 'cryptic-note': return p.setup.skullDepth >= 100;
    case 'archaeology': return Object.keys(p.done.museum || {}).length > 0;
    case 'the-giant-stump': return p.setup.raccoon >= 2;
    case 'to-the-beach': return p.setup.rod !== 'auto' && p.setup.rod !== 'none';
    case 'getting-started': return isDoneIn(p, 'shipping', '(O)24'); // shipped a parsnip, so one was harvested
    case 'forging-ahead': case 'smelting': return Object.values(p.setup.tools).some((t) => t > 0); // a Clint upgrade needs copper bars
    default: return false;
  }
}
export function questGateOk(q: GQuest, p: Profile, a: Access) {
  switch (q.gate) {
    case 'skullkey': return a.mine >= 120 || a.skullKey;
    case 'skull': return a.skull && (q.id !== 'cryptic-note' || isDoneIn(p, 'notes', '10'));
    case 'ccdone': return a.ccDone;
    case 'talisman': return isDoneIn(p, 'quests', 'dark-talisman');
    case 'island': return a.island;
    case 'bus': return a.bus;
    case 'woods': return a.woods && (q.id !== 'strange-note' || isDoneIn(p, 'notes', '23'));
    case undefined: case null: case '': return true;
    default: return false;
  }
}
export function openQuests(core: Core, p: Profile, a = access(core, p)): GQuest[] {
  return core.guide.quests.filter((q) => {
    if (questDone(p, q.id, a)) return false;
    if (q.date && a.daysPlayed < absDay(q.date.season, q.date.day, q.date.year)) return false;
    if (q.after?.some((x) => !questDone(p, x, a))) return false;
    if (q.mine && a.mine < q.mine) return false;
    if (q.hearts && (p.hearts[q.hearts[0]] ?? 0) < q.hearts[1]) return false;
    if (q.raccoon && a.raccoon < q.raccoon) return false;
    if (q.seasons?.length && !q.seasons.includes(a.seasonKey) && !q.seasons.includes(String(a.season))) return false;
    if (q.id === 'archaeology' && !a.minesOpen) return false;
    if (q.id === 'forging-ahead' && a.mine < 2) return false;
    if (q.id === 'raising-animals' || q.id === 'advancement') { /* needs Getting Started done (handled by after) */ }
    if (q.id === 'meet-the-wizard' && !isDoneIn(p, 'quests', 'rat-problem')) return false;
    if (!q.date && !q.after && !q.mine && !q.hearts && !q.raccoon && !q.gate && !q.seasons && !['archaeology', 'forging-ahead'].includes(q.id)) return false;
    return questGateOk(q, p, a);
  });
}

// ---------- special orders ----------
export function ordersAvailable(core: Core, p: Profile, a = access(core, p)) {
  if (!a.ordersBoard) return [];
  return core.orders.filter((o) => {
    if ((o as any).unused || isDoneIn(p, 'orders', o.id)) return false;
    if (o.board === 'Qi') return a.qi;
    if (o.board !== 'Town') return false;
    return o.tags.every((t) => {
      const neg = t.startsWith('!'); const k = neg ? t.slice(1) : t;
      let v: boolean | null = null;
      if (k.startsWith('season_')) v = a.seasonKey === k.slice(7);
      else if (k === 'island') v = a.island;
      else if (k.startsWith('mail_Island')) v = a.island;
      else if (k.startsWith('event_')) v = isDoneIn(p, 'events', k.slice(6));
      if (v === null) return false;
      return neg ? !v : v;
    });
  });
}

// ---------- the ranked plan ----------
export interface DayGuide {
  a: Access; fish: FishRow[]; forage: ForageRow[]; crops: CropRow[]; bundles: BundleRow[]; birthdays: Bday[]; cart: CartInfo | null;
  events: EventRow[]; quests: GQuest[]; orders: ReturnType<typeof ordersAvailable>; tasks: Task[]; road: Road;
}
export function dayGuide(core: Core, p: Profile, gifts?: Record<string, GiftData>): DayGuide {
  const a = access(core, p);
  const fish = fishToday(core, p, a);
  const forage = forageToday(core, p, a);
  const crops = cropsToday(core, p, a);
  const bundles = bundlesToday(core, p, a, fish, forage, crops);
  const bdays = birthdays(core, p, a, gifts, fish, forage);
  const cart = cartToday(core, p, a);
  const events = eventsToday(core, p, a);
  const quests = openQuests(core, p, a);
  const orders = ordersAvailable(core, p, a);
  const road = roadmap(core, p, a);
  const T: Task[] = [];
  const boost = (phase: number) => (road.current?.n === phase ? 40 : 0);

  if (a.festival) T.push({ id: 'festival', label: 'Friendship', title: `Go to the ${a.festival.name}`, why: 'Festivals happen once a year — everyone is there and the shops are closed while it runs.', where: a.festival.where, score: 1000, icon: { ui: 'weather:Festival' } });

  // first-day basics
  if (a.year === 1 && a.season === 0 && a.day === 1) {
    if (a.farmType === 'meadowlands') T.push({ id: 'd1-hay', label: 'Money', title: 'Meet your two chickens', why: 'On Meadowlands Farm you start with a Coop and two chickens, and you get 15 Hay instead of Parsnip Seeds — use it to feed them.', where: 'Your Coop', score: 900, icon: { qid: '(O)178' } });
    else T.push({ id: 'd1-plant', label: 'Money', title: 'Clear a patch and plant your 15 Parsnip Seeds', why: 'Your first crop is ready on Day 5 and finishes the “Getting Started” quest.', where: 'Your farm', score: 900, icon: { qid: '(O)472' } });
    T.push({ id: 'd1-meet', label: 'Friendship', title: 'Say hi to everyone in town', why: 'Meeting people starts the “Introductions” quest and some friendship.', where: 'Pelican Town', score: 500, icon: { ui: 'Heart' } });
  }

  // birthdays today
  const noGifts = a.weather === 'green' && a.year === 1;
  if (noGifts) T.push({ id: 'green-nogift', label: 'Friendship', title: 'No gifts today — villagers stay inside', why: core.guide.facts.greenRainY1.text, score: 200, icon: { ui: 'weather:GreenRain' } });
  for (const b of bdays.filter((x) => x.inDays === 0 && !noGifts)) {
    const top = b.gifts[0];
    T.push({ id: 'bday-' + b.npc, label: 'Friendship', title: `It's ${b.name}'s birthday — give a gift`, why: top ? `Birthday gifts count 8×. ${nm(top.qid)} is a ${top.tier === 'love' ? 'loved' : 'liked'} gift (${top.how.toLowerCase()}).` : 'Birthday gifts count 8× — check what they like before you go.', score: top ? 420 : 300, icon: { npc: b.npc }, href: '#/villager/' + b.npc });
  }

  // heart events
  const evRank = events.map((e) => ({ e, gap: (p.hearts[e.e.npc] ?? 0) - e.e.hearts })).sort((x, y) => x.gap - y.gap);
  evRank.forEach(({ e, gap }, i) => {
    if (i >= 3) return;
    const fresh = gap <= 1;
    T.push({ id: 'ev-' + e.e.id, label: 'Friendship', title: `${e.name}'s ${e.e.hearts}♥ scene`, why: fresh ? e.why : `${e.why} Tick it off if you've already seen it.`, where: e.e.locName, when: e.when, score: (fresh ? 260 : 150) + (e.e.w === 'rainy' ? 80 : 0), icon: { npc: e.e.npc }, href: '#/events', tick: { col: 'events', id: e.e.id } });
  });

  // quests
  const qRank = quests.map((q) => {
    const itemToday = !!q.item && (fish.some((f) => f.f.qid === q.item) || forage.some((f) => f.qid === q.item));
    const fresh = q.date ? a.daysPlayed - absDay(q.date.season, q.date.day, q.date.year) : 99;
    return { q, sc: 200 + (itemToday ? 120 : 0) + (fresh <= 2 ? 60 : 0) - Math.min(80, Math.max(0, fresh - 7) * 2) + boost(1) };
  }).sort((x, y) => y.sc - x.sc).slice(0, 4).map((x) => x.q);
  for (const q of qRank) {
    const itemToday = q.item && (fish.some((f) => f.f.qid === q.item) || forage.some((f) => f.qid === q.item));
    const fresh = q.date ? a.daysPlayed - absDay(q.date.season, q.date.day, q.date.year) : 99;
    const sc = 200 + (itemToday ? 120 : 0) + (fresh <= 2 ? 60 : 0) - Math.min(80, Math.max(0, fresh - 7) * 2) + boost(1);
    T.push({ id: 'q-' + q.id, label: 'Quest', title: q.name, why: q.task + (itemToday ? ` You can get ${nm(q.item)} today.` : ''), where: q.npc, score: sc, icon: q.item ? { qid: q.item } : { ui: 'Quest' }, href: '#/quests', tick: { col: 'quests', id: q.id } });
  }

  // bundles
  const byBundle = new Map<string, BundleRow[]>();
  for (const r of bundles) byBundle.set(r.bundleId, [...(byBundle.get(r.bundleId) || []), r]);
  for (const [id, rows] of byBundle) {
    const r = rows[0];
    const seasonal = rows.some((x) => (items[x.qid]?.t || []).length === 1) && a.day >= 21;
    T.push({ id: 'b-' + id, label: 'Bundle', title: `${r.bundle} bundle: ${rows.map((x) => x.name).slice(0, 3).join(', ')}${rows.length > 3 ? ` +${rows.length - 3}` : ''}`, why: `${rows.length === 1 ? 'This item is' : 'These items are'} gettable today. ${r.how}.${seasonal ? ' The season ends soon!' : ''}`, where: r.room, score: 230 + rows.length * 15 + (seasonal ? 90 : 0) + boost(2), icon: { qid: r.qid }, href: '#/bundles' });
  }
  if (a.ccRoute === 'joja' && !a.ccDone) {
    const next = !p.cc.joja.membership ? { name: 'Joja Membership', cost: 5000 } : core.joja.developments.filter((d) => !p.cc.joja[d.room]).sort((x, y) => x.cost - y.cost)[0];
    if (next) T.push({ id: 'joja-next', label: 'Bundle', title: `Save up for ${next.name} (${g(next.cost)})`, why: 'You chose the Joja route — buying developments unlocks the same things as the bundles.', where: 'JojaMart', score: 200 + boost(2), icon: { ui: 'Community Center' }, href: '#/bundles/joja' });
  }

  // money
  const best = crops.filter((c) => c.profit > 0)[0];
  if (best) T.push({ id: 'money-crop', label: 'Money', title: `Plant ${best.c.name}`, why: `Best profit per day you can still harvest this season: ${g(best.perDay)}/day per plant (seeds ${g(best.seedPrice)} at ${best.shop}).`, where: best.shop, score: 170 + Math.min(120, best.perDay * 2), icon: { qid: best.c.item } });
  const plain = fish.filter((f) => !f.f.legendary);
  const bestFish = plain[0];
  if (bestFish) T.push({ id: 'money-fish', label: 'Money', title: `Go fishing — ${bestFish.f.name} is biting`, why: `${bestFish.f.name} sells for ${g(bestFish.f.price)}${bestFish.rainOnly ? ' and only bites in the rain' : ''}. ${fish.length} kinds of fish are around today.`, where: bestFish.where, when: bestFish.when, score: 140 + (a.rain ? 60 : 0) + (bestFish.rainOnly ? 30 : 0), icon: { qid: bestFish.f.qid }, href: '#/today/fish' });
  if (forage.length) T.push({ id: 'money-forage', label: 'Money', title: `Forage: ${forage.slice(0, 3).map((f) => f.name).join(', ')}`, why: 'Free items on the ground — good for gifts, bundles and quick cash.', where: [...new Set(forage.flatMap((f) => f.where))].slice(0, 3).join(', '), score: 110, icon: { qid: forage[0].qid } });

  T.push(...farmTasks(a));

  // weather
  if (a.rain && a.daysPlayed > 1) T.push({ id: 'rain-water', label: 'Money', title: 'Skip watering — the rain does it', why: 'Rain waters every outdoor crop, so spend that energy in the Mines or fishing instead.', where: 'Your farm', score: 175, icon: { ui: 'Watering Can' } });
  if (a.weather === 'storm' && (p.perf.skills.Foraging ?? 0) >= 6) T.push({ id: 'storm-rods', label: 'Money', title: 'Put out Lightning Rods', why: `Lightning can strike your farm in a storm. Lightning Rods (Foraging level 6) turn strikes into Battery Packs, which sell for ${g(price('(O)787'))}.`, where: 'Your farm', score: 185, icon: { qid: '(BC)9' } });
  if (a.weather === 'green') T.push({ id: 'green-moss', label: 'Money', title: 'Gather Moss and clear the giant weeds', why: core.guide.facts.greenRain.text, where: 'Trees all over the valley', score: 190, icon: { qid: '(O)Moss' } });

  // milestones
  if (a.minesOpen && a.mine < 120) T.push({ id: 'mines', label: 'Quest', title: `Go deeper in the Mines (next stop floor ${Math.floor(a.mine / 5) * 5 + 5})`, why: a.mine < 40 ? 'Ore for tool upgrades and the Crafts Room. Floor 40 opens the next quest.' : 'Floor 120 gives the Skull Key.', where: 'The Mines', score: 150 + (a.rain ? 50 : 0) + boost(1) + boost(3), icon: { ui: 'Pickaxe' } });
  if (p.setup.backpack < 24 && a.daysPlayed >= 3) T.push({ id: 'backpack', label: 'Money', title: 'Buy the Large Pack at Pierre’s (2,000g)', why: '12 more inventory slots — the biggest early quality-of-life upgrade.', where: "Pierre's", score: 155 + boost(1), icon: { ui: 'Backpack' } });
  if (a.ccRestored && !a.island) T.push({ id: 'boat', label: 'Quest', title: 'Repair Willy’s boat to Ginger Island', why: core.guide.facts.island.text, where: 'Willy’s Fish Shop (back room)', score: 190 + boost(4), icon: { ui: 'Golden Walnut' } });
  if (a.island && walnutsFound(core, p) < walnutTotal(core)) T.push({ id: 'walnuts', label: 'Quest', title: 'Hunt Golden Walnuts on Ginger Island', why: `${walnutsFound(core, p)}/${walnutTotal(core)} found — they unlock island upgrades${a.qi ? '' : ' and Qi’s Walnut Room at 100'}.`, where: 'Ginger Island', score: 160 + boost(4), icon: { ui: 'Golden Walnut' }, href: '#/walnuts' });
  if (a.skull) T.push({ id: 'skull', label: 'Money', title: 'Dive the Skull Cavern', why: 'Iridium ore and treasure — go early in the day with food and bombs.', where: 'Calico Desert', score: 130 + boost(3), icon: { ui: 'Skull Key' } });
  if (!a.woods && a.mine >= 40) T.push({ id: 'steelaxe', label: 'Quest', title: 'Upgrade to a Steel Axe', why: 'It opens the Secret Woods (hardwood, Woodskip fish). ' + core.guide.facts.tools.text, where: 'Clint’s Blacksmith', score: 120, icon: { ui: 'Steel Axe' } });
  // raccoons
  if (a.greenhouse && a.raccoon === 0) T.push({ id: 'raccoon-wait', label: 'Quest', title: 'Watch for the wind storm', why: core.guide.raccoon.unlock, score: 60, icon: { ui: 'Raccoon' } });
  if (a.raccoon === 1 && !isDoneIn(p, 'quests', 'the-giant-stump')) T.push({ id: 'raccoon-stump', label: 'Quest', title: 'Fix the Giant Stump (100 Hardwood)', why: 'The raccoons have moved in — fixing it starts their requests.', where: 'Cindersap Forest', score: 170, icon: { ui: 'Raccoon' }, href: '#/raccoon' });
  if (a.raccoon >= 2) {
    const st = core.guide.raccoon.stages[Math.min(core.guide.raccoon.stages.length - 1, p.setup.raccoonDone)];
    if (st) T.push({ id: 'raccoon-req', label: 'Quest', title: `Raccoon request: ${st.task}`, why: core.guide.raccoon.gap, where: 'Giant Stump, Cindersap Forest', score: 165, icon: { ui: 'Raccoon' }, href: '#/raccoon' });
  }
  // special orders / qi / museum
  if (a.ordersBoard && a.dow === 0 && orders.some((o) => o.board === 'Town')) T.push({ id: 'orders', label: 'Quest', title: 'New Special Orders are up', why: 'The board by Pierre’s refreshes every Monday — pick one before starting the day.', where: "Outside Pierre's", score: 240, icon: { ui: 'Quest' }, href: '#/orders' });
  if (a.qi && a.dow === 0 && orders.some((o) => o.board === 'Qi')) T.push({ id: 'qi', label: 'Quest', title: 'Check Mr. Qi’s challenges', why: 'Qi’s board refreshes each Monday; rewards are Qi Gems.', where: 'Qi’s Walnut Room', score: 180, icon: { ui: 'Qi Gem' }, href: '#/orders' });
  const museumLeft = core.museum.items.length - Object.keys(p.done.museum || {}).length;
  if (a.minesOpen && museumLeft > 0) T.push({ id: 'museum', label: 'Quest', title: 'Donate new finds to the Museum', why: `${museumLeft} items left. Dig up artifact spots (wiggling worms) and break geodes.`, where: 'Museum', score: 70, icon: { ui: 'Museum' }, href: '#/museum' });

  T.sort((x, y) => y.score - x.score);
  // Jobs that aren't a saved checklist item (bundle runs, money days, birthdays…) get a tick that only lasts for this in-game day.
  const dk = planDayKey(p);
  for (const t of T) if (!t.tick) t.tick = { col: 'plan', id: `${dk}:${t.id}` };
  return { a, fish, forage, crops, bundles, birthdays: bdays, cart, events, quests, orders, tasks: T, road };
}

/** The "What should I do?" answer: the best move plus the next 3, each with a plain reason. */
/** Key for "done today" ticks on plan jobs that aren't checklist items: Y1 Summer 12 → "y1-1-12". */
export const planDayKey = (p: Pick<Profile, 'date'>) => `y${p.date.year}-${p.date.season}-${p.date.day}`;

/** The one "Today's plan" card: the first job not yet ticked goes in the big slot; the rest fold under "More jobs".
 *  Ticked jobs that are still listed sink to the end of "More jobs" (so they can be unticked) and never take the big slot. */
export function planSlots(tasks: Task[], done: (t: Task) => boolean) {
  const open = tasks.filter((t) => !done(t));
  const ticked = tasks.filter((t) => done(t));
  return { best: open[0] || null, more: [...open.slice(1), ...ticked], open: open.length };
}
export function whatToDo(gd: DayGuide) { return { best: gd.tasks[0] || null, more: gd.tasks.slice(1, 4) }; }

/** Energy / birthday / festival tabs. */
export function ifThen(core: Core, gd: DayGuide) {
  const energy: Task[] = gd.tasks.filter((t) => ['rain-water', 'green-moss', 'mines', 'skull', 'money-fish', 'money-forage', 'walnuts', 'museum'].includes(t.id))
    .sort((x, y) => Number(y.id === 'rain-water') - Number(x.id === 'rain-water')); // rain: the saved watering time leads the list
  const nextFest = FESTIVALS.map((f) => ({ f, d: f.days.find((x) => absDay(f.season, x, gd.a.year) >= gd.a.daysPlayed) })).filter((x) => x.d && x.f.season >= gd.a.season).sort((x, y) => x.f.season * 28 + x.d! - (y.f.season * 28 + y.d!))[0] || { f: FESTIVALS[0], d: FESTIVALS[0].days[0] };
  return { energy, birthdays: gd.birthdays, festival: gd.a.festival, nextFestival: { name: nextFest.f.name, season: SEASON_NAMES[nextFest.f.season], day: nextFest.d!, where: nextFest.f.where } };
}

// ---------- Road to Perfection ----------
export interface Step { label: string; done: boolean; have?: number; total?: number; href?: string }
export interface Phase { n: number; name: string; blurb: string; steps: Step[]; done: boolean }
export interface Road { phases: Phase[]; current: Phase | null; next: Step | null; percent: number }
export function roadmap(core: Core, p: Profile, a = access(core, p)): Road {
  const perf = perfection(core, p);
  const row = (id: string) => perf.rows.find((r) => r.id === id)!;
  const cc = ccProgress(core, p);
  const joja = jojaProgress(core, p);
  const st = (label: string, have: number, total: number, href?: string): Step => ({ label, have: Math.min(have, total), total, done: have >= total, href });
  const yes = (label: string, done: boolean, href?: string): Step => ({ label, done, href });
  const quests = core.guide.quests;
  const phases: Omit<Phase, 'done'>[] = [
    { n: 1, name: 'Getting started', blurb: 'Plant crops, open the Mines and get a bigger backpack.', steps: [
      yes('Finish “Getting Started” (harvest a parsnip)', questDone(p, 'getting-started', a), '#/quests'),
      st('Reach Mines floor 40', a.mine, 40, '#/setup'),
      yes('Buy the Large Pack (24 slots)', p.setup.backpack >= 24, '#/setup'),
      a.ccRoute === 'cc' ? yes('Finish your first bundle', cc.bundlesDone > 0, '#/bundles') : yes('Buy a Joja membership', joja.bought > 0, '#/bundles/joja'),
    ] },
    { n: 2, name: a.ccRoute === 'cc' ? 'Restore the Community Center' : 'Joja development', blurb: a.ccRoute === 'cc' ? 'Each room unlocks something big: bus, greenhouse, minecarts, bridge.' : 'Buy each development at JojaMart.', steps: a.ccRoute === 'cc'
      ? CC_ROOMS.map((r) => yes(r, cc.roomsDone.includes(r), '#/bundles'))
      : JOJA_KEYS.map((k) => yes(k === 'membership' ? 'Membership' : k, !!p.cc.joja[k], '#/bundles/joja')) },
    { n: 3, name: 'Desert & Skull Cavern', blurb: 'Take the bus to the desert and reach the bottom of the Mines.', steps: [
      yes('Bus to the Desert repaired', a.bus, '#/setup'), st('Mines floor 120 (Skull Key)', a.mine, 120, '#/setup'), yes('Enter the Skull Cavern', a.skull, '#/setup'), st('House upgrades', p.setup.house, 2, '#/setup'),
    ] },
    { n: 4, name: 'Ginger Island', blurb: 'Fix Willy’s boat, collect Golden Walnuts, open Qi’s room.', steps: [
      yes('Repair the boat to Ginger Island', a.island, '#/setup'), st('Golden Walnuts', walnutsFound(core, p), walnutTotal(core), '#/walnuts'), yes('Qi’s Walnut Room (100 walnuts)', a.qi, '#/walnuts'),
    ] },
    { n: 5, name: 'Collections', blurb: 'Ship, catch, cook, craft and donate one of everything.', steps: [
      st('Items shipped', row('shipping').have, row('shipping').total, '#/shipping'), st('Fish caught', row('fish').have, row('fish').total, '#/fish'),
      st('Recipes cooked', row('cooking').have, row('cooking').total, '#/cooking'), st('Items crafted', row('crafting').have, row('crafting').total, '#/crafting'),
      st('Museum donations', Object.keys(p.done.museum || {}).length, core.museum.items.length, '#/museum'),
      st('Raccoon requests', p.setup.raccoonDone, core.guide.raccoon.stages.length, '#/raccoon'),
    ] },
    { n: 6, name: 'Friends, skills & story', blurb: 'Max friendships and skills, clear the monster goals and story quests.', steps: [
      st('Great friends', row('friends').have, row('friends').total, '#/villagers'), st('Farmer level', farmerLevel(p, core.perfection.skills), 25, '#/setup'),
      st('Monster Slayer goals', row('slayer').have, row('slayer').total, '#/slayer'), st('Story quests', quests.filter((q) => questDone(p, q.id, a)).length, quests.length, '#/quests'),
    ] },
    { n: 7, name: 'Final touches', blurb: 'Obelisks, the Gold Clock and every Stardrop.', steps: [
      st('Obelisks', row('obelisks').have, 4, '#/perfection'), yes('Gold Clock', !!p.perf.goldClock, '#/perfection'), st('Stardrops', row('stardrops').have, row('stardrops').total, '#/perfection'), st('Perfection', perf.percent, 100, '#/perfection'),
    ] },
  ];
  const full: Phase[] = phases.map((ph) => ({ ...ph, done: ph.steps.every((s) => s.done) }));
  const current = full.find((ph) => !ph.done) || null;
  return { phases: full, current, next: current?.steps.find((s) => !s.done) || null, percent: perf.percent };
}
void heartsTarget;

// ---------- plan signature ----------
/** Everything the plan recommends, in order — two days with the same signature give the same plan. */
export function planSignature(gd: DayGuide): string {
  return JSON.stringify([
    gd.tasks.map((t) => t.id + '|' + t.title + '|' + t.why),
    gd.fish.map((f) => f.f.qid), gd.forage.map((f) => f.qid), gd.crops.map((c) => c.c.item + c.perDay),
    gd.bundles.map((b) => b.bundleId + ':' + b.qid), gd.events.map((e) => e.e.id), gd.birthdays.map((b) => b.npc + b.gifts.map((x) => x.qid).join()),
  ]);
}
