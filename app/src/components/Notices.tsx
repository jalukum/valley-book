// v7.0 app-wide notices: the parchment Undo bar after a tick, and the one-time "Valley Book just updated!" letter.
import { useEffect, useState } from 'react';
import { useUndo, applyUndo, clearUndo, getUi } from '../lib/state';
import { APP_VERSION, SEEN_KEY, noteToShow, entryFor } from '../lib/changelog';
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

/** Decided once at startup, before onboarding can write anything, so a brand-new install never gets the letter. */
const pending: string | null = (() => {
  let existing = false;
  try { existing = getUi().onboarded || !!localStorage.getItem('sdv:profiles'); } catch { /* */ }
  const v = noteToShow(readSeen(), existing);
  if (!v) writeSeen();
  return v;
})();

export function UpdateNote() {
  const [v, setV] = useState<string | null>(pending);
  const e = v ? entryFor(v) : null;
  if (!e) return null;
  const close = () => { writeSeen(); setV(null); };
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
