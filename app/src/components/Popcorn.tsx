import { useEffect, useState } from 'react';
import { core } from '../data';

/** A few seconds after you open a page (4–6 s), then every 10–18 s at random, a Junimo — in a group of 1–4 — pops up from the bottom edge
 *  like popcorn and falls back off screen. Real sprite: the wiki's 4-frame animated Junimo (sprites/derived/Junimo_Strip.png),
 *  tinted for colour. Sits behind the page content, ignores taps, and never runs under prefers-reduced-motion. */
export const POP_MIN_MS = 10000, POP_MAX_MS = 18000, POP_MAX = 4;
export const FIRST_MIN_MS = 4000, FIRST_MAX_MS = 6000;
/** Drawn at 3× the in-game 16 px Junimo (48 px) so it's easy to spot. */
export const POP_PX = 48;
const TINTS = ['green', 'blue', 'pink', 'yellow', 'purple'];
export interface Pop { id: number; x: number; tint: string; delay: number; h: number }
/** Pure: one burst of 1–4 Junimos (rnd() in [0,1)). Each one pops on its own: its own random spot across the screen,
 *  its own random start (0–1.2 s stagger) and its own hop height, in mixed colours — scattered popcorn, not a synced row. */
export function makeBurst(rnd: () => number, id: number): Pop[] {
  const n = 1 + Math.floor(rnd() * POP_MAX); // 1–4
  const off = Math.floor(rnd() * TINTS.length);
  return Array.from({ length: n }, (_, i) => ({
    id: id * 10 + i, x: Math.round(6 + rnd() * 88), tint: TINTS[(off + i) % TINTS.length],
    delay: Math.round(rnd() * 1200), h: 200 + Math.round(rnd() * 120),
  }));
}
export const nextDelay = (rnd: () => number) => POP_MIN_MS + Math.round(rnd() * (POP_MAX_MS - POP_MIN_MS));
export const firstDelay = (rnd: () => number) => FIRST_MIN_MS + Math.round(rnd() * (FIRST_MAX_MS - FIRST_MIN_MS));

export function Popcorn() {
  const [pops, setPops] = useState<Pop[]>([]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq?.matches) return;
    let n = 0; let t: number;
    const fire = () => { if (!document.hidden) setPops(makeBurst(Math.random, ++n)); t = window.setTimeout(fire, nextDelay(Math.random)); };
    const start = () => { window.clearTimeout(t); setPops([]); t = window.setTimeout(fire, firstDelay(Math.random)); };
    start();
    // every page you open gets its own first pop a few seconds in
    window.addEventListener('hashchange', start);
    // screenshot / test hook: `window.__popcorn()` fires one burst now
    (window as unknown as { __popcorn?: () => void }).__popcorn = () => setPops(makeBurst(Math.random, ++n));
    return () => { window.clearTimeout(t); window.removeEventListener('hashchange', start); };
  }, []);
  const strip = core.ui['junimo:Strip'];
  if (!strip || !pops.length) return null;
  return (
    <div className="popcorn" aria-hidden>
      {pops.map((p) => (
        <span key={p.id} className={'pop ' + p.tint} style={{ left: p.x + '%', animationDelay: p.delay + 'ms', ['--h' as string]: -p.h + 'px' }}
          onAnimationEnd={() => setPops((xs) => xs.filter((x) => x.id !== p.id))}>
          <i style={{ backgroundImage: `url(./${strip.s})` }} />
        </span>
      ))}
    </div>
  );
}
