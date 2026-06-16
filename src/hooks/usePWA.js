import { useState, useEffect } from 'react';
export function usePWA() {
  const [installPrompt,   setInstallPrompt]   = useState(null);
  const [isInstalled,     setIsInstalled]     = useState(false);
  const [isOnline,        setIsOnline]        = useState(navigator.onLine);
  const [swRegistered,    setSwRegistered]    = useState(false);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service worker registered:', reg.scope);
          setSwRegistered(true);
        })
        .catch((err) => console.error('[PWA] SW registration failed:', err));
    }
  }, []);

  // Capture install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Detect if already installed
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mq.matches);
    const handler = (e) => setIsInstalled(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Online / offline status
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
    return outcome === 'accepted';
  };

  return { installPrompt, isInstalled, isOnline, swRegistered, promptInstall };
}
