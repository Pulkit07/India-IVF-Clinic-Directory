import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const staleBuildReloadKey = 'openivf-stale-build-reload';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  const now = Date.now();
  const lastReload = Number(sessionStorage.getItem(staleBuildReloadKey) || 0);
  if (now - lastReload < 30_000) return;

  sessionStorage.setItem(staleBuildReloadKey, String(now));
  window.location.reload();
});

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
