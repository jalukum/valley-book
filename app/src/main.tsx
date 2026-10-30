import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './styles.css';
import App from './App';
import { lockPageZoom } from './lib/nozoom';
import { installSfx } from './lib/sfx';
import { installNoLongPress } from './lib/nopress';
import { ErrorBoundary } from './components/ErrorBoundary';
import { reloadOnce } from './lib/lazyload';
import { watchViewport } from './lib/viewport';

lockPageZoom(document);
installSfx(document);
installNoLongPress(document);

// v7.2.2: a file Vite preloads for a screen went missing (usually a newer version was just installed): reload once.
watchViewport(); // v7.2.3: no stray strip at the bottom of the iOS home-screen app
window.addEventListener('vite:preloadError', (e) => { if (reloadOnce()) e.preventDefault(); });

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary full><App /></ErrorBoundary></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
