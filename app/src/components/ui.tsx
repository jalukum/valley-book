import { balancedRows, gridSpans } from '../lib/chipgrid';
import { Lk } from './Link';
import { Children, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Spr } from '../types';
import { goBack } from '../lib/router';
import { items, core } from '../data';

const url = (s: string) => './' + s;

/** A real game sprite. `size` is the CSS box (longest side); keeps aspect, pixel-crisp, lazy. */
export function Sprite({ spr, size = 32, alt = '', className = '', eager = false }: { spr: Spr | null | undefined; size?: number; alt?: string; className?: string; eager?: boolean }) {
  if (!spr) return null;
  const k = size / Math.max(spr.w, spr.h);
  const w = Math.round(spr.w * k), h = Math.round(spr.h * k);
  return <img className={'spr ' + className} src={url(spr.s)} width={w} height={h} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />;
}
export function ItemIcon({ qid, size = 32, eager }: { qid: string | null | undefined; size?: number; eager?: boolean }) {
  const it = qid ? items[qid] : null;
  if (!it) return null;
  return <Sprite spr={it} size={size} alt={it.n} eager={eager} />;
}
export const uiSpr = (k: string): Spr | undefined => core.ui[k];
export const Ui = ({ k, size = 24, eager }: { k: string; size?: number; eager?: boolean }) => <Sprite spr={uiSpr(k)} size={size} alt="" eager={eager} />;

export function TopBar({ title, back, right, sub }: { title: ReactNode; back?: string; right?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? <Lk className="back" href={back} aria-label="Back" onClick={(e) => { e.preventDefault(); goBack(back); }}><span className="chev" /></Lk> : <span className="back-spacer" />}
      <div className="tb-title"><h1>{title}</h1>{sub && <div className="tb-sub">{sub}</div>}</div>
      <div className="tb-right">{right}</div>
    </header>
  );
}

export function Panel({ children, className = '', title, icon, right }: { children?: ReactNode; className?: string; title?: ReactNode; icon?: ReactNode; right?: ReactNode }) {
  return (
    <section className={'panel ' + className}>
      {title && <div className="panel-h">{icon}<h2>{title}</h2><span className="grow" />{right}</div>}
      {children}
    </section>
  );
}

export function Bar({ value, max = 100, label, tone }: { value: number; max?: number; label?: ReactNode; tone?: string }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={'bar ' + (tone || '')} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="bar-fill" style={{ width: pct + '%' }} />
      {label != null && <span className="bar-label">{label}</span>}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, small }: { value: T; options: { v: T; label: ReactNode; tour?: string }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={'seg' + (small ? ' seg-sm' : '')} role="tablist">
      {options.map((o) => (
        <button key={o.v} data-tour={o.tour} role="tab" aria-selected={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Check({ on, onClick, children, icon, sub, right, dim }: { on: boolean; onClick: () => void; children: ReactNode; icon?: ReactNode; sub?: ReactNode; right?: ReactNode; dim?: boolean }) {
  return (
    <button className={'row check' + (on ? ' done' : '') + (dim ? ' dim' : '')} onClick={onClick} aria-pressed={on}>
      <span className="box" aria-hidden />
      {icon && <span className="row-ic">{icon}</span>}
      <span className="row-main"><span className="row-t">{children}</span>{sub && <span className="row-s">{sub}</span>}</span>
      {right && <span className="row-r">{right}</span>}
    </button>
  );
}

export function Stepper({ value, min = 0, max, onChange, label }: { value: number; min?: number; max: number; onChange: (n: number) => void; label?: string }) {
  return (
    <span className="stepper" aria-label={label}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">−</button>
      <b>{value}<small>/{max}</small></b>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">+</button>
    </span>
  );
}

export function Sheet({ open, onClose, title, children, closeLabel = 'Done' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; closeLabel?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.classList.add('noscroll');
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.classList.remove('noscroll'); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h2>{title}</h2><button className="btn sm" data-sfx="close" onClick={onClose}>{closeLabel}</button></div>
        <div className="sheet-b">{children}</div>
      </div>
    </div>
  );
}

export function Chip({ on, onClick, children }: { on?: boolean; onClick?: () => void; children: ReactNode }) {
  return <button className={'chip' + (on ? ' on' : '')} onClick={onClick} aria-pressed={on === undefined ? undefined : on}>{children}</button>;
}

/** v7.2.1 even chip grids (see lib/chipgrid). `narrow` is the layout under 360px wide. Default: balanced rows of at most `max`. */
export { balancedRows, gridSpans };
export function ChipGrid({ rows, narrow, max = 3, narrowMax = max, children, className = '', tour }: { rows?: number[]; narrow?: number[]; max?: number; narrowMax?: number; children: ReactNode; className?: string; tour?: string }) {
  const kids = Children.toArray(children).filter(Boolean);
  const fit = (r: number[] | undefined, m: number) => (r && r.reduce((a, b) => a + b, 0) === kids.length ? r : balancedRows(kids.length, m));
  const w = gridSpans(fit(rows, max)), nw = gridSpans(fit(narrow ?? rows, narrowMax));
  return (
    <div className={'chips cgrid ' + className} data-tour={tour} style={{ '--c': w.cols, '--cn': nw.cols } as CSSProperties}>
      {kids.map((k, i) => <div key={i} className="cgc" style={{ '--s': w.spans[i], '--sn': nw.spans[i] } as CSSProperties}>{k}</div>)}
    </div>
  );
}

export function MissingToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <Chip on={value} onClick={() => onChange(!value)}>Missing only</Chip>;
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="search">
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
      {value && <button className="x" onClick={(e) => { e.preventDefault(); onChange(''); }} aria-label="Clear">×</button>}
    </label>
  );
}

/** Percent text helper */
export const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 100) : 0) + '%';

/** Small persistent UI state (filters etc.) in sessionStorage so tabs remember their filters. */
export function useUiState<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => { try { const s = sessionStorage.getItem('ui:' + key); return s ? JSON.parse(s) : init; } catch { return init; } });
  return [v, (x: T) => { setV(x); try { sessionStorage.setItem('ui:' + key, JSON.stringify(x)); } catch { /* */ } }];
}

export const gold = (n: number) => n.toLocaleString('en-US') + 'g';
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
