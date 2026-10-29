export interface Spr { s: string; w: number; h: number }
export interface Item { n: string; c: string; p: number; d: string; s: string; w: number; h: number; k: string; t: string[]; cat: number }
export interface Npc { id: string; name: string; birthday: { season: string; day: number } | null; romanceable: boolean; gender: string; age: string; region: string; address: string; location: string; family: string[] | string | null; perfection: boolean; portrait: Spr | null; icon: Spr | null; wiki: string }
export interface BItem { qid: string | null; name: string; count: number; quality: string; source: string | null; gold?: number; category?: string; oneOf?: BItem[] }
export interface Reward { qid: string | null; name: string | null; count?: number; isRecipe?: boolean; icon?: Spr | null }
export interface Bundle { key: string; name: string; color: string; required: number; items: BItem[]; reward: Reward | null; icon: Spr | null; colorIcon: Spr | null }
export interface Room { name: string; reward: string; description: string; joja: string | null; jojaCost: number | null; images: Spr[]; bundles: Bundle[] }
export interface RemixOption { name: string; color: string; pick: number | null; required: number | null; items: BItem[]; reward: Reward | null; icon: Spr | null; colorIcon: Spr | null }
export interface RemixRoom { room: string; count: number; slots: { index: number; note: string; options: RemixOption[] }[] }
export interface Fish { qid: string; name: string; method: string; times: [number, number][] | null; seasons: string[] | null; weather: string | null; water: string | null; level: number; collection: boolean; legendary: boolean; family: boolean; price: number; difficulty: number | null; behavior: string | null; summary: { locations?: string[]; time?: string; seasons?: string[]; weather?: string; difficulty?: string }; locs: string[]; spawns: string[] }
export interface Recipe { id: string; name: string; out: string | null; outCount: number; ing: { qid: string | null; name: string; count: number; any: boolean }[]; unlock: string; perfection: boolean }
export interface MuseumItem { qid: string; name: string; kind: string; foundIn: string[] }
export interface MuseumReward { id: string; requires: { qid: string | null; tag?: string; name: string; count: number; all?: boolean }[]; reward: (Reward & { note?: string }) | null; actions?: string[] | null; icon?: { s: string; w: number; h: number } | null }
export interface Walnut { id: string; name: string; count: number; hint: string }
export interface Achievement { name: string; desc: string; id: number | null; inGame: boolean; icon: Spr | null }
export interface Slayer { id: string; name: string; targets: string[]; count: number; reward: Reward | null; sprites: Spr[] }
export interface Note { id: string; kind: string; text: string; isImg: boolean; img: { s: string; w: number; h: number; scale: number } | null; solutions: { title: string; text: string }[]; reveals: [string, string][] }
export interface Power { id: string; name: string; desc: string; item?: string; ui?: string }
export interface Island { id: string; cost: number; name: string; description: string; location: string }
export interface Order { id: string; name: string; requester: string; board: string; text: string; duration: string; repeatable: boolean; objectives: string[]; tags: string[]; rewards: { type: string; amount?: number | null; qid?: string | null }[] }
export interface Shipping { qid: string; name: string; seasons: string[]; monoculture: boolean; polyculture: boolean; category: string }
export interface PerfCat { id: string; name: string; weight: number; total: number; [k: string]: unknown }
export interface ShopOffer { price: number; seasons: string[]; year: number; dow: number[] | null; festival?: string }
export interface GCrop { seed: string | null; seedName: string; item: string; name: string; seasons: string[]; days: number; regrow: number; raised: boolean; paddy: boolean; yield: number; sell: number; cat: number; shops: Record<string, ShopOffer[]> }
export interface GForage { item: string; loc: string; seasons: string[]; chance?: number; note?: string; src?: string; days?: [number, number]; access?: string }
export interface GEvent { id: string; loc: string; locName: string; access: string | null; special: string[]; t?: [number, number]; w?: 'sunny' | 'rainy'; notSeasons?: string[]; notDays?: number[]; y?: number; after?: string[]; notAfter?: string[]; notMarriedTo?: string[]; marriedTo?: string; days?: number[]; minPlayed?: number; npc: string; hearts: number; others: { npc: string; hearts: number }[] }
export interface GQuest { id: string; name: string; text: string; start: string; task: string; reward: string; src: string; date?: { season: number; day: number; year: number }; gate?: string; hearts?: [string, number]; item?: string; qty?: number; npc?: string; after?: string[]; mine?: number; weather?: string; tip?: string; seasons?: string[]; raccoon?: number }
export interface Fact { text: string; src: string }
export interface Guide { crops: GCrop[]; forage: GForage[]; forageLoc: Record<string, string>; forageAccess: Record<string, string | null>; events: GEvent[]; quests: GQuest[];
  raccoon: { src: string; unlock: string; unlockSrc: string; gap: string; stages: { n: number; task: string; items: string[]; artisan?: string }[] }; cartPool: string[]; facts: Record<string, Fact> }
export interface Core {
  guide: Guide;
  npcs: Npc[]; rooms: Room[]; remix: RemixRoom[]; joja: { membership: number; developments: { room: string; name: string; cost: number }[]; total: number };
  fish: Fish[]; museum: { items: MuseumItem[]; rewards: MuseumReward[] }; shipping: Shipping[]; recipes: { cooking: Recipe[]; crafting: Recipe[] };
  perfection: any; walnuts: Walnut[]; achievements: Achievement[]; slayer: Slayer[]; notes: Note[]; powers: Power[]; island: Island[]; orders: Order[];
  ui: Record<string, Spr>; universal: any;
}
export type Tier = 'love' | 'like' | 'neutral' | 'dislike' | 'hate';
export interface GiftData { tiers: Record<Tier, ([string] | [string, 1])[]>; dialogue: Record<string, string>; notes: Record<string, string[]> }
export interface SchedBlock { sub: string | null; cond: string; tags: Record<string, any>; e: [string, string, string[]][] }
export interface Schedule { notes: { sub: string | null; text: string }[]; blocks: SchedBlock[]; wiki: string }
