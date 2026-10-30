import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getUi, setUi } from '../lib/state';
import { go, scroller } from '../lib/router';
import { viewH } from '../lib/viewport';
import { TOUR, TOURS, startIndex, type TourId } from '../lib/tour';

export { TOUR };

/** Open a tutorial: go to its first screen, then show it (More → Replay a tutorial). */
export function startTour(id: TourId) {
  const first = TOURS[id][0].route;
  go('#/' + first);
  setTimeout(() => setUi({ tourOpen: id === 'day' ? true : id }), 50);
}

/** The box around every element of a step's target. */
export function unionRect(els: Element[]): DOMRect {
  const rs = els.map((e) => e.getBoundingClientRect());
  const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
  const r = Math.max(...rs.map((x) => x.right)), b = Math.max(...rs.map((x) => x.bottom));
  return new DOMRect(l, t, r - l, b - t);
}

export function Tour({ id, route }: { id: TourId; route: string }) {
  const steps = TOURS[id];
  const [i, setI] = useState(() => startIndex(steps, route));
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [missing, setMissing] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const [popH, setPopH] = useState(150);
  useLayoutEffect(() => { const h = popRef.current?.offsetHeight; if (h && Math.abs(h - popH) > 1) setPopH(h); });
  const step = steps[i];
  const close = () => setUi({ tourOpen: false, tabTours: { ...getUi().tabTours, [id]: true }, ...(id === 'day' ? { tourSeen: true } : {}) });
  // Opened somewhere none of its steps live: take the user to step 1.
  useEffect(() => { if (!steps.some((s) => s.route === route)) go('#/' + steps[0].route); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Tap steps move on when the user arrives on the next screen.
  useEffect(() => { if (step.tap && route === step.tap) setI(i + 1); }, [route, step, i]);
  const here = route === step.route;
  useLayoutEffect(() => {
    if (!here) { setRect(null); return; }
    // v7.2.1: a target can be several elements (Energy, Birthday and Festival, but not Luck): the spotlight wraps just those.
    const all = (t: string) => [...document.querySelectorAll<HTMLElement>(`[data-tour~="${t}"]`)].filter((e) => e.getClientRects().length);
    const find = () => {
      const main = all(step.target);
      setMissing(!main.length && !!step.alt);
      return main.length ? main : step.alt ? all(step.alt) : [];
    };
    const upd = () => { const els = find(); setRect(els.length ? unionRect(els) : null); };
    upd();
    // v7.2.3: bring the target into view — centred between the top bar and the tab bar — with a smooth scroll (a jump with
    // reduced motion). It runs after the router's own scroll-to-top for a new tab (queued in the same frame, earlier), and is checked
    // again as lazy screens settle; it only scrolls when the target isn't already fully visible, so it never fights the user.
    let first = true;
    const reveal = () => {
      const els = find(); const sc = scroller();
      if (!els.length || !sc) return;
      const box = unionRect(els);
      if (els.every((e) => e.closest('.tabbar, .topbar'))) return; // targets in the tab bar or the sticky top bar are always on screen
      const lo = (document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0) + 10;
      const tb = document.querySelector('.tabbar')?.getBoundingClientRect().top;
      const hi = (tb ?? viewH()) - 10;
      const tall = box.height > Math.min(hi - lo, viewH() * 0.55);
      const ph = (popRef.current?.offsetHeight ?? 150) + 22; // the card needs this much room above or below the target
      const inView = box.top >= lo - 1 && box.bottom <= hi + 1 && (box.top >= ph || viewH() - box.bottom >= ph);
      if (inView && !(first && tall)) { first = false; return; }
      // A tall target (the Progress trackers list) starts just under the top bar; anything else sits in the middle.
      const d = tall ? box.top - lo : box.top + box.height / 2 - (lo + hi) / 2;
      const top = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, sc.scrollTop + d));
      first = false;
      if (Math.abs(top - sc.scrollTop) < 2) return;
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      sc.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
    };
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(reveal); });
    const t = setTimeout(() => { upd(); reveal(); }, 120);
    const t2 = setTimeout(() => { upd(); reveal(); }, 450); // lazy screens (Maps) settle a moment later
    window.addEventListener('resize', upd); window.addEventListener('scroll', upd, true);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); clearTimeout(t2); window.removeEventListener('resize', upd); window.removeEventListener('scroll', upd, true); };
  }, [step.target, step.alt, here]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!here) return null; // the user wandered off: wait until they're back on that screen
  const vh = viewH();
  const pad = step.pad ?? 6;
  const r = rect && { top: Math.max(4, rect.top - pad), left: Math.max(4, rect.left - pad), w: Math.min(window.innerWidth - 8, rect.width + pad * 2), h: Math.min(rect.height + pad * 2, vh * 0.55) };
  // v7.2.3: a tall target (the trackers list on a small phone) is trimmed so the card fits below it instead of covering its end.
  if (r && r.h > vh * 0.4) r.h = Math.max(120, Math.min(r.h, vh - r.top - popH - 26));
  // v7.2: put the card on whichever side it fits; if neither does (a tall target on a small phone), keep it fully on screen.
  const roomBelow = r ? vh - (r.top + r.h) - 18 : 0, roomAbove = r ? r.top - 18 : 0;
  const below = !r || (r.top + r.h < vh * 0.58 ? popH <= roomBelow || roomBelow >= roomAbove : popH > roomAbove && roomBelow > roomAbove);
  const popTop = r ? Math.max(8, Math.min(vh - popH - 8, below ? r.top + r.h + 10 : r.top - 10 - popH)) : 0;
  const popStyle: React.CSSProperties = r ? { top: popTop } : { top: '30%' };
  const next = () => { const n = steps[i + 1]; if (n && n.route !== route) go('#/' + n.route); setI(i + 1); };
  const back = () => { const n = steps[i - 1]; if (n.route !== route) go('#/' + n.route); setI(i - 1); };
  const canBack = i > 0 && !steps[i - 1].tap; // stepping back onto a tap step would bounce straight forward again
  const one = steps.length === 1;
  return (
    <div className={'tour' + (step.tap ? ' tap' : '')} role="dialog" aria-modal="true" aria-label="Tutorial">
      {r ? <div className="tour-hole" style={{ top: r.top, left: r.left, width: r.w, height: r.h }} /> : <div className="tour-dim" />}
      <div ref={popRef} className={'tour-pop' + (below ? ' below' : ' above')} style={popStyle}>
        {!one && <small className="tour-n">Step {i + 1} of {steps.length}</small>}
        <b>{step.title}</b>
        <p>{missing && step.altBody ? step.altBody : step.body}</p>
        <div className="tour-nav">
          {!one && <button className="btn ghost" data-sfx="close" onClick={close}>Skip tour</button>}
          <span className="grow" />
          {canBack && <button className="btn ghost" onClick={back}>Back</button>}
          {step.tap ? <button className="btn primary" onClick={() => go('#/' + step.tap)}>Open it</button> : i < steps.length - 1 ? <button className="btn primary" onClick={next}>Next</button> : <button className="btn primary" onClick={close}>{one ? 'Got it' : 'Done'}</button>}
        </div>
      </div>
    </div>
  );
}
