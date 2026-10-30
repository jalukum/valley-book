/** v7.2.3–7.2.4 iOS home-screen app: a strip at the bottom of the screen.
 *  In standalone mode with viewport-fit=cover and a black-translucent status bar, iOS sometimes (fresh launch, after landscape and back)
 *  sizes `position: fixed` boxes to a containing block a status bar (~55–59pt) shorter than the screen. v7.2.3 only reacted when
 *  window.innerHeight was short too — on a real iPhone it wasn't, so nothing moved and only html's background showed in the strip.
 *  v7.2.4: in standalone we never trust the fixed containing block. We publish the real screen height (portrait/landscape aware) as
 *  --vb-h and set html.vb-sa; styles.css gives every full-screen layer an explicit height of max(100lvh, --vb-h) and pins the tab bar's
 *  bottom edge there with `bottom: calc(100% - H)`, which lands on H whatever height iOS gives the containing block. Browsers: untouched. */
export interface ViewIn { innerWidth: number; innerHeight: number; screenWidth: number; screenHeight: number; standalone: boolean }

/** The full-screen height the app should fill, in CSS px, or 0 to leave the layout alone (browser tab, split view, desktop). */
export function fullHeight(v: ViewIn): number {
  if (!v.standalone || !v.innerWidth || !v.screenWidth || !v.screenHeight) return 0;
  const portrait = v.innerHeight >= v.innerWidth || !v.innerHeight;
  const long = Math.max(v.screenWidth, v.screenHeight), short = Math.min(v.screenWidth, v.screenHeight);
  const fullW = portrait ? short : long, fullH = portrait ? long : short;
  if (Math.abs(v.innerWidth - fullW) > 2) return 0; // not a full-screen window (split view, Stage Manager, desktop)
  return Math.max(fullH, v.innerHeight || 0);
}

const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;

let full = 0;
/** The real visible height (the tutorial card uses it to stay on screen). */
export const viewH = () => (typeof window === 'undefined' ? 0 : Math.max(window.innerHeight, full));

export function measure() {
  const h = fullHeight({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, screenWidth: screen.width, screenHeight: screen.height, standalone: isStandalone() });
  const root = document.documentElement;
  if (h === full && root.classList.contains('vb-sa') === !!h) return;
  full = h;
  if (h) { root.style.setProperty('--vb-h', h + 'px'); root.classList.add('vb-sa'); }
  else { root.style.removeProperty('--vb-h'); root.classList.remove('vb-sa'); }
}

/** Keep --vb-h right: on launch, every resize/rotation (iOS reports the new size late, so check again a few times), the visual
 *  viewport changing, coming back from the background, and restoring from the back/forward cache. */
export function watchViewport() {
  measure();
  let timers: number[] = [];
  const soon = () => { measure(); timers.forEach(clearTimeout); timers = [60, 250, 600, 1200].map((ms) => window.setTimeout(measure, ms)); };
  window.addEventListener('resize', soon);
  window.addEventListener('orientationchange', soon);
  window.addEventListener('pageshow', soon);
  window.visualViewport?.addEventListener('resize', soon);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(); });
  soon();
}
