/** Tutorial steps (kept apart from the component so tests can read them). */
/** route: the screen the step lives on ('' = start screen). tap: the user must tap the highlighted thing (or the button) to go on.
 *  target: every element with that data-tour name is wrapped (v7.2.1), so a step can light up part of a row. pad: spotlight margin.
 *  alt/altBody: if the target isn't on screen today (Cart, Orders, Recently viewed), point at `alt` and say when it shows up.
 *  v7.2: every step is one or two short lines. The Day guide tour plays on first launch; each other tab has its own short tour
 *  that plays the first time that tab is opened, and any of them can be replayed from More. */
export interface TStep { route: string; target: string; title: string; body: string; tap?: string; alt?: string; altBody?: string; pad?: number }
export type TourId = 'day' | 'progress' | 'villagers' | 'search' | 'more';

const DAY: TStep[] = [
  { route: '', target: 'bubble-today', title: 'Let’s start with your Day guide', body: 'It shows what to do today in your game. Tap it to open.', tap: 'today' },
  { route: 'today', target: 'date', title: 'Set your day', body: 'Tap here to match the season, day, year and weather in your game.' },
  { route: 'today', target: 'plan', title: 'Today’s plan', body: 'The big job is your best move today. Tick it when it’s done and the next job moves up.' },
  { route: 'today', target: 'plan-more', title: 'More jobs', body: 'Tap to unfold the rest of today’s jobs, best first.', alt: 'plan', altBody: 'When there’s more to do, a “More jobs” list folds out here.' },
  { route: 'today', target: 'xtabs', pad: 3, title: 'Energy, Birthday, Festival', body: 'Ideas for spare energy, gifts for this week’s birthdays, and the next festival.' },
  { route: 'today', target: 'luck', title: 'Luck of the day', body: 'Pick what the TV fortune teller said. Lucky days move the Mines up your plan.' },
  { route: 'today', target: 'tile-fish', title: 'Fish', body: 'Fish you can catch today, with where and when. Tap “Biting now” inside for this hour.' },
  { route: 'today', target: 'tile-forage', title: 'Forage', body: 'Wild things to pick up this season, and where to find them.' },
  { route: 'today', target: 'tile-crops', title: 'Crops', body: 'Seeds you can still plant today that ripen before the season ends.' },
  { route: 'today', target: 'tile-bundles', title: 'Bundles', body: 'Bundle items you can get today. On the Joja route, this opens Joja instead.' },
  { route: 'today', target: 'tile-gifts', title: 'Gifts', body: 'Birthdays coming up and the loved gifts that win the most friendship.' },
  { route: 'today', target: 'tile-quests', title: 'Quests', body: 'Story quests you can work on now. Tick them off when they’re done.' },
  { route: 'today', target: 'tile-events', title: 'Heart scenes', body: 'Heart scenes you could see today: who, where, when and the hearts you need.' },
  { route: 'today', target: 'tile-starred', title: 'Starred', body: 'Everything you’ve starred. Tap the star on any item, villager or bundle to add it.' },
  { route: 'today', target: 'tile-cart', title: 'Traveling Cart', body: 'The cart is in Cindersap Forest today. See which bundle items it sells.', alt: 'tiles',
    altBody: 'A Cart tile appears on Fridays and Sundays, when the Traveling Cart visits the forest.' },
  { route: 'today', target: 'tile-orders', title: 'Special Orders', body: 'Jobs from the board outside Pierre’s. New ones go up every Monday.', alt: 'tiles',
    altBody: 'An Orders tile appears from Fall 2 of Year 1, when the board opens.' },
  { route: 'today', target: 'road', title: 'Road to Perfection', body: 'Your big goal, one phase at a time. Tap to see what’s next.' },
  { route: 'today', target: 'home', title: 'Back to the front page', body: 'Tap here anytime to get back to the front page. Other tabs have their own quick tour.' },
];

