// v7.0 shop days on the Calendar. Every rule is from the wiki (checked Oct 2026):
// - Traveling Cart (stardewvalleywiki.com/Traveling_Cart): every Friday and Sunday, 6am–8pm, Cindersap Forest; also each day of
//   the Night Market (Winter 15–17, 5pm–2am, on the docks) and the Desert Festival (Spring 15–17, 1.6), which needs the bus.
// - The Queen of Sauce (stardewvalleywiki.com/The_Queen_of_Sauce): from Spring 7, Year 1 a new recipe airs every Sunday for the
//   first two years (a two-year rotation that then repeats); Wednesdays air a rerun of an earlier recipe (first one Spring 10, Y1).
//   No recipe airs on a Green Rain day.
// - Special Orders (stardewvalleywiki.com/Quests): the board outside Pierre's is put up in a cutscene from Fall 2, Year 1;
//   new orders post every Monday. Mr. Qi's board in the Walnut Room (100 Golden Walnuts) also refreshes every Monday.
import { core } from '../data';

export type ShopKind = 'cart' | 'market' | 'queen' | 'rerun' | 'orders';
export interface ShopEntry { kind: ShopKind; title: string; detail: string; icon: string }
export interface ShopCtx { bus: boolean; qi: boolean }

export const SHOP_ICON: Record<ShopKind, string> = { cart: 'cal:Cart', market: 'weather:Festival', queen: 'cal:Queen', rerun: 'cal:TV', orders: 'cal:Board' };
export const SHOP_LEGEND: { kind: ShopKind; label: string }[] = [
  { kind: 'cart', label: 'Traveling Cart' }, { kind: 'queen', label: 'New TV recipe' }, { kind: 'rerun', label: 'TV rerun' }, { kind: 'orders', label: 'New special orders' },
];

const abs = (season: number, day: number, year: number) => (year - 1) * 112 + season * 28 + day;
const SEASON_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'];

/** Recipe aired on a given Sunday of the 2-year rotation, from each cooking recipe's wiki "Season D, Year Y" air date. */
let qos: Map<string, string> | null = null;
export function queenRecipe(season: number, day: number, year: number): string | null {
  if (!qos) {
    qos = new Map();
    for (const r of core.recipes.cooking) {
      const m = /^(Spring|Summer|Fall|Winter) (\d+), Year ([12])$/.exec(r.unlock || '');
      if (m) qos.set(`${SEASON_NAMES.indexOf(m[1])}-${m[2]}-${m[3]}`, r.name);
    }
  }
  return qos.get(`${season}-${day}-${((year - 1) % 2) + 1}`) ?? null;
}

/** Shop/TV/board events for one calendar day (Mon = day 1, 8, 15, 22). */
export function shopDays(season: number, day: number, year: number, ctx: ShopCtx): ShopEntry[] {
  const out: ShopEntry[] = [];
  const dow = (day - 1) % 7; // 0 Mon … 6 Sun
  const d = abs(season, day, year);
  const nightMarket = season === 3 && day >= 15 && day <= 17;
  const desert = season === 0 && day >= 15 && day <= 17;
  if (nightMarket) out.push({ kind: 'market', title: 'Night Market', detail: 'The Beach, 5pm–2am', icon: SHOP_ICON.market });
  if (dow === 4 || dow === 6) out.push({ kind: 'cart', title: 'Traveling Cart', detail: 'Cindersap Forest, 6am–8pm', icon: SHOP_ICON.cart });
  else if (nightMarket) out.push({ kind: 'cart', title: 'Traveling Cart', detail: 'On a raft at the Night Market docks, 5pm–2am', icon: SHOP_ICON.cart });
  else if (desert) out.push({ kind: 'cart', title: 'Traveling Cart', detail: ctx.bus ? 'At the Desert Festival, Calico Desert' : 'At the Desert Festival (needs the bus repaired)', icon: SHOP_ICON.cart });
  if (dow === 6 && d >= abs(0, 7, 1)) {
    const r = queenRecipe(season, day, year);
    out.push({ kind: 'queen', title: 'Queen of Sauce: new recipe', detail: (r ? r : 'New recipe') + (year > 2 ? ' (rotation repeats from Year 3)' : '') + ' · not on Green Rain days', icon: SHOP_ICON.queen });
  }
  if (dow === 2 && d > abs(0, 7, 1)) out.push({ kind: 'rerun', title: 'Queen of Sauce: rerun', detail: 'An earlier recipe, ones you don’t know first · not on Green Rain days', icon: SHOP_ICON.rerun });
  if (dow === 0 && d >= abs(2, 2, 1)) {
    out.push({ kind: 'orders', title: 'New special orders', detail: 'Board outside Pierre’s posts new orders', icon: SHOP_ICON.orders });
    if (ctx.qi) out.push({ kind: 'orders', title: 'Qi’s special orders', detail: 'Walnut Room board refreshes too', icon: 'Mr. Qi' });
  }
  return out;
}
