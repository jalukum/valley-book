// Farm map types (wiki: https://stardewvalleywiki.com/Farm_Maps). Only effects the wiki states are used by the guide.
import type { Fish } from '../types';

export type FarmType = 'standard' | 'riverland' | 'forest' | 'hilltop' | 'wilderness' | 'fourcorners' | 'beach' | 'meadowlands';
export const FARM_SRC = 'https://stardewvalleywiki.com/Farm_Maps';
export interface FarmInfo { id: FarmType; name: string; skill: string; blurb: string }
export const FARM_TYPES: FarmInfo[] = [
  { id: 'standard', name: 'Standard', skill: 'Farming', blurb: 'Mostly open farmland — the most space for crops and animals.' },
  { id: 'riverland', name: 'Riverland', skill: 'Fishing', blurb: 'Lots of water and less farmland. You can fish on the farm (town river and forest fish) and start with a Fish Smoker.' },
  { id: 'forest', name: 'Forest', skill: 'Foraging', blurb: 'Renewable Large Stumps for Hardwood, seasonal forage, and weeds that drop Mixed Seeds. The ponds can give Woodskip.' },
  { id: 'hilltop', name: 'Hill-top', skill: 'Mining', blurb: 'A small quarry that spawns stones, ore and geode nodes. The stream has forest river fish.' },
  { id: 'wilderness', name: 'Wilderness', skill: 'Combat', blurb: 'Monsters come out at night. The ponds have mountain lake fish.' },
  { id: 'fourcorners', name: 'Four Corners', skill: 'Multiplayer', blurb: 'Four areas: a forest corner with a Large Stump, open farmland, a fishing pond and a small quarry.' },
  { id: 'beach', name: 'Beach', skill: 'Foraging & Fishing', blurb: 'Ocean fishing and beach forage, but sprinklers don’t work in the sand. Meant for experienced players.' },
  { id: 'meadowlands', name: 'Meadowlands', skill: 'Farming', blurb: 'Starts with a Coop and two chickens, and Blue Grass that animals love. You get 15 Hay instead of Parsnip Seeds.' },
];
export const FARM_IDS = FARM_TYPES.map((f) => f.id);
export const farmInfo = (t: string | undefined) => FARM_TYPES.find((f) => f.id === t) || FARM_TYPES[0];
export const isFarmType = (t: unknown): t is FarmType => typeof t === 'string' && (FARM_IDS as string[]).includes(t);

/** Can this fish be caught in the farm's own water? Follows the per-map fishing notes on the wiki's Farm Maps page.
 *  Legendaries and the Forest waterfall Goby are tied to their own spots, so they never count. */
export function farmFish(f: Fish, t: FarmType): boolean {
  if (f.legendary || f.family || f.name === 'Goby' || f.method !== 'rod') return false;
  const locs = f.locs || [];
  const sum = f.summary.locations || [];
  // Night Market submarine fish carry a 'Beach' location in the game data — they aren't in any farm's water.
  if (sum.length && sum.every((l) => /Submarine|Night Market/i.test(l))) return false;
  const forestRiver = locs.includes('Forest') && sum.some((l) => l === 'River' || /Forest River/i.test(l));
  switch (t) {
    case 'riverland': return locs.includes('Town') || locs.includes('Forest'); // 70% town river, 30% forest fish
    case 'forest': return locs.includes('Farm_Forest') || locs.includes('Forest'); // Woodskip, else Cindersap Forest fish
    case 'hilltop': case 'fourcorners': return forestRiver; // forest river fish
    case 'wilderness': return locs.includes('Mountain'); // mountain lake fish
    case 'beach': return locs.includes('Farm_Beach') || (locs.includes('Beach') && sum.some((l) => /Ocean|Beach/i.test(l))); // ocean fish
    case 'meadowlands': return locs.includes('Forest') && sum.some((l) => /Forest Pond/i.test(l)); // forest pond fish
    default: return false;
  }
}

/** Forage that spawns on the farm itself, per the wiki. */
const FOREST_FORAGE: Record<string, string[]> = {
  spring: ['(O)22', '(O)20', '(O)257', '(O)16'],
  summer: ['(O)404', '(O)398', '(O)396', '(O)402'],
  fall: ['(O)281', '(O)404', '(O)422', '(O)420'],
  winter: [],
};
// Beach Farm: "Season-specific beach foragables can spawn year-round" (Clam, Cockle, Mussel, Oyster, Rainbow Shell, Nautilus Shell).
const BEACH_FORAGE = ['(O)372', '(O)718', '(O)719', '(O)723', '(O)394', '(O)392'];
export function farmForage(t: FarmType, seasonKey: string): { qid: string; where: string }[] {
  if (t === 'forest') return (FOREST_FORAGE[seasonKey] || []).map((qid) => ({ qid, where: 'Your farm (west clearings)' }));
  if (t === 'beach') return BEACH_FORAGE.map((qid) => ({ qid, where: 'Your farm (shore)' }));
  return [];
}

/** The farm's own real map icon (File:<Map>_Farm_Map_Icon.png) — used everywhere a farm is shown. */
export const farmIconKey = (t?: string) => 'farm:' + (isFarmType(t) ? t : 'standard');
