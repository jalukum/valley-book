// Map tabs and spots for the Maps screen.
// Building positions are the game's own: the centres of Data/WorldMap.json `MapPixelArea`s (Stardew Valley 1.6),
// in the 300×180 world-map texture's pixels. Spots marked `approx` are open ground picked by eye on the wiki map art
// (paths, beach, lake), because the game only stores whole-area rectangles for outdoor places.

export type RegionId = 'valley' | 'island' | 'desert';
export interface Region {
  id: RegionId; label: string; img: string; w: number; h: number;
  /** Game world-map pixel -> image pixel: img = a·g + b (per axis). */
  a: number; bx: number; by: number;
  /** Area (image px) the view may pan inside, and where it starts. */
  bounds: [number, number, number, number]; start: [number, number];
}
// Valley: Data/WorldMap.json "Valley" BaseTexture LooseSprites\map (300×180) drawn 4/3× on the wiki's 400×244 File:Map.png with a 2/1 px frame offset.
// Ginger Island: same 4/3 scale; offset fitted on the volcano caldera and the dock (WorldMap "GingerIsland" areas). Approximate.
export const REGIONS: Record<RegionId, Region> = {
  valley: { id: 'valley', label: 'Stardew Valley', img: 'map:Valley', w: 400, h: 244, a: 4 / 3, bx: -2, by: -1, bounds: [0, 0, 400, 244], start: [232, 118] },
  island: { id: 'island', label: 'Ginger Island', img: 'map:Island', w: 400, h: 244, a: 4 / 3, bx: -33, by: -9, bounds: [0, 0, 400, 244], start: [190, 110] },
  // Calico Desert: the wiki's full 800×960 render of the location (1 px per game pixel, 16 px tiles). Spots are image px.
  desert: { id: 'desert', label: 'Calico Desert', img: 'map:Desert', w: 800, h: 960, a: 1, bx: 0, by: 0, bounds: [0, 0, 800, 960], start: [400, 480] },
};
export const REGION_ORDER: RegionId[] = ['valley', 'island', 'desert'];

export const toImg = (r: Region, gx: number, gy: number): [number, number] => [r.a * gx + r.bx, r.a * gy + r.by];

