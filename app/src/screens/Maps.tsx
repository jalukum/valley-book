import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { core, npcById, SEASONS, weekday, loadSchedules } from '../data';
import { useProfile, weatherIcon, WEATHER_LABEL } from '../lib/state';
import { TopBar, Seg, Sprite, Ui, Sheet } from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { query, go } from '../lib/router';
import { fmtTime } from '../lib/schedule';
import { festivalOn } from '../lib/festivals';
import { locate, spotImg, SPOTS, REGIONS, type Placed } from '../lib/maps';
import { REGION_ORDER, type RegionId } from '../lib/mapdata';
import type { Npc } from '../types';

const T0 = 360, T1 = 1560, STEP = 10;
const HEAD = 30; // css px of a pin head (npc_icons are 16 px art at 2×)
const byName = [...core.npcs].sort((a, b) => a.name.localeCompare(b.name));
const clampT = (t: number) => Math.min(T1, Math.max(T0, Math.round(t / STEP) * STEP));
const vhref = (id: string) => `#/villager/${encodeURIComponent(id)}`;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface View { s: number; tx: number; ty: number }

/** Three real villager heads, overlapped: the icon for "Everyone". */
export function GroupHeads({ size = 26 }: { size?: number }) {
  return <span className="group-heads" style={{ width: size * 1.7, height: size }}>
    {['Abigail', 'Lewis', 'Emily'].map((id, i) => <span key={id} style={{ transform: `translateX(${i * size * 0.35}px)` }}><Sprite spr={npcById[id]?.icon} size={size} eager /></span>)}
  </span>;
}

