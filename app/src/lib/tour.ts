/** Tutorial steps (kept apart from the component so tests can read them). */
/** route: the screen the step lives on ('' = start screen). tap: the user must tap the highlighted thing (or the button) to go on.
 *  alt/altBody: if the target isn't on screen today (Cart, Orders), point at the tile grid and say when it shows up. */
export interface TStep { route: string; target: string; title: string; body: string; tap?: string; alt?: string; altBody?: string }
export const TOUR: TStep[] = [
  { route: '', target: 'bubble-today', title: 'Let’s start with your Day guide', body: 'It tells you what to do today in your game. Tap it to open.', tap: 'today' },
  { route: 'today', target: 'date', title: 'Set your day and weather', body: 'Tap here to match the season, day and year in your game, and pick today’s weather from the TV. Rain, storms and green rain change the plan below.' },
  { route: 'today', target: 'plan', title: 'Today’s plan', body: 'Not sure what to do? Start here. The big job at the top is your best move today, with where to go and why. Tick its box when it’s done and the next job moves up.' },
  { route: 'today', target: 'plan-more', title: 'More jobs', body: 'Tap here to unfold the rest of today’s jobs, best first. Each one shows where to go and why.', alt: 'plan', altBody: 'When there’s more to do, a “More jobs” list folds out under the big job.' },
  { route: 'today', target: 'xtabs', title: 'Energy, Birthday, Festival', body: 'Ideas for leftover energy, gifts for this week’s birthdays, and the next festival. Tap a tab again to go back to the plan.' },
  { route: 'today', target: 'tile-fish', title: 'Fish', body: 'Every fish you can catch today in this season and weather, with where and when. The number is how many there are.' },
  { route: 'today', target: 'tile-forage', title: 'Forage', body: 'Wild things you can pick up this season, and where to look for them.' },
  { route: 'today', target: 'tile-crops', title: 'Crops', body: 'Seeds you can still plant today that will be ready before the season ends, best profit first.' },
  { route: 'today', target: 'tile-bundles', title: 'Bundles', body: 'Community Center bundle items you can get today. If you picked the Joja route, this opens Joja instead.' },
  { route: 'today', target: 'tile-gifts', title: 'Gifts', body: 'Birthdays coming up and the loved gifts that win the most friendship.' },
  { route: 'today', target: 'tile-quests', title: 'Quests', body: 'Story quests you can work on now. Tick them off as you finish them.' },
  { route: 'today', target: 'tile-events', title: 'Heart scenes', body: 'Heart events you could see today: who, where, what time and how many hearts you need.' },
  { route: 'today', target: 'tile-cart', title: 'Traveling Cart', body: 'The cart is in Cindersap Forest today. Open it for a drop-down per bundle with only the items the cart can sell. Ticking one ticks it in that bundle too.', alt: 'tiles',
    altBody: 'A Cart tile appears on Fridays and Sundays (and Night Market nights), when the Traveling Cart visits Cindersap Forest.' },
  { route: 'today', target: 'tile-orders', title: 'Special Orders', body: 'Jobs from the Special Orders board outside Pierre’s. New ones go up every Monday.', alt: 'tiles',
    altBody: 'An Orders tile appears from Fall 2 of Year 1, once the Special Orders board opens outside Pierre’s.' },
  { route: 'today', target: 'road', title: 'Road to Perfection', body: 'Your big-picture goal. Tap to see each phase and what’s next.' },
  { route: 'today', target: 'tabbar', title: 'Getting around', body: 'This bar takes you to each part of the book. Here’s what each one does.' },
  { route: 'today', target: 'tab-today', title: 'Today', body: 'Your Day guide: today’s plan, fish, forage and more.' },
  { route: 'today', target: 'tab-progress', title: 'Progress', body: 'Checklists to tick off: bundles, museum, quests and more.' },
  { route: 'today', target: 'tab-villagers', title: 'Villagers', body: 'Birthdays, loved gifts and where everyone is.' },
  { route: 'today', target: 'tab-search', title: 'Search', body: 'Look up any item, fish, villager or recipe.' },
  { route: 'today', target: 'tab-more', title: 'More', body: 'Perfection, saves and settings. Replay tutorial in the More tab shows this tour again.' },
  { route: 'today', target: 'home', title: 'Back to the front page', body: 'Tap here anytime to get back to the front page.' },
];

