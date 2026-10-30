/** v6.8.3: no page pinch-zoom or double-tap zoom anywhere. iOS Safari ignores user-scalable=no, so also cancel its
 *  gesture* events (page pinch) and multi-finger touchmoves, except inside the Maps viewport (.map-vp), which runs its own
 *  pinch/pan zoom with pointer events. Single-finger scrolling is never touched. */
export const ZOOM_OK = '.map-vp';

type Ev = { target: EventTarget | null; touches?: { length: number }; cancelable?: boolean; preventDefault(): void };
type Target = { addEventListener(t: string, f: (e: Ev) => void, o?: AddEventListenerOptions): void };

const inMap = (t: EventTarget | null) => !!(t && typeof (t as Element).closest === 'function' && (t as Element).closest(ZOOM_OK));

/** Returns true when the event was cancelled (page zoom blocked). Exported for tests. */
export function blockZoom(e: Ev): boolean {
  if (inMap(e.target)) return false;
  if (e.touches && e.touches.length < 2) return false; // touchmove with one finger = normal scroll
  if (e.cancelable !== false) e.preventDefault();
  return true;
}

export function lockPageZoom(doc: Target) {
  const opt = { passive: false } as AddEventListenerOptions;
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(t, blockZoom, opt);
  doc.addEventListener('touchmove', blockZoom, opt);
}
