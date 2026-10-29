import coreJson from './generated/core.json';
import itemsJson from './generated/items.json';
import type { Core, Item, GiftData, Schedule, Npc } from './types';

export const core = coreJson as unknown as Core;
export const items = itemsJson as unknown as Record<string, Item>;
export const npcById: Record<string, Npc> = Object.fromEntries(core.npcs.map((n) => [n.id, n]));
export const fishByQid = Object.fromEntries(core.fish.map((f) => [f.qid, f]));

let giftsP: Promise<Record<string, GiftData>> | null = null;
let schedP: Promise<Record<string, Schedule>> | null = null;
export const loadGifts = () => (giftsP ??= import('./generated/gifts.json').then((m) => m.default as unknown as Record<string, GiftData>));
export const loadSchedules = () => (schedP ??= import('./generated/schedules.json').then((m) => m.default as unknown as Record<string, Schedule>));

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
export type Season = (typeof SEASONS)[number];
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekday = (day: number) => WEEKDAYS[(day - 1) % 7];
