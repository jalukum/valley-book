import { Component, type ReactNode } from 'react';
import { Ui } from './ui';
import { isChunkError, reloadOnce } from '../lib/lazyload';

// v7.2.2: before this, any error while drawing a page unmounted the whole app and left a plain sky-blue screen.
// Now the page shows a parchment card with a reload button instead (the tab bar stays usable for in-page errors).

/** Parchment "Something went wrong" card. `full` covers the whole screen (used when the app shell itself failed). */
export function ErrorCard({ full = false }: { full?: boolean }) {
  return (
    <div className={'oops' + (full ? ' full' : '')} role="alert">
      <div className="oops-card">
        <Ui k="Junimo" size={48} eager />
        <b>Something went wrong</b>
        <small>This page didn't load properly. Your saved progress is safe.</small>
        <button type="button" className="btn oops-btn" onClick={() => location.reload()}>Tap to reload</button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode; full?: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) {
    // A missing script chunk usually means a newer version was installed while this page was open: one reload fixes it.
    if (isChunkError(err)) reloadOnce();
  }
  render() { return this.state.failed ? <ErrorCard full={this.props.full} /> : this.props.children; }
}

/** Suspense fallback: never a blank page. Fades in after a moment so quick loads don't flash. */
export function PageLoading() {
  return <div className="loading page-loading" role="status"><Ui k="Junimo" size={40} eager /><span>Loading…</span></div>;
}
