import { useCallback } from 'react';

export function useSimpleBadge() {
  
  const updateBadge = useCallback(async (count: number) => {
    console.log(`Setting badge count to: ${count}`);
    
    try {
      // Try navigator.setAppBadge first (iOS 16.4+)
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count);
        console.log('Badge set via navigator.setAppBadge');
        return;
      }

      // Try Service Worker registration badge
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('setAppBadge' in registration) {
          await (registration as any).setAppBadge(count);
          console.log('Badge set via ServiceWorker registration');
          return;
        }
      }

      console.log('Badge API not supported');
    } catch (error) {
      console.error('Error setting badge:', error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    try {
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
        console.log('Badge cleared via navigator.clearAppBadge');
        return;
      }

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('clearAppBadge' in registration) {
          await (registration as any).clearAppBadge();
          console.log('Badge cleared via ServiceWorker registration');
          return;
        }
      }

      // Fallback to setting badge to 0
      updateBadge(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }, [updateBadge]);

  return {
    updateBadge,
    clearBadge
  };
}