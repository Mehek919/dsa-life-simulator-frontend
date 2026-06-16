import { trace } from 'firebase/performance';
import { perf } from './firebase';

/**
 * Wraps an async function in a Firebase Performance trace.
 * Usage: await tracedFetch('fetch_daily_challenges', () => axios.get(...))
 */
export async function tracedFetch(traceName, asyncFn) {
  const t = trace(perf, traceName);
  t.start();
  try {
    const result = await asyncFn();
    return result;
  } catch (err) {
    throw err;
  } finally {
    t.stop();
  }
}
