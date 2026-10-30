import { useEffect, useLayoutEffect, useState } from 'react';
import { setUi } from '../lib/state';
import { go } from '../lib/router';
import { TOUR } from '../lib/tour';

export { TOUR };

export function Tour({ route }: { route: string }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [missing, setMissing] = useState(false);
  const step = TOUR[i];
  const close = () => setUi({ tourOpen: false, tourSeen: true });
  // Tap steps move on when the user arrives on the next screen.
  useEffect(() => { if (step.tap && route === step.tap) setI(i + 1); }, [route, step, i]);
  const here = route === step.route;
  useLayoutEffect(() => {
    if (!here) { setRect(null); return; }
    let el: HTMLElement | null = null;
    const find = () => {
      const main = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      setMissing(!main && !!step.alt);
      return main ?? (step.alt ? document.querySelector<HTMLElement>(`[data-tour="${step.alt}"]`) : null);
    };
    const upd = () => { el = find(); setRect(el ? el.getBoundingClientRect() : null); };
    upd();
    if (el && step.target !== 'tabbar' && !step.target.startsWith('tab-')) (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    upd();
    const t = setTimeout(upd, 80);
    window.addEventListener('resize', upd); window.addEventListener('scroll', upd, true);
    return () => { clearTimeout(t); window.removeEventListener('resize', upd); window.removeEventListener('scroll', upd, true); };
  }, [step.target, step.alt, here]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  if (!here) return null; // the user wandered off: wait until they're back on that screen
  const vh = window.innerHeight;
  const pad = 6;
  const r = rect && { top: Math.max(4, rect.top - pad), left: Math.max(4, rect.left - pad), w: Math.min(window.innerWidth - 8, rect.width + pad * 2), h: Math.min(rect.height + pad * 2, vh * 0.55) };
  const below = !r || r.top + r.h < vh * 0.58;
  const popStyle: React.CSSProperties = r ? (below ? { top: r.top + r.h + 10 } : { bottom: vh - r.top + 10 }) : { top: '30%' };
  const next = () => { const n = TOUR[i + 1]; if (n && n.route !== route) go('#/' + n.route); setI(i + 1); };
  const back = () => { const n = TOUR[i - 1]; if (n.route !== route) go('#/' + n.route); setI(i - 1); };
  const canBack = i > 0 && !TOUR[i - 1].tap; // stepping back onto a tap step would bounce straight forward again
  return (
    <div className={'tour' + (step.tap ? ' tap' : '')} role="dialog" aria-modal="true" aria-label="Tutorial">
      {r ? <div className="tour-hole" style={{ top: r.top, left: r.left, width: r.w, height: r.h }} /> : <div className="tour-dim" />}
      <div className={'tour-pop' + (below ? ' below' : ' above')} style={popStyle}>
        <small className="tour-n">Step {i + 1} of {TOUR.length}</small>
        <b>{step.title}</b>
        <p>{missing && step.altBody ? step.altBody : step.body}</p>
        <div className="tour-nav">
          <button className="btn ghost" data-sfx="close" onClick={close}>Skip tour</button>
          <span className="grow" />
          {canBack && <button className="btn ghost" onClick={back}>Back</button>}
          {step.tap ? <button className="btn primary" onClick={() => go('#/' + step.tap)}>Open it</button> : i < TOUR.length - 1 ? <button className="btn primary" onClick={next}>Next</button> : <button className="btn primary" onClick={close}>Done</button>}
        </div>
      </div>
    </div>
  );
}
