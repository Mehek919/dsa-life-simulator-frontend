import React from 'react';
import * as Sentry from '@sentry/react';
import ReactDOM from 'react-dom/client';
import './index.css'; // ✅ ADD THIS LINE
import App from './App';
import { initSentry } from './sentry';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
initSentry();
inject();
injectSpeedInsights();
Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);