export function MapsScreen() {
  const p = useProfile();
  const sched = useAsync(loadSchedules);
  const q = query();
  const initNpc = q.get('npc') && npcById[q.get('npc')!] ? q.get('npc')! : null;
  const [sel, setSel] = useState<string | null>(initNpc);          // selector choice (null = Everyone)
  const [focus, setFocus] = useState<string | null>(initNpc);      // whose card is open
  const [time, setTime] = useState(() => clampT(p.time));
  const [playing, setPlaying] = useState(false);
  const [region, setRegion] = useState<RegionId>('valley');
  const [fanned, setFanned] = useState<string | null>(null);
  const [wheel, setWheel] = useState(false);
  const [view, setView] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const [anim, setAnim] = useState(false);
  const [live, setLive] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const vp = useRef<HTMLDivElement>(null);
  const R = REGIONS[region];

  const placed = useMemo(() => sched ? byName.map((n) => locate(n, sched[n.id], p, time)) : [], [sched, p, time]);
  const pl = Object.fromEntries(placed.map((x) => [x.npc.id, x])) as Record<string, Placed>;
  const fest = festivalOn(p.date.season, p.date.day);

  // ---- view geometry ----
  const minS = box.w ? Math.max(box.w / R.minSpan, box.h / (R.bounds[3] - R.bounds[1])) : 1;
  const maxS = minS * 5;
  const clampV = (v: View): View => {
    const s = Math.min(maxS, Math.max(minS, v.s));
    const [x0, y0, x1, y1] = R.bounds;
    const fit = (t: number, a0: number, a1: number, size: number) => { const lo = size - a1 * s, hi = -a0 * s; return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, t)); };
    return { s, tx: fit(v.tx, x0, x1, box.w), ty: fit(v.ty, y0, y1, box.h) };
  };
  // fy < .5 keeps a chosen villager above the bottom card.
  const centerOn = (ix: number, iy: number, s: number, fy = 0.5) => clampV({ s, tx: box.w / 2 - ix * s, ty: box.h * fy - iy * s });
  const animTo = (v: View) => { setAnim(!reduced()); setView(clampV(v)); };

  useLayoutEffect(() => {
    const el = vp.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  // Reset the view when the tab or the screen size changes; zoom to the chosen villager when there is one.
  useLayoutEffect(() => {
    if (!box.w) return;
    const who = sel && pl[sel] && SPOTS[pl[sel].spot].region === region ? spotImg(pl[sel].spot) : null;
    setAnim(false);
    setView(who ? centerOn(who[0], who[1], minS * 2, 0.32) : centerOn(R.start[0], R.start[1], minS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, box.w, box.h, !!sched]);

  // Picking a villager: jump to their tab and zoom in on them.
  const pick = (id: string | null) => {
    setSel(id); setFocus(id); setFanned(null); setWheel(false);
    if (!id || !pl[id]) { animTo(centerOn(R.start[0], R.start[1], minS)); return; }
    const sp = SPOTS[pl[id].spot];
    if (sp.region !== region) { setRegion(sp.region); return; }
    const [ix, iy] = spotImg(pl[id].spot);
    animTo(centerOn(ix, iy, Math.max(view.s, minS * 2), 0.32));
  };
  // While the day plays, keep the chosen villager in view.
  useEffect(() => {
    if (!sel || !pl[sel] || !box.w) return;
    const sp = SPOTS[pl[sel].spot];
    if (sp.region !== region) return;
    const [ix, iy] = spotImg(pl[sel].spot);
    const sx = ix * view.s + view.tx, sy = iy * view.s + view.ty;
    if (sx < 40 || sx > box.w - 40 || sy < 50 || sy > box.h - 30) animTo(centerOn(ix, iy, view.s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  // ---- play the day ----
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTime((t) => { if (t >= T1) { setPlaying(false); return t; } return t + STEP; }), 450);
    return () => clearInterval(id);
  }, [playing]);

  // ---- gestures: drag to pan, pinch / double-tap / buttons to zoom ----
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef<{ v: View; d: number; mx: number; my: number; moved: boolean } | null>(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const local = (e: { clientX: number; clientY: number }) => { const r = vp.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const startGesture = () => {
    const pts = [...ptrs.current.values()];
    const mx = pts.reduce((a, b) => a + b.x, 0) / pts.length, my = pts.reduce((a, b) => a + b.y, 0) / pts.length;
    const d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gest.current = { v: view, d, mx, my, moved: gest.current?.moved ?? false };
  };
  const zoomAt = (k: number, x: number, y: number) => { const s = Math.min(maxS, Math.max(minS, view.s * k)); const f = s / view.s; animTo({ s, tx: x - (x - view.tx) * f, ty: y - (y - view.ty) * f }); };
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button, a, .map-card')) return;
    vp.current!.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, local(e)); setAnim(false); setLive(true);
    if (ptrs.current.size === 1) gest.current = null;
    startGesture();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId) || !gest.current) return;
    ptrs.current.set(e.pointerId, local(e));
    const g = gest.current; const pts = [...ptrs.current.values()];
    const mx = pts.reduce((a, b) => a + b.x, 0) / pts.length, my = pts.reduce((a, b) => a + b.y, 0) / pts.length;
    let s = g.v.s;
    if (pts.length > 1 && g.d > 0) s = Math.min(maxS, Math.max(minS, g.v.s * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / g.d));
    const f = s / g.v.s;
    if (Math.abs(mx - g.mx) + Math.abs(my - g.my) > 6 || pts.length > 1) g.moved = true;
    setView(clampV({ s, tx: mx - (g.mx - g.v.tx) * f, ty: my - (g.my - g.v.ty) * f }));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const pt = local(e);
    ptrs.current.delete(e.pointerId);
    const moved = gest.current?.moved;
    if (ptrs.current.size) { startGesture(); return; }
    gest.current = null; setLive(false);
    if (moved) return;
    const now = Date.now(); const lt = lastTap.current;
    if (now - lt.t < 320 && Math.hypot(pt.x - lt.x, pt.y - lt.y) < 30) { zoomAt(2, pt.x, pt.y); lastTap.current = { t: 0, x: 0, y: 0 }; }
    else { lastTap.current = { t: now, x: pt.x, y: pt.y }; setFanned(null); }
  };

  // ---- pins ----
  const here = placed.filter((x) => SPOTS[x.spot].region === region);
  const away = REGION_ORDER.filter((r) => r !== region).map((r) => ({ r, list: placed.filter((x) => SPOTS[x.spot].region === r) })).filter((x) => x.list.length);
  const groups = new Map<string, Placed[]>();
  for (const x of here) { const g = groups.get(x.spot) || []; g.push(x); groups.set(x.spot, g); }
  // Chosen villager goes on top of their stack.
  for (const g of groups.values()) g.sort((a, b) => (b.npc.id === sel ? 1 : 0) - (a.npc.id === sel ? 1 : 0));
  // Screen anchor of every spot, then nudge heads of neighbouring spots apart so faces never cover each other.
  const anchors = [...groups.keys()].map((k) => { const [ix, iy] = spotImg(k); return { k, ax: ix * view.s + view.tx, ay: iy * view.s + view.ty, hx: 0, hy: -HEAD * 0.7 }; });
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) {
      const a = anchors[i], b = anchors[j];
      const dx = (b.ax + b.hx) - (a.ax + a.hx), dy = (b.ay + b.hy) - (a.ay + a.hy); const d = Math.hypot(dx, dy) || 0.01;
      const min = HEAD + 4;
      if (d < min) { const push = (min - d) / 2; const ux = d > 0.02 ? dx / d : (i % 2 ? 1 : -1), uy = d > 0.02 ? dy / d : 0; a.hx -= ux * push; a.hy -= uy * push; b.hx += ux * push; b.hy += uy * push; }
    }
  }
  const anchorOf = Object.fromEntries(anchors.map((a) => [a.k, a]));
  const pinOf = (x: Placed, i: number, n: number) => {
    const a = anchorOf[x.spot];
    if (n > 1 && fanned === x.spot) {
      const r = HEAD * (n <= 6 ? 1 : 1 + (n - 6) * 0.12); const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return { a, hx: a.hx + r * Math.cos(ang), hy: a.hy + r * Math.sin(ang), hidden: false };
    }
    return { a, hx: a.hx + Math.min(i, 2) * 4, hy: a.hy - Math.min(i, 2) * 3, hidden: i > 2 };
  };
  const trail = sel && pl[sel] && SPOTS[pl[sel].spot].region === region ? [...pl[sel].trail.filter((k) => SPOTS[k].region === region), pl[sel].spot].map(spotImg) : [];
  const card = focus ? pl[focus] : null;
  const fspot = fest && /Pelican Town/.test(fest.where) ? 'Square' : fest && /Beach/.test(fest.where) ? 'Beach' : fest && /Forest/.test(fest.where) ? 'Forest' : fest && /Desert/.test(fest.where) ? 'Desert' : null;

  return (
    <div className="screen maps">
      <TopBar title="Villagers" right={<a className="btn sm" href="#/calendar"><Ui k="Calendar" size={16} /> Calendar</a>} />
      <Seg value="maps" onChange={(v) => v === 'grid' && go('#/villagers')} options={[{ v: 'grid', label: 'Friends' }, { v: 'maps', label: 'Maps' }]} />
      <div className="map-tabs" role="tablist" aria-label="Maps">
        {REGION_ORDER.map((r) => <button key={r} role="tab" aria-selected={r === region} className={'map-tab' + (r === region ? ' on' : '')} onClick={() => { setRegion(r); setFanned(null); }}>{REGIONS[r].label}</button>)}
      </div>
      <div className="map-bar">
        <button className="who-btn" onClick={() => setWheel(true)} aria-haspopup="dialog" aria-label={`Showing ${sel ? npcById[sel].name : 'everyone'}. Change`}>
          {sel ? <Sprite spr={npcById[sel].icon} size={32} eager /> : <GroupHeads size={26} />}
          <b>{sel ? npcById[sel].name : 'Everyone'}</b><span className="who-chev" aria-hidden />
        </button>
        <span className="day-pill" aria-label="Date and weather from your farm">
          <Ui k={'season:' + SEASONS[p.date.season]} size={20} eager /><span><b>{SEASONS[p.date.season]} {p.date.day}</b><small>{weekday(p.date.day).slice(0, 3)}</small></span>
          <Ui k={weatherIcon(p.weather, p.date.season)} size={22} eager /><span className="sr">{WEATHER_LABEL[p.weather]}</span>
        </span>
      </div>

      <div className={'map-vp' + (anim ? ' anim' : '') + (live ? ' live' : '')} ref={vp} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onTransitionEnd={() => setAnim(false)} aria-label={`${R.label} map`} role="application">
        <div className="map-layer" style={{ transform: `translate3d(${view.tx}px,${view.ty}px,0) scale(${view.s})` }}>
          <img src={'./' + core.ui[R.img].s} width={R.w} height={R.h} alt={`${R.label} map (game art)`} draggable={false} />
          {trail.length > 1 && <svg className="map-trail" viewBox={`0 0 ${R.w} ${R.h}`} width={R.w} height={R.h} aria-hidden>
            <polyline style={{ strokeWidth: 3 / view.s, strokeDasharray: `${2 / view.s} ${6 / view.s}` }} points={trail.map(([x, y]) => `${x},${y}`).join(' ')} />
            {trail.slice(0, -1).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4 / view.s} style={{ strokeWidth: 1.5 / view.s }} />)}
          </svg>}
        </div>
        {fspot && SPOTS[fspot].region === region && (() => { const [ix, iy] = spotImg(fspot); return <span className="fest-flag" style={{ transform: `translate3d(${ix * view.s + view.tx}px,${iy * view.s + view.ty}px,0)` }}><Ui k="weather:Festival" size={28} eager /></span>; })()}
        {[...groups.entries()].flatMap(([k, g]) => g.map((x, i) => {
          const { a, hx, hy, hidden } = pinOf(x, i, g.length);
          const on = x.npc.id === sel || x.npc.id === focus;
          const dim = sel && x.npc.id !== sel;
          const len = Math.hypot(hx, hy + 4);
          return (
            <button key={x.npc.id} className={'pin' + (on ? ' on' : '') + (dim ? ' dim' : '') + (hidden ? ' hid' : '')} style={{ transform: `translate3d(${a.ax}px,${a.ay}px,0)`, zIndex: on ? 30 : 10 + (g.length - i) }}
              onClick={() => { if (g.length > 1 && fanned !== k && i === 0 && !sel) { setFanned(k); return; } setFocus(x.npc.id); }} aria-label={`${x.npc.name}: ${SPOTS[x.spot].label}`} tabIndex={hidden ? -1 : 0}>
              <i className="pin-dot" />
              <i className="pin-tail" style={{ transform: `rotate(${Math.atan2(hy + 4, hx)}rad) scaleX(${len})`, opacity: len > HEAD * 0.9 ? 1 : 0 }} />
              <span className="pin-head" style={{ transform: `translate3d(${hx - HEAD / 2}px,${hy - HEAD / 2}px,0)` }}><Sprite spr={x.npc.icon} size={HEAD - 6} eager alt="" /></span>
            </button>
          );
        }))}
        {[...groups.entries()].filter(([k, g]) => g.length > 1 && fanned !== k).map(([k, g]) => {
          const a = anchorOf[k];
          return <button key={'n-' + k} className="pin-count" style={{ transform: `translate3d(${a.ax + a.hx + HEAD / 2 - 6}px,${a.ay + a.hy - HEAD / 2 - 8}px,0)` }} onClick={() => setFanned(k)} aria-label={`${g.length} villagers at ${SPOTS[k].label}. Show all`}>{g.length}</button>;
        })}
        <div className="map-zoom">
          <button className="btn sm" onClick={() => zoomAt(1.6, box.w / 2, box.h / 2)} aria-label="Zoom in" disabled={view.s >= maxS - 0.01}>+</button>
          <button className="btn sm" onClick={() => zoomAt(1 / 1.6, box.w / 2, box.h / 2)} aria-label="Zoom out" disabled={view.s <= minS + 0.01}>−</button>
        </div>
        {!card && (away.length > 0 || fest) && <div className="map-foot">
          {fest && <span className="map-note"><Ui k="weather:Festival" size={16} /> {fest.name}: {fest.where}</span>}
          {away.map(({ r, list }) => <button key={r} className="map-note go" onClick={() => setRegion(r)}>
            {list.slice(0, 3).map((x) => <Sprite key={x.npc.id} spr={x.npc.icon} size={18} />)}
            +{list.length} {list.length <= 2 ? list.map((x) => x.npc.name).join(' & ') : 'more'} {r === 'island' ? 'on' : 'in'} {REGIONS[r].label}
          </button>)}
        </div>}
        {card ? <div className="panel map-card">
          <Sprite spr={card.npc.portrait} size={64} eager alt={card.npc.name} />
          <div className="mc-main">
            <b>{card.npc.name}</b>
            <span className="mc-place">{SPOTS[card.spot].label}{SPOTS[card.spot].region !== region ? ` · ${REGIONS[SPOTS[card.spot].region].label}` : ''}</span>
            <small>{card.until != null ? `Here until ${fmtTime(card.until)}, then ${card.next && card.next !== card.spot ? SPOTS[card.next].label : 'stays nearby'}.` : card.kind === 'fixed' ? 'Always found here.' : 'Here for the rest of the day.'}</small>
            {card.text && <small className="mc-text">{card.text}</small>}
          </div>
          <div className="mc-act">
            <a className="btn sm" href={vhref(card.npc.id)}>Full schedule</a>
            <button className="mc-x" onClick={() => { setFocus(null); if (sel) pick(null); }} aria-label="Close card">×</button>
          </div>
        </div> : null}
        {!sched && <div className="map-loading">Loading schedules…</div>}
      </div>

      <div className="time-row">
        <button className={'play' + (playing ? ' on' : '')} onClick={() => { if (!playing && time >= T1) setTime(T0); setPlaying(!playing); }} aria-label={playing ? 'Pause the day' : 'Play the day: time moves forward and villagers walk'}>
          <span className={playing ? 'ic-pause' : 'ic-play'} aria-hidden />
        </button>
        <div className="time-slide">
          <div className="time-top"><b>{fmtTime(time)}</b><small>{playing ? 'Playing the day…' : 'Drag to change the time'}</small></div>
          <input type="range" min={T0} max={T1} step={STEP} value={time} onChange={(e) => { setPlaying(false); setTime(Number(e.target.value)); }} aria-label="Time of day" />
          <div className="range-ticks"><span>6am</span><span>12pm</span><span>6pm</span><span>2am</span></div>
        </div>
      </div>


      {!card && <p className="hint">Tap a face for details. Pinch or double-tap to zoom. Spots are approximate.</p>}

      <Sheet open={wheel} onClose={() => setWheel(false)} title="Who do you want to find?" closeLabel="Close">
        <PickerWheel value={sel} onPick={pick} />
      </Sheet>
    </div>
  );
}

