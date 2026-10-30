// Turns the Phase 1 pipeline output (../data/*.json + ../sprites) into compact app data.
// Reads only; never modifies ../data. Output: src/generated/*.json and public/sprites/**.
// - decodes HTML entities (&amp; &#9825; ...)
// - keeps only items that have a downloaded sprite (internal/unobtainable decor is dropped)
// - copies only sprites the app references, with URL-safe file names
import { readFile, writeFile, mkdir, copyFile, rm, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname; // /workspace/sdv-app/
const APP = new URL('../', import.meta.url).pathname;
const DATA = path.join(ROOT, 'data');
const GAME = path.join(ROOT, 'cache/src/game');
const OUT = path.join(APP, 'src/generated');
const PUB = path.join(APP, 'public/sprites');

const load = async (f) => JSON.parse(await readFile(path.join(DATA, f), 'utf8')).data;
const loadGame = async (f) => { try { return JSON.parse(await readFile(path.join(GAME, f), 'utf8')); } catch { return {}; } };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
export function decodeEntities(s) {
  let prev;
  do {
    prev = s;
    s = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
      return ENT[e.toLowerCase()] ?? m;
    });
  } while (s !== prev);
  return s;
}
const deep = (o) => Array.isArray(o) ? o.map(deep) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deep(v)])) : typeof o === 'string' ? decodeEntities(o) : o;

