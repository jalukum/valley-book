import coreJson from './generated/core.json';
import itemsJson from './generated/items.json';
import { retryImport } from './lib/lazyload';
import type { Core, Item, GiftData, Schedule, Npc } from './types';

export const core = coreJson as unknown as Core;
export const items = itemsJson as unknown as Record<string, Item>;
export const npcById: Record<string, Npc> = Object.fromEntries(core.npcs.map((n) => [n.id, n]));
export const fishByQid = Object.fromEntries(core.fish.map((f) => [f.qid, f]));

// v7.2.2: retried (and never cached as failed), so a flaky load doesn't leave gifts/schedules empty for the session.
export const loadGifts = retryImport(() => import('./generated/gifts.json').then((m) => m.default as unknown as Record<string, GiftData>));
export const loadSchedules = retryImport(() => import('./generated/schedules.json').then((m) => m.default as unknown as Record<string, Schedule>));

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
export type Season = (typeof SEASONS)[number];
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekday = (day: number) => WEEKDAYS[(day - 1) % 7];
