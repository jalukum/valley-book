import { Lk } from '../components/Link';
import { useMemo, useState, type ReactNode } from 'react';
import { core, loadGifts, npcById, items } from '../data';
import { useProfile, useStore, isDone, WEATHER_LABEL, weatherIcon, type Weather } from '../lib/state';
import { fixedWeather } from '../lib/weather';
import { whereNow } from '../lib/where';
import { loadSchedules } from '../data';
import { useAsync } from '../lib/useAsync';
import { query } from '../lib/router';
import { farmIconKey, farmInfo } from '../lib/farms';
import { planSlots, cartBundles, ifThen, dayGuide, DOW, SEASON_NAMES, type DayGuide } from '../lib/guide';
import { Ui, ItemIcon, Sprite, Sheet, gold, TopBar } from '../components/ui';
import { DateChip } from '../components/DateSheet';
import { TaskRow, Section, GIcon } from '../components/guideui';
import { BundleItemRow, toggleItem, bundleTitle } from './Bundles';
import { StarredSheet } from '../components/Stars';
import { starCount } from '../lib/stars';
import { LUCK, luckToday, luckLevel, setLuck } from '../lib/luck';

function More<T>({ list, n, render, empty }: { list: T[]; n: number; render: (x: T, i: number) => ReactNode; empty: ReactNode }) {
  const [all, setAll] = useState(false);
  if (!list.length) return <div className="empty">{empty}</div>;
  const shown = all ? list : list.slice(0, n);
  return (
    <>
      <div className="list">{shown.map(render)}</div>
      {list.length > n && <button className="link more-btn" onClick={() => setAll(!all)}>{all ? 'Show less' : `Show ${list.length - n} more`}</button>}
    </>
  );
}

export function RoadLine({ gd }: { gd: DayGuide }) {
  const r = gd.road;
  const text = r.current ? `Phase ${r.current.n} of 7 · ${r.current.name}` : 'Perfection reached — well done!';
  const next = r.next ? `Next: ${r.next.label}${r.next.total ? ` (${r.next.have}/${r.next.total})` : ''}` : '';
  return (
    <Lk className="road-line" href="#/road" data-tour="road">
      <Ui k="Gold Clock" size={20} eager />
      <span className="rl-t"><b>{text}</b>{next && <small>{next}</small>}</span>
      <span className="chev-r" />
    </Lk>
  );
}

/** The day's plan for the date and weather set in the date picker. Ignores the time of day entirely. */
function useGuide() {
  const p = useProfile();
  const gifts = useAsync(loadGifts);
  return { p, gd: useMemo(() => dayGuide(core, p, gifts || undefined), [p, gifts]) };
}
const PLAN_NAME: Partial<Record<Weather, string>> = { rain: 'Rain plan', storm: 'Storm plan', green: 'Green rain plan', snow: 'Snow day' };
/** Tiny label saying the plan follows the chosen weather (nothing for a normal sunny day). */
function WxChip({ w, season, day, year }: { w: Weather; season: number; day: number; year: number }) {
  const fixed = fixedWeather(season, day, year);
  if (w === 'sun' || w === 'wind') return null;
  return (
    <p className="wx-chip"><Ui k={weatherIcon(w, season)} size={16} /><b>{PLAN_NAME[w]}</b>
      {fixed === w ? <small>always {WEATHER_LABEL[w].toLowerCase()} on this date</small> : <small>change in the date picker</small>}</p>
  );
}

/** Big, obvious save switcher — the first thing on the page. */
export function FarmPill() {
  const p = useProfile();
  const store = useStore();
  const n = store.profiles.length;
  return (
    <Lk className="farm-pill" href="#/profiles" data-tour="farm" aria-label={`Farm: ${p.name} (${farmInfo(p.farmType).name} Farm). Tap to switch or add a save`}>
      <span className="fp-ic" title={farmInfo(p.farmType).name + ' Farm'}><Ui key={p.id + p.farmType} k={farmIconKey(p.farmType)} size={28} eager /></span>
      <span className="fp-t"><small>{n > 1 ? `Farm · 1 of ${n}` : 'Your farm'}</small><b>{p.name}</b></span>
      <span className="fp-sw">Switch</span>
    </Lk>
  );
}

