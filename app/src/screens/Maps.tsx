import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { core, npcById, SEASONS, weekday, loadSchedules } from '../data';
import { useProfile, weatherIcon, WEATHER_LABEL, type Profile } from '../lib/state';
import { TopBar, Seg, Sprite, Ui, Sheet } from '../components/ui';
import { DatePickerBody } from '../components/DateSheet';
import { ddNext, mapDayTo, sameDate, dayAfter, type DdState, type DdEvent, type MapDay } from '../lib/mapui';
import { useAsync } from '../lib/useAsync';
import { query, go } from '../lib/router';
import { fmtTime } from '../lib/schedule';
import { festivalOn } from '../lib/festivals';
import { locate, spotImg, SPOTS, REGIONS, coverScale } from '../lib/maps';
import { REGION_ORDER, type RegionId } from '../lib/mapdata';
import type { Npc } from '../types';

const T0 = 360, T1 = 1560, STEP = 10;
const HEAD = 34; // css px of the chosen villager's pin head
const byName = [...core.npcs].sort((a, b) => a.name.localeCompare(b.name));
const clampT = (t: number) => Math.min(T1, Math.max(T0, Math.round(t / STEP) * STEP));
const vhref = (id: string) => `#/villager/${encodeURIComponent(id)}`;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

type Tab = RegionId;
const TABS: { id: Tab; label: string }[] = REGION_ORDER.map((r) => ({ id: r, label: REGIONS[r].label }));

interface View { s: number; tx: number; ty: number }


/** A small square of the real valley map: the "no one" icon in the picker. */
function MapThumb({ size = 40 }: { size?: number }) {
  const m = core.ui['map:Valley'];
  return <span className="map-thumb" aria-hidden style={{ width: size, height: size, backgroundImage: `url(./${m.s})`, backgroundSize: `${m.w * 1.5}px ${m.h * 1.5}px`, backgroundPosition: `${-(235 * 1.5 - size / 2)}px ${-(113 * 1.5 - size / 2)}px` }} />;
}

