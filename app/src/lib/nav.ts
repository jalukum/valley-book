/** In-app navigation history, so every back arrow returns to the screen you actually came from.
 *  Pure state + reducers here (unit-tested); the browser wiring lives in router.ts.
 *  Each browser history entry is stamped with its index (history.state.navIdx), so browser back/forward,
 *  the in-app back arrow and reloads all stay in step. */
export interface NavState { stack: string[]; cur: number }

/** '#', '#/', '' all mean the front page. */
export const normHash = (h: string): string => { const x = h.replace(/^#?\/?/, ''); return '#/' + x; };

export const navInit = (hash: string): NavState => ({ stack: [normHash(hash)], cur: 0 });

/** A hash change happened. `idx` = navIdx stamped on the entry we landed on (null = brand-new entry);
 *  `replaced` = the change came from location.replace (same entry, new address). */
export function navStep(s: NavState, hash: string, idx: number | null, replaced = false): NavState {
  const h = normHash(hash);
  if (replaced) { const stack = s.stack.slice(); stack[s.cur] = h; return { stack, cur: s.cur }; }
  if (idx != null && idx >= 0 && idx < s.stack.length) { // back/forward onto an entry we know
    const stack = s.stack.slice(); stack[idx] = h; return { stack, cur: idx };
  }
  const cur = s.cur + 1; // a fresh tap: drop any forward entries, push
  return { stack: [...s.stack.slice(0, cur), h], cur };
}

/** What the back arrow should do: real history back when there is an in-app previous screen,
 *  otherwise (deep link / fresh open) replace this entry with the screen's sensible parent. */
export function backPlan(s: NavState, fallback: string): { kind: 'history' } | { kind: 'replace'; to: string } {
  return s.cur > 0 ? { kind: 'history' } : { kind: 'replace', to: normHash(fallback) };
}
export const prevScreen = (s: NavState): string | null => (s.cur > 0 ? s.stack[s.cur - 1] : null);