export function Brand({ home }: { home?: boolean }) {
  const inner = <><Ui k="Junimo" size={30} eager /><h1>Valley Book</h1></>;
  return home ? <div className="brand">{inner}</div> : <Lk className="brand" href="#/" data-tour="home" aria-label="Valley Book — back to the start screen">{inner}<span className="home-ic">Home</span></Lk>;
}

type Tile = { k: string; title: string; n: number | string; icon: ReactNode; href: string; onClick?: () => void };
function tilesFor(gd: DayGuide, stars?: { n: number; open: () => void }): Tile[] {
  const a = gd.a;
  const q = '';
  const good = gd.crops.filter((c) => c.profit > 0);
  const t: Tile[] = [
    { k: 'fish', title: 'Fish', n: gd.fish.length, icon: <ItemIcon qid="(O)145" size={32} />, href: '#/today/fish' + q },
    { k: 'forage', title: 'Forage', n: gd.forage.length, icon: <ItemIcon qid="(O)16" size={32} />, href: '#/today/forage' + q },
    { k: 'crops', title: 'Crops', n: good.length, icon: <ItemIcon qid="(O)472" size={32} />, href: '#/today/crops' + q },
    a.ccRoute === 'cc'
      ? { k: 'bundles', title: 'Bundles', n: gd.bundles.length, icon: <Ui k="Junimo Bundle" size={32} />, href: '#/today/bundles' + q }
      : { k: 'bundles', title: 'Joja', n: '›', icon: <Ui k="Community Center" size={32} />, href: '#/bundles/joja' },
    { k: 'gifts', title: 'Gifts', n: gd.birthdays.length, icon: <Ui k="Gift" size={32} />, href: '#/today/gifts' + q },
    { k: 'quests', title: 'Quests', n: gd.quests.length, icon: <Ui k="Quest" size={32} />, href: '#/quests' },
    { k: 'events', title: 'Heart scenes', n: gd.events.length, icon: <Ui k="Heart" size={28} />, href: '#/events' },
  ];
  if (stars) t.push({ k: 'starred', title: 'Starred', n: stars.n, icon: <Ui k="Star" size={28} />, href: '#/today', onClick: stars.open });
  if (gd.cart) t.push({ k: 'cart', title: 'Cart', n: gd.cart.count, icon: <Ui k="Traveling Cart" size={32} />, href: '#/today/cart' + q });
  if (a.ordersBoard) t.push({ k: 'orders', title: 'Orders', n: gd.orders.length, icon: <ItemIcon qid="(O)PrizeTicket" size={32} />, href: '#/orders' });
  return t;
}
export function TileGrid({ gd }: { gd: DayGuide }) {
  const p = useProfile();
  const [starOpen, setStarOpen] = useState(false);
  const tiles = tilesFor(gd, { n: starCount(p), open: () => setStarOpen(true) });
  return (
    <div className={'dtiles' + (tiles.length > 8 ? ' many' : '')} data-tour="tiles">
      {tiles.map((t) => t.onClick ? (
        <button key={t.k} className={'dtile dtile-' + t.k + (t.n === 0 ? ' zero' : '')} onClick={t.onClick} data-tour={'tile-' + t.k} aria-label={`Starred: ${t.n}`}>
          <span className="dtile-ic">{t.icon}<span className="badge">{t.n}</span></span>
          <b>{t.title}</b>
        </button>
      ) : (
        <Lk key={t.k} className={"dtile dtile-" + t.k + (t.n === 0 ? " zero" : "")} href={t.href} data-tour={'tile-' + t.k}>
          <span className="dtile-ic">{t.icon}<span className="badge">{t.n}</span></span>
          <b>{t.title}</b>
        </Lk>
      ))}
      <StarredSheet open={starOpen} onClose={() => setStarOpen(false)} />
    </div>
  );
}

/** Traveling Cart: one fold-out per Community Center bundle, listing only the bundle items the cart can sell (wiki Standard
 *  Stock). Ticks write to the same bundle checklist as the Bundles pages. Items ticked here stay (struck) until you leave. */
