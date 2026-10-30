import { describe, it, expect } from 'vitest';
import { shopDays, queenRecipe } from '../lib/shopdays';
const k = (s: number, d: number, y = 1, ctx = { bus: false, qi: false }) => shopDays(s, d, y, ctx).map((e) => e.kind);

describe('v7.0 calendar shop days (wiki rules)', () => {
  it('Traveling Cart: Fridays and Sundays', () => {
    for (const d of [5, 7, 12, 14, 19, 21, 26, 28]) expect(k(1, d)).toContain('cart');
    for (const d of [1, 2, 3, 4, 6, 8]) expect(k(1, d)).not.toContain('cart');
  });
  it('Cart at the Night Market (Winter 15–17) and the Desert Festival (Spring 15–17)', () => {
    for (const d of [15, 16, 17]) { expect(k(3, d)).toEqual(expect.arrayContaining(['market', 'cart'])); expect(k(0, d)).toContain('cart'); }
    expect(shopDays(0, 15, 1, { bus: false, qi: false }).find((e) => e.kind === 'cart')!.detail).toMatch(/bus/);
    expect(k(2, 15)).not.toContain('cart');
  });
  it('Queen of Sauce: Sundays from Spring 7 Y1 with the right recipe; reruns on Wednesdays from Spring 10 Y1', () => {
    expect(queenRecipe(0, 7, 1)).toBe('Stir Fry');
    expect(queenRecipe(0, 28, 1)).toBe('Omelet');
    expect(queenRecipe(0, 7, 2)).toBe('Pizza');
    expect(queenRecipe(3, 28, 2)).toBe('Shrimp Cocktail');
    expect(queenRecipe(0, 7, 3)).toBe('Stir Fry');
    expect(k(0, 7)).toContain('queen');
    expect(k(0, 3)).not.toContain('rerun');
    expect(k(0, 10)).toContain('rerun');
    expect(k(0, 3, 2)).toContain('rerun');
    expect(shopDays(1, 7, 1, { bus: false, qi: false }).find((e) => e.kind === 'queen')!.detail).toMatch(/Baked Fish/);
  });
  it('all 32 recipes of the 2-year rotation are known', () => {
    let n = 0; for (const y of [1, 2]) for (let s = 0; s < 4; s++) for (const d of [7, 14, 21, 28]) if (queenRecipe(s, d, y)) n++;
    expect(n).toBe(32);
  });
  it('Special orders: Mondays, only once the board is up (Fall 2, Y1); Qi board too when unlocked', () => {
    expect(k(2, 1)).not.toContain('orders');
    expect(k(2, 8)).toContain('orders');
    expect(k(0, 1, 2)).toContain('orders');
    expect(k(1, 1)).not.toContain('orders');
    expect(shopDays(2, 8, 1, { bus: true, qi: true }).filter((e) => e.kind === 'orders')).toHaveLength(2);
  });
});
