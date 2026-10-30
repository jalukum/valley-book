import { Lk } from './components/Link';
import { lazy, Suspense, useEffect } from 'react';
import { useRoute } from './lib/router';
import { Ui } from './components/ui';
import { DateSheetHost } from './components/DateSheet';
import { useProfile, useUi } from './lib/state';
import { SEASONS } from './data';
import Today, { TodayDetail } from './screens/Today';
import Home from './screens/Home';
import { ProgressHub, MoreHub } from './screens/Progress';
import { SetupScreen } from './screens/Setup';
import { QuestsScreen, EventsScreen, RaccoonScreen } from './screens/Quests';
import { RoadScreen } from './screens/Road';
import { Onboarding } from './components/Onboarding';
import { Tour } from './components/Tour';
import { autoTour, openTour } from './lib/tour';
import { setUi } from './lib/state';
import { Sky } from './components/Sky';
import { Popcorn } from './components/Popcorn';
import { UndoBar, UpdateNote, useLetterOpen } from './components/Notices';
import SearchScreen from './screens/Search';
import { BundlesHome, RoomScreen, NeededScreen, JojaScreen } from './screens/Bundles';
import { VillagersScreen, CalendarScreen } from './screens/Villagers';
import { CollectionsHub, MuseumScreen, FishScreen, ShippingScreen, RecipesScreen } from './screens/Collections';
import { GoalsHub, PerfectionScreen, WalnutsScreen, OrdersScreen, AchievementsScreen, SlayerScreen, NotesScreen, PowersScreen, IslandScreen } from './screens/Goals';
import { ProfilesScreen, AboutScreen } from './screens/Profiles';

const VillagerScreen = lazy(() => import('./screens/Villager'));
const MapsScreen = lazy(() => import('./screens/Maps').then((m) => ({ default: m.MapsScreen })));
const ItemScreen = lazy(() => import('./screens/Item'));

type Tab = 'home' | 'today' | 'progress' | 'villagers' | 'search' | 'more';
const TAB_OF: Record<string, Tab> = {
  '': 'home', today: 'today', road: 'today',
  progress: 'progress', setup: 'progress', bundles: 'progress', quests: 'progress', events: 'progress', raccoon: 'progress',
  museum: 'progress', fish: 'progress', shipping: 'progress', cooking: 'progress', crafting: 'progress', orders: 'progress', walnuts: 'progress',
  villagers: 'villagers', villager: 'villagers', maps: 'villagers',
  search: 'search', item: 'search',
  more: 'more', calendar: 'more', collections: 'more', goals: 'more', perfection: 'more', achievements: 'more', slayer: 'more', notes: 'more', powers: 'more', island: 'more', profiles: 'more', about: 'more',
};

function Screen({ r }: { r: string[] }) {
  const [a, b, c] = r;
  switch (a ?? '') {
    case '': return <Home />;
    case 'today': return b ? <TodayDetail kind={b} /> : <Today />;
    case 'progress': return <ProgressHub />;
    case 'more': return <MoreHub />;
    case 'setup': return <SetupScreen />;
    case 'quests': return <QuestsScreen />;
    case 'events': return <EventsScreen />;
    case 'raccoon': return <RaccoonScreen />;
    case 'road': return <RoadScreen />;
    case 'search': return <SearchScreen />;
    case 'bundles':
      if (b === 'room') return <RoomScreen index={Number(c) || 0} />;
      if (b === 'needed') return <NeededScreen />;
      if (b === 'joja') return <JojaScreen />;
      return <BundlesHome />;
    case 'villagers': return <VillagersScreen />;
    case 'villager': return <VillagerScreen id={b} />;
    case 'maps': return <MapsScreen />;
    case 'calendar': return <CalendarScreen />;
    case 'collections': return <CollectionsHub />;
    case 'museum': return <MuseumScreen />;
    case 'fish': return <FishScreen />;
    case 'shipping': return <ShippingScreen />;
    case 'cooking': return <RecipesScreen kind="cooking" />;
    case 'crafting': return <RecipesScreen kind="crafting" />;
    case 'goals': return <GoalsHub />;
    case 'perfection': return <PerfectionScreen />;
    case 'walnuts': return <WalnutsScreen />;
    case 'orders': return <OrdersScreen />;
    case 'achievements': return <AchievementsScreen />;
    case 'slayer': return <SlayerScreen />;
    case 'notes': return <NotesScreen />;
    case 'powers': return <PowersScreen />;
    case 'island': return <IslandScreen />;
    case 'item': return <ItemScreen qid={b} />;
    case 'profiles': return <ProfilesScreen />;
    case 'about': return <AboutScreen />;
    default: return <Home />;
  }
}

