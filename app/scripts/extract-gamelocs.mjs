// One-off: extracts villager homes (Data/Characters.json `Home`) and world-map building rectangles
// (Data/WorldMap.json WorldPositions `MapPixelArea`) from the game data checkout (kronosta/stardew-data, SDV 1.6)
// into src/game/gamelocs.json, which is committed because CI has no game-data checkout.
import { readFile, writeFile } from 'node:fs/promises';
const GAME = new URL('../../cache/src/game/Data/', import.meta.url).pathname;
const chars = JSON.parse(await readFile(GAME + 'Characters.json', 'utf8'));
const wm = JSON.parse(await readFile(GAME + 'WorldMap.json', 'utf8'));
const homes = {};
for (const [id, c] of Object.entries(chars)) if (c.Home?.length) homes[id] = c.Home.map((h) => ({ loc: h.Location, x: h.Tile.X, y: h.Tile.Y, ...(h.Condition ? { if: h.Condition } : {}) }));
const areas = {};
for (const [region, r] of Object.entries(wm)) for (const a of r.MapAreas ?? []) for (const w of a.WorldPositions ?? []) {
  const names = [w.LocationName, ...(w.LocationNames ?? [])].filter(Boolean);
  const p = w.MapPixelArea; if (!p) continue;
  for (const n of names) if (!areas[n]) areas[n] = { region, area: a.Id, x: p.X, y: p.Y, w: p.Width, h: p.Height };
}
await writeFile(new URL('../src/game/gamelocs.json', import.meta.url), JSON.stringify({ source: 'Stardew Valley 1.6 Data/Characters.json + Data/WorldMap.json via github.com/kronosta/stardew-data', homes, areas }, null, 0) + '\n');
console.log(Object.keys(homes).length, 'homes', Object.keys(areas).length, 'locations');
