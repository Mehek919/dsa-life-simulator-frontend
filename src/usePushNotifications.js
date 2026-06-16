import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE from './config';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function usePushNotifications(user) {
  const [permission,    setPermission]    = useState(Notification.permission);
  const [subscription,  setSubscription]  = useState(null);
  const [isSubscribed,  setIsSubscribed]  = useState(false);
  const [loading,       setLoading]       = useState(false);

  // ── Check existing subscription on mount ──
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !user) return;

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          setSubscription(sub);
          setIsSubscribed(true);
        }
      });
    });
  }, [user]);

  // ── Subscribe ──
  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return;
    setLoading(true);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);
      setIsSubscribed(true);

      // Save subscription to backend
      await axios.post(`${API_BASE}/notifications/subscribe`, {
        uid:          user.uid,
        subscription: sub.toJSON(),
      });

      console.log('[Push] Subscribed successfully');
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Unsubscribe ──
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);

      await axios.post(`${API_BASE}/notifications/unsubscribe`, {
        uid: user.uid,
      });

      console.log('[Push] Unsubscribed');
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [subscription, user]);

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}