const PROGRESS: TStep[] = [
  { route: 'progress', target: 'setup', title: 'Where you are in the game', body: 'Tap here anytime to change how far along you are: Mines, backpack, route and more.' },
  { route: 'progress', target: 'trackers', title: 'Your trackers', body: 'Checklists for bundles, quests, museum, fish, recipes and more. Tick things as you play.' },
];

const VILLAGERS: TStep[] = [
  { route: 'villagers', target: 'vill-cal', title: 'Calendar', body: 'Birthdays and festivals for every season. Tap a day to see what’s on.' },
  { route: 'villagers', target: 'vill-card', title: 'Villagers', body: 'Tap anyone for their loved gifts, hearts, heart scenes and more.' },
  { route: 'villagers', target: 'vill-maps', pad: 3, title: 'Maps', body: 'Maps shows where everyone is. Tap Maps to try it.', tap: 'maps' },
  { route: 'maps', target: 'map-who', title: 'Choose a villager', body: 'Tap here and pick someone. Their face shows where they are.' },
  { route: 'maps', target: 'map-day', title: 'Date and weather', body: 'Tap to change the map’s day and weather. › jumps to the next day.' },
  { route: 'maps', target: 'map-time', title: 'Time of day', body: 'Drag the slider to change the time, or press play to watch them walk.' },
  { route: 'maps', target: 'map-tabs', title: 'Other maps', body: 'Switch to Ginger Island or the Calico Desert here.' },
  { route: 'maps', target: 'map-vp', title: 'Look around', body: 'Drag to move and use + and − to zoom. Tap a face for details.' },
];

const SEARCH: TStep[] = [
  { route: 'search', target: 'search-box', title: 'Search anything', body: 'Type any item, fish, villager, bundle or recipe.' },
  { route: 'search', target: 'recent', title: 'Recently viewed', body: 'Things you’ve opened show up here, so you can jump back fast.' },
];

const MORE: TStep[] = [
  { route: 'more', target: 'replay', title: 'Replay a tutorial', body: 'Pick any tutorial here to watch it again, whenever you like.' },
];

export const TOURS: Record<TourId, TStep[]> = { day: DAY, progress: PROGRESS, villagers: VILLAGERS, search: SEARCH, more: MORE };
/** The first-launch Day guide tour (older tests and code read it as TOUR). */
export const TOUR = DAY;

/** Which tab tour a screen starts the first time it's opened. Only a tab's own pages, never deep links like an item page. */
export const TAB_TOURS: Record<string, TourId> = { progress: 'progress', villagers: 'villagers', maps: 'villagers', search: 'search', more: 'more' };

/** The four tutorials in More → Replay a tutorial (the one-step More tour isn't listed: you're already looking at it). */
export const REPLAY: { id: TourId; label: string; sub: string }[] = [
  { id: 'day', label: 'Day guide', sub: 'Today’s plan, luck and the tiles' },
  { id: 'progress', label: 'Progress', sub: 'Where you are and your trackers' },
  { id: 'villagers', label: 'Villagers & Maps', sub: 'Calendar, villagers and the map' },
  { id: 'search', label: 'Search', sub: 'Find anything, recently viewed' },
];

export interface TourFlags { onboarded: boolean; tourOpen?: boolean | TourId; tabTours?: Partial<Record<TourId, boolean>> }
/** The tab tour to start now, if any: onboarded, nothing else open, on a tab page whose tour hasn't played on this device yet. */
export function autoTour(route: string, ui: TourFlags, busy = false): TourId | null {
  if (!ui.onboarded || ui.tourOpen || busy) return null;
  const t = TAB_TOURS[route];
  return t && !ui.tabTours?.[t] ? t : null;
}
/** The open tour's id (`tourOpen: true` is the Day guide, as before v7.2). */
export const openTour = (v: TourFlags['tourOpen']): TourId | null => (v === true ? 'day' : v || null);
/** Where a tour starts when it opens on `route`: the first step on this screen, else step 1 (and go there). */
export const startIndex = (steps: TStep[], route: string) => Math.max(0, steps.findIndex((s) => s.route === route));
