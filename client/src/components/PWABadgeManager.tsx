import { useEffect } from 'react';
import { usePWABadge } from '@/hooks/usePWABadge';

/**
 * PWA Badge Manager Component
 * Manages app icon badge for unread message counts
 * Automatically integrates with unread counts API and handles PWA badge updates
 */
export function PWABadgeManager() {
  const { unreadCount, updateBadge, clearBadge } = usePWABadge();

  // Log badge status for debugging
  useEffect(() => {
    console.log('PWA Badge Manager - Unread count:', unreadCount);
    
    // Check if badge API is supported
    if ('setAppBadge' in navigator) {
      console.log('PWA Badge API supported');
    } else {
      console.log('PWA Badge API not supported on this device');
    }
  }, [unreadCount]);

  // This component doesn't render anything - it just manages badge state
  return null;
}

export default PWABadgeManager;