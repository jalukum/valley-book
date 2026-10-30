/** v7.2.3 iOS home-screen app: a strip of plain background at the bottom of the screen.
 *  In standalone mode with viewport-fit=cover and a black-translucent status bar, iOS sometimes lays the page out a status bar
 *  shorter than the screen (on a fresh launch, or after rotating to landscape and back): window.innerHeight — and with it every
 *  `position: fixed; inset: 0` / 100% / 100dvh box — ends ~47–62pt above the real bottom, and html's background shows below.
 *  The screen itself still has the right size, so we compare the two and publish the missing height as --vb-gap (px); the app
 *  shell, tab bar and full-screen layers extend down by it (styles.css). 0 everywhere else (browsers, iPad split view, desktop). */
export interface ViewIn { innerWidth: number; innerHeight: number; screenWidth: number; screenHeight: number; standalone: boolean }

/** Missing height at the bottom of the layout viewport, or 0 when nothing looks wrong. */
export function viewportGap(v: ViewIn): number {
  if (!v.standalone || !v.innerWidth || !v.innerHeight || !v.screenWidth || !v.screenHeight) return 0;
  const portrait = v.innerHeight >= v.innerWidth;
  const long = Math.max(v.screenWidth, v.screenHeight), short = Math.min(v.screenWidth, v.screenHeight);
  const fullW = portrait ? short : long, fullH = portrait ? long : short;
  if (Math.abs(v.innerWidth - fullW) > 2) return 0; // not a full-screen window (split view, Stage Manager, desktop)
  const gap = Math.round(fullH - v.innerHeight);
  return gap > 1 && gap <= 80 ? gap : 0; // at most a status bar's worth; anything bigger isn't this bug
}

const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;

let gap = 0;
/** The real visible height: innerHeight plus any missing strip (the tutorial card uses it to stay on screen). */
export const viewH = () => (typeof window === 'undefined' ? 0 : window.innerHeight + gap);

export function measure() {
  const g = viewportGap({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, screenWidth: screen.width, screenHeight: screen.height, standalone: isStandalone() });
  if (g === gap && document.documentElement.style.getPropertyValue('--vb-gap')) return;
  gap = g;
  document.documentElement.style.setProperty('--vb-gap', g + 'px');
  if (g) document.documentElement.dataset.vbGap = String(g); else delete document.documentElement.dataset.vbGap;
}

/** Keep --vb-gap right: on launch, every resize/rotation (iOS reports the new size late, so check again a few times), the visual
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