export default function App() {
  const r = useRoute();
  const p = useProfile();
  const season = SEASONS[p.date.season].toLowerCase();
  useEffect(() => { document.documentElement.dataset.season = season; }, [season]);
  // Portrait lock where the browser allows it (installed Android PWAs); iOS ignores it, so the CSS overlay covers phones.
  useEffect(() => { try { const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }; o?.lock?.('portrait')?.catch(() => {}); } catch { /* not supported */ } }, []);
  const ui = useUi();
  const tab = TAB_OF[r[0] ?? ''] ?? 'today';
  const letter = useLetterOpen();
  // v7.2: each tab's own short tutorial plays the first time that tab is opened on this device (after the update letter, if any).
  useEffect(() => {
    const t = autoTour(r[0] ?? '', ui, letter);
    if (t) setUi({ tourOpen: t, tabTours: { ...ui.tabTours, [t]: true } });
  }, [r[0], ui.onboarded, ui.tourOpen, letter]); // eslint-disable-line react-hooks/exhaustive-deps
  const tourId = ui.onboarded ? openTour(ui.tourOpen) : null;
  // v6.8.1: wood theme-color behind the iOS status bar while a wooden top bar is on screen; sky otherwise.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const upd = () => { const wood = !!document.querySelector('.topbar'); meta?.setAttribute('content', wood ? '#b47d43' : '#6fc2ee'); };
    upd();
    const mo = new MutationObserver(upd); mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  const tabs: { id: Tab; href: string; label: string; icon: React.ReactElement }[] = [
    { id: 'today', href: '#/today', label: 'Today', icon: <Ui k="Junimo" size={28} eager /> },
    { id: 'progress', href: '#/progress', label: 'Progress', icon: <Ui k="Junimo Bundle" size={28} eager /> },
    { id: 'villagers', href: '#/villagers', label: 'Villagers', icon: <Ui k="Heart" size={24} eager /> },
    { id: 'search', href: '#/search', label: 'Search', icon: <Ui k="Magnifying Glass" size={28} eager /> },
    { id: 'more', href: '#/more', label: 'More', icon: <Ui k="Backpack" size={28} eager /> },
  ];
  return (
    <div className={'app' + (tab === 'home' ? ' no-tabs' : '') + (r[0] === 'maps' ? ' fit' : '')}>
      <Sky full={tab === 'home'} season={p.date.season} />
      {tab !== 'home' && <Popcorn />}
      <div className="rotate-lock" role="status">
        <div className="rl-card"><Ui k="Junimo" size={64} eager /><b>Turn your phone upright to keep playing</b><small>Valley Book is made for portrait.</small></div>
      </div>
      <main className="main" key={'page:' + r.join('/')}>
        <Suspense fallback={<div className="loading">Loading…</div>}>
          <Screen r={r} />
        </Suspense>
      </main>
      {tab !== 'home' && <nav className="tabbar" aria-label="Sections" data-tour="tabbar">
        <span className="tab-hl" aria-hidden style={{ transform: `translateX(${tabs.findIndex((t) => t.id === tab) * 100}%)` }} />
        {tabs.map((t) => (
          <Lk key={t.id} href={t.href} data-tour={'tab-' + t.id} className={'tab' + (tab === t.id ? ' on' : '')} aria-current={tab === t.id ? 'page' : undefined}>
            <span className="tab-ic">{t.icon}</span><span className="tab-l">{t.label}</span>
          </Lk>
        ))}
      </nav>}
      <DateSheetHost />
      <UndoBar />
      {ui.onboarded && <UpdateNote blocked={!!ui.tourOpen} />}
      {!ui.onboarded && <Onboarding />}
      {tourId && <Tour key={'tour:' + tourId} id={tourId} route={r[0] ?? ''} />}
    </div>
  );
}