export interface Spot { region: RegionId; x: number; y: number; label: string; indoor?: boolean; approx?: boolean }
/** x, y = game world-map pixels. */
const B = (region: RegionId, x: number, y: number, w: number, h: number, label: string): Spot => ({ region, x: x + w / 2, y: y + h / 2, label, indoor: true });
const O = (region: RegionId, x: number, y: number, label: string): Spot => ({ region, x, y, label, approx: true });
export const SPOTS: Record<string, Spot> = {
  // Valley buildings (MapPixelArea from Data/WorldMap.json)
  Saloon: B('valley', 177, 95, 4, 3, 'The Stardrop Saloon'),
  SeedShop: B('valley', 175, 84, 6, 3, "Pierre's General Store"),
  Hospital: B('valley', 171, 84, 3, 3, "Harvey's Clinic"),
  JoshHouse: B('valley', 188, 89, 4, 4, '1 River Road'),
  Trailer: B('valley', 198, 94, 5, 3, 'The Trailer'),
  ManorHouse: B('valley', 189, 104, 6, 6, "Mayor's Manor"),
  HaleyHouse: B('valley', 162, 108, 5, 3, '2 Willow Lane'),
  SamHouse: B('valley', 153, 107, 3, 3, '1 Willow Lane'),
  Blacksmith: B('valley', 214, 104, 3, 3, 'Blacksmith'),
  Museum: B('valley', 220, 110, 5, 3, 'Museum & Library'),
  JojaMart: B('valley', 215, 79, 7, 5, 'JojaMart'),
  CommunityCenter: B('valley', 184, 57, 5, 4, 'Community Center'),
  ScienceHouse: B('valley', 172, 36, 6, 4, "Carpenter's Shop"),
  Tent: B('valley', 189, 28, 1, 2, "Linus's tent"),
  AdventureGuild: B('valley', 219, 28, 3, 2, "Adventurer's Guild"),
  Mines: B('valley', 204, 26, 1, 1, 'The Mines'),
  AnimalShop: B('valley', 102, 102, 2, 2, "Marnie's Ranch"),
  LeahHouse: B('valley', 111, 113, 3, 2, "Leah's Cottage"),
  WizardHouse: B('valley', 50, 107, 2, 3, "Wizard's Tower"),
  ElliottHouse: B('valley', 211, 140, 2, 3, "Elliott's Cabin"),
  FishShop: B('valley', 202, 155, 5, 3, "Willy's Fish Shop"),
  Spa: B('valley', 149, 17, 6, 6, 'The Spa'),
  Sewer: B('valley', 175, 120, 2, 2, 'The Sewers'),
  Submarine: B('valley', 181, 158, 9, 8, 'Night Market'),
  // Valley outdoor spots (approximate, picked on the map art inside the WorldMap area rectangles)
  Square: O('valley', 168, 95, 'Pelican Town square'),
  Graveyard: O('valley', 201, 108, 'Graveyard'),
  IceCream: O('valley', 190, 82, 'Ice cream stand'),
  Beach: O('valley', 220, 146, 'The Beach'),
  Lake: O('valley', 205, 38, 'Mountain lake'),
  Forest: O('valley', 100, 130, 'Cindersap Forest'),
  BusStop: O('valley', 130, 62, 'Bus Stop'),
  Railroad: O('valley', 162, 14, 'Railroad'),
  Farm: O('valley', 98, 74, 'The farm'),
  Treehouse: O('valley', 198, 33, "Leo's treehouse"),
  // Calico Desert: image px on the wiki's full desert render (File:DesertDistances.png, overlay removed) (door / sign tiles picked on the image).
  Desert: { region: 'desert', x: 104, y: 812, label: 'The Oasis (Sandy’s shop)', indoor: true },
  SkullCavern: { region: 'desert', x: 136, y: 92, label: 'Skull Cavern', indoor: true },
  DesertTrader: { region: 'desert', x: 650, y: 372, label: 'Desert Trader', approx: true },
  DesertBus: { region: 'desert', x: 424, y: 372, label: 'Bus stop', approx: true },
  DesertFest: { region: 'desert', x: 400, y: 640, label: 'Desert Festival grounds', approx: true },
  // Ginger Island (Data/WorldMap.json "GingerIsland" region)
  IslandHut: B('island', 190, 67, 13, 12, "Leo's hut"),
  Shrine: B('island', 210, 70, 5, 5, 'Gem Bird Shrine'),
  IslandEast: O('island', 196, 92, 'Island East jungle'),
  IslandNorth: O('island', 160, 80, 'Island North'),
  IslandSouth: O('island', 157, 126, 'Island South dock'),
  IslandWest: O('island', 90, 120, 'Island West'),
};

/** Game location name (Data/Characters.json homes, Data/WorldMap.json) -> spot. Interiors map to their building on the map,
 *  exactly as the game's world map does (e.g. SebastianRoom shares ScienceHouse's MapPixelArea). */
export const LOC_TO_SPOT: Record<string, string> = {
  SeedShop: 'SeedShop', Sunroom: 'SeedShop', Blacksmith: 'Blacksmith', ScienceHouse: 'ScienceHouse', SebastianRoom: 'ScienceHouse',
  FishShop: 'FishShop', ElliottHouse: 'ElliottHouse', HaleyHouse: 'HaleyHouse', JoshHouse: 'JoshHouse', Saloon: 'Saloon',
  Hospital: 'Hospital', HarveyRoom: 'Hospital', AnimalShop: 'AnimalShop', SamHouse: 'SamHouse', LeahHouse: 'LeahHouse',
  ManorHouse: 'ManorHouse', Tent: 'Tent', AdventureGuild: 'AdventureGuild', Trailer: 'Trailer', Trailer_Big: 'Trailer',
  WizardHouse: 'WizardHouse', WizardHouseBasement: 'WizardHouse', Mine: 'Mines', Mines: 'Mines', Sewer: 'Sewer',
  ArchaeologyHouse: 'Museum', JojaMart: 'JojaMart', CommunityCenter: 'CommunityCenter', BathHouse_Entry: 'Spa', BathHouse_Pool: 'Spa',
  Submarine: 'Submarine', SandyHouse: 'Desert', SandyShop: 'Desert', Club: 'Desert', Desert: 'Desert', SkullCave: 'SkullCavern',
  LeoTreeHouse: 'Treehouse', IslandHut: 'IslandHut',
};
/** Fallback home building keyed by core.json `address` (wiki infobox), for anyone missing from the game data. */
export const HOME_BY_ADDRESS: Record<string, string> = {
  '24 Mountain Road': 'ScienceHouse', Tent: 'Tent', "Pierre's General Store": 'SeedShop', '1 River Road': 'JoshHouse',
  "Mayor's Manor": 'ManorHouse', Blacksmith: 'Blacksmith', Trailer: 'Trailer', '2 Willow Lane': 'HaleyHouse',
  "Marnie's Ranch": 'AnimalShop', '1 Willow Lane': 'SamHouse', "Leah's Cottage": 'LeahHouse', "Elliott's Cabin": 'ElliottHouse',
  'The Stardrop Saloon': 'Saloon', 'Eastern Cave': 'Mines', "Wizard's Tower": 'WizardHouse', 'Medical Clinic': 'Hospital',
  Oasis: 'Desert', 'Fish Shop': 'FishShop', "Krobus' Shop": 'Sewer',
};
/** Villagers the wiki lists no schedule for: shown at their fixed home spot. */
export const FIXED_NPCS = ['Wizard', 'Dwarf', 'Krobus'];

