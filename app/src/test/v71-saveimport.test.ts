import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { core } from '../data';
import { newProfile } from '../lib/state';
import { readSave, applySave, newFromSave, parseXml, partLine, IMPORT_PARTS, luckFromDaily } from '../lib/saveimport';
import { ccProgress, activeBundles, bundleDone } from '../lib/progress';

const XML = readFileSync(new URL('./fixtures/Shot_412345678.xml', import.meta.url), 'utf8');
const all = new Set(IMPORT_PARTS);

describe('save import: reading', () => {
  const s = readSave(core, XML);
  it('reads the farm, date, weather and luck', () => {
    expect(s.farmer).toBe('Shot');
    expect(s.farmName).toBe('Shot');
    expect(s.farmType).toBe('standard');
    expect(s.date).toEqual({ season: 0, day: 12, year: 1 });
    expect(s.weather).toBe('sun');
    expect(s.luck).toBe(2);
  });
  it('reads bundles: Spring Foraging done, partial others', () => {
    expect(s.cc.mode).toBe('standard');
    expect(s.cc.checked['std:Crafts Room/13']).toEqual([0, 1, 2, 3]);
    expect(s.cc.checked['std:Pantry/0']).toEqual([0, 3]);
    expect(s.cc.checked['std:Fish Tank/6']).toEqual([0]);
    expect(s.cc.checked['std:Fish Tank/7']).toEqual([1]);
    expect(s.cc.bundlesDone).toBe(1);
    expect(s.cc.itemsIn).toBe(8);
  });
  it('reads fish, shipping, museum and recipes', () => {
    expect(s.fish).toHaveLength(9);
    expect(s.fish).toContain('(O)145');
    expect(s.shipping.length).toBeGreaterThan(15);
    expect(s.shipping).toContain('(O)24');
    expect(s.museum).toEqual(expect.arrayContaining(['(O)96', '(O)80', '(O)86']));
    expect(s.cooking).toEqual(expect.arrayContaining(['Fried Egg', 'Salad']));
    expect(s.crafting).toContain('Chest');
    expect(s.crafting).not.toContain('Bait'); // known but never crafted
  });
  it('reads friendships (villagers only), gifts and unlocks', () => {
    expect(s.hearts.Abigail).toBe(4);
    expect(s.hearts.Lewis).toBe(2);
    expect(s.hearts).not.toHaveProperty('Marlon');
    expect(s.gifts.Abigail).toBe(1);
    expect(s.skills).toMatchObject({ Farming: 2, Fishing: 4, Mining: 3 });
    expect(s.setup.mine).toBe(27);
    expect(s.setup.tools).toEqual({ pickaxe: 1, axe: 1, hoe: 0, can: 0 });
    expect(s.setup.rod).toBe('bamboo');
  });
  it('writes a friendly line per part', () => {
    expect(partLine(s, 'fish')).toBe('9 kinds caught');
    expect(partLine(s, 'cc')).toBe('1 bundle complete, 8 items in');
    expect(partLine(s, 'date', newProfile())).toBe('Spring 1 → Spring 12, Year 1');
  });
});

describe('save import: applying', () => {
  it('updates an existing farm, replacing ticked parts and keeping stars and notes', () => {
    const p = newProfile('Old');
    p.stars = ['item:(O)24']; p.done.notes = { '1': 1 }; p.done.fish = { '(O)128': 1 };
    const s = readSave(core, XML);
    const out = applySave(p, s, new Set(['fish', 'cc', 'date'] as const));
    expect(out.id).toBe(p.id);
    expect(out.stars).toEqual(['item:(O)24']);
    expect(out.done.notes).toEqual({ '1': 1 });
    expect(Object.keys(out.done.fish)).toHaveLength(9);
    expect(out.done.fish['(O)128']).toBeUndefined();
    expect(out.date.day).toBe(12);
    expect(out.luck).toEqual({ day: 'y1-0-12', v: 2 });
    expect(out.hearts).toEqual({}); // friendships not ticked
    const done = activeBundles(core, out).filter((b) => bundleDone(out, b)).map((b) => b.name);
    expect(done).toEqual(['Spring Foraging']);
    expect(ccProgress(core, out).bundlesDone).toBe(1);
  });
  it('adds a new farm with everything', () => {
    const s = readSave(core, XML);
    const out = newFromSave(s, all, newProfile());
    expect(out.name).toBe('Shot');
    expect(out.hearts.Abigail).toBe(4);
    expect(out.setup.mine).toBe(27);
    expect(out.perf.skills.Fishing).toBe(4);
  });
});

describe('save import: other saves', () => {
  it('maps remixed bundles by name', () => {
    const x = XML.replace(/<string>Crafts Room\/17<\/string><\/key><value><string>Construction\/[^<]*/, '<string>Crafts Room/17</string></key><value><string>Sticky/O 495 30/92 500 0/0/1//Sticky')
      .replace('<item><key><int>17</int></key><value><ArrayOfBoolean><boolean>false</boolean>', '<item><key><int>17</int></key><value><ArrayOfBoolean><boolean>true</boolean>');
    const s = readSave(core, x);
    expect(s.cc.mode).toBe('remix');
    expect(s.cc.checked['rmx:Crafts Room:Sticky']).toEqual([0]);
    expect(s.cc.remix['Crafts Room'][4]).toBe(1);
  });
  it('reads Joja, rain, other farm types and bad luck', () => {
    const x = XML.replace('<string>Robin</string>', '<string>Robin</string><string>JojaMember</string><string>jojaPantry</string>')
      .replace('<isRaining>false</isRaining>', '<isRaining>true</isRaining>').replace('<whichFarm>0</whichFarm>', '<whichFarm>2</whichFarm>')
      .replace('<dailyLuck>0.081</dailyLuck>', '<dailyLuck>-0.09</dailyLuck>');
    const s = readSave(core, x);
    expect(s.cc.route).toBe('joja');
    expect(s.cc.joja).toEqual({ membership: true, Pantry: true });
    expect(s.weather).toBe('rain');
    expect(s.farmType).toBe('forest');
    expect(s.luck).toBe(-2);
    expect([0.08, 0.03, 0, -0.03, -0.1].map(luckFromDaily)).toEqual([2, 1, 0, -1, -2]);
  });
  it('explains the wrong file', () => {
    expect(() => readSave(core, '<?xml version="1.0"?><Farmer><name>Shot</name></Farmer>')).toThrow(/SaveGameInfo/);
    expect(() => readSave(core, '{"profiles":[]}')).toThrow(/not a Stardew Valley save/);
  });
  it('xml reader handles entities, self-closing tags and attributes', () => {
    const n = parseXml('<a x="1 &amp; 2"><b/><c>&lt;hi&gt; &#65;</c></a>');
    expect(n.a.x).toBe('1 & 2');
    expect(n.k.map((k) => k.n)).toEqual(['b', 'c']);
    expect(n.k[1].t).toBe('<hi> A');
  });
});