function CartList({ here, rareSeed, joja }: { here: boolean; rareSeed: boolean; joja: boolean }) {
  const p = useProfile();
  const [keep, setKeep] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const groups = useMemo(() => cartBundles(core, p, keep), [p, keep]);
  const flip = (s: Set<string>, k: string) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; };
  const total = groups.reduce((n, g) => n + g.items.filter((x) => !x.done).length, 0);
  return (
    <>
      <div className="cart-head panel">
        <Ui k="Traveling Cart" size={40} />
        <span><b>{here ? 'The cart is in Cindersap Forest today' : 'The cart isn’t here today'}</b>
          <small>{here ? '6am–8pm. Stock is random (10 items), so check which of these it has.' : 'It visits Fridays and Sundays, plus Night Market and Desert Festival days.'}</small></span>
      </div>
      {joja ? <div className="empty">You’re on the Joja route, so there are no bundles to fill.</div>
        : !groups.length ? <div className="empty">No bundle items left that the cart can sell. Nice work!</div>
        : <>
          <p className="hint cart-hint">{total} bundle {total === 1 ? 'item' : 'items'} the cart can sell. Tick one when you’ve put it in the bundle; it’s ticked on the Bundles page too.</p>
          <div className="cart-groups" data-tour="cart-groups">
            {groups.map((g) => {
              const on = open.has(g.b.id);
              const left = g.items.filter((x) => !x.done).length;
              return (
                <section key={g.b.id} className={'cg' + (on ? ' on' : '')}>
                  <button className="cg-h" onClick={() => setOpen(flip(open, g.b.id))} aria-expanded={on}>
                    <Sprite spr={g.b.icon || g.b.colorIcon} size={32} />
                    <span className="cg-t"><b>{bundleTitle(g.b.name)}</b><small>{g.b.room}</small></span>
                    <span className="pill">{left}</span>
                    <span className="pc-chev" aria-hidden />
                  </button>
                  <div className={'pc-fold' + (on ? ' on' : '')} inert={!on}>
                    <div className="pc-in"><div className="list">
                      {g.items.map(({ it, i, done }) => <BundleItemRow key={i} it={it} on={done} onToggle={() => { setKeep(new Set([...keep, g.b.id + ':' + i])); toggleItem(g.b, i); }} />)}
                    </div></div>
                  </div>
                </section>
              );
            })}
          </div>
        </>}
      {rareSeed && <p className="hint">In spring and summer it always sells a Rare Seed too.</p>}
      <p className="hint">Stock list: <Lk className="link" href="https://stardewvalleywiki.com/Traveling_Cart" target="_blank" rel="noreferrer">Stardew Valley Wiki · Traveling Cart</Lk>. It only sells normal quality, so silver and gold-quality bundle slots are left out.</p>
    </>
  );
}

/** Today's plan: the best job big (reason, place, tick box), everything else folded under "More jobs (N)". Replaces the old
 *  top-3 list + "What should I do?" sheet, which showed the same jobs twice. Ticking #1 promotes the next job. */
function PlanCard({ gd }: { gd: DayGuide }) {
  const p = useProfile();
  const [open, setOpen] = useState(false);
  const { best, more } = planSlots(gd.tasks, (t) => !!t.tick && isDone(p, t.tick.col, t.tick.id));
  const luck = luckLevel(luckToday(p));
  const unlucky = !!luck && luck.v < 0 && gd.a.minesOpen;
  return (
    <section className="plan-card" data-tour="plan">
      <div className="pc-h"><Ui k="Junimo" size={22} eager /><h2>Today’s plan</h2><span className="grow" /><small className={unlucky ? 'pc-lk' : undefined}>{luck ? `Luck: ${luck.short}` : 'Best move first'}</small>{unlucky && <small className="pc-lk-s">Unlucky: Mines later</small>}</div>
      {unlucky && <p className="notice-in luck-n"><Ui k={'luck:' + luck!.v} size={30} /><span><b>Unlucky day.</b> Mines jobs moved down.</span></p>}
      {best ? <div className="pc-best" key={best.id}><TaskRow t={best} big /></div>
        : <div className="empty">You’re all caught up for today. Water crops, chat with villagers, and head to bed!</div>}
      {more.length > 0 && <>
        <button className={'pc-more' + (open ? ' on' : '')} onClick={() => setOpen(!open)} aria-expanded={open} data-tour="plan-more">
          <span>More jobs ({more.length})</span><span className="pc-chev" aria-hidden />
        </button>
        <div className={'pc-fold' + (open ? ' on' : '')} aria-hidden={!open} inert={!open}>
          <div className="pc-in"><div className="list">{more.map((t) => <TaskRow key={t.id} t={t} />)}</div></div>
        </div>
      </>}
    </section>
  );
}

