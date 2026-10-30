// Where, when and in what weather each fish bites — hand-checked against the Stardew Valley Wiki
// (stardewvalleywiki.com, one page per fish, Oct 2026). The game's raw data is per-location and
// easy to misread (e.g. Sardine/Tiger Trout looked "all seasons"), so the app trusts this table.
export type Season = 'Spring' | 'Summer' | 'Fall' | 'Winter';
export type Gate = 'woods' | 'sewer' | 'bugLair' | 'swamp' | 'desert' | 'island' | 'nightMarket' | 'mine20' | 'mine60' | 'mine100' | 'qi';
export type Wx = 'sunny' | 'rainy' | 'both';
export type Times = [number, number][] | null; // HHMM 600..2600; null = any time
export interface Spot {
  at: string; seasons: Season[]; times: Times; weather: Wx;
  gate?: Gate;
  /** only on these days of the season (festivals / Night Market) */
  days?: [number, number];
  /** an extra, conditional way to catch it (island, Night Market, festival, Rain Totem) — not part of its "normal" seasons */
  extra?: string;
}
export interface WikiFish { page: string; spots: Spot[] }

const ALL: Season[] = ['Spring', 'Summer', 'Fall', 'Winter'];
const A: Times = null;
const SUB = (seasonsNote = 'Night Market submarine (Winter 15–17)'): Spot => ({ at: 'Night Market submarine', seasons: ['Winter'], days: [15, 17], times: [[1700, 2600]], weather: 'both', gate: 'nightMarket', extra: seasonsNote });
const ISLAND = (at: string, times: Times, weather: Wx = 'both'): Spot => ({ at, seasons: ALL, times, weather, gate: 'island', extra: 'Ginger Island, any season' });
const TOTEM = (at: string, times: Times, gate?: Gate): Spot => ({ at, seasons: ['Winter'], times, weather: 'rainy', gate, extra: 'Winter with a Rain Totem' });
const s = (at: string, seasons: Season[], times: Times, weather: Wx = 'both', gate?: Gate): Spot => ({ at, seasons, times, weather, gate });
const W = (page: string, ...spots: Spot[]): WikiFish => ({ page, spots });
const SP: Season[] = ['Spring'], SU: Season[] = ['Summer'], FA: Season[] = ['Fall'], WI: Season[] = ['Winter'];
const OCEAN = 'Ocean (The Beach)';

