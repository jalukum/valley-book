/** Sentinel-safe labels: game data uses 0 / -1 for "none" or "all"; never print those raw. */
export const heartsLabel = (h: number): string => (h > 0 ? `${h}♥` : 'any friendship');