export default function Today() {
  const { p, gd } = useGuide();
  const [tab, setTab] = useState<string>(() => query().get('t') || 'plan');
  const it = useMemo(() => ifThen(core, gd), [gd]);
  const activeTab = ['plan', 'energy', 'bday', 'fest'].includes(tab) ? tab : 'plan';
  const [luckOpen, setLuckOpen] = useState(false);
  const luck = luckLevel(luckToday(p));
  const T = (id: string, label: ReactNode) => (
    <button key={id} data-tour="xtabs" role="tab" aria-selected={activeTab === id} className={'dt' + (activeTab === id ? ' on' : '')} onClick={() => setTab(activeTab === id ? 'plan' : id)}>{label}</button>
  );
  return (
    <div className="screen today-s">
      <header className="home-h">
        <div className="home-top"><Brand /><FarmPill /></div>
        <div className="home-row"><span data-tour="date"><DateChip /></span><RoadLine gd={gd} /></div>
      </header>

      <div className="day-tabs four" role="tablist" aria-label="Day guide extras">
        {T('energy', <><Ui k="Energy" size={18} />Energy</>)}
        {T('bday', <><Ui k="Gift" size={18} />Birthday</>)}
        {T('fest', <><Ui k="weather:Festival" size={18} />Festival</>)}
        <button data-tour="luck" className={'dt dt-luck' + (luck ? ' set' : '')} aria-haspopup="dialog" aria-label={luck ? `Luck of the day: ${luck.label}. Change` : 'Set luck of the day'} onClick={() => setLuckOpen(true)}>
          {luck ? <Ui k={'luck:' + luck.v} size={22} /> : <Ui k="skill:Luck" size={18} />}<span>Luck</span>
        </button>
      </div>
      <LuckSheet open={luckOpen} onClose={() => setLuckOpen(false)} />

      {activeTab === 'plan' && (
        <>
          <WxChip w={p.weather} season={p.date.season} day={p.date.day} year={p.date.year} />
          <PlanCard gd={gd} />
          <TileGrid gd={gd} />
        </>
      )}

      {activeTab === 'energy' && (
        <Section title="Got spare energy?" icon={<Ui k="Energy" size={24} />} sub={gd.a.rain && gd.a.daysPlayed > 1 ? 'No watering today, so you have extra energy and time to spend.' : 'Things that turn leftover energy into progress or money.'}>
          <More list={it.energy} n={5} render={(t) => <TaskRow key={t.id} t={t} />} empty="Not much to spend energy on yet — chop wood and clear debris on your farm for materials." />
        </Section>
      )}
      {activeTab === 'bday' && <BirthdayList gd={gd} />}
      {activeTab === 'fest' && (
        <Section title={it.festival ? it.festival.name : 'Next festival'} icon={<Ui k="weather:Festival" size={24} />}>
          {it.festival
            ? <div className="list"><div className="row static"><span className="row-main"><b>Today: {it.festival.name}</b><small>{it.festival.where}. Shops in town may be closed; most of the day is the festival.</small></span></div></div>
            : <div className="list"><div className="row static"><span className="row-main"><b>{it.nextFestival.name}</b><small>{it.nextFestival.season} {it.nextFestival.day} · {it.nextFestival.where}</small></span></div></div>}
          <p className="hint"><Lk className="link" href="#/calendar">See the full calendar ›</Lk></p>
        </Section>
      )}
      {activeTab !== 'plan' && <button className="link more-btn" onClick={() => setTab('plan')}>‹ Back to today’s plan</button>}
    </div>
  );
}

/** Luck of the day: pick what the Fortune Teller show said this morning. The Day guide reacts (Mines up or down). */
function LuckSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProfile();
  const cur = luckToday(p);
  return (
    <Sheet open={open} onClose={onClose} title="Luck of the day">
      <div className="tv-frame"><Ui k="Fortune Teller" size={120} /></div>
      <p className="hint">What did the Fortune Teller say on TV this morning ({SEASON_NAMES[p.date.season]} {p.date.day})? The Day guide moves Mines jobs up on lucky days and down on unlucky ones.</p>
      <div className="list">
        {LUCK.map((l) => (
          <div key={l.v} className={'row farm luck-row' + (cur === l.v ? ' active' : '')}>
            <button className="row-btn" aria-pressed={cur === l.v} onClick={() => setLuck(cur === l.v ? null : l.v)}>
              <span className={'radio' + (cur === l.v ? ' on' : '')} aria-hidden />
              <Ui k={'luck:' + l.v} size={42} />
              <span className="row-main"><span className="row-t">{l.label}</span><span className="row-s luck-q">“{l.quote}”</span></span>
            </button>
          </div>
        ))}
      </div>
      <p className="cfoot">Luck is set when the day starts, and watching the show doesn’t change it. Good luck also helps fishing treasure, double harvests and geodes. It resets when you move to a new day.</p>
    </Sheet>
  );
}

