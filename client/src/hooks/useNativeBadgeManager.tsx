import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { useAppState } from './useAppState';

interface UnreadCount {
  chatRoomId: number;
  unreadCount: number;
}

interface UnreadData {
  unreadCounts: UnreadCount[];
}

export function useNativeBadgeManager() {
  const { user } = useAuth();
  const appState = useAppState();
  const lastBadgeCountRef = useRef<number>(0);
  const isNativePlatform = Capacitor.isNativePlatform();

  // Fetch unread counts - only poll when app is active to save battery
  const { data: unreadData } = useQuery<UnreadData>({
    queryKey: ['/api/unread-counts'],
    enabled: !!user && isNativePlatform,
    refetchInterval: appState === 'active' ? 5000 : false, // Only poll when active
    staleTime: 0, // Always fresh data
    gcTime: 0, // Don't cache old data
  });

  // Update native badge when unread count changes
  useEffect(() => {
    if (!user || !unreadData || !Array.isArray(unreadData.unreadCounts) || !isNativePlatform) return;

    const totalUnread = unreadData.unreadCounts.reduce(
      (total: number, count: { unreadCount: number }) => total + count.unreadCount,
      0
    );

    // Only update if count actually changed to avoid unnecessary updates
    if (totalUnread !== lastBadgeCountRef.current) {
      console.log(`📱 Native Badge update: ${lastBadgeCountRef.current} → ${totalUnread}`);
      lastBadgeCountRef.current = totalUnread;
      
      // Use Capacitor PushNotifications API to set badge count
      PushNotifications.setBadgeCount({ count: totalUnread })
        .then(() => {
          console.log(`✅ Native badge count set to ${totalUnread}`);
        })
        .catch((error) => {
          console.error('❌ Failed to set native badge count:', error);
        });
    }
  }, [user, unreadData, isNativePlatform]);

  // Clear badge when user logs out
  useEffect(() => {
    if (!user && lastBadgeCountRef.current > 0 && isNativePlatform) {
      console.log('📱 User logged out - clearing native badge');
      lastBadgeCountRef.current = 0;
      
      PushNotifications.setBadgeCount({ count: 0 })
        .catch(console.error);
    }
  }, [user, isNativePlatform]);

  // Update badge immediately when app comes to foreground
  useEffect(() => {
    if (appState === 'active' && isNativePlatform && unreadData) {
      const totalUnread = unreadData.unreadCounts?.reduce(
        (total: number, count: { unreadCount: number }) => total + count.unreadCount,
        0
      ) || 0;
      
      if (totalUnread !== lastBadgeCountRef.current) {
        console.log(`📱 App foregrounded - syncing badge to ${totalUnread}`);
        lastBadgeCountRef.current = totalUnread;
        
        PushNotifications.setBadgeCount({ count: totalUnread })
          .catch(console.error);
      }
    }
  }, [appState, unreadData, isNativePlatform]);

  // Real-time badge sync via custom event (triggered by message read, etc.)
  useEffect(() => {
    if (!isNativePlatform) return;

    const handleBadgeSync = (event: CustomEvent) => {
      const { totalUnread } = event.detail;
      console.log(`📱 Real-time badge sync event: ${totalUnread}`);
      
      lastBadgeCountRef.current = totalUnread;
      PushNotifications.setBadgeCount({ count: totalUnread })
        .catch(console.error);
    };

    window.addEventListener('native-badge-sync' as any, handleBadgeSync);

    return () => {
      window.removeEventListener('native-badge-sync' as any, handleBadgeSync);
    };
  }, [isNativePlatform]);

  return {
    currentBadgeCount: lastBadgeCountRef.current,
    totalUnread: (unreadData && Array.isArray(unreadData.unreadCounts)) 
      ? unreadData.unreadCounts.reduce(
          (total: number, count: { unreadCount: number }) => total + count.unreadCount,
          0
        )
      : 0,
    setBadgeCount: async (count: number) => {
      if (!isNativePlatform) return;
      
      try {
        await PushNotifications.setBadgeCount({ count });
        lastBadgeCountRef.current = count;
        console.log(`✅ Badge manually set to ${count}`);
      } catch (error) {
        console.error('❌ Failed to manually set badge:', error);
      }
    },
    clearBadge: async () => {
      if (!isNativePlatform) return;
      
      try {
        await PushNotifications.setBadgeCount({ count: 0 });
        lastBadgeCountRef.current = 0;
        console.log('✅ Badge cleared');
      } catch (error) {
        console.error('❌ Failed to clear badge:', error);
      }
    }
  };
}
