/** v7.2.1 even chip grids: `rows` = chips per row, e.g. [3, 2]. Every row fills the width edge to edge with equal tiles
 *  (no lonely chip on a ragged second row). Kept apart from the component so tests can read it. */
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** Rows of at most `max`, as even as possible, bigger rows first (5 → 3+2, 4 → 2+2, 7 → 3+2+2). */
export function balancedRows(n: number, max = 3): number[] {
  if (n <= 0) return [];
  const r = Math.ceil(n / max), base = Math.floor(n / r), extra = n % r;
  return Array.from({ length: r }, (_, i) => base + (i < extra ? 1 : 0));
}
/** One CSS grid for every row: columns = LCM of the row sizes, each chip spans cols / its row size. */
export function gridSpans(rows: number[]): { cols: number; spans: number[] } {
  const cols = rows.reduce((a, b) => (a * b) / gcd(a, b), 1);
  return { cols, spans: rows.flatMap((n) => Array(n).fill(cols / n)) };
}
