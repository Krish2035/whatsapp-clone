'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('PWA ServiceWorker registered:', reg.scope))
          .catch((err) => console.error('PWA ServiceWorker registration failed:', err));
      });
    }
  }, []);

  return null;
}
