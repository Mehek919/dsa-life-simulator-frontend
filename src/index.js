import React                        from 'react';
import ReactDOM                     from 'react-dom/client';
import './index.css';
import App                          from './App';
import { register }                 from './serviceWorkerRegistration'; // ✅ import added

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Register Service Worker ──
register({
  onSuccess: () => console.log('[SW] App is cached for offline use.'),
  onUpdate:  () => console.log('[SW] New version available. Refresh to update.'),
});




