import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ── Service Worker: DISABLED ──────────────────────────────────────────────────
// CRA's default SW causes MIME type errors on Vercel (serves SW as text/html).
// PWA features work fine without it. To re-enable later, set up a proper
// Workbox config or use vite-plugin-pwa.
// DO NOT call serviceWorkerRegistration.register() here.
// ─────────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



