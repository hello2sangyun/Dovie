import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { useAppState } from './useAppState';

interface TotalBadgeData {
  totalBadgeCount: number;
  unreadMessages: number;
  unreadAiNotices: number;
}

export function useNativeBadgeManager() {
  const { user } = useAuth();
  const appState = useAppState();
  const lastBadgeCountRef = useRef<number>(0);
  const isNativePlatform = Capacitor.isNativePlatform();

  // Fetch total badge count (messages + AI notices) - only poll when app is active to save battery
  const { data: badgeData } = useQuery<TotalBadgeData>({
    queryKey: ['/api/total-unread-badge'],
    enabled: !!user && isNativePlatform,
    refetchInterval: appState === 'active' ? 5000 : false, // Only poll when active
    staleTime: 0, // Always fresh data
    gcTime: 0, // Don't cache old data
  });

  // Update native badge when badge count changes
  useEffect(() => {
    if (!user || !badgeData || !isNativePlatform) {
      console.log('📱 Skipping native badge update - not native platform or no user/data');
      return;
    }

    const updateBadge = async () => {
      const { Badge } = await import('@capawesome/capacitor-badge');
      const totalBadgeCount = badgeData.totalBadgeCount;

      // Only update if count actually changed to avoid unnecessary updates
      if (totalBadgeCount !== lastBadgeCountRef.current) {
        console.log(`📱 Native Badge update: ${lastBadgeCountRef.current} → ${totalBadgeCount} (messages: ${badgeData.unreadMessages}, AI: ${badgeData.unreadAiNotices})`);
        lastBadgeCountRef.current = totalBadgeCount;
        
        try {
          await Badge.set({ count: totalBadgeCount });
          console.log(`✅ Native badge count set to ${totalBadgeCount}`);
        } catch (error) {
          console.error('❌ Failed to set native badge count:', error);
        }
      }
    };

    updateBadge();
  }, [user, badgeData, isNativePlatform]);

  // Clear badge when user logs out
  useEffect(() => {
    if (!user && lastBadgeCountRef.current > 0 && isNativePlatform) {
      const clearBadgeOnLogout = async () => {
        const { Badge } = await import('@capawesome/capacitor-badge');
        console.log('📱 User logged out - clearing native badge');
        lastBadgeCountRef.current = 0;
        
        try {
          await Badge.clear();
        } catch (error) {
          console.error('❌ Failed to clear badge on logout:', error);
        }
      };
      
      clearBadgeOnLogout();
    }
  }, [user, isNativePlatform]);

  // Update badge immediately when app comes to foreground
  useEffect(() => {
    if (appState === 'active' && isNativePlatform && badgeData) {
      const syncBadgeOnForeground = async () => {
        const { Badge } = await import('@capawesome/capacitor-badge');
        const totalBadgeCount = badgeData.totalBadgeCount;
        
        if (totalBadgeCount !== lastBadgeCountRef.current) {
          console.log(`📱 App foregrounded - syncing badge to ${totalBadgeCount}`);
          lastBadgeCountRef.current = totalBadgeCount;
          
          try {
            await Badge.set({ count: totalBadgeCount });
          } catch (error) {
            console.error('❌ Failed to sync badge on foreground:', error);
          }
        }
      };
      
      syncBadgeOnForeground();
    }
  }, [appState, badgeData, isNativePlatform]);

  // Real-time badge sync via custom event (triggered by message read, etc.)
  useEffect(() => {
    if (!isNativePlatform) return;

    const handleBadgeSync = async (event: CustomEvent) => {
      const { Badge } = await import('@capawesome/capacitor-badge');
      const { totalUnread } = event.detail;
      console.log(`📱 Real-time badge sync event: ${totalUnread}`);
      
      lastBadgeCountRef.current = totalUnread;
      try {
        await Badge.set({ count: totalUnread });
      } catch (error) {
        console.error('❌ Failed to sync badge via event:', error);
      }
    };

    window.addEventListener('native-badge-sync' as any, handleBadgeSync);

    return () => {
      window.removeEventListener('native-badge-sync' as any, handleBadgeSync);
    };
  }, [isNativePlatform]);

  return {
    currentBadgeCount: lastBadgeCountRef.current,
    totalUnread: badgeData?.totalBadgeCount || 0,
    setBadgeCount: async (count: number) => {
      if (!isNativePlatform) return;
      
      try {
        const { Badge } = await import('@capawesome/capacitor-badge');
        await Badge.set({ count });
        lastBadgeCountRef.current = count;
        console.log(`✅ Badge manually set to ${count}`);
      } catch (error: any) {
        console.error('❌ Failed to manually set badge:', error);
      }
    },
    clearBadge: async () => {
      if (!isNativePlatform) return;
      
      try {
        const { Badge } = await import('@capawesome/capacitor-badge');
        await Badge.clear();
        lastBadgeCountRef.current = 0;
        console.log('✅ Badge cleared');
      } catch (error: any) {
        console.error('❌ Failed to clear badge:', error);
      }
    }
  };
}
