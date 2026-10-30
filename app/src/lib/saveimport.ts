// v7.1 Save import: read a Stardew Valley save file (the XML named like Farm_123456789) on the device and turn it
// into Valley Book progress. Nothing leaves the phone. A tiny XML reader keeps this free of extra libraries.
import type { Core } from '../types';
import { normalizeProfile, type Profile, type Weather } from './state';
import { FARM_IDS, type FarmType } from './farms';

// ---------- tiny XML tree ----------
export interface XNode { n: string; a: Record<string, string>; k: XNode[]; t: string }
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unesc = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] ?? m);
const local = (n: string) => { const i = n.indexOf(':'); return i < 0 ? n : n.slice(i + 1); };
export function parseXml(src: string): XNode {
  const root: XNode = { n: '#root', a: {}, k: [], t: '' };
  const stack: XNode[] = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[1] != null) { top.t += m[1]; continue; }
    if (m[6] != null) { if (stack.length > 1) top.t += unesc(m[6]); continue; }
    if (!m[3]) continue; // comment, <?xml?>, doctype
    if (m[2]) { // closing tag
      if (stack.length > 1 && local(top.n) === local(m[3])) stack.pop();
      continue;
    }
    const a: Record<string, string> = {};
    if (m[4]) for (const am of m[4].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[local(am[1])] = unesc(am[2] ?? am[3] ?? '');
    const node: XNode = { n: local(m[3]), a, k: [], t: '' };
    top.k.push(node);
    if (!m[5]) stack.push(node);
  }
  if (!root.k.length) throw new Error('That file is not a Stardew Valley save.');
  return root.k[0];
}
export const kid = (n: XNode | undefined, name: string) => n?.k.find((x) => x.n === name);
export const kids = (n: XNode | undefined, name: string) => (n ? n.k.filter((x) => x.n === name) : []);
const txt = (n: XNode | undefined, name: string) => kid(n, name)?.t.trim() ?? '';
const num = (n: XNode | undefined, name: string) => { const v = Number(txt(n, name)); return Number.isFinite(v) ? v : 0; };
const bool = (n: XNode | undefined, name: string) => txt(n, name) === 'true';
const first = (n: XNode | undefined) => n?.k[0];
/** Serialized dictionaries: <x><item><key><T>k</T></key><value><U>v</U></value></item>…</x> */
function dict(n: XNode | undefined): { key: string; val: XNode | undefined }[] {
  return kids(n, 'item').map((it) => ({ key: first(kid(it, 'key'))?.t.trim() ?? '', val: first(kid(it, 'value')) }));
}
const strings = (n: XNode | undefined) => (n ? n.k.map((x) => x.t.trim()).filter(Boolean) : []);
const qual = (id: string) => (/^\(/.test(id) ? id : '(O)' + id);

// ---------- what a save holds ----------
export type ImportPart = 'date' | 'cc' | 'fish' | 'shipping' | 'museum' | 'recipes' | 'friends' | 'unlocks';
export const IMPORT_PARTS: ImportPart[] = ['date', 'cc', 'fish', 'shipping', 'museum', 'recipes', 'friends', 'unlocks'];
export interface SaveData {
  farmer: string; farmName: string; farmType: FarmType;
  date: { season: number; day: number; year: number }; weather: Weather; luck: number | null; dailyLuck: number | null;
  cc: { route: 'cc' | 'joja'; mode: 'standard' | 'remix'; checked: Record<string, number[]>; remix: Record<string, number[]>; joja: Record<string, boolean>; bundlesDone: number; itemsIn: number; unmatched: string[] };
  fish: string[]; shipping: string[]; museum: string[]; cooking: string[]; crafting: string[];
  hearts: Record<string, number>; gifts: Record<string, number>; spouse: string | null; met: number;
  skills: Record<string, number>;
  setup: { mine: number; skullDepth: number; tools: { pickaxe: number; axe: number; hoe: number; can: number } | null; rod: Profile['setup']['rod'] | null; house: number; backpack: number; keys: Record<string, boolean> };
  bridge: boolean; mail: number;
}
const SEASON_IDX: Record<string, number> = { spring: 0, summer: 1, fall: 2, winter: 3 };
const WHICH_FARM: FarmType[] = ['standard', 'riverland', 'forest', 'hilltop', 'wilderness', 'fourcorners', 'beach', 'meadowlands'];
const CC_MAIL: [string, string][] = [['ccPantry', 'Pantry'], ['ccCraftsRoom', 'Crafts Room'], ['ccFishTank', 'Fish Tank'], ['ccBoilerRoom', 'Boiler Room'], ['ccVault', 'Vault'], ['ccBulletin', 'Bulletin Board']];
const JOJA_MAIL: [string, string][] = [['jojaPantry', 'Pantry'], ['jojaCraftsRoom', 'Crafts Room'], ['jojaFishTank', 'Fish Tank'], ['jojaBoilerRoom', 'Boiler Room'], ['jojaVault', 'Vault']];
/** The TV fortune teller's five moods (wiki: Luck). */
export const luckFromDaily = (d: number) => (d > 0.07 ? 2 : d > 0.02 ? 1 : d >= -0.02 ? 0 : d >= -0.07 ? -1 : -2);

export function readSave(core: Core, xml: string): SaveData {
  const sg = parseXml(xml);
  if (sg.n !== 'SaveGame') throw new Error(sg.n === 'Farmer' ? 'That is the SaveGameInfo file. Pick the other file in the folder, the one named like the folder.' : 'That file is not a Stardew Valley save.');
  const pl = kid(sg, 'player');
  if (!pl) throw new Error('No farmer found in that save.');
  const mail = new Set(strings(kid(pl, 'mailReceived')));
  const season = SEASON_IDX[txt(sg, 'currentSeason').toLowerCase()] ?? 0;
  const date = { season, day: Math.min(28, Math.max(1, num(sg, 'dayOfMonth') || 1)), year: Math.max(1, num(sg, 'year') || 1) };
  const weather: Weather = bool(sg, 'isGreenRain') ? 'green' : bool(sg, 'isLightning') ? 'storm' : bool(sg, 'isRaining') ? 'rain' : bool(sg, 'isSnowing') ? 'snow' : bool(sg, 'isDebrisWeather') ? 'wind' : 'sun';
  const dl = kid(sg, 'dailyLuck') ? num(sg, 'dailyLuck') : null;
  const wf = num(sg, 'whichFarm');
  let farmType: FarmType = WHICH_FARM[wf] ?? 'standard';
  if (/meadow/i.test(txt(sg, 'whichModFarm'))) farmType = 'meadowlands';
  if (!FARM_IDS.includes(farmType)) farmType = 'standard';

  // ---- Community Center ----
  const locs = kids(kid(sg, 'locations'), 'GameLocation');
  const locOf = (type: string) => locs.find((l) => l.a.type === type || txt(l, 'name') === type);
  const ccLoc = locOf('CommunityCenter');
  const saved = new Map<number, boolean[]>();
  for (const { key, val } of dict(kid(ccLoc, 'bundles'))) saved.set(Number(key), (val?.k || []).map((b) => b.t.trim() === 'true'));
  const rewards = new Map<number, boolean>(dict(kid(ccLoc, 'bundleRewards')).map(({ key, val }) => [Number(key), val?.t.trim() === 'true']));
  const bd = dict(kid(sg, 'bundleData')).map(({ key, val }) => ({ key, raw: val?.t ?? '' }));
  const cc: SaveData['cc'] = { route: mail.has('JojaMember') ? 'joja' : 'cc', mode: 'standard', checked: {}, remix: {}, joja: {}, bundlesDone: 0, itemsIn: 0, unmatched: [] };
  if (mail.has('JojaMember')) cc.joja.membership = true;
  for (const [m, room] of JOJA_MAIL) if (mail.has(m)) cc.joja[room] = true;
  const roomDone = new Set(CC_MAIL.filter(([m]) => mail.has(m)).map(([, r]) => r));
  if (mail.has('abandonedJojaMartComplete') || mail.has('ccMovieTheater')) roomDone.add('Abandoned Joja Mart');
  // Which remix option is each saved bundle? Match by name (bundleData is "Name/reward/items/color/required/…").
  const entries = bd.map(({ key, raw }) => {
    const f = raw.split('/');
    const [room, idx] = [key.slice(0, key.lastIndexOf('/')), Number(key.slice(key.lastIndexOf('/') + 1))];
    const toks = (f[2] || '').trim().split(/\s+/).filter(Boolean);
    const its: { id: string; q: number }[] = [];
    for (let i = 0; i + 2 < toks.length; i += 3) its.push({ id: toks[i], q: Number(toks[i + 2]) || 0 });
    return { key, room, idx, name: f[0] || '', items: its, required: Number(f[4]) || 0 };
  });
  const stdByKey = new Map(core.rooms.flatMap((r) => r.bundles.map((b) => [b.key, { room: r.name, b }] as const)));
  if (entries.some((e) => stdByKey.get(e.key) && stdByKey.get(e.key)!.b.name !== e.name)) cc.mode = 'remix';
  const QN: Record<number, string> = { 0: 'normal', 1: 'silver', 2: 'gold', 4: 'iridium' };
  for (const e of entries) {
    let id: string | null = null; let items: { qid: string | null; quality: string }[] = []; let required = e.required;
    const std = stdByKey.get(e.key);
    if (cc.mode === 'standard' && std) { id = 'std:' + std.b.key; items = std.b.items; required = std.b.required || std.b.items.length; }
    else {
      const rr = core.remix.find((r) => r.room === e.room);
      if (rr) rr.slots.forEach((s, si) => {
        const oi = s.options.findIndex((o) => o.name === e.name);
        if (oi < 0) return;
        const o = s.options[oi]; id = `rmx:${e.room}:${o.name}`; items = o.items; required = o.required ?? o.pick ?? o.items.length;
        const cur = cc.remix[e.room] || (s.index === -1 ? [] : rr.slots.map(() => 0));
        if (s.index === -1) { if (!cur.includes(oi)) cur.push(oi); } else cur[si] = oi;
        cc.remix[e.room] = cur;
      });
      else if (std) { id = 'std:' + std.b.key; items = std.b.items; required = std.b.required || std.b.items.length; }
    }
    if (!id) { cc.unmatched.push(e.name); continue; }
    const flags = saved.get(e.idx) || [];
    const used = new Set<number>(); const got: number[] = [];
    flags.forEach((on, pos) => {
      if (!on || pos >= e.items.length) return;
      const s = e.items[pos]; const sq = s.id === '-1' ? null : qual(s.id);
      let i = items.findIndex((it, k) => !used.has(k) && it.qid === sq && it.quality === (QN[s.q] ?? 'normal'));
      if (i < 0) i = items.findIndex((it, k) => !used.has(k) && it.qid === sq);
      if (i < 0 && pos < items.length && !used.has(pos)) i = pos;
      if (i >= 0) { used.add(i); got.push(i); }
    });
    const done = rewards.get(e.idx) || roomDone.has(e.room) || got.length >= required;
    if (done) for (let i = 0; got.length < Math.min(required, items.length) && i < items.length; i++) if (!used.has(i)) { used.add(i); got.push(i); }
    if (done) cc.bundlesDone++;
    cc.itemsIn += got.length;
    if (got.length) cc.checked[id] = got.sort((x, y) => x - y);
  }

  // ---- collections ----
  const coll = (n: XNode | undefined) => dict(n).filter(({ val }) => { const v = Number(first(val)?.t ?? val?.t); return !val || !Number.isFinite(v) || v > 0; }).map(({ key }) => qual(key));
  const fishQ = new Set(core.fish.map((f) => f.qid));
  const fish = coll(kid(pl, 'fishCaught')).filter((q) => fishQ.has(q));
  const shipQ = new Set(core.shipping.map((s) => s.qid));
  const shipping = coll(kid(pl, 'basicShipped')).filter((q) => shipQ.has(q));
  const musQ = new Set(core.museum.items.map((i) => i.qid));
  const museum = [...new Set(dict(kid(locOf('LibraryMuseum'), 'museumPieces')).map(({ val }) => qual(val?.t.trim() || '')))].filter((q) => musQ.has(q));
  const cookedIds = new Set(coll(kid(pl, 'recipesCooked')));
  const cooking = core.recipes.cooking.filter((r) => r.out && cookedIds.has(r.out)).map((r) => r.id);
  const crafted = new Set(dict(kid(pl, 'craftingRecipes')).filter(({ val }) => Number(val?.t) > 0).map(({ key }) => key));
  const crafting = core.recipes.crafting.filter((r) => crafted.has(r.id) || crafted.has(r.name)).map((r) => r.id);

  // ---- friendships ----
  const npcId = new Map(core.npcs.map((n) => [n.name.toLowerCase(), n.id]));
  const hearts: Record<string, number> = {}, gifts: Record<string, number> = {};
  let met = 0;
  for (const { key, val } of dict(kid(pl, 'friendshipData'))) {
    const id = npcId.get(key.toLowerCase()); if (!id) continue;
    met++;
    hearts[id] = Math.min(14, Math.floor(num(val, 'Points') / 250));
    const g = num(val, 'GiftsThisWeek'); if (g > 0) gifts[id] = Math.min(2, g);
  }
  const sp = txt(pl, 'spouse');
  const spouse = sp ? npcId.get(sp.toLowerCase()) ?? null : null;

  // ---- unlocks ----
  const skills: Record<string, number> = {};
  for (const [k, tag] of [['Farming', 'farmingLevel'], ['Fishing', 'fishingLevel'], ['Foraging', 'foragingLevel'], ['Mining', 'miningLevel'], ['Combat', 'combatLevel']] as const) if (kid(pl, tag)) skills[k] = Math.min(10, num(pl, tag));
  const deep = num(pl, 'deepestMineLevel');
  const inv = kids(kid(pl, 'items'), 'Item');
  const toolLv = (t: string) => { const x = inv.find((i) => i.a.type === t); return x ? Math.min(4, num(x, 'upgradeLevel')) : -1; };
  const tl = { pickaxe: toolLv('Pickaxe'), axe: toolLv('Axe'), hoe: toolLv('Hoe'), can: toolLv('WateringCan') };
  const tools = Object.values(tl).some((v) => v >= 0) ? { pickaxe: Math.max(0, tl.pickaxe), axe: Math.max(0, tl.axe), hoe: Math.max(0, tl.hoe), can: Math.max(0, tl.can) } : null;
  const rodLv = toolLv('FishingRod');
  const rod: SaveData['setup']['rod'] = rodLv < 0 ? null : rodLv >= 3 ? 'iridium' : rodLv === 2 ? 'fiberglass' : 'bamboo';
  const keys: Record<string, boolean> = {};
  if (bool(pl, 'hasSkullKey') || mail.has('HasSkullKey')) keys.skullKey = true;
  if (bool(pl, 'hasRustyKey') || mail.has('HasRustyKey')) keys.rustyKey = true;
  if (bool(pl, 'hasDarkTalisman') || mail.has('HasDarkTalisman')) keys.talisman = true;
  if (mail.has('willyBoatFixed')) keys.boat = true;
  if (num(sg, 'goldenWalnutsFound') >= 100) keys.qi = true;
  const setup = { mine: Math.min(120, deep), skullDepth: Math.max(0, deep - 120), tools, rod, house: Math.min(3, num(pl, 'houseUpgradeLevel')), backpack: [12, 24, 36].includes(num(pl, 'maxItems')) ? num(pl, 'maxItems') : 12, keys };

  return {
    farmer: txt(pl, 'name') || 'Farmer', farmName: txt(pl, 'farmName') || 'My', farmType, date, weather,
    dailyLuck: dl, luck: dl == null ? null : luckFromDaily(dl),
    cc, fish, shipping, museum, cooking, crafting, hearts, gifts, spouse, met, skills, setup,
    bridge: mail.has('beachBridgeFixed') || bool(sg, 'beachBridgeFixed'), mail: mail.size,
  };
}

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const dateText = (d: SaveData['date']) => `${SEASONS[d.season]} ${d.day}, Year ${d.year}`;
const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** One friendly line per tick row in the "Found your farm" sheet. */
export function partLine(s: SaveData, part: ImportPart, cur?: Profile): string {
  switch (part) {
    case 'date': return `${cur ? `${SEASONS[cur.date.season]} ${cur.date.day} → ` : ''}${dateText(s.date)}`;
    case 'cc': return s.cc.route === 'joja' ? `Joja route · ${Object.keys(s.cc.joja).length - (s.cc.joja.membership ? 1 : 0)} rooms bought` : `${pl(s.cc.bundlesDone, 'bundle')} complete, ${pl(s.cc.itemsIn, 'item')} in${s.cc.mode === 'remix' ? ' · remixed' : ''}`;
    case 'fish': return `${s.fish.length} kinds caught`;
    case 'shipping': return `${pl(s.shipping.length, 'item')} shipped`;
    case 'museum': return pl(s.museum.length, 'donation');
    case 'recipes': return `${s.cooking.length} cooked · ${s.crafting.length} crafted`;
    case 'friends': return `${s.met} villagers met · hearts and this week’s gifts`;
    case 'unlocks': return 'Tools, skills, Mines floor and keys';
  }
}
export const PART_LABEL: Record<ImportPart, string> = { date: 'Date', cc: 'Community Center', fish: 'Fish', shipping: 'Shipping', museum: 'Museum', recipes: 'Recipes', friends: 'Friendships', unlocks: 'Unlocks' };

/** Apply the ticked parts onto a profile. Each part REPLACES what Valley Book had for it; notes, stars and settings stay. */
export function applySave(base: Profile, s: SaveData, parts: Set<ImportPart>): Profile {
  const p: Profile = normalizeProfile(JSON.parse(JSON.stringify(base)));
  const set = (col: string, ids: string[]) => { p.done[col] = Object.fromEntries(ids.map((i) => [i, 1])); };
  if (parts.has('date')) {
    p.date = { ...s.date }; p.weather = s.weather; p.time = 600;
    if (s.luck != null) p.luck = { day: `y${s.date.year}-${s.date.season}-${s.date.day}`, v: s.luck };
  }
  if (parts.has('cc')) {
    p.cc = { ...p.cc, route: s.cc.route, mode: s.cc.mode, checked: { ...s.cc.checked }, remix: s.cc.mode === 'remix' ? { ...s.cc.remix } : p.cc.remix, joja: { ...s.cc.joja } };
    p.setup.route = s.cc.route;
  }
  if (parts.has('fish')) set('fish', s.fish);
  if (parts.has('shipping')) set('shipping', s.shipping);
  if (parts.has('museum')) set('museum', s.museum);
  if (parts.has('recipes')) { set('cooking', s.cooking); set('crafting', s.crafting); }
  if (parts.has('friends')) { p.hearts = { ...s.hearts }; p.gifts = { ...s.gifts }; p.spouse = s.spouse; }
  if (parts.has('unlocks')) {
    p.perf.skills = { ...p.perf.skills, ...s.skills };
    p.setup.mine = s.setup.mine; p.setup.skullDepth = s.setup.skullDepth; p.setup.house = s.setup.house; p.setup.backpack = s.setup.backpack;
    if (s.setup.tools) p.setup.tools = { ...s.setup.tools };
    if (s.setup.rod) p.setup.rod = s.setup.rod;
    p.setup.keys = { ...p.setup.keys, ...s.setup.keys };
    if (s.bridge) p.flags.bridge = true;
  }
  return normalizeProfile(p);
}
export function newFromSave(s: SaveData, parts: Set<ImportPart>, blank: Profile): Profile {
  const b = { ...blank, name: s.farmName, farmType: s.farmType };
  return applySave(b, s, new Set([...parts]));
}