function BirthdayList({ gd }: { gd: DayGuide }) {
  const it = ifThen(core, gd);
  const gifts = useAsync(loadGifts);
  const sched = useAsync(loadSchedules);
  const p = useProfile();
  const noon = (npc: string) => { if (!sched) return ''; const w = whereNow(npc, sched[npc], { ...p, time: 1200 }); return w.place ? `At noon${p.weather !== 'sun' && p.weather !== 'wind' ? ` (${WEATHER_LABEL[p.weather].toLowerCase()} schedule)` : ''}: ${w.place}. ` : ''; };
  return (
    <Section title="Birthdays this week" icon={<Ui k="Gift" size={24} />} sub="Birthday gifts count 8×. These are gifts you can actually get today or have had before.">
      <More list={it.birthdays} n={7} empty="No birthdays in the next week."
        render={(b) => (
          <Lk key={b.npc} className="row" href={`#/villager/${encodeURIComponent(b.npc)}`}>
            <span className="row-ic"><GIcon icon={{ npc: b.npc }} size={40} /></span>
            <span className="row-main"><b>{b.name} · {b.inDays === 0 ? 'today!' : b.inDays === 1 ? 'tomorrow' : `in ${b.inDays} days`}</b>
              <small>{b.inDays === 0 ? noon(b.npc) : ''}{b.gifts.length ? b.gifts.slice(0, 4).map((g) => `${items[g.qid]?.n} (${g.tier === 'love' ? 'loves' : 'likes'}, ${g.how})`).join(' · ') : gifts ? 'Nothing they love is gettable today — tap for their full list.' : 'Loading gift tastes…'}</small></span>
          </Lk>
        )} />
    </Section>
  );
}

