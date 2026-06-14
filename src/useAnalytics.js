import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

/**
 * Tracks a named event with optional params.
 * Usage: trackEvent('arena_joined', { topic: 'Arrays' })
 */
export function trackEvent(eventName, params = {}) {
  try {
    logEvent(analytics, eventName, params);
  } catch (err) {
    console.warn('Analytics error:', err);
  }
}

