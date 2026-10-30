import { lazy, type ComponentType } from 'react';

// v7.2.2: code-split screens and data files can fail to load (a flaky connection, or a page that was opened on the
// previous version while a new one was being installed). Before, that error unmounted the whole app and left a plain
// sky-blue screen. Now: retry once, then reload the page once (which picks up the current version), then give up and
// let the error boundary show its "Tap to reload" card.

const RELOAD_KEY = 'vb:chunkReload';
const RELOAD_GAP = 60_000;

/** True for the errors browsers throw when a script chunk or a preloaded file can't be fetched. */
export function isChunkError(e: unknown): boolean {
  const err = e as { name?: string; message?: string } | null;
  if (err?.name === 'ChunkLoadError') return true;
  const m = String(err?.message ?? e ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS|Failed to fetch|Load failed|ChunkLoadError/i.test(m);
}

/** Reload the page, but at most once a minute so a broken network can never cause a reload loop. Returns true if reloading. */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_GAP) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    location.reload();
    return true;
  } catch { return false; }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Memoised loader: tries the import, retries once after a short pause, then reloads once on a chunk error. A failure is
 *  never cached, so the next call starts fresh. */
export function retryImport<T>(load: () => Promise<T>, opts: { delay?: number; reload?: () => boolean } = {}): () => Promise<T> {
  let p: Promise<T> | null = null;
  const { delay = 400, reload = reloadOnce } = opts;
  return () => (p ??= load()
    .catch(() => wait(delay).then(load))
    .catch((e) => {
      p = null;
      if (isChunkError(e) && reload()) return new Promise<T>(() => { /* the page is reloading */ });
      throw e;
    }));
}

/** React.lazy with retry + reload-once, plus `.preload()` so idle time can fetch the chunk before it's needed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRetry<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  const get = retryImport(load);
  return Object.assign(lazy(get), { preload: () => get().then(() => undefined, () => undefined) });
}
