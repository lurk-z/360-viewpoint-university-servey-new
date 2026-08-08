'use client';

import { useEffect } from 'react';

export default function DevelopmentRuntime() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !('serviceWorker' in navigator)) return;
    const clearDevelopmentCaches = async (): Promise<void> => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if (!('caches' in window)) return;
      const keys = await window.caches.keys();
      await Promise.all(keys
        .filter((key) => key.startsWith('kmuntb-tour-'))
        .map((key) => window.caches.delete(key)));
    };
    void clearDevelopmentCaches().catch(() => undefined);
  }, []);

  return null;
}
