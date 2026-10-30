// v7.0 app-wide notices: the parchment Undo bar after a tick, and the one-time "Valley Book just updated!" letter.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useUndo, applyUndo, clearUndo, getUi } from '../lib/state';
import { APP_VERSION, SEEN_KEY, letterAtLaunch, entryFor } from '../lib/changelog';
import { Ui } from './ui';

export const UNDO_MS = 5000;

export function UndoBar() {
  const u = useUndo();
  useEffect(() => {
    if (!u) return;
    const t = setTimeout(() => clearUndo(), UNDO_MS);
    return () => clearTimeout(t);
  }, [u?.id]);
  if (!u) return null;
  return (
    <div className="undo-bar" role="status" aria-live="polite" key={u.id}>
      <Ui k="Quest" size={22} eager />
      <span className="ub-t">{u.label}</span>
      <button className="btn sm ub-b" data-sfx="back" onClick={() => applyUndo()}>Undo</button>
      <span className="ub-timer" aria-hidden style={{ animationDuration: UNDO_MS + 'ms' }} />
    </div>
  );
}

const readSeen = () => { try { return localStorage.getItem(SEEN_KEY); } catch { return null; } };
const writeSeen = () => { try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch { /* private mode */ } };

/** v7.2.1: decided once at startup, before onboarding or a tutorial can change anything. A brand-new install, or an open
 *  that starts with a tour, just marks this version as seen. Whatever happens, the version is marked seen right away,
 *  so the letter shows at most once per version and never comes back after a tour ends. */
let pending: string | null = (() => {
  let existing = false, ui: { onboarded: boolean; tourOpen?: unknown } = { onboarded: false };
  try { ui = getUi(); existing = ui.onboarded || !!localStorage.getItem('sdv:profiles'); } catch { /* */ }
  const v = letterAtLaunch(readSeen(), existing, ui.onboarded, !!ui.tourOpen);
  writeSeen();
  return v;
})();

// v7.2: tab tutorials wait until the update letter is closed.
let letterOpen = pending != null;
const letterL = new Set<() => void>();
export const useLetterOpen = () => useSyncExternalStore((l) => { letterL.add(l); return () => letterL.delete(l); }, () => letterOpen, () => false);
/** Throw the letter away for good (closed, or a tour got on screen first). */
function drop() { pending = null; if (letterOpen) { letterOpen = false; letterL.forEach((l) => l()); } }

/** `blocked`: a tutorial is on screen. The letter never stacks on a tour; if one opens first, the letter is dropped. */
export function UpdateNote({ blocked = false }: { blocked?: boolean }) {
  const [v, setV] = useState<string | null>(pending);
  useEffect(() => { if (blocked && pending) { drop(); setV(null); } }, [blocked]);
  const e = v && !blocked ? entryFor(v) : null;
  if (!e) return null;
  const close = () => { drop(); setV(null); };
  return (
    <div className="sheet-wrap letter-wrap" onClick={close}>
      <div className="letter" role="dialog" aria-modal="true" aria-labelledby="letter-h" onClick={(ev) => ev.stopPropagation()}>
        <div className="letter-top"><Ui k="Junimo" size={34} eager /><h2 id="letter-h">Valley Book just updated!</h2></div>
        <p className="letter-hi">Dear farmer,</p>
        <p>Here’s what’s new in version {e.version}:</p>
        <ul>{e.items.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="letter-sign">See you in the valley!</p>
        <button className="btn letter-b" data-sfx="close" onClick={close}>OK</button>
      </div>
    </div>
  );
}
