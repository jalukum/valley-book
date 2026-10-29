// Fixed festival dates (Stardew Valley 1.6). Used for calendar marks and the "where now" notice.
export const FESTIVALS: { name: string; season: number; days: number[]; where: string }[] = [
  { name: 'Egg Festival', season: 0, days: [13], where: 'Pelican Town square, 9am–2pm' },
  { name: 'Desert Festival', season: 0, days: [15, 16, 17], where: 'The Calico Desert, 10am–12am' },
  { name: 'Flower Dance', season: 0, days: [24], where: 'Cindersap Forest, 9am–2pm' },
  { name: 'Luau', season: 1, days: [11], where: 'The Beach, 9am–2pm' },
  { name: 'Trout Derby', season: 1, days: [20, 21], where: 'Cindersap Forest river, 6am–2am' },
  { name: 'Dance of the Moonlight Jellies', season: 1, days: [28], where: 'The Beach, 10pm–12am' },
  { name: 'Stardew Valley Fair', season: 2, days: [16], where: 'Pelican Town, 9am–3pm' },
  { name: "Spirit's Eve", season: 2, days: [27], where: 'Pelican Town, 10pm–11:50pm' },
  { name: 'Festival of Ice', season: 3, days: [8], where: 'Cindersap Forest, 9am–2pm' },
  { name: 'SquidFest', season: 3, days: [12, 13], where: 'The Beach, 6am–2am' },
  { name: 'Night Market', season: 3, days: [15, 16, 17], where: 'The Beach, 5pm–2am' },
  { name: 'Feast of the Winter Star', season: 3, days: [25], where: 'Pelican Town square, 9am–2pm' },
];
export const festivalOn = (season: number, day: number) => FESTIVALS.find((f) => f.season === season && f.days.includes(day)) || null;