export const FISH_WIKI: Record<string, WikiFish> = {
  Pufferfish: W('Pufferfish', s(OCEAN, SU, [[1200, 1600]], 'sunny'), ISLAND('Ginger Island ocean & Pirate Cove', [[1200, 1600]], 'sunny')),
  Anchovy: W('Anchovy', s(OCEAN, ['Spring', 'Fall'], A)),
  Tuna: W('Tuna', s(OCEAN, ['Summer', 'Winter'], [[600, 1900]]), ISLAND('Ginger Island ocean & Pirate Cove', [[600, 1900]])),
  Sardine: W('Sardine', s(OCEAN, ['Spring', 'Fall', 'Winter'], [[600, 1900]])),
  Bream: W('Bream', s('River', ALL, [[1800, 2600]])),
  'Largemouth Bass': W('Largemouth Bass', s('Mountain Lake', ALL, [[600, 1900]])),
  'Smallmouth Bass': W('Smallmouth Bass', s('Town River, Forest Pond', ['Spring', 'Fall'], A)),
  'Rainbow Trout': W('Rainbow Trout', s('River, Mountain Lake', SU, [[600, 1900]], 'sunny'),
    { at: 'River, Mountain Lake', seasons: SU, days: [20, 21], times: A, weather: 'both', extra: 'Any time & weather during the Trout Derby (Summer 20–21)' }),
  Salmon: W('Salmon', s('River', FA, [[600, 1900]]), { at: 'Forest waterfalls', seasons: FA, times: A, weather: 'both', extra: 'Any time at the Forest waterfalls' }),
  Walleye: W('Walleye', s('River, Mountain Lake, Forest Pond', FA, [[1200, 2600]], 'rainy'), TOTEM('River, Mountain Lake, Forest Pond', [[1200, 2600]])),
  Perch: W('Perch', s('River, Mountain Lake, Forest Pond', WI, A)),
  Carp: W('Carp', s('Mountain Lake', ['Spring', 'Summer', 'Fall'], A), s('Secret Woods', ALL, A, 'both', 'woods'), s('The Sewers', ALL, A, 'both', 'sewer'), s('Mutant Bug Lair', ALL, A, 'both', 'bugLair')),
  Catfish: W('Catfish', s('River', ['Spring', 'Fall'], [[600, 2400]], 'rainy'), s('Secret Woods', ['Spring', 'Summer', 'Fall'], [[600, 2400]], 'rainy', 'woods'),
    s("Witch's Swamp", ['Spring', 'Summer', 'Fall'], [[600, 2400]], 'rainy', 'swamp'), TOTEM('River', [[600, 2400]])),
  Pike: W('Pike', s('River, Forest Pond', ['Summer', 'Winter'], A)),
  Sunfish: W('Sunfish', s('River', ['Spring', 'Summer'], [[600, 1900]], 'sunny')), // wiki: sun or spring wind — wind counts as dry here
  'Red Mullet': W('Red Mullet', s(OCEAN, ['Summer', 'Winter'], [[600, 1900]])),
  Herring: W('Herring', s(OCEAN, ['Spring', 'Winter'], A)),
  Eel: W('Eel', s(OCEAN, ['Spring', 'Fall'], [[1600, 2600]], 'rainy')),
  Octopus: W('Octopus', s(OCEAN, SU, [[600, 1300]]), SUB(), ISLAND('Ginger Island West (ocean)', [[600, 1300]])),
  'Red Snapper': W('Red Snapper', s(OCEAN, ['Summer', 'Fall'], [[600, 1900]], 'rainy'), TOTEM(OCEAN, [[600, 1900]])),
  Squid: W('Squid', s(OCEAN, WI, [[1800, 2600]]), { at: OCEAN, seasons: WI, days: [12, 13], times: A, weather: 'both', extra: 'Any time during SquidFest (Winter 12–13)' }),
  Seaweed: W('Seaweed', s('Ocean', ALL, A)),
  'Green Algae': W('Green Algae', s('Freshwater', ALL, A)),
  'Sea Cucumber': W('Sea Cucumber', s(OCEAN, ['Fall', 'Winter'], [[600, 1900]]), SUB()),
  'Super Cucumber': W('Super Cucumber', s(OCEAN, ['Summer', 'Fall'], [[1800, 2600]]), SUB(), ISLAND('Ginger Island ocean & Pirate Cove', [[1800, 2600]])),
  Ghostfish: W('Ghostfish', s('The Mines, floor 20', ALL, A, 'both', 'mine20'), s('The Mines, floor 60', ALL, A, 'both', 'mine60')),
  'White Algae': W('White Algae', s('The Mines (20 & 60), Sewers, Bug Lair, Swamp', ALL, A)),
  Stonefish: W('Stonefish', s('The Mines, floor 20', ALL, A, 'both', 'mine20')),
  Crimsonfish: W('Crimsonfish', s('East pier, The Beach', SU, A)),
  Angler: W('Angler', s('Plank bridge north of JojaMart', FA, A)),
  'Ice Pip': W('Ice Pip', s('The Mines, floor 60', ALL, A, 'both', 'mine60')),
  'Lava Eel': W('Lava Eel', s('The Mines, floor 100', ALL, A, 'both', 'mine100'), s('Volcano Caldera', ALL, A, 'both', 'island')),
  Legend: W('Legend', s('Mountain Lake, by the log', SP, A, 'rainy')),
  Sandfish: W('Sandfish', s('The Desert', ALL, [[600, 2000]], 'both', 'desert')),
  'Scorpion Carp': W('Scorpion Carp', s('The Desert', ALL, [[600, 2000]], 'both', 'desert')),
  Flounder: W('Flounder', s(OCEAN, ['Spring', 'Summer'], [[600, 2000]]), ISLAND('Ginger Island ocean & Pirate Cove', [[600, 2000]])),
  'Midnight Carp': W('Midnight Carp', s('Mountain Lake, Forest Pond', ['Fall', 'Winter'], [[2200, 2600]]), ISLAND('Ginger Island North & West (freshwater)', [[2200, 2600]])),
  'Mutant Carp': W('Mutant Carp', s('The Sewers', ALL, A, 'both', 'sewer')),
  Sturgeon: W('Sturgeon', s('Mountain Lake', ['Summer', 'Winter'], [[600, 1900]])),
  'Tiger Trout': W('Tiger Trout', s('River', ['Fall', 'Winter'], [[600, 1900]])),
  Bullhead: W('Bullhead', s('Mountain Lake', ALL, A)),
  Tilapia: W('Tilapia', s(OCEAN, ['Summer', 'Fall'], [[600, 1400]]), ISLAND('Ginger Island North & West (freshwater)', [[600, 1400]])),
  Chub: W('Chub', s('Mountain Lake, Forest River', ALL, A)),
  Dorado: W('Dorado', s('Forest River', SU, [[600, 1900]])),
  Albacore: W('Albacore', s(OCEAN, ['Fall', 'Winter'], [[600, 1100], [1800, 2600]])),
  Shad: W('Shad', s('River', ['Spring', 'Summer', 'Fall'], [[900, 2600]], 'rainy')),
  Lingcod: W('Lingcod', s('River, Mountain Lake', WI, A)),
  Halibut: W('Halibut', s(OCEAN, ['Spring', 'Summer', 'Winter'], [[600, 1100], [1900, 2600]])),
  Woodskip: W('Woodskip', s('Secret Woods', ALL, A, 'both', 'woods')),
  Glacierfish: W('Glacierfish', s('South tip of Arrowhead Island, Cindersap Forest', WI, A)),
  'Void Salmon': W('Void Salmon', s("Witch's Swamp", ALL, A, 'both', 'swamp')),
  Slimejack: W('Slimejack', s('Mutant Bug Lair', ALL, A, 'both', 'bugLair')),
  'Midnight Squid': W('Midnight Squid', SUB('Only on the Night Market submarine (Winter 15–17, 5pm–2am)')),
  'Spook Fish': W('Spook Fish', SUB('Only on the Night Market submarine (Winter 15–17, 5pm–2am)')),
  Blobfish: W('Blobfish', SUB('Only on the Night Market submarine (Winter 15–17, 5pm–2am)')),
  Stingray: W('Stingray', s('Pirate Cove, Ginger Island', ALL, A, 'both', 'island')),
  Lionfish: W('Lionfish', s('Ginger Island ocean (West, South, Southeast)', ALL, A, 'both', 'island')),
  'Blue Discus': W('Blue Discus', s('Ginger Island North & West (freshwater)', ALL, A, 'both', 'island')),
  'Cave Jelly': W('Cave Jelly', s('The Mines, floors 20, 60 & 100', ALL, A, 'both', 'mine20')),
  Goby: W('Goby', s('Cindersap Forest waterfalls', ALL, A)),
  'River Jelly': W('River Jelly', s('Freshwater (river, lake, ponds)', ALL, A)),
  'Sea Jelly': W('Sea Jelly', s('Ocean', ALL, A)),
  'Son of Crimsonfish': W('Son of Crimsonfish', s('East pier, The Beach (Extended Family quest)', ALL, A, 'both', 'qi')),
  'Ms. Angler': W('Ms. Angler', s('Plank bridge north of JojaMart (Extended Family quest)', ALL, A, 'both', 'qi')),
  'Legend II': W('Legend II', s('Mountain Lake (Extended Family quest)', ALL, A, 'both', 'qi')),
  'Radioactive Carp': W('Radioactive Carp', s('The Sewers (Extended Family quest)', ALL, A, 'both', 'qi')),
  'Glacierfish Jr.': W('Glacierfish Jr.', s('Arrowhead Island, Cindersap Forest (Extended Family quest)', ALL, A, 'both', 'qi')),
};
export const wikiUrl = (page: string) => `https://stardewvalleywiki.com/${page.replace(/ /g, '_')}`;