/** Words in a schedule line -> spot. Matched case-insensitively; the mention that comes last in the line wins (it is usually the destination). */
export const KEYWORDS: [RegExp, string][] = [
  [/saloon|prairie king|tend(s|ing)? the bar|behind the bar/i, 'Saloon'], [/\b(the )?lab\b|microscope/i, 'ScienceHouse'],
  [/exam(ination)? room|waiting room/i, 'Hospital'], [/sunroom/i, 'SeedShop'], [/grandparents?'?(s|’s)?\b|dog (pen|kennel)/i, 'JoshHouse'],
  [/treehouse/i, 'Treehouse'], [/\b(his|leo'?s|leo’s) hut\b/i, 'IslandHut'], [/general store|pierre'?s|yoba/i, 'SeedShop'], [/clinic|hospital/i, 'Hospital'],
  [/manor/i, 'ManorHouse'], [/carpenter|robin'?s|24 mountain road/i, 'ScienceHouse'], [/marnie'?s|ranch/i, 'AnimalShop'],
  [/trailer/i, 'Trailer'], [/museum|library/i, 'Museum'], [/joja/i, 'JojaMart'], [/fish shop|willy'?s/i, 'FishShop'],
  [/community cent(er|re)/i, 'CommunityCenter'], [/elliott'?s/i, 'ElliottHouse'], [/1 willow lane/i, 'SamHouse'],
  [/2 willow lane/i, 'HaleyHouse'], [/1 river road/i, 'JoshHouse'], [/blacksmith|clint'?s/i, 'Blacksmith'],
  [/wizard'?s tower/i, 'WizardHouse'], [/leah'?s/i, 'LeahHouse'], [/\btent\b|campfire/i, 'Tent'], [/\bspa\b|bath ?house/i, 'Spa'],
  [/sewer/i, 'Sewer'], [/adventurer'?s guild|\bguild\b|\bgil\b|marlon/i, 'AdventureGuild'], [/\bmines?\b/i, 'Mines'],
  [/graveyard|cemetery|grave\b/i, 'Graveyard'], [/ice cream/i, 'IceCream'], [/town square|\bsquare\b/i, 'Square'],
  [/bus stop|\bbus\b/i, 'BusStop'], [/railroad|train/i, 'Railroad'], [/night market|submarine/i, 'Submarine'],
  [/\bbeach\b|tide ?pools?|squidfest/i, 'Beach'], [/\blake\b|\bmountain\b/i, 'Lake'], [/cindersap|\bforest\b|secret woods|trout derby/i, 'Forest'],
  [/\bfarm(house)?\b/i, 'Farm'], [/desert|oasis|calico/i, 'Desert'], [/skull cavern/i, 'SkullCavern'], [/desert trader/i, 'DesertTrader'], [/desert festival/i, 'DesertFest'],
  [/island north|island trader|volcano/i, 'IslandNorth'], [/island south(?!east)|resort|ginger island/i, 'IslandSouth'],
  [/island east|jungle/i, 'IslandEast'], [/gem bird shrine/i, 'Shrine'], [/island west/i, 'IslandWest'], [/pelican town|\btown\b/i, 'Square'],
];
