import { useEffect, useState } from 'react';
import { navInit, navStep, backPlan, type NavState } from './nav';
const parse = () => (location.hash.replace(/^#\/?/, '') || '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
const saved = new Map<string, number>();
/** v6.8: the page scrolls inside .app (html/body never scroll, so iOS can't rubber-band the whole page). */
export const scroller = (): HTMLElement | null => (typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.app') : null);
let lastHash = location.hash;
let freshNav = false;
// ---- in-app history (see lib/nav.ts) ----
const NAV_KEY = 'sdv:nav';
let nav: NavState = navInit(typeof location !== 'undefined' ? location.hash : '');
let replacing = false;
const stamp = () => { try { history.replaceState({ ...(history.state || {}), navIdx: nav.cur }, ''); sessionStorage.setItem(NAV_KEY, JSON.stringify(nav)); } catch { /* private mode */ } };
if (typeof window !== 'undefined') {
  try {
    const old = JSON.parse(sessionStorage.getItem(NAV_KEY) || 'null') as NavState | null;
    const i = history.state?.navIdx;
    if (old && Array.isArray(old.stack) && typeof i === 'number' && i < old.stack.length) nav = navStep(old, location.hash, i); // reload
  } catch { /* ignore */ }
  stamp();
  window.addEventListener('hashchange', () => {
    const i = history.state?.navIdx;
    nav = navStep(nav, location.hash, typeof i === 'number' ? i : null, replacing);
    replacing = false;
    stamp();
  });
  // Link taps go to the top of the new page; back/forward restore the old scroll position.
  document.addEventListener('click', (e) => { const a = (e.target as Element)?.closest?.('a[href^="#"]'); if (a && !a.classList.contains('back')) freshNav = true; }, true);
}
export function useRoute(): string[] {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => {
      saved.set(lastHash, scroller()?.scrollTop ?? window.scrollY);
      lastHash = location.hash;
      setR(parse());
      const y = freshNav ? 0 : saved.get(location.hash) ?? 0;
      freshNav = false;
      requestAnimationFrame(() => { const sc = scroller(); if (sc) sc.scrollTop = y; else window.scrollTo(0, y); });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const go = (h: string) => { freshNav = true; location.hash = h; };
export const query = (): URLSearchParams => new URLSearchParams(location.hash.split('?')[1] || '');

/** Back arrow: the actual previous screen, or `fallback` (the parent) when there is no in-app history. */
export function goBack(fallback: string) {
  const plan = backPlan(nav, fallback);
  if (plan.kind === 'history') { history.back(); return; }
  replacing = true; location.replace(plan.to);
}
export const navState = (): NavState => nav;