/** Stardew-style vertical picker wheel: snap scrolling, centre band, faded ends. Tap a row or let it settle on one. */
function PickerWheel({ value, onPick }: { value: string | null; onPick: (id: string | null) => void }) {
  const ROW = 56;
  const items: (Npc | null)[] = [null, ...byName];
  const ref = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(() => Math.max(0, items.findIndex((n) => (n?.id ?? null) === value)));
  const start = useRef(cur);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touching = useRef(false);
  useLayoutEffect(() => { if (ref.current) ref.current.scrollTop = cur * ROW; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const settle = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (touching.current || !ref.current) return;
      const i = Math.round(ref.current.scrollTop / ROW);
      if (i !== start.current) onPick(items[i]?.id ?? null);
    }, 900);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="wheel-frame">
      <div className="wheel-band" aria-hidden />
      <div className="wheel" ref={ref} role="listbox" aria-label="Villagers" style={{ ['--row' as string]: ROW + 'px' }}
        onScroll={(e) => { const i = Math.round(e.currentTarget.scrollTop / ROW); if (i !== cur) setCur(i); settle(); }}
        onTouchStart={() => { touching.current = true; clearTimeout(timer.current); }} onTouchEnd={() => { touching.current = false; settle(); }}>
        {items.map((n, i) => (
          <button key={n?.id ?? 'all'} role="option" aria-selected={i === cur} className={'wheel-row' + (i === cur ? ' on' : '')} onClick={() => onPick(n?.id ?? null)}>
            <span className="wr-ic">{n ? <Sprite spr={n.icon} size={40} eager /> : <GroupHeads size={30} />}</span>
            <span className="wr-name">{n ? n.name : 'Everyone'}</span>
          </button>
        ))}
      </div>
      <p className="hint wheel-hint">Spin the wheel and stop on someone, or tap a name.</p>
    </div>
  );
}
