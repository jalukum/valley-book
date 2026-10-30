// v7.0 "Valley Book just updated!" letter. The changelog lives here, keyed by version; the newest entry is the app version.
// Shown once per version to people who already used an older version; a brand-new install never sees it.
export const CHANGELOG: { version: string; items: string[] }[] = [
  {
    version: '7.1',
    items: [
      'Stars: tap the star on any item, fish, villager or bundle. Find them all with the Starred button next to Heart scenes.',
      'Biting now on the Fish page: see what bites at this hour and weather, which fish stop first, and what starts later today.',
      'Fish seasons, times, weather and spots now match the wiki.',
      'Bundle filters: see which bundles you can finish today, or are just one item short.',
      'Luck of the day: tell Valley Book what the Fortune Teller said and the Day guide plans around it.',
      'Import your game save: fill in a farm from your real save file. It never leaves your phone.',
      'Rows of tags now wrap, so nothing slides off the side of the screen.',
    ],
  },
  {
    version: '7.0',
    items: [
      'Shop days on the Calendar: the Traveling Cart, Night Market, Queen of Sauce recipes and new special orders. Tap a day to see what’s on.',
      'Undo: ticked something by mistake? Tap Undo on the note that pops up.',
      'Recently viewed: the last things you opened show up in Search.',
      'Graphical bug fixes.',
    ],
  },
];
export const APP_VERSION = CHANGELOG[0].version;
export const SEEN_KEY = 'sdv:seenVersion';

const num = (v: string) => v.split('.').map((x) => parseInt(x, 10) || 0);
export function newer(a: string, b: string) {
  const x = num(a), y = num(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
/** Which version's note to show (or null). `existingUser`: this device already had Valley Book before (farm data or onboarding). */
export function noteToShow(seen: string | null, existingUser: boolean): string | null {
  if (seen == null) return existingUser ? APP_VERSION : null;
  return newer(APP_VERSION, seen) ? APP_VERSION : null;
}
export const entryFor = (v: string) => CHANGELOG.find((c) => c.version === v) || null;