export function MapsScreen() {
  const p = useProfile();
  const sched = useAsync(loadSchedules);
  const q = query();
  const qn = q.get('npc'); const qt = Number(q.get('t')); const qb = q.get('b');
  const [sel, setSel] = useState<string | null>(qn && npcById[qn] ? qn : null);  // null = just the map
  const [forcedIdx, setForcedIdx] = useState<number | null>(sel && qb != null && qb !== '' ? Number(qb) : null);
  const [cardOpen, setCardOpen] = useState(true);
  const [time, setTime] = useState(() => clampT(Number.isFinite(qt) && qt > 0 ? qt : p.time));
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<Tab>('valley');
  const [dd, setDd] = useState<DdState>('closed');
  const ddTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The Maps tab's own day: starts on the app's date and weather, and snaps back whenever those change.
  const [md, setMd] = useState<MapDay>({ date: p.date, weather: p.weather });
  const [dateOpen, setDateOpen] = useState(false);
  useEffect(() => { setMd({ date: p.date, weather: p.weather }); }, [p.date.season, p.date.day, p.date.year, p.weather]); // eslint-disable-line react-hooks/exhaustive-deps
  const pm = useMemo<Profile>(() => ({ ...p, date: md.date, weather: md.weather }), [p, md]);
  const mapDiffers = !sameDate(md.date, p.date) || md.weather !== p.weather;
  const [glow, setGlow] = useState(1); // bumps to replay the pin's glow when a villager is located
  const [view, setView] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const [anim, setAnim] = useState(false);
  const [live, setLive] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const vp = useRef<HTMLDivElement>(null);

  const npc: Npc | null = sel ? npcById[sel] : null;
  const forced = sel && sched && forcedIdx != null ? sched[sel]?.blocks[forcedIdx] ?? null : null;
  const me = useMemo(() => npc && sched ? locate(npc, sched[npc.id], pm, time, forced) : null, [npc, sched, pm, time, forced]);
  const myRegion = me ? SPOTS[me.spot].region : null;
  const fest = festivalOn(md.date.season, md.date.day);

  const R = REGIONS[tab];
  const surf = R;

  // ---- view geometry: fully zoomed out, the map still fills the whole portrait frame (pan sideways for the rest) ----
  const [bx0, by0, bx1, by1] = surf.bounds;
  const minS = box.w ? coverScale(box.w, box.h, bx1 - bx0, by1 - by0) : 1;
  const maxS = minS * 6;
  const pickS = minS * 2.2; // comfortable zoom when a villager is chosen
  const clampV = (v: View): View => {
    const s = Math.min(maxS, Math.max(minS, v.s));
    const fit = (t: number, a0: number, a1: number, size: number) => { const lo = size - a1 * s, hi = -a0 * s; return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, t)); };
    return { s, tx: fit(v.tx, bx0, bx1, box.w), ty: fit(v.ty, by0, by1, box.h) };
  };
  // fy < .5 keeps the chosen villager above the bottom card.
  const centerOn = (ix: number, iy: number, s: number, fy = 0.5) => clampV({ s, tx: box.w / 2 - ix * s, ty: box.h * fy - iy * s });
  const animTo = (v: View) => { setAnim(!reduced()); setView(clampV(v)); };

  useLayoutEffect(() => {
    const el = vp.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  // Follow the chosen villager to their map: on opening from a link, on picking, and when the time moves them to another map.
  useEffect(() => { if (myRegion && myRegion !== tab) setTab(myRegion); }, [sel, myRegion]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reset the view when the map or the frame changes; zoom to the chosen villager when they are on this map.
  useLayoutEffect(() => {
    if (!box.w) return;
    setAnim(false);
    if (me && myRegion === tab) { const [ix, iy] = spotImg(me.spot); setView(centerOn(ix, iy, pickS, 0.34)); }
    else setView(centerOn(surf.start[0], surf.start[1], tab === 'desert' ? minS : minS * 1.3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, box.w, box.h, !!me]);

  // Roll the list up, then (after a pick) locate the villager. Reduced motion: no roll, straight away.
  const ddGo = (e: DdEvent, then?: () => void) => {
    const nx = ddNext(dd, e); setDd(nx);
    if (nx !== 'closing' || dd === 'closing') return;
    clearTimeout(ddTimer.current);
    ddTimer.current = setTimeout(() => { setDd((s) => ddNext(s, 'rolled')); then?.(); }, reduced() ? 0 : 170);
  };
  useEffect(() => () => clearTimeout(ddTimer.current), []);
  const pick = (id: string | null) => {
    setSel(id); setForcedIdx(null); setCardOpen(true);
    history.replaceState(null, '', id ? `#/maps?npc=${encodeURIComponent(id)}` : '#/maps');
    setGlow((g) => g + 1);
    if (!id || !sched) { setPlaying(false); return; }
    const r = SPOTS[locate(npcById[id], sched[id], pm, time).spot];
    if (r.region !== tab) { setAnim(false); setTab(r.region); return; }
    const [ix, iy] = toXY(id);
    animTo(centerOn(ix, iy, Math.max(view.s, pickS), 0.34));
  };
  const toXY = (id: string) => spotImg(locate(npcById[id], sched![id], pm, time).spot);
  // While the day plays (or the slider moves), keep the chosen villager in view.
  useEffect(() => {
    if (!me || myRegion !== tab || !box.w) return;
    const [ix, iy] = spotImg(me.spot);
    const sx = ix * view.s + view.tx, sy = iy * view.s + view.ty;
    if (sx < 40 || sx > box.w - 40 || sy < 50 || sy > box.h - 40) animTo(centerOn(ix, iy, view.s, 0.34));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.spot]);

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
    else lastTap.current = { t: now, x: pt.x, y: pt.y };
  };

  const onMap = !!me && myRegion === tab;
  const [px, py] = onMap ? spotImg(me!.spot) : [0, 0];
  const fspot = fest && /Pelican Town/.test(fest.where) ? 'Square' : fest && /Beach/.test(fest.where) ? 'Beach' : fest && /Forest/.test(fest.where) ? 'Forest' : null;
  const where = (r: RegionId) => (r === 'island' ? 'on ' : r === 'desert' ? 'at the ' : 'in ') + REGIONS[r].label;
  const card = me && cardOpen ? me : null;

  return (
    <div className="screen maps">
      <TopBar title="Villagers" right={<a className="btn sm" href="#/calendar"><Ui k="Calendar" size={16} /> Calendar</a>} />
      <Seg value="maps" onChange={(v) => v === 'grid' && go('#/villagers')} options={[{ v: 'grid', label: 'Friends' }, { v: 'maps', label: 'Maps' }]} />
      <div className="map-tabs" role="tablist" aria-label="Maps">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={t.id === tab} className={'map-tab' + (t.id === tab ? ' on' : '')} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      <div className="map-bar">
          <div className="who-wrap">
            <button className={'who-btn' + (dd === 'open' ? ' open' : '')} onClick={() => ddGo('button')} aria-haspopup="listbox" aria-expanded={dd === 'open'} aria-label={npc ? `Showing ${npc.name}. Change` : 'Choose a villager to find'}>
              {npc ? <Sprite spr={npc.icon} size={32} eager /> : <Ui k="Magnifying Glass" size={28} eager />}
              <b className={npc ? '' : 'none'}>{npc ? npc.name : 'Choose a villager'}</b><span className="who-chev" aria-hidden />
            </button>
            {dd !== 'closed' && <PickerDropdown value={sel} closing={dd === 'closing'} onPick={(id) => ddGo('pick', () => pick(id))} onClose={(e) => ddGo(e)} />}
          </div>
          <span className={'map-day' + (mapDiffers ? ' moved' : '')}>
            <button className="day-pill" onClick={() => setDateOpen(true)} aria-label={`Map date: ${SEASONS[md.date.season]} ${md.date.day}, year ${md.date.year}, ${WEATHER_LABEL[md.weather]}. Change the map's date and weather`}>
              <Ui k={'season:' + SEASONS[md.date.season]} size={20} eager /><span><b>{SEASONS[md.date.season]} {md.date.day}</b><small>{weekday(md.date.day).slice(0, 3)}</small></span>
              <Ui k={weatherIcon(md.weather, md.date.season)} size={22} eager />
            </button>
            <button className="day-next" onClick={() => setMd((m) => mapDayTo(m, dayAfter(m.date)))} aria-label="Show the next day on the map"><span aria-hidden>›</span></button>
          </span>
        </div>
      {mapDiffers && <div className="map-dayline"><span>Map shows {weekday(md.date.day).slice(0, 3)}, {SEASONS[md.date.season]} {md.date.day} · {WEATHER_LABEL[md.weather]}</span><button className="linkbtn" onClick={() => setMd({ date: p.date, weather: p.weather })}>Reset to app date</button></div>}
      <Sheet open={dateOpen} onClose={() => setDateOpen(false)} title="Map date">
        <p className="hint ds-note">Only changes this map. The rest of the app stays on {SEASONS[p.date.season]} {p.date.day}, Y{p.date.year}.</p>
        <DatePickerBody date={md.date} weather={md.weather} onDate={(d) => setMd((m) => mapDayTo(m, d))} onWeather={(w) => setMd((m) => ({ ...m, weather: w }))}
          onNext={() => setMd((m) => mapDayTo(m, dayAfter(m.date)))} nextLabel="Tomorrow ›" wxHint="Pick the weather to see where everyone goes on that kind of day.">
          {mapDiffers && <div className="ds-row"><button className="linkbtn" onClick={() => setMd({ date: p.date, weather: p.weather })}>Reset to app date ({SEASONS[p.date.season]} {p.date.day}, {WEATHER_LABEL[p.weather]})</button></div>}
        </DatePickerBody>
      </Sheet>

      <div className={'map-vp' + (anim ? ' anim' : '') + (live ? ' live' : '')} ref={vp} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onTransitionEnd={() => setAnim(false)} aria-label={`${surf.label} map`} role="application">
        <div className="map-layer" style={{ transform: `translate3d(${view.tx}px,${view.ty}px,0) scale(${view.s})` }}>
          <img key={surf.img} src={'./' + core.ui[surf.img].s} width={surf.w} height={surf.h} alt={`${surf.label} map (game art)`} draggable={false} className={view.s < 1.5 ? 'soft' : ''} />
        </div>
        {fspot && SPOTS[fspot].region === tab && (() => { const [ix, iy] = spotImg(fspot); return <span className="fest-flag" style={{ transform: `translate3d(${ix * view.s + view.tx}px,${iy * view.s + view.ty}px,0)` }}><Ui k="weather:Festival" size={28} eager /></span>; })()}
        {onMap && <button className="pin on" style={{ transform: `translate3d(${px * view.s + view.tx}px,${py * view.s + view.ty}px,0)` }} onClick={() => setCardOpen(true)} aria-label={`${npc!.name}: ${SPOTS[me!.spot].label}`}>
          <i className="pin-dot" />
          <i key={glow + ':' + tab} className="pin-ring" style={{ transform: `translate3d(${-HEAD / 2}px,${-HEAD - 6}px,0)` }} />
          <span className="pin-head" style={{ transform: `translate3d(${-HEAD / 2}px,${-HEAD - 6}px,0)` }}><Sprite spr={npc!.icon} size={HEAD - 6} eager alt="" /></span>
        </button>}
        <div className="map-zoom">
          <button className="btn sm" onClick={() => zoomAt(1.6, box.w / 2, box.h / 2)} aria-label="Zoom in" disabled={view.s >= maxS - 0.01}>+</button>
          <button className="btn sm" onClick={() => zoomAt(1 / 1.6, box.w / 2, box.h / 2)} aria-label="Zoom out" disabled={view.s <= minS + 0.01}>−</button>
        </div>
        {me && myRegion !== tab && <div className="map-top">
          <button className="map-note big go" onClick={() => setTab(myRegion!)}><Sprite spr={npc!.icon} size={22} /> {npc!.name} is {where(myRegion!)} right now. Show</button>
        </div>}
        {!card && fest && <div className="map-foot">
          {fest && <span className="map-note"><Ui k="weather:Festival" size={16} /> {fest.name}: {fest.where}</span>}
        </div>}
        {card && <div className="panel map-card">
          <Sprite spr={card.npc.portrait} size={64} eager alt={card.npc.name} />
          <div className="mc-main">
            <b>{card.npc.name}</b>
            <span className="mc-place">{SPOTS[card.spot].label}{SPOTS[card.spot].region !== tab ? ` · ${REGIONS[SPOTS[card.spot].region].label}` : ''}</span>
            <small>{card.until != null ? `Here until ${fmtTime(card.until)}, then ${card.next && card.next !== card.spot ? SPOTS[card.next].label : 'stays nearby'}.` : card.kind === 'fixed' ? 'Always found here.' : 'Here for the rest of the day.'}</small>
            {forced ? <small className="mc-forced">Schedule: {forced.cond} <button onClick={() => setForcedIdx(null)} aria-label="Show today's schedule instead">Use today’s</button></small>
              : card.text && <small className="mc-text">{card.text}</small>}
          </div>
          <div className="mc-act">
            <button className="mc-x" onClick={() => setCardOpen(false)} aria-label="Hide card">×</button>
            <a className="btn sm" href={vhref(card.npc.id)}>Villager info</a>
          </div>
        </div>}
        {!sched && <div className="map-loading">Loading schedules…</div>}
      </div>

      <>
        <div className="time-row">
          <button className={'play' + (playing ? ' on' : '')} onClick={() => { if (!playing && time >= T1) setTime(T0); setPlaying(!playing); }} aria-label={playing ? 'Pause the day' : 'Play the day: time moves forward and the villager walks'}>
            <span className={playing ? 'ic-pause' : 'ic-play'} aria-hidden />
          </button>
          <div className="time-slide">
            <div className="time-top"><b>{fmtTime(time)}</b><small>{playing ? 'Playing the day…' : npc ? 'Drag to change the time' : 'Pick a villager to see them move'}</small></div>
            <input type="range" min={T0} max={T1} step={STEP} value={time} onChange={(e) => { setPlaying(false); setTime(Number(e.target.value)); }} aria-label="Time of day" />
            <div className="range-ticks"><span>6am</span><span>12pm</span><span>6pm</span><span>2am</span></div>
          </div>
        </div>
        {npc && !card && <p className="hint">Tap {npc.name}’s face for details. Spots are approximate.</p>}
      </>

    </div>
  );
}

/** Stardew-style dropdown that unrolls under the selector button: "No one" first, then villagers A–Z with their heads. */
function PickerDropdown({ value, closing, onPick, onClose }: { value: string | null; closing: boolean; onPick: (id: string | null) => void; onClose: (e: 'outside' | 'escape') => void }) {
  const items: (Npc | null)[] = [null, ...byName];
  const ref = useRef<HTMLDivElement>(null);
  const cur = Math.max(0, items.findIndex((n) => (n?.id ?? null) === value));
  const choose = (id: string | null) => { if (!closing) onPick(id); };
  // Open with the current choice in view (centred when possible).
  useLayoutEffect(() => {
    const el = ref.current; const row = el?.children[cur] as HTMLElement | undefined;
    if (el && row) el.scrollTop = Math.max(0, row.offsetTop - (el.clientHeight - row.offsetHeight) / 2);
    row?.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose('escape'); };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [onClose]);
  return <>
    {/* Taps outside roll the list up. The selector button sits above this scrim, so tapping it is the toggle, never "outside then reopen". */}
    <div className="dd-scrim" onPointerDown={(e) => { e.preventDefault(); onClose('outside'); }} aria-hidden />
    <div className={'who-dd' + (closing ? ' closing' : '')} ref={ref} role="listbox" aria-label="Choose a villager">
      {items.map((n, i) => (
        <button key={n?.id ?? 'none'} role="option" aria-selected={i === cur} className={'dd-row' + (i === cur ? ' on' : '') + (n ? '' : ' none')} onClick={() => choose(n?.id ?? null)}>
          <span className="dd-ic">{n ? <Sprite spr={n.icon} size={32} eager /> : <MapThumb size={32} />}</span>
          <span className="dd-name">{n ? n.name : 'No one (just the map)'}</span>
        </button>
      ))}
    </div>
  </>;
}