// ---------- sprites ----------
const spritesMeta = await load('sprites.json');
const used = new Map(); // src local path -> public rel path
const safe = (p) => p.replace(/[^A-Za-z0-9_.\-/]/g, '_');
const taken = new Set();
function pub(local) {
  if (!local) return null;
  if (used.has(local)) return used.get(local);
  let rel = 'sprites/' + safe(local.replace(/^sprites\//, ''));
  let i = 1; while (taken.has(rel.toLowerCase())) rel = rel.replace(/(\.\w+)$/, `_${i++}$1`);
  taken.add(rel.toLowerCase()); used.set(local, rel); return rel;
}
const imgs = spritesMeta.images.filter((x) => x.found && x.downloaded && x.local);
const byGroup = (g) => { const m = new Map(); for (const x of imgs) if (x.group === g && !m.has(x.key)) m.set(x.key, x); return m; };
const itemImg = byGroup('items');
const sprite = (x) => (x ? { s: pub(x.local), w: x.w, h: x.h } : null);

// ---------- items ----------
const rawItems = deep(await load('items.json'));
const items = {};
for (const [qid, it] of Object.entries(rawItems)) {
  const im = itemImg.get(qid);
  if (!im) continue; // no sprite -> hidden
  items[qid] = { n: it.name, c: it.categoryName || '', p: it.price ?? 0, d: it.description || '', s: pub(im.local), w: im.w, h: im.h, k: it.kind === 'bigcraftable' ? 'bc' : it.kind === 'object' ? 'o' : it.kind, t: (it.contextTags || []).filter((t) => t.startsWith('season_')).map((t) => t.slice(7)) , cat: it.category };
}
const hasItem = (q) => !!items[q];
const droppedItems = Object.keys(rawItems).filter((q) => !items[q]).map((q) => `${q} ${rawItems[q].name}`);

// furniture / hats / weapons names for museum & slayer rewards (text only, no sprite)
const furn = await loadGame('Data/Furniture.json');
const furnStr = await loadGame('Strings/Furniture.json');
const hats = await loadGame('Data/hats.json');
const weapons = await loadGame('Data/Weapons.json');
const weaponStr = await loadGame('Strings/Weapons.json');
function otherName(qid) {
  const m = /^\((F|H|W)\)(.+)$/.exec(qid || ''); if (!m) return null;
  const [, t, id] = m;
  if (t === 'F' && furn[id]) { const parts = furn[id].split('/'); const lt = /Strings\\Furniture:(\w+)/.exec(parts[7] || ''); return (lt && furnStr[lt[1]]) || parts[0].replace(/^'|'$/g, ''); }
  if (t === 'H' && hats[id]) return hats[id].split('/')[0];
  if (t === 'W' && weapons[id]) { const lt = /Strings\\Weapons:(\w+)/.exec(weapons[id].DisplayName || ''); return (lt && weaponStr[lt[1]]) || weapons[id].Name; }
  return null;
}
const fixReward = (r) => { if (!r) return r; if (r.qid && !hasItem(r.qid)) { const nm = otherName(r.qid); return { ...r, name: nm || (r.name?.startsWith('(') ? null : r.name), qid: null }; } return r; };

// ---------- NPCs ----------
const npcsRaw = deep(await load('npcs.json'));
const npcMetaRaw = deep(JSON.parse(await readFile(path.join(DATA, 'npcs.json'), 'utf8'))._meta);
const portraits = byGroup('portraits');
const icons = byGroup('npc_icons');
const npcs = []; const gifts = {};
for (const [id, n] of Object.entries(npcsRaw)) {
  npcs.push({ id, name: n.name, birthday: n.birthday, romanceable: !!n.romanceable, gender: n.gender, age: n.age, region: n.homeRegion, address: n.address, location: n.location, family: n.family, perfection: n.perfectionScore !== false, portrait: sprite(portraits.get(id)), icon: sprite(icons.get(id)), wiki: n.wikiUrl });
  const g = {};
  for (const tier of ['love', 'like', 'neutral', 'dislike', 'hate']) {
    g[tier] = (n.gifts?.[tier] || []).filter(hasItem).map((q) => { const r = n.giftReasons?.[q] || ''; return r.startsWith('universal') ? [q, 1] : [q]; });
  }
  gifts[id] = { tiers: g, dialogue: n.giftDialogue, notes: n.wikiGiftNotes };
}

// ---------- schedules ----------
const schedRaw = deep(await load('schedules.json'));
const schedules = {};
for (const [id, s] of Object.entries(schedRaw)) {
  schedules[id] = { notes: s.notes.map((x) => ({ sub: x.subsection, text: x.text })), blocks: s.blocks.map((b) => ({ sub: b.subsection, cond: b.condition, tags: b.conditionTags, e: b.entries.map((e) => [e.time, e.description, e.locations]) })), wiki: s.wikiUrl };
}

// ---------- bundles ----------
const bundlesRaw = deep(await load('bundles.json'));
const bundleImg = byGroup('bundles');
const roomImgs = imgs.filter((x) => x.group === 'rooms');
const mapItem = (i) => i.oneOf ? { oneOf: i.oneOf.filter((o) => hasItem(o.qid)).map(mapItem) } : { qid: i.qid && hasItem(i.qid) ? i.qid : null, name: i.name, count: i.count ?? 1, quality: i.quality || 'normal', source: i.source || null, gold: i.gold, category: i.category };
const bundleIcon = (name) => sprite(bundleImg.get(name));
const colorIcon = (file) => sprite(bundleImg.get('color:' + file));
const rooms = bundlesRaw.rooms.map((r) => ({
  name: r.name, reward: r.reward, description: r.description, joja: r.jojaDevelopment, jojaCost: r.jojaCost,
  images: roomImgs.filter((x) => x.key === r.name).map((x) => sprite(x)),
  bundles: r.bundles.map((b) => ({ key: b.key, name: b.name, color: b.color, required: b.itemsRequired, items: b.items.map(mapItem), reward: Array.isArray(b.reward) ? null : fixReward(b.reward), icon: bundleIcon(b.name), colorIcon: colorIcon(b.colorIcon) })),
}));
// RandomBundles writes rewards by short name ("3 Battery"); the game resolves "Battery" to Battery Pack (O)787, the same
// item the pipeline already resolves for the bundle's own "1 Battery" ingredient.
const remixReward = (r) => r && !r.qid && r.name === 'Battery' && hasItem('(O)787') ? { ...r, qid: '(O)787', name: 'Battery Pack' } : fixReward(r);
const remix = bundlesRaw.remix.map((r) => ({
  room: r.room, count: r.bundleKeys.length,
  slots: r.slots.map((sl) => ({ index: sl.index, note: sl.note, options: sl.options.map((o) => ({ name: o.name, color: o.color, pick: o.pick, required: o.itemsRequired, items: o.items.map(mapItem), reward: remixReward(o.reward), icon: bundleIcon(o.name), colorIcon: colorIcon(o.colorIcon) })) })),
}));

// ---------- collections ----------
const fishRaw = deep(await load('fish.json'));
const fish = fishRaw.filter((f) => hasItem(f.qid)).map((f) => ({ qid: f.qid, name: f.name, method: f.method || 'other', times: f.times || null, seasons: f.seasons ? f.seasons.map((s) => s[0].toUpperCase() + s.slice(1)) : null, weather: f.weather || null, water: f.water || null, level: f.minFishingLevel ?? 0, collection: !!f.collection, legendary: !!f.legendary, family: !!f.legendaryFamily, price: f.price, difficulty: f.difficulty ?? null, behavior: f.behavior ?? null, summary: f.summary, locs: (f.spawns || []).map((s) => s.location).filter((v, i, a) => v && a.indexOf(v) === i), spawns: (f.spawns || []).map((s) => s.locationName).filter((v, i, a) => v && a.indexOf(v) === i) }));
const museumRaw = deep(await load('museum.json'));
// v6.3: rewards whose item has no object sprite (furniture, the Rusty Key event) get their unedited wiki sprite (SOURCES.json);
// the game's Count -1 ("every donatable item", museumComplete) is resolved to the real number of donatable items.
const rewardIcons = JSON.parse(await readFile(path.join(ROOT, 'sprites/derived/museum_rewards.json'), 'utf8'));
const museumItems = museumRaw.items.filter((i) => hasItem(i.qid));
const museum = { items: museumItems, rewards: museumRaw.rewards.map((r) => {
  const ic = rewardIcons[r.id];
  const reward = r.reward ? fixReward(r.reward) : r.actions?.some((a) => /MarkEventSeen Host 295672/.test(a)) ? { qid: null, name: 'Rusty Key', count: 1, isRecipe: false, note: 'Gunther delivers it the next day; opens the Sewers' } : null;
  return { ...r, requires: r.requires.map((q) => ({ ...q, qid: q.qid && hasItem(q.qid) ? q.qid : null, ...(q.count < 0 ? { count: museumItems.length, all: true } : {}) })), reward,
    icon: !reward?.qid && ic ? { s: pub('sprites/derived/' + ic[0]), w: ic[1], h: ic[2] } : null };
}) };
const shipping = deep(await load('shipping.json')).filter((s) => hasItem(s.qid));
const recipesRaw = deep(await load('recipes.json'));
const catIcon = { '-4': '(O)145', '-5': '(O)176', '-6': '(O)184', '-777': '(O)495' }; // representative real sprites for "Any Fish/Egg/Milk/Wild Seeds"
const mapIng = (i) => ({ qid: i.qid && hasItem(i.qid) ? i.qid : i.category != null ? catIcon[String(i.category)] ?? null : null, name: i.name, count: i.count, any: i.category != null });
const mapRecipe = (r) => ({ id: r.recipe, name: r.displayName, out: r.output?.qid && hasItem(r.output.qid) ? r.output.qid : null, outCount: r.output?.count ?? 1, ing: r.ingredients.map(mapIng), unlock: r.unlock, perfection: r.countsForPerfection !== false });
const recipes = { cooking: recipesRaw.cooking.map(mapRecipe), crafting: recipesRaw.crafting.map(mapRecipe) };
const perfection = deep(await load('perfection.json'));
const walnuts = deep(await load('walnuts.json'));
const achImg = byGroup('achievements');
const achievements = deep(await load('achievements.json')).map((a) => ({ name: a.name, desc: a.description, id: a.gameId, inGame: a.inGame, icon: sprite(achImg.get(a.name)) }));
const monImg = byGroup('monsters');
// Slayer hats have no object sprite (fixReward drops (H) qids); use their real wiki hat sprite (SOURCES.json).
const hatIcons = JSON.parse(await readFile(path.join(ROOT, 'sprites/derived/hats.json'), 'utf8'));
const slayerReward = (r) => { const x = fixReward(r); const h = x && !x.qid && hatIcons[x.name]; return h ? { ...x, icon: { s: pub('sprites/derived/' + h[0]), w: h[1], h: h[2] } } : x; };
const slayer = deep(await load('monster_slayer.json')).map((m) => ({ id: m.id, name: m.name, targets: m.targets, count: m.count, reward: slayerReward(m.reward), sprites: m.targets.map((t) => monImg.get(t)).filter((x) => x && x.w <= 200).map(sprite) }));
// Picture notes ('!image N' in game data) get the wiki's note picture (3x, unedited; SOURCES.json); solutions are the wiki's text.
const notesWiki = await load('secret_notes_wiki.json');
const notes = deep(await load('secret_notes.json')).map((n) => {
  const w = notesWiki[n.id] || {};
  const isImg = /^!image \d+$/.test(n.text.trim());
  return { id: n.id, kind: n.kind, text: isImg ? '' : n.text, img: w.image ? { s: pub('sprites/derived/' + w.image), w: 216, h: 216, scale: 3 } : null, isImg,
    solutions: w.solutions || [], reveals: n.revealsTastes.filter(([, q]) => hasItem('(O)' + q)).map(([npc, q]) => [npc, '(O)' + q]) };
});
const uiImg = byGroup('ui');
const ui = Object.fromEntries([...uiImg].map(([k, v]) => [k, sprite(v)]));
// Grass strip: in-game grass tiles cropped, unedited, from the wiki's File:Standard_Farm.png (see ../sprites/derived/SOURCES.json).
ui['ground:Grass'] = { s: pub('sprites/derived/Grass_Strip.png'), w: 64, h: 22 };
// v6 scenery (see ../sprites/derived/SOURCES.json): Green Rain trees' spring panels cropped from the wiki, and the wiki's 4-frame animated Junimo as a strip.
ui['tree:Fiddlehead'] = { s: pub('sprites/derived/Tree_Fiddlehead.png'), w: 155, h: 475 };
ui['tree:MossyWild'] = { s: pub('sprites/derived/Tree_Mossy_Wild.png'), w: 240, h: 485 };
ui['tree:MossyLush'] = { s: pub('sprites/derived/Tree_Mossy_Lush.png'), w: 240, h: 480 };
ui['junimo:Strip'] = { s: pub('sprites/derived/Junimo_Strip.png'), w: 192, h: 48 };
// v6.4 Maps: the wiki's unedited in-game world maps, File:Map.png and File:Ginger_Island_Map.png (see SOURCES.json).
ui['map:Valley'] = { s: pub('sprites/derived/Map_Valley.png'), w: 400, h: 244 };
ui['map:Island'] = { s: pub('sprites/derived/Map_Ginger_Island.png'), w: 400, h: 244 };
ui['map:Desert'] = { s: pub('sprites/derived/Map_Desert.png'), w: 800, h: 960 };
// v6 farm types: the wiki's unedited farm map selection icons (File:<Type>_Farm_Map_Icon.png, see SOURCES.json).
for (const [k, f, w] of [['standard', 'Standard', 54], ['riverland', 'Riverland', 57], ['forest', 'Forest', 54], ['hilltop', 'Hilltop', 54], ['wilderness', 'Wilderness', 54], ['fourcorners', 'Four_Corners', 54], ['beach', 'Beach', 54], ['meadowlands', 'Meadowlands', 54]]) ui['farm:' + k] = { s: pub(`sprites/derived/${f}_Farm_Map_Icon.png`), w, h: 60 };
// v6.2 meadow ground (see ../sprites/derived/SOURCES.json): 4 unedited 16×16 grass tiles from File:Standard_Farm.png,
// the Weeds debris sprites cut from File:Weeds_Composite.png (2×), and the grown Fiber crop (3×) as tall tufts.
ui['ground:Tiles'] = { s: pub('sprites/derived/Ground_Tiles.png'), w: 64, h: 16 };
for (let i = 1; i <= 8; i++) ui['weed:' + i] = { s: pub(`sprites/derived/Weed_${i}.png`), w: 32, h: 32 };
for (const [k, f] of [['spring', 'Fiber_Tuft'], ['fall', 'Fiber_Tuft_Fall'], ['winter', 'Fiber_Tuft_Winter']]) ui['tuft:' + k] = { s: pub(`sprites/derived/${f}.png`), w: 45, h: 75 };
// v6.3 seasons (see ../sprites/derived/SOURCES.json): the other seasonal panels of the same trees (5× Green Rain trees),
// the Maple's fall and the Pine's snowy winter panel (2× wiki images), snow ground cut from File:Festival_of_Ice.png,
// and the tumbling leaf / petal from the game's TV weather animations (4 frames each, 1×).
for (const [k, f, w, h] of [['MossyWild', 'Tree_Mossy_Wild', 240, 485], ['MossyLush', 'Tree_Mossy_Lush', 240, 480]])
  for (const [i, n] of [[1, 'Summer'], [2, 'Fall'], [3, 'Winter']]) ui[`tree:${k}:${i}`] = { s: pub(`sprites/derived/${f}_${n}.png`), w, h };
ui['tree:Fiddlehead:1'] = { s: pub('sprites/derived/Tree_Fiddlehead_Summer.png'), w: 155, h: 475 };
ui['tree:Maple:2'] = { s: pub('sprites/derived/Tree_Maple_Fall.png'), w: 94, h: 182 };
ui['tree:Oak:2'] = { s: pub('sprites/derived/Tree_Oak_Fall.png'), w: 96, h: 184 };
for (const [n, w, h] of [['Oak', 96, 184], ['Maple', 94, 180], ['Pine', 96, 180]]) ui[`tree:${n}:0`] = { s: pub(`sprites/derived/Tree_${n}_Spring.png`), w, h };
ui['tree:Pine:3'] = { s: pub('sprites/derived/Tree_Pine_Winter.png'), w: 96, h: 182 };
ui['ground:Tiles:3'] = { s: pub('sprites/derived/Ground_Tiles_Winter.png'), w: 64, h: 16 };
ui['air:leaf'] = { s: pub('sprites/derived/Particle_Leaf.png'), w: 32, h: 8 };
ui['air:petal'] = { s: pub('sprites/derived/Particle_Petal.png'), w: 28, h: 7 };
ui['sky:Sun'] = { s: pub('sprites/derived/Sun.png'), w: 16, h: 16 }; // File:Sunny.png with its flat cyan backdrop keyed out
const nameToQid = new Map(Object.entries(items).map(([q, v]) => [v.n.toLowerCase(), q]));
const powerIcons = JSON.parse(await readFile(path.join(ROOT, 'sprites/derived/powers.json'), 'utf8'));
const powerSprite = (p) => {
  if (hasItem('(O)' + p.id)) return { item: '(O)' + p.id };
  const q = nameToQid.get(p.name.toLowerCase()); if (q) return { item: q };
  const m = /^Mastery_(\w+)/.exec(p.id); if (m) return { ui: 'skill:' + m[1] };
  // Special items with no object sprite: their real wiki sprite (48x48 = 3x of 16; SOURCES.json).
  if (powerIcons[p.id]) { const k = 'power:' + p.id; ui[k] = { s: pub('sprites/derived/' + powerIcons[p.id]), w: 48, h: 48 }; return { ui: k }; }
  if (p.id === 'SpringOnionMastery' && nameToQid.get('spring onion')) return { item: nameToQid.get('spring onion') };
  return {};
};
const powers = deep(await load('powers.json')).map((p) => ({ id: p.id, name: p.name, desc: p.description, ...powerSprite(p) }));
const island = deep(await load('island_upgrades.json')).map((u) => ({ ...u, cost: Number(u.cost) }));
// special orders: resolve [Key] placeholders from the game's English strings; hide unused ones
const soStr = await loadGame('Strings/SpecialOrderStrings.json');
const PH = { 'FishType:Text': '[random fish]', 'Crop:Text': '[random crop]', 'Crop:TextPlural': '[random crop]', 'Monster:LocalizedName': '[random monster]', 'Resource:Text': '[random resource]', 'Treasure:Count': 'some', 'Treasure:LocalizedName': '[random treasure]', Greeting: 'Hello', Text: '' };
const tidy = (s) => decodeEntities(String(s || '')).replace(/\[([A-Za-z0-9_]+)\]/g, (m, k) => soStr[k] ?? m).replace(/\{([^}]+)\}/g, (m, k) => PH[k] ?? '…').replace(/\s{2,}/g, ' ').replace(/\s*-\s*(\w+)\s*$/, ' —$1').trim();
const ordersRaw = deep(await load('special_orders.json'));
const orders = ordersRaw.filter((o) => !o.unused).map((o) => ({ id: o.id, name: tidy(o.name), requester: o.requester, board: o.board, text: tidy(o.text), duration: o.duration, repeatable: o.repeatable, objectives: o.objectives.map((x) => tidy(x.text)), tags: (o.requiredTags || '').split(',').map((t) => t.trim()).filter(Boolean), rewards: o.rewards.map((r) => r.type === 'gold' ? { type: 'gold', amount: /^\d+$/.test(r.amount) ? Number(r.amount) : null } : r.type === 'qiGems' ? { type: 'qiGems', amount: Number(r.amount) } : r.type === 'object' ? { type: 'item', qid: hasItem('(O)' + r.Item) ? '(O)' + r.Item : null, amount: Number(r.Amount) } : { type: r.type }) }));
const unusedOrders = ordersRaw.filter((o) => o.unused).map((o) => o.id);

// ---------- daily guide ----------
const g = deep(await load('guide.json'));
const Q = (id) => (hasItem('(O)' + id) ? '(O)' + id : null);
const guide = {
  crops: g.crops.map((c) => ({ ...c, seed: Q(c.seed), item: Q(c.item) })).filter((c) => c.item),
  forage: g.forage.map((f) => ({ ...f, item: Q(f.item) })).filter((f) => f.item),
  forageLoc: g.forageLoc, forageAccess: g.forageAccess,
  events: g.events,
  quests: g.quests.map((q) => ({ ...q, item: q.item ? Q(q.item) : undefined })),
  raccoon: { ...g.raccoon, stages: g.raccoon.stages.map((s) => ({ ...s, items: (s.items || []).map(Q).filter(Boolean) })) },
  cartPool: g.cartPool.map((n) => '(O)' + n).filter(hasItem),
  facts: g.facts,
};
const core = { guide, npcs, rooms, remix, joja: bundlesRaw.joja, fish, museum, shipping, recipes, perfection, walnuts, achievements, slayer, notes, powers, island, orders, ui, universal: npcMetaRaw.universalTastes };
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'items.json'), JSON.stringify(items));
await writeFile(path.join(OUT, 'core.json'), JSON.stringify(core));
await writeFile(path.join(OUT, 'gifts.json'), JSON.stringify(gifts));
await writeFile(path.join(OUT, 'schedules.json'), JSON.stringify(schedules));
await writeFile(path.join(OUT, 'report.json'), JSON.stringify({ droppedItems, unusedOrders, missingMonsterSprites: spritesMeta.coverage?.monsters?.missing ?? [] }, null, 1));

// copy sprites (also the extra few the app shell needs)
pub('sprites/items/Prismatic_Shard.png');
await rm(PUB, { recursive: true, force: true });
let n = 0;
for (const [src, rel] of used) {
  const dst = path.join(APP, 'public', rel);
  await mkdir(path.dirname(dst), { recursive: true });
  await access(path.join(ROOT, src));
  await copyFile(path.join(ROOT, src), dst); n++;
}
console.log(`prepare-data: ${Object.keys(items).length} items (dropped ${droppedItems.length} without sprites), ${npcs.length} npcs, ${n} sprites copied`);
