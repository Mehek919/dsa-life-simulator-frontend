import { useCallback, useEffect, useRef, useState } from 'react';
export default function useProblemShort({ problemId, apiBase, getToken, enabled = true }) {
  const [short, setShort] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [attempt, setAttempt] = useState(0);
  const watchedRef = useRef(false);
  const authHeaders = useCallback(async () => {
    const token = getToken ? await getToken() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  useEffect(() => {
    if (!enabled || !problemId) return undefined;
    const ctrl = new AbortController();
    watchedRef.current = false;
    setStatus('loading');

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/shorts/${encodeURIComponent(problemId)}`, {
          headers: await authHeaders(),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setShort(data.short);
        setStatus('ready');
      } catch (err) {
        if (err.name !== 'AbortError') setStatus('error');
      }
    })();

    return () => ctrl.abort();
  }, [problemId, apiBase, authHeaders, enabled, attempt]);

  const markWatched = useCallback(async () => {
    if (watchedRef.current || !problemId) return;
    watchedRef.current = true;
    try {
      await fetch(`${apiBase}/api/shorts/${encodeURIComponent(problemId)}/watched`, {
        method: 'POST',
        headers: await authHeaders(),
      });
    } catch {
      /* analytics only, never block the student */
    }
  }, [apiBase, problemId, authHeaders]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { short, status, retry, markWatched };
}
