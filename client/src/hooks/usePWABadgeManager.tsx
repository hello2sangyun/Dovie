import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useAppState } from './useAppState';

interface UnreadCount {
  chatRoomId: number;
  unreadCount: number;
}

interface UnreadData {
  unreadCounts: UnreadCount[];
}

// Comprehensive PWA badge manager that ensures correct total count
export function usePWABadgeManager() {
  const { user } = useAuth();
  const appState = useAppState();
  const lastBadgeCountRef = useRef<number>(0);

  // Fetch unread counts - only poll when app is active to save battery
  const { data: unreadData } = useQuery<UnreadData>({
    queryKey: ['/api/unread-counts'],
    enabled: !!user,
    refetchInterval: appState === 'active' ? 5000 : false, // Only poll when active
    staleTime: 0, // Always fresh data
    gcTime: 0, // Don't cache old data
  });

  // Update Service Worker badge when unread count changes
  useEffect(() => {
    if (!user || !unreadData || !Array.isArray(unreadData.unreadCounts)) return;

    const totalUnread = unreadData.unreadCounts.reduce(
      (total: number, count: { unreadCount: number }) => total + count.unreadCount,
      0
    );

    // Only update if count actually changed to avoid unnecessary updates
    if (totalUnread !== lastBadgeCountRef.current) {
      console.log(`📱 Badge update: ${lastBadgeCountRef.current} → ${totalUnread}`);
      lastBadgeCountRef.current = totalUnread;
      
      // Update Service Worker badge via postMessage
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE_COUNT',
          count: totalUnread
        });
      }

      // Direct badge update as fallback
      if ('setAppBadge' in navigator) {
        if (totalUnread > 0) {
          navigator.setAppBadge(totalUnread).catch(console.error);
        } else {
          navigator.clearAppBadge().catch(console.error);
        }
      }
    }
  }, [user, unreadData]);

  // Clear badge when user logs out
  useEffect(() => {
    if (!user && lastBadgeCountRef.current > 0) {
      console.log('📱 User logged out - clearing badge');
      lastBadgeCountRef.current = 0;
      
      if ('setAppBadge' in navigator) {
        navigator.clearAppBadge().catch(console.error);
      }
      
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE_COUNT',
          count: 0
        });
      }
    }
  }, [user]);

  return {
    currentBadgeCount: lastBadgeCountRef.current,
    totalUnread: (unreadData && Array.isArray(unreadData.unreadCounts)) 
      ? unreadData.unreadCounts.reduce(
          (total: number, count: { unreadCount: number }) => total + count.unreadCount,
          0
        )
      : 0
  };
}