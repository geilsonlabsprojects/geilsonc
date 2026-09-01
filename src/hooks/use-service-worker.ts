import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => setSwReady(true))
        .catch((error) => console.error('SW registration failed:', error));
    }

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, swReady };
}

export function useOfflineCache() {
  const cacheKey = 'offline-data';

  const saveOfflineData = (key: string, data: unknown) => {
    try {
      const current = JSON.parse(localStorage.getItem(cacheKey) || '{}') as Record<string, unknown>;
      current[key] = data;
      localStorage.setItem(cacheKey, JSON.stringify(current));
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  };

  const getOfflineData = (key: string) => {
    try {
      const data = JSON.parse(localStorage.getItem(cacheKey) || '{}') as Record<string, unknown>;
      return data[key];
    } catch {
      return null;
    }
  };

  const clearOfflineData = (key?: string) => {
    try {
      if (key) {
        const current = JSON.parse(localStorage.getItem(cacheKey) || '{}') as Record<string, unknown>;
        delete current[key];
        localStorage.setItem(cacheKey, JSON.stringify(current));
      } else {
        localStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  return { saveOfflineData, getOfflineData, clearOfflineData };
}