// ---------- focused pages behind each tile ----------
const KINDS: Record<string, string> = { plan: 'Today’s plan', fish: 'Fish biting today', forage: 'Forage', crops: 'Crops to plant', bundles: 'Bundle items today', gifts: 'Gifts & birthdays', cart: 'Traveling Cart' };
export function TodayDetail({ kind }: { kind: string }) {
  const { p, gd } = useGuide();
  const a = gd.a;
  const wxName = p.weather !== 'sun' && p.weather !== 'wind' ? WEATHER_LABEL[p.weather] : null;
  const season = SEASON_NAMES[p.date.season];
  const sub = <>{DOW[(p.date.day - 1) % 7]}, {season} {p.date.day} · Y{p.date.year}{wxName ? <> · {wxName.toLowerCase()}</> : null}</>;
  const goodCrops = gd.crops.filter((c) => c.profit > 0);
  const kegs = a.kegs || a.jars;
  const back = '#/today';
  let body: ReactNode;
  switch (kind) {
    case 'fish':
      body = (
        <Section title="Best price first" icon={<ItemIcon qid="(O)145" size={24} />} right={<span className="count">{gd.fish.length}</span>} sub={a.rod ? 'Every fish you can reach today, with where and when it bites.' : undefined}>
          <More list={gd.fish} n={40} empty={a.rod ? 'No fish you can reach today.' : 'You get your first fishing rod from Willy on Spring 2 — visit the beach!'}
            render={(f) => (
              <Lk key={f.f.qid} className="row" href={`#/item/${encodeURIComponent(f.f.qid)}`}>
                <span className="row-ic"><ItemIcon qid={f.f.qid} /></span>
                <span className="row-main"><b>{f.f.name}{f.rainOnly && <span className="tag">Rain only</span>}</b><small>{f.where} · {f.when}</small></span>
                <span className="cost">{gold(items[f.f.qid]?.p ?? 0)}</span>
              </Lk>
            )} />
        </Section>
      ); break;
    case 'forage':
      body = (
        <Section title="Forage you can find" icon={<ItemIcon qid="(O)16" size={24} />} right={<span className="count">{gd.forage.length}</span>}>
          <More list={gd.forage} n={40} empty="Nothing to forage in the places you can reach today."
            render={(f) => (
              <Lk key={f.qid} className="row" href={`#/item/${encodeURIComponent(f.qid)}`}>
                <span className="row-ic"><ItemIcon qid={f.qid} /></span>
                <span className="row-main"><b>{f.name}</b><small>{f.note || f.where.join(', ')}</small></span>
                <span className="cost">{gold(f.price)}</span>
              </Lk>
            )} />
        </Section>
      ); break;
    case 'crops':
      body = (
        <>
          <Section title="Worth planting today" icon={<ItemIcon qid="(O)472" size={24} />} sub={goodCrops.length ? 'Only crops that are ready before the season ends. Profit per plant per day.' : undefined}>
            <More list={goodCrops} n={40} empty={p.date.day >= 25 ? 'Too late to plant anything that will finish this season — plan for next season instead.' : 'No seed shop with profitable seeds is open today.'}
              render={(c) => (
                <Lk key={c.c.item} className="row" href={`#/item/${encodeURIComponent(c.c.item)}`}>
                  <span className="row-ic"><ItemIcon qid={c.c.seed || c.c.item} /></span>
                  <span className="row-main"><b>{c.c.name}</b><small>{c.shop}, {gold(c.seedPrice)} · ready Day {c.readyDay}{c.harvests > 1 ? ` · ${c.harvests} harvests` : ''}{c.artisan ? ` · ${c.artisan.kind}: ${c.artisan.perDay}g/day` : ''}</small></span>
                  <span className="cost">{c.perDay}g/d</span>
                </Lk>
              )} />
          </Section>
          <p className="assume">Profits assume base-quality crops sold raw{kegs ? `; ${[a.jars && 'jars', a.kegs && 'kegs'].filter(Boolean).join(' and ')} shown since you have them` : '; no artisan goods until you unlock jars or kegs'}.</p>
        </>
      ); break;
    case 'bundles':
      body = (
        <Section title="Missing items you can get today" icon={<Ui k="Junimo Bundle" size={24} />} right={<Lk className="link" href="#/bundles/needed">All ›</Lk>}>
          <More list={gd.bundles} n={40} empty="No missing bundle items are gettable today — nice work!"
            render={(b) => (
              <Lk key={b.bundleId + b.index} className="row" href={`#/item/${encodeURIComponent(b.qid)}`}>
                <span className="row-ic"><ItemIcon qid={b.qid} /></span>
                <span className="row-main"><b>{b.count > 1 ? `${b.count}× ` : ''}{b.name}{b.quality && <span className={'qual q-' + b.quality.toLowerCase()}>{b.quality}</span>}</b><small>{b.bundle} · {b.how}</small></span>
              </Lk>
            )} />
        </Section>
      ); break;
    case 'gifts':
      body = (
        <>
          {gd.birthdays.filter((b) => b.inDays === 0).map((b) => (
            <Lk key={b.npc} className="panel bday" href={`#/villager/${encodeURIComponent(b.npc)}`}>
              <Sprite spr={npcById[b.npc]?.portrait} size={56} alt={b.name} />
              <span><b>{b.name}’s birthday!</b><small>{b.gifts.length ? 'Good gifts you can get: ' + b.gifts.slice(0, 3).map((g) => items[g.qid]?.n).join(', ') : 'Gifts are worth 8× today. Tap for loved gifts.'}</small></span>
              <Ui k="Gift" size={32} />
            </Lk>
          ))}
          <BirthdayList gd={gd} />
          <p className="hint"><Lk className="link" href="#/calendar">Calendar ›</Lk></p>
        </>
      ); break;
    case 'cart':
      body = <CartList here={!!gd.cart} rareSeed={!!gd.cart?.rareSeed} joja={a.ccRoute !== 'cc'} />; break;
    default:
      body = (
        <Section title="Most important first" icon={<Ui k={'season:' + season} size={24} />} sub="Tick things off as you do them.">
          <More list={gd.tasks} n={60} render={(t) => <TaskRow key={t.id} t={t} />} empty="You’re all caught up for today. Enjoy the valley!" />
        </Section>
      );
  }
  return (
    <div className="screen">
      <TopBar title={KINDS[kind] || KINDS.plan} back={back} sub={sub} />
      {body}
    </div>
  );
}
