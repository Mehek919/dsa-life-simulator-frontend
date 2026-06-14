import * as Sentry from '@sentry/react';

export function initSentry() {
  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.REACT_APP_SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN not found — skipping Sentry init');
    return;
  }

  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.5,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration(),
    ],
  });

  console.log('✅ Sentry initialized');
}
