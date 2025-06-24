// Service Worker helper functions for PWA authentication support

export const clearServiceWorkerCaches = async (): Promise<void> => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const deletionPromises = cacheNames.map(cacheName => {
        console.log('🗑️ Clearing cache:', cacheName);
        return caches.delete(cacheName);
      });
      await Promise.all(deletionPromises);
      console.log('✅ All caches cleared for fresh authentication');
    }
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
  }
};

export const unregisterAllServiceWorkers = async (): Promise<void> => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterPromises = registrations.map(registration => {
        console.log('🔄 Unregistering Service Worker');
        return registration.unregister();
      });
      await Promise.all(unregisterPromises);
      console.log('✅ All Service Workers unregistered');
    }
  } catch (error) {
    console.error('❌ Failed to unregister Service Workers:', error);
  }
};

export const refreshPageAfterCachesClear = (): void => {
  // Force a hard refresh to bypass any cached resources
  window.location.reload();
};

// PWA-safe authentication helper
export const performPWAAuthCheck = async (userId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'PWA-Auth-Check': 'true' // Custom header to identify PWA auth requests
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('PWA auth check failed:', error);
    return false;
  }
};