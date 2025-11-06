import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useAppState } from './useAppState';

interface TotalBadgeData {
  totalBadgeCount: number;
  unreadMessages: number;
  unreadAiNotices: number;
}

// Comprehensive PWA badge manager that ensures correct total count (messages + AI notices)
export function usePWABadgeManager() {
  const { user } = useAuth();
  const appState = useAppState();
  const lastBadgeCountRef = useRef<number>(0);

  // Fetch total badge count (messages + AI notices) - only poll when app is active to save battery
  const { data: badgeData } = useQuery<TotalBadgeData>({
    queryKey: ['/api/total-unread-badge'],
    enabled: !!user,
    refetchInterval: appState === 'active' ? 5000 : false, // Only poll when active
    staleTime: 0, // Always fresh data
    gcTime: 0, // Don't cache old data
  });

  // Update Service Worker badge when badge count changes
  useEffect(() => {
    if (!user || !badgeData) return;

    const totalBadgeCount = badgeData.totalBadgeCount;

    // Only update if count actually changed to avoid unnecessary updates
    if (totalBadgeCount !== lastBadgeCountRef.current) {
      console.log(`📱 PWA Badge update: ${lastBadgeCountRef.current} → ${totalBadgeCount} (messages: ${badgeData.unreadMessages}, AI: ${badgeData.unreadAiNotices})`);
      lastBadgeCountRef.current = totalBadgeCount;
      
      // Update Service Worker badge via postMessage
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE_COUNT',
          count: totalBadgeCount
        });
      }

      // Direct badge update as fallback
      if ('setAppBadge' in navigator) {
        if (totalBadgeCount > 0) {
          navigator.setAppBadge(totalBadgeCount).catch(console.error);
        } else {
          navigator.clearAppBadge().catch(console.error);
        }
      }
    }
  }, [user, badgeData]);

  // Clear badge when user logs out
  useEffect(() => {
    if (!user && lastBadgeCountRef.current > 0) {
      console.log('📱 User logged out - clearing PWA badge');
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
    totalUnread: badgeData?.totalBadgeCount || 0
  };
}
